import { Router } from 'express'; import bcrypt from 'bcryptjs'; import crypto from 'node:crypto'; import { z } from 'zod'; import jwt from 'jsonwebtoken'; import { User, RefreshToken, PasswordResetToken } from '../models/index.js'; import { asyncHandler, requireAuth } from '../middleware/auth.js'; import { cookieOptions, publicUser, signAccess, signRefresh } from '../utils/tokens.js';
const router=Router();const registerSchema=z.object({name:z.string().trim().min(2).max(80),email:z.email().transform(v=>v.toLowerCase()),password:z.string().min(8).max(128),hometown:z.string().max(100).optional()});const loginSchema=z.object({email:z.email().transform(v=>v.toLowerCase()),password:z.string().min(1).max(128)});const hash=t=>crypto.createHash('sha256').update(t).digest('hex');
async function setSession(res,user){const access=signAccess(user),jti=crypto.randomUUID(),refresh=signRefresh(user,jti);await RefreshToken.create({user:user._id,hashedToken:hash(refresh),expiresAt:new Date(Date.now()+7*864e5)});res.cookie('accessToken',access,cookieOptions(15*60*1000,'/api/v1'));res.cookie('refreshToken',refresh,cookieOptions(7*864e5,'/api/v1/auth'));}
router.post('/register',asyncHandler(async(req,res)=>{const v=registerSchema.parse(req.body);if(await User.exists({email:v.email}))return res.status(409).json({message:'An account with this email already exists'});const base=v.email.split('@')[0].replace(/[^a-z0-9_]/g,'').slice(0,20)||'neighbor';let username=base;for(let i=0;await User.exists({username});i++)username=`${base}${i+1}`;const user=await User.create({name:v.name,email:v.email,username,passwordHash:await bcrypt.hash(v.password,12),hometown:v.hometown});await setSession(res,user);res.status(201).json({user:publicUser(user)});}));
router.post('/login',asyncHandler(async(req,res)=>{const v=loginSchema.parse(req.body);const user=await User.findOne({email:v.email}).select('+passwordHash');if(!user||!(await bcrypt.compare(v.password,user.passwordHash))||user.accountStatus!=='active')return res.status(401).json({message:'Invalid email or password'});await setSession(res,user);res.json({user:publicUser(user)});}));
router.post('/logout',asyncHandler(async(req,res)=>{const token=req.cookies?.refreshToken;if(token)await RefreshToken.updateOne({hashedToken:hash(token),revokedAt:null},{$set:{revokedAt:new Date()}});res.clearCookie('accessToken',{...cookieOptions(0,'/api/v1')});res.clearCookie('refreshToken',{...cookieOptions(0,'/api/v1/auth')});res.json({message:'Logged out'});}));
router.post('/refresh',asyncHandler(async(req,res)=>{const token=req.cookies?.refreshToken;if(!token)return res.status(401).json({message:'Refresh session expired'});let payload;try{payload=jwt.verify(token,process.env.JWT_REFRESH_SECRET,{issuer:'hometown-hub',audience:'hometown-hub-client'})}catch{return res.status(401).json({message:'Refresh session expired'})}const record=await RefreshToken.findOne({hashedToken:hash(token),user:payload.sub,revokedAt:null,expiresAt:{$gt:new Date()}});if(!record)return res.status(401).json({message:'Refresh session expired'});record.revokedAt=new Date();await record.save();const user=await User.findById(payload.sub);if(!user||user.accountStatus!=='active')return res.status(401).json({message:'Refresh session expired'});await setSession(res,user);res.json({user:publicUser(user)});}));
router.get('/me',requireAuth,(req,res)=>res.json({user:publicUser(req.user)}));
router.post('/forgot-password',asyncHandler(async(req,res)=>{
  const schema=z.object({email:z.email().transform(v=>v.toLowerCase())});
  const {email}=schema.parse(req.body);
  // Always return the same response to avoid revealing whether an account exists.
  if(!process.env.EMAIL_PROVIDER_API_KEY||!process.env.EMAIL_FROM)return res.status(503).json({message:'Password reset email is not configured on this server'});
  const generic={message:'If an active account exists for that email, a password-reset link will be sent.'};
  const user=await User.findOne({email,accountStatus:'active'});
  if(!user)return res.json(generic);
  const rawToken=crypto.randomBytes(32).toString('hex');
  await PasswordResetToken.deleteMany({user:user._id});
  await PasswordResetToken.create({user:user._id,tokenHash:hash(rawToken),expiresAt:new Date(Date.now()+30*60*1000)});
  const clientUrl=(process.env.CLIENT_URL||'http://localhost:5173').split(',')[0].trim();
  const resetUrl=`${clientUrl}/reset-password?token=${rawToken}`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.EMAIL_PROVIDER_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[user.email],subject:'Reset your Hometown Hub password',html:`<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Reset your password</h2><p>We received a request to reset your Hometown Hub password.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p></div>`})});
  if(!response.ok){await PasswordResetToken.deleteOne({user:user._id,tokenHash:hash(rawToken)});const details=await response.text();console.error('Resend request failed:',response.status,details);return res.status(502).json({message:'Unable to send password-reset email. Please try again later.'});}
  return res.json(generic);
}));
router.post('/reset-password',asyncHandler(async(req,res)=>{
  const v=z.object({token:z.string().min(32).max(200),password:z.string().min(8).max(128)}).parse(req.body);
  const reset=await PasswordResetToken.findOne({tokenHash:hash(v.token),expiresAt:{$gt:new Date()}});
  if(!reset)return res.status(400).json({message:'This password-reset link is invalid or has expired.'});
  const user=await User.findById(reset.user).select('+passwordHash');
  if(!user||user.accountStatus!=='active')return res.status(400).json({message:'This password-reset link is invalid or has expired.'});
  user.passwordHash=await bcrypt.hash(v.password,12);await user.save();
  await Promise.all([PasswordResetToken.deleteMany({user:user._id}),RefreshToken.updateMany({user:user._id,revokedAt:null},{$set:{revokedAt:new Date()}})]);
  res.clearCookie('accessToken',{...cookieOptions(0,'/api/v1')});res.clearCookie('refreshToken',{...cookieOptions(0,'/api/v1/auth')});
  return res.json({message:'Password reset successfully. Please log in with your new password.'});
}));
export default router;
