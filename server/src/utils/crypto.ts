import crypto from 'crypto';

export function randomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(v: string) {
  return crypto.createHash('sha256').update(v).digest('hex');
}

export function sha256Hex(v: string) {
  return sha256(v);
}

// Basic IP anonymization for logging (keeps /24 for IPv4, /48 for IPv6)
export function anonymizeIp(ip: string) {
  const v = String(ip || '').trim();
  if (!v) return '';
  if (v.includes('.')) {
    const parts = v.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    return v;
  }
  if (v.includes(':')) {
    const parts = v.split(':');
    return parts.slice(0, 3).join(':') + '::';
  }
  return v;
}
