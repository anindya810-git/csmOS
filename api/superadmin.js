import supabase from './_utils/supabase.js';
import bcrypt from 'bcryptjs';
import { signSuperadminToken, signImpersonationToken, verifySuperadminToken } from './_utils/auth.js';
import { setCors } from './_utils/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Login does not require auth
  if (req.method === 'POST' && req.query.action === 'login') {
    return handleLogin(req, res);
  }

  // All other routes require a valid superadmin JWT
  let admin;
  try { admin = verifySuperadminToken(req); } catch { return res.status(401).json({ error: 'Unauthorized' }); }

  if (req.method === 'POST' && req.query.action === 'impersonate') {
    return handleImpersonate(req, res, admin);
  }

  const { resource } = req.query;

  if (resource === 'orgs') return handleOrgs(req, res, admin);
  if (resource === 'stats') return handleStats(req, res);

  return res.status(404).json({ error: 'Not found' });
}

async function handleLogin(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { data: admin } = await supabase
    .from('superadmin_users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, admin.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  await supabase.from('superadmin_users').update({ last_login_at: new Date().toISOString() }).eq('id', admin.id);

  const token = signSuperadminToken({ id: admin.id, email: admin.email, name: admin.name });
  return res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
}

async function handleImpersonate(req, res, admin) {
  const { org_id, user_id } = req.body || {};
  if (!org_id) return res.status(400).json({ error: 'org_id required' });

  let user;
  if (user_id) {
    const { data } = await supabase
      .from('users').select('id, name, email, role, csm_name, org_id')
      .eq('id', user_id).eq('org_id', org_id).maybeSingle();
    user = data;
  } else {
    const { data } = await supabase
      .from('users').select('id, name, email, role, csm_name, org_id')
      .eq('org_id', org_id).eq('role', 'admin').order('id').limit(1).maybeSingle();
    user = data;
  }

  if (!user) return res.status(404).json({ error: 'No admin user found for this org' });

  const token = signImpersonationToken({
    id: user.id, email: user.email, name: user.name,
    role: user.role, csm_name: user.csm_name, org_id: user.org_id,
    impersonated: true, impersonated_by: admin.email,
  });

  return res.json({ token, user });
}

async function handleOrgs(req, res, admin) {
  const { id } = req.query;

  if (req.method === 'GET' && id) {
    const [{ data: org }, { data: users }] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', id).maybeSingle(),
      supabase.from('users').select('id, name, email, role, csm_name, last_active_at').eq('org_id', id).order('name'),
    ]);
    if (!org) return res.status(404).json({ error: 'Not found' });

    // head:true count queries return { count }, not a data array.
    const [accts, issues, escalations, tasks, frs, reports] = await Promise.all([
      supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('org_id', id),
      supabase.from('issues').select('id', { count: 'exact', head: true }).eq('org_id', id),
      supabase.from('escalations').select('id', { count: 'exact', head: true }).eq('org_id', id),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('org_id', id),
      supabase.from('feature_requests').select('id', { count: 'exact', head: true }).eq('org_id', id),
      supabase.from('custom_reports').select('id', { count: 'exact', head: true }).eq('org_id', id),
    ]);

    return res.json({
      ...org,
      features: org.features || {},
      users: users || [],
      _stats: {
        users: (users || []).length,
        accounts: accts.count ?? 0,
        issues: issues.count ?? 0,
        escalations: escalations.count ?? 0,
        tasks: tasks.count ?? 0,
        feature_requests: frs.count ?? 0,
        custom_reports: reports.count ?? 0,
      },
    });
  }

  if (req.method === 'GET') {
    const { data: orgs } = await supabase.from('organizations').select('*').order('name');
    const orgIds = (orgs || []).map(o => o.id);
    if (!orgIds.length) return res.json([]);

    const [{ data: userRows }, { data: acctRows }, { data: issueRows }] = await Promise.all([
      supabase.from('users').select('org_id').in('org_id', orgIds),
      supabase.from('accounts').select('org_id').in('org_id', orgIds),
      supabase.from('issues').select('org_id').in('org_id', orgIds),
    ]);

    const userMap = {};
    const acctMap = {};
    const issueMap = {};
    (userRows || []).forEach(u => { userMap[u.org_id] = (userMap[u.org_id] || 0) + 1; });
    (acctRows || []).forEach(a => { acctMap[a.org_id] = (acctMap[a.org_id] || 0) + 1; });
    (issueRows || []).forEach(i => { issueMap[i.org_id] = (issueMap[i.org_id] || 0) + 1; });

    return res.json((orgs || []).map(o => ({
      ...o,
      user_count: userMap[o.id] || 0,
      account_count: acctMap[o.id] || 0,
      _stats: {
        users: userMap[o.id] || 0,
        accounts: acctMap[o.id] || 0,
        issues: issueMap[o.id] || 0,
      },
    })));
  }

  if (req.method === 'POST') {
    const { org_name, org_slug, plan, user_limit, notes, admin_name, admin_email, admin_password } = req.body || {};
    if (!org_name || !org_slug) return res.status(400).json({ error: 'org_name and org_slug required' });
    if (!admin_email || !admin_password) return res.status(400).json({ error: 'admin_email and admin_password required' });

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: org_name, slug: org_slug, plan: plan || 'trial', user_limit: user_limit || 10, notes: notes || null, billing_status: 'active' })
      .select().single();
    if (orgErr) return res.status(500).json({ error: orgErr.message });

    const password_hash = bcrypt.hashSync(admin_password, 10);
    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert({ org_id: org.id, name: admin_name || admin_email, email: admin_email.toLowerCase().trim(), password_hash, role: 'admin' })
      .select('id, name, email, role, org_id').single();
    if (userErr) {
      await supabase.from('organizations').delete().eq('id', org.id);
      return res.status(500).json({ error: userErr.message });
    }

    return res.status(201).json({ org, user });
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const { name, plan, billing_status, user_limit, notes, features } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (plan !== undefined) updates.plan = plan;
    if (billing_status !== undefined) updates.billing_status = billing_status;
    if (user_limit !== undefined) updates.user_limit = Number(user_limit);
    if (notes !== undefined) updates.notes = notes || null;
    if (features !== undefined && features && typeof features === 'object') updates.features = features;

    const { data, error } = await supabase.from('organizations').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabase.from('organizations').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleStats(req, res) {
  const [{ data: orgs }, { data: users }, { data: accounts }, { data: issues }] = await Promise.all([
    supabase.from('organizations').select('id, plan, billing_status'),
    supabase.from('users').select('id'),
    supabase.from('accounts').select('id'),
    supabase.from('issues').select('id'),
  ]);

  const totalOrgs = (orgs || []).length;
  const activeOrgs = (orgs || []).filter(o => o.billing_status === 'active').length;
  const suspendedOrgs = (orgs || []).filter(o => o.billing_status === 'suspended').length;
  const planBreakdown = {};
  (orgs || []).forEach(o => { planBreakdown[o.plan] = (planBreakdown[o.plan] || 0) + 1; });

  return res.json({
    totalOrgs, activeOrgs, suspendedOrgs,
    totalUsers: (users || []).length,
    totalAccounts: (accounts || []).length,
    totalIssues: (issues || []).length,
    planBreakdown,
  });
}
