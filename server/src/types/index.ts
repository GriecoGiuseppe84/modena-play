export type Role = 'admin' | 'user' | 'seller';

export type ProfileRow = {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AffiliateLinkStatus = 'active' | 'paused' | 'archived';

export type AffiliateLinkRow = {
  id: string;
  created_by_id: string;
  source_url: string;
  destination_url: string;
  title: string;
  category: string;
  commission_rate: number;
  status: AffiliateLinkStatus;
  click_count: number;
  conversion_count: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
};

export type LinkClickRow = {
  id: string;
  link_id: string;
  visitor_id: string | null;
  referer: string | null;
  user_agent: string | null;
  ip_anonymized: string | null;
  clicked_at: string;
};

export type ConversionSource = 'amazon' | 'ebay' | 'manual_entry';

export type ConversionStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled';

export type ConversionRow = {
  id: string;
  link_id: string;
  click_id: string | null;
  amount: string; // numeric -> returned as string by pg
  commission_earned: string; // numeric
  source: ConversionSource;
  external_transaction_id: string | null;
  status: ConversionStatus;
  created_at: string;
  confirmed_at: string | null;
};

export type AdminConfigRow = {
  id: string;
  config_key: string;
  config_value: any;
  updated_by: string;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  action: string;
  actor_id: string | null;
  resource_type: string;
  resource_id: string | null;
  changes: any;
  created_at: string;
};

export type ApiHealth = {
  status: 'ok' | 'degraded';
  database: 'connected' | 'disconnected';
  timestamp: string;
  environment: string;
};

export type JwtClaims = {
  sub: string;
  email: string;
  role: Role;
  type: 'access' | 'refresh';
  jti: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
};
