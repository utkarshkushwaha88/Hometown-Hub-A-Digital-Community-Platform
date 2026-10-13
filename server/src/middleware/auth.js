import jwt from 'jsonwebtoken'; import { User, DailyActiveUser } from '../models/index.js';

// Record one unique activity row per authenticated user per UTC calendar day.
// The in-process set avoids issuing a database upsert on every API request.
// The unique database index deduplicates activity across multiple server instances.
const trackedToday = new Set();
let trackedDayKey = '';
function recordDailyActiveUser(userId) {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const dayKey = day.toISOString().slice(0, 10);
  if (trackedDayKey !== dayKey) {
    trackedToday.clear();
    trackedDayKey = dayKey;
  }
  const key = String(userId);
  if (trackedToday.has(key)) return;
  trackedToday.add(key);
  DailyActiveUser.updateOne(
    { user: userId, day },
    { $setOnInsert: { user: userId, day } },
    { upsert: true }
  ).catch((error) => {
    // A duplicate-key response means another instance already recorded the same user/day.
    if (error?.code === 11000) return;
    // Permit a retry if a transient database error occurred.
    trackedToday.delete(key);
    console.error('[analytics] Could not record daily activity:', error.message);
  });
}
export async function requireAuth(req,res,next){try{const token=req.cookies?.accessToken;if(!token)return res.status(401).json({message:'Authentication required'});const payload=jwt.verify(token,process.env.JWT_ACCESS_SECRET,{issuer:'hometown-hub',audience:'hometown-hub-client'});const user=await User.findById(payload.sub);if(!user||user.accountStatus!=='active')return res.status(401).json({message:'Authentication required'});req.user=user;recordDailyActiveUser(user._id);next()}catch{return res.status(401).json({message:'Authentication required'})}}
export function allowRoles(...roles){return (req,res,next)=>{if(!req.user||!roles.includes(req.user.role))return res.status(403).json({message:'You do not have permission to perform this action'});next()}}
export function asyncHandler(fn){return (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next)}

export async function optionalAuth(req,res,next){try{const token=req.cookies?.accessToken;if(token){const payload=jwt.verify(token,process.env.JWT_ACCESS_SECRET,{issuer:'hometown-hub',audience:'hometown-hub-client'});const user=await User.findById(payload.sub);if(user&&user.accountStatus==='active'){req.user=user;recordDailyActiveUser(user._id);}}}catch{/* Public resources remain available without a valid session. */}next()}
