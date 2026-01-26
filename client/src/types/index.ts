export type Role = 'admin' | 'user' | 'seller';

export type AffiliateLinkStatus = 'active' | 'paused' | 'archived';

export type AffiliateLink = {
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

export type AnalyticsSummary = {
  clicks: number;
  conversions: number;
  revenue: number;
  commission: number;
  conversionRate: number;
};

export type SetupStatus = { completed: boolean; raw: any | null };
