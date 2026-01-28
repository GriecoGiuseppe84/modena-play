import jwt from 'jsonwebtoken';

export type JwtPayload = {
  sub: string;
  role: 'admin' | 'user';
  email?: string;
};

const SECRET = process.env.JWT_SECRET || '';

export function signJwt(payload: JwtPayload, expiresIn: string = '7d') {
  if (!SECRET) throw new Error('Missing JWT_SECRET');
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyJwt(token: string): JwtPayload {
  if (!SECRET) throw new Error('Missing JWT_SECRET');
  return jwt.verify(token, SECRET) as JwtPayload;
}
