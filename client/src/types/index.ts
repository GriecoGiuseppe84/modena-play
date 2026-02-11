export type Role = 'admin' | 'user' | 'seller';

export type AffiliateLink = {
  id: string;
  title: string;
  source_url: string;
  destination_url: string;
  network: string;
  slug: string;
  is_active: boolean;
  click_count: number;
  brand_id?: string | null;
  payout_type?: string | null;
  payout_value?: number | null;
  tags?: string[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalyticsSummary = {
  scope: string;
  from: string;
  to: string;
  totalLinks: number;
  activeLinks: number;
  totalClicks: number;
  clicks: number;
  revenue: number;
  views?: number;
  conversionRate: number;
  topLinks?: Array<{ id: string; title: string; slug: string; clicks: number }>;
  topPages?: Array<{ page: string; clicks: number; views?: number; ctr?: number }>;
  series?: Array<{ day: string; clicks: number; revenue: number }>;
};

export type SetupStatus = { completed: boolean; raw: any | null };
