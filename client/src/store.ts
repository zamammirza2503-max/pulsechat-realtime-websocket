import {
    configureStore,
    createSlice,
    type PayloadAction,
} from "@reduxjs/toolkit";

import createSagaMiddleware from "redux-saga";

import {
    all,
    call,
    put,
    select,
    takeEvery,
} from "redux-saga/effects";


// ============================================================
// API
// ============================================================

// Empty = same origin (production, and dev via the Vite proxy).
// Set VITE_API_URL only if the API is hosted on a different domain.
const API: string = import.meta.env.VITE_API_URL ?? "";

function wsUrl(token: string): string {
    const base = API ? new URL(API) : new URL(window.location.href);
    const protocol = base.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${base.host}/ws?token=${encodeURIComponent(token)}`;
}


// ============================================================
// Types
// ============================================================

type User = {
    id: string;
    username: string;
};

export type Message = {
    id: string;
    content: string;
    createdAt: string;
    userId: string;
    roomId: string;
    user: User;
    clientId?: string;
    optimistic?: boolean;
};


// ============================================================
// Auth Slice
// ============================================================

const auth = createSlice({
    name: "auth",

    initialState: {
        token: null as string | null,
        user: null as User | null,
        error: null as string | null,
    },

    reducers: {
        loggedIn: (
            state,
            action: PayloadAction<{
                token: string;
                user: User;
            }>
        ) => {
            state.token = action.payload.token;
            state.user = action.payload.user;
            state.error = null;
        },

        loggedOut: (state) => {
            state.token = null;
            state.user = null;
        },

        error: (
            state,
            action: PayloadAction<string>
        ) => {
            state.error = action.payload;
        },
    },
});


// ============================================================
// Chat Slice
// ============================================================

const chat = createSlice({
    name: "chat",

    initialState: {
        rooms: [] as {
            id: string;
            name: string;
        }[],

        active: null as string | null,

        messages: [] as Message[],

        status: "offline",

        typing: {} as Record<string, string>,

        online: [] as string[],
    },

    reducers: {
        roomsLoaded: (state, action) => {
            state.rooms = action.payload;
        },

        roomSelected: (state, action) => {
            state.active = action.payload;
            state.messages = [];
        },

        messagesLoaded: (state, action) => {
            state.messages = action.payload;
        },

        status: (state, action) => {
            state.status = action.payload;
        },

        messageOptimistic: (state, action) => {
            state.messages.push(action.payload);
        },

        messageReceived: (state, action) => {
            const existingMessage = state.messages.find(
                (message) =>
                    message.clientId === action.payload.clientId
            );

            if (existingMessage) {
                Object.assign(
                    existingMessage,
                    action.payload
                );
            } else if (
                !state.messages.some(
                    (message) =>
                        message.id === action.payload.id
                )
            ) {
                state.messages.push(action.payload);
            }
        },

        typing: (state, action) => {
            if (action.payload.isTyping) {
                state.typing[action.payload.userId] =
                    action.payload.username;
            } else {
                delete state.typing[action.payload.userId];
            }
        },

        presence: (state, action) => {
            const users = new Set(state.online);

            if (action.payload.status === "online") {
                users.add(action.payload.username);
            } else {
                users.delete(action.payload.username);
            }

            state.online = [...users];
        },
    },
});


// ============================================================
// Saga Middleware
// ============================================================

const sagaMiddleware = createSagaMiddleware();


// ============================================================
// Redux Store
// ============================================================

export const store = configureStore({
    reducer: {
        auth: auth.reducer,
        chat: chat.reducer,
    },

    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }).concat(sagaMiddleware),
});


// ============================================================
// Root State
// ============================================================

export type Root = ReturnType<typeof store.getState>;


// ============================================================
// WebSocket
// ============================================================

let ws: WebSocket | null = null;


// ============================================================
// Login / Register Saga
// ============================================================

function* login(action: any): Generator {
    try {
        const response: Response = yield call(
            fetch,
            `${API}/api/auth/${action.type === "registerRequested" ? "register" : "login"}`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify(action.payload),
            }
        );

        const data = yield response.json();

        if (!response.ok) {
            throw Error(data.error);
        }

        yield put(
            auth.actions.loggedIn(data)
        );
    } catch (error: any) {
        yield put(
            auth.actions.error(error.message)
        );
    }
}


// ============================================================
// Load Rooms Saga
// ============================================================

function* rooms(): Generator {
    const token = yield select(
        (state: Root) => state.auth.token
    );

    const response: Response = yield call(
        fetch,
        `${API}/api/rooms`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = yield response.json();

    yield put(
        chat.actions.roomsLoaded(data)
    );
}


// ============================================================
// Select Room Saga
// ============================================================

function* selectRoom(action: any): Generator {
    const token = yield select(
        (state: Root) => state.auth.token
    );

    const response: Response = yield call(
        fetch,
        `${API}/api/rooms/${action.payload}/messages`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    const data = yield response.json();

    yield put(
        chat.actions.messagesLoaded(data)
    );

    yield put({
        type: "connect",
    });
}


// ============================================================
// WebSocket Connection
// ============================================================

function connect(): void {
    const token = store.getState().auth.token;

    const room = store.getState().chat.active;

    if (!token || !room) {
        return;
    }

    // Close previous connection
    ws?.close();

    // Create WebSocket connection
    ws = new WebSocket(
        wsUrl(token)
    );


    // --------------------------------------------------------
    // WebSocket opened
    // --------------------------------------------------------

    ws.onopen = () => {
        ws?.send(
            JSON.stringify({
                type: "JOIN_ROOM",
                roomId: room,
            })
        );

        store.dispatch(
            chat.actions.status("connected")
        );
    };


    // --------------------------------------------------------
    // WebSocket message received
    // --------------------------------------------------------

    ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);


        // New message
        if (payload.type === "MESSAGE") {
            store.dispatch(
                chat.actions.messageReceived({
                       ...payload.message,
                       clientId: payload.clientId,
                   })
                )
            );
        }


        // Typing notification
        if (payload.type === "TYPING") {
            store.dispatch(
                chat.actions.typing(payload)
            );
        }


        // Online / offline presence
        if (payload.type === "PRESENCE") {
            store.dispatch(
                chat.actions.presence(payload)
            );
        }
    };


    // --------------------------------------------------------
    // WebSocket closed
    // --------------------------------------------------------

    ws.onclose = () => {
        store.dispatch(
            chat.actions.status("reconnecting")
        );

        setTimeout(connect, 1500);
    };
}


// ============================================================
// Send Message through WebSocket
// ============================================================

function send(action: any): void {
    if (
        ws?.readyState ===
        WebSocket.OPEN
    ) {
        ws.send(
            JSON.stringify({
                type: "MESSAGE_SEND",

                roomId: action.payload.roomId,

                content: action.payload.content,

                clientId: action.payload.clientId,
            })
        );
    }
}


// ============================================================
// Root Saga
// ============================================================

function* root(): Generator {
    yield all([
        takeEvery(
            "loginRequested",
            login
        ),

        takeEvery(
            "registerRequested",
            login
        ),

        takeEvery(
            "roomsRequested",
            rooms
        ),

        takeEvery(
            chat.actions.roomSelected.type,
            selectRoom
        ),

        takeEvery(
            "connect",
            connect
        ),

        takeEvery(
            "sendMessage",
            send
        ),
    ]);
}


// ============================================================
// Start Saga
// ============================================================

sagaMiddleware.run(root);


// ============================================================
// Actions
// ============================================================

export const actions = {
    ...auth.actions,

    ...chat.actions,

    loginRequested: (payload: any) => ({
        type: "loginRequested",
        payload,
    }),

    registerRequested: (payload: any) => ({
        type: "registerRequested",
        payload,
    }),

    roomsRequested: () => ({
        type: "roomsRequested",
    }),

    sendMessage: (payload: any) => ({
        type: "sendMessage",
        payload,
    }),
};
