import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../database/supabase';
import { schemas } from '../utils/validators';
import { anonymizeIp, sha256Hex } from '../utils/crypto';

export const affiliateRouter = Router();

// list my links
affiliateRouter.get('/links', requireAuth(), async (req: any, res) => {
  const { data, error } = await supabaseAdmin
    .from('affiliate_links')
    .select('*')
    .eq('created_by_id', req.auth.userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to load links' });
  res.json({ items: data ?? [] });
});

// create link
affiliateRouter.post('/links', requireAuth(), async (req: any, res) => {
  const { error, value } = schemas.affiliateLinkCreate.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json({ error: 'Invalid input', details: error.details.map((d) => d.message) });

  const row = {
    created_by_id: req.auth.userId,
    ...value,
  };

  const { data, error: insErr } = await supabaseAdmin.from('affiliate_links').insert(row).select('*').single();
  if (insErr) return res.status(500).json({ error: 'Failed to create link' });

  await supabaseAdmin.from('audit_log').insert({
    action: 'LINK_CREATE',
    actor_id: req.auth.userId,
    resource_type: 'affiliate_link',
    resource_id: data.id,
    changes: row,
  });

  res.json({ item: data });
});

// update link
affiliateRouter.patch('/links/:id', requireAuth(), async (req: any, res) => {
  const { error, value } = schemas.affiliateLinkUpdate.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) return res.status(400).json({ error: 'Invalid input', details: error.details.map((d) => d.message) });

  const id = String(req.params.id);

  const { data: existing } = await supabaseAdmin
    .from('affiliate_links')
    .select('id, created_by_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (existing.created_by_id !== req.auth.userId && req.auth.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { data, error: updErr } = await supabaseAdmin.from('affiliate_links').update(value).eq('id', id).select('*').single();
  if (updErr) return res.status(500).json({ error: 'Failed to update link' });

  await supabaseAdmin.from('audit_log').insert({
    action: 'LINK_UPDATE',
    actor_id: req.auth.userId,
    resource_type: 'affiliate_link',
    resource_id: id,
    changes: value,
  });

  res.json({ item: data });
});

// redirect + click tracking (public)
affiliateRouter.get('/r/:id', async (req, res) => {
  const id = String(req.params.id);

  const { data: link, error } = await supabaseAdmin.from('affiliate_links').select('id,destination_url,status').eq('id', id).maybeSingle();
  if (error || !link) return res.status(404).send('Not found');
  if (link.status !== 'active') return res.status(410).send('Link inactive');

  const ua = req.header('user-agent') ?? null;
  const referer = req.header('referer') ?? null;

  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? null;
  const ipAnon = anonymizeIp(ip);
  const visitorRaw = `${ipAnon ?? 'na'}|${ua ?? 'na'}`;
  const visitorId = sha256Hex(visitorRaw).slice(0, 32);

  const { data: click } = await supabaseAdmin
    .from('link_clicks')
    .insert({
      link_id: id,
      visitor_id: visitorId,
      referer,
      user_agent: ua,
      ip_anonymized: ipAnon,
    })
    .select('id')
    .single();

  // best-effort counters
  await supabaseAdmin.rpc('mg_inc_click', { p_link_id: id });

  const dest = link.destination_url;
  res.redirect(302, dest);
});
