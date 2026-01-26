import crypto from 'crypto';

export function sha256Hex(v: string): string {
  return crypto.createHash('sha256').update(v).digest('hex');
}

export function randomId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function anonymizeIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  // IPv4 simple masking: a.b.c.d -> a.b.c.0
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) return `${m[1]}.${m[2]}.${m[3]}.0`;
  // IPv6: keep first 4 blocks
  const parts = ip.split(':');
  if (parts.length >= 4) return `${parts.slice(0, 4).join(':')}::`;
  return null;
}
