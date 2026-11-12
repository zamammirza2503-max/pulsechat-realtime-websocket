import bcrypt from "bcryptjs"; import jwt from "jsonwebtoken"; import type {Request,Response,NextFunction} from "express";
if(process.env.NODE_ENV==="production"&&!process.env.JWT_SECRET)throw new Error("JWT_SECRET must be set in production"); const secret=process.env.JWT_SECRET||"development-secret"; export type AuthUser={id:string;username:string};
export const hashPassword=(p:string)=>bcrypt.hash(p,12); export const verifyPassword=(p:string,h:string)=>bcrypt.compare(p,h);
export const signToken=(u:AuthUser)=>jwt.sign(u,secret,{expiresIn:"7d"}); export const verifyToken=(t:string)=>jwt.verify(t,secret) as AuthUser;
export function requireAuth(req:Request,res:Response,next:NextFunction){const h=req.headers.authorization;if(!h?.startsWith("Bearer "))return res.status(401).json({error:"Missing token"});try{res.locals.user=verifyToken(h.slice(7));next()}catch{return res.status(401).json({error:"Invalid token"})}}
