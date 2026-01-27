import crypto from 'crypto';

export function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(v: string) {
  return crypto.createHash('sha256').update(v).digest('hex');
}
