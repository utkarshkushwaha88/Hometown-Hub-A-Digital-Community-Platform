import jwt from 'jsonwebtoken';
export function signAccess(user){return jwt.sign({sub:user._id.toString(),role:user.role},process.env.JWT_ACCESS_SECRET,{expiresIn:process.env.ACCESS_TOKEN_EXPIRES_IN||'15m',issuer:'hometown-hub',audience:'hometown-hub-client'});}
export function signRefresh(user,jti){return jwt.sign({sub:user._id.toString(),jti},process.env.JWT_REFRESH_SECRET,{expiresIn:process.env.REFRESH_TOKEN_EXPIRES_IN||'7d',issuer:'hometown-hub',audience:'hometown-hub-client'});}
export function cookieOptions(maxAge, path='/api/v1/auth'){
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path,
    maxAge,
  };
}
export function publicUser(user){return {_id:user._id,name:user.name,username:user.username,email:user.email,avatar:user.avatar,hometown:user.hometown,city:user.city,state:user.state,country:user.country,bio:user.bio,role:user.role,createdAt:user.createdAt};}
