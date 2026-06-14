import supabase from './_utils/supabase.js';
import bcrypt from 'bcryptjs';
import { signSuperadminToken, signImpersonationToken, verifySuperadminToken } from './_utils/auth.js';
import { setCors } from './_utils/cors.js';
import { normalizeHost } from './_utils/domain.js';

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

  if (resource === 'orgs' && req.query.action === 'logo') return handleOrgLogo(req, res, admin);
  if (resource === 'orgs') return handleOrgs(req, res, admin);
  if (resource === 'clone') return handleCloneOrg(req, res, admin);
  if (resource === 'stats') return handleStats(req, res);
  if (resource === 'admins') return handleAdmins(req, res, admin);
  if (resource === 'feature_requests') return handleFeatureRequests(req, res, admin);

  return res.status(404).json({ error: 'Not found' });
}

// Upload (or remove) an org's logo. POST takes a base64 data URL; we push the
// bytes to the public `org-logos` Storage bucket and save the public URL.
async function handleOrgLogo(req, res, admin) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  if (req.method === 'DELETE') {
    const { data, error } = await supabase
      .from('organizations')
      .update({ logo_url: null, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { logo_data } = req.body || {};
  const match = typeof logo_data === 'string' && logo_data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return res.status(400).json({ error: 'A valid image is required' });

  const contentType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 1024 * 1024) return res.status(413).json({ error: 'Image too large (max 1 MB)' });

  const ext = contentType.split('/')[1].replace('svg+xml', 'svg').replace('jpeg', 'jpg');
  const path = `org-${id}/logo-${Date.now()}.${ext}`;

  // Create the bucket on first use (idempotent — a second call just errors,
  // which we ignore) and upload.
  await supabase.storage.createBucket('org-logos', { public: true });
  const { error: upErr } = await supabase.storage
    .from('org-logos')
    .upload(path, buffer, { contentType, upsert: true });
  if (upErr) return res.status(500).json({ error: `Upload failed: ${upErr.message}` });

  const { data: pub } = supabase.storage.from('org-logos').getPublicUrl(path);
  const logo_url = pub?.publicUrl || null;

  const { data, error } = await supabase
    .from('organizations')
    .update({ logo_url, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
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

  if (admin.is_active === false) return res.status(403).json({ error: 'This superadmin account has been deactivated' });

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
    const [{ data: org }, { data: users }, { data: tzData }] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', id).maybeSingle(),
      supabase.from('users').select('id, name, email, role, csm_name, last_active_at').eq('org_id', id).order('name'),
      supabase.from('dropdown_config').select('value').eq('org_id', id).eq('field_name', 'org_timezone').maybeSingle(),
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
      org_timezone: tzData?.value || null,
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
    const { name, plan, billing_status, user_limit, notes, features, custom_domain, theme_color, org_timezone } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (plan !== undefined) updates.plan = plan;
    if (billing_status !== undefined) updates.billing_status = billing_status;
    if (user_limit !== undefined) updates.user_limit = Number(user_limit);
    if (notes !== undefined) updates.notes = notes || null;
    if (features !== undefined && features && typeof features === 'object') updates.features = features;
    if (custom_domain !== undefined) updates.custom_domain = normalizeHost(custom_domain) || null;
    if (theme_color !== undefined) {
      const validHex = typeof theme_color === 'string' && /^#[0-9a-fA-F]{6}$/.test(theme_color.trim());
      updates.theme_color = validHex ? theme_color.trim() : null;
    }

    const { data, error } = await supabase.from('organizations').update(updates).eq('id', id).select().single();
    if (error) {
      // Unique-violation → the domain is already claimed by another org.
      if (error.code === '23505')
        return res.status(409).json({ error: 'That domain is already assigned to another organisation.' });
      return res.status(500).json({ error: error.message });
    }

    // Store org timezone in dropdown_config (no schema change needed).
    let savedTz = undefined;
    if (org_timezone !== undefined) {
      const tz = typeof org_timezone === 'string' ? org_timezone.trim() : '';
      await supabase.from('dropdown_config').delete().eq('org_id', id).eq('field_name', 'org_timezone');
      if (tz) await supabase.from('dropdown_config').insert({ org_id: Number(id), field_name: 'org_timezone', value: tz });
      savedTz = tz || null;
    }

    return res.json({ ...data, ...(savedTz !== undefined ? { org_timezone: savedTz } : {}) });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabase.from('organizations').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleCloneOrg(req, res, admin) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { source_org_id, new_name, new_slug, clone_users, clone_dropdown, clone_accounts } = req.body || {};
  if (!source_org_id || !new_name || !new_slug)
    return res.status(400).json({ error: 'source_org_id, new_name and new_slug are required' });

  const { data: srcOrg } = await supabase.from('organizations').select('*').eq('id', source_org_id).maybeSingle();
  if (!srcOrg) return res.status(404).json({ error: 'Source org not found' });

  // Create the new org (logo is not cloned — storage paths are org-specific)
  const { data: newOrg, error: orgErr } = await supabase
    .from('organizations')
    .insert({
      name: new_name, slug: new_slug,
      plan: srcOrg.plan, billing_status: 'active',
      user_limit: srcOrg.user_limit, notes: srcOrg.notes,
      features: srcOrg.features || {},
    })
    .select().single();
  if (orgErr) return res.status(500).json({ error: orgErr.message });

  const cloned = {};
  let userIdMap = {};

  // Clone users (parallel inserts; silently skip email conflicts)
  if (clone_users) {
    const { data: srcUsers } = await supabase
      .from('users').select('id, name, email, password_hash, role, csm_name, is_active')
      .eq('org_id', source_org_id);
    if (srcUsers?.length) {
      const pairs = await Promise.all(srcUsers.map(async ({ id: oldId, ...u }) => {
        const { data: nu } = await supabase.from('users')
          .insert({ ...u, org_id: newOrg.id, is_active: u.is_active !== false })
          .select('id').single();
        return nu ? [oldId, nu.id] : null;
      }));
      userIdMap = Object.fromEntries(pairs.filter(Boolean));
      cloned.users = Object.keys(userIdMap).length;
    }
  }

  // Clone dropdown configs
  if (clone_dropdown) {
    const { data: srcDD } = await supabase.from('dropdown_config').select('*').eq('org_id', source_org_id);
    if (srcDD?.length) {
      const { data: ins } = await supabase.from('dropdown_config')
        .insert(srcDD.map(({ id, org_id, ...r }) => ({ ...r, org_id: newOrg.id })))
        .select('id');
      cloned.dropdowns = ins?.length || 0;
    }
  }

  // Clone accounts + all linked data
  if (clone_accounts) {
    const { data: srcAccounts } = await supabase.from('accounts').select('*').eq('org_id', source_org_id);
    if (srcAccounts?.length) {
      // Parallel-insert accounts; build old→new ID map from returned rows
      const pairs = await Promise.all(srcAccounts.map(async ({ id: oldId, created_at, updated_at, org_id: _oid, ...rest }) => {
        const { data: na } = await supabase.from('accounts')
          .insert({ ...rest, org_id: newOrg.id }).select('id').single();
        return na ? [oldId, na.id] : null;
      }));
      const acctIdMap = Object.fromEntries(pairs.filter(Boolean));
      cloned.accounts = Object.keys(acctIdMap).length;

      // Helper: strip PK/timestamps, remap org_id + account_id, apply extra overrides
      const remap = (row, extra = {}) => {
        const { id, created_at, updated_at, account_id, org_id: _oid2, ...rest } = row;
        return {
          ...rest,
          org_id: newOrg.id,
          ...(account_id != null ? { account_id: acctIdMap[account_id] } : {}),
          ...extra,
        };
      };
      const filterMap = (rows, extraFn = () => ({})) =>
        (rows || []).filter(r => !r.account_id || acctIdMap[r.account_id]).map(r => remap(r, extraFn(r)));

      // For tasks: remap assigned_to / assigned_by if users were also cloned
      const mapUid = (uid) => (clone_users && uid) ? (userIdMap[uid] || null) : null;

      const [issRes, escRes, tskRes, frRes] = await Promise.all([
        supabase.from('issues').select('*').eq('org_id', source_org_id),
        supabase.from('escalations').select('*').eq('org_id', source_org_id),
        supabase.from('tasks').select('*').eq('org_id', source_org_id),
        supabase.from('feature_requests').select('*').eq('org_id', source_org_id),
      ]);

      const [insIss, insEsc, insTsk, insFR] = await Promise.all([
        issRes.data?.length ? supabase.from('issues').insert(filterMap(issRes.data)).select('id') : { data: [] },
        escRes.data?.length ? supabase.from('escalations').insert(filterMap(escRes.data)).select('id') : { data: [] },
        tskRes.data?.length ? supabase.from('tasks').insert(filterMap(tskRes.data, r => ({
          assigned_to: mapUid(r.assigned_to),
          assigned_by: mapUid(r.assigned_by),
        }))).select('id') : { data: [] },
        frRes.data?.length ? supabase.from('feature_requests').insert(filterMap(frRes.data)).select('id') : { data: [] },
      ]);

      cloned.issues = insIss.data?.length || 0;
      cloned.escalations = insEsc.data?.length || 0;
      cloned.tasks = insTsk.data?.length || 0;
      cloned.feature_requests = insFR.data?.length || 0;
    }
  }

  return res.status(201).json({ org: newOrg, cloned });
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

// Is there at least one OTHER active superadmin besides `excludeId`? Used to
// block actions that would lock everyone out of the platform.
async function otherActiveAdminExists(excludeId) {
  let { data, error } = await supabase
    .from('superadmin_users').select('id, is_active').neq('id', excludeId);
  if (error) {
    // is_active column not migrated yet → treat any other row as active.
    ({ data } = await supabase.from('superadmin_users').select('id').neq('id', excludeId));
    return (data || []).length > 0;
  }
  return (data || []).some(a => a.is_active !== false);
}

// Superadmin (platform owner) account management — mirrors org-level user
// management, but global: superadmins don't belong to an org and own no
// org-scoped data.
async function handleAdmins(req, res, admin) {
  const { id, action } = req.query;

  if (req.method === 'GET') {
    let { data, error } = await supabase
      .from('superadmin_users')
      .select('id, name, email, is_active, last_login_at, created_at')
      .order('name');
    if (error) {
      // Pre-migration fallback (no is_active column yet).
      ({ data, error } = await supabase
        .from('superadmin_users')
        .select('id, name, email, last_login_at, created_at')
        .order('name'));
    }
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === 'POST' && action === 'replace') {
    return handleReplaceAdmin(req, res, admin);
  }

  if (req.method === 'POST') {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email and password are required' });
    const password_hash = bcrypt.hashSync(password, 10);
    const { data, error } = await supabase
      .from('superadmin_users')
      .insert({ name, email: email.toLowerCase().trim(), password_hash })
      .select('id, name, email, is_active, last_login_at, created_at')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'A superadmin with that email already exists' });
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const { name, email, password, is_active } = req.body || {};

    if (is_active === false) {
      if (String(id) === String(admin.id))
        return res.status(400).json({ error: 'You cannot deactivate your own account' });
      if (!(await otherActiveAdminExists(id)))
        return res.status(400).json({ error: 'Cannot deactivate the last active superadmin' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase().trim();
    if (is_active !== undefined) updates.is_active = !!is_active;
    if (password) updates.password_hash = bcrypt.hashSync(password, 10);
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

    const { data, error } = await supabase
      .from('superadmin_users')
      .update(updates)
      .eq('id', id)
      .select('id, name, email, is_active, last_login_at, created_at')
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'A superadmin with that email already exists' });
      return res.status(500).json({ error: error.message });
    }
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id required' });
    if (String(id) === String(admin.id))
      return res.status(400).json({ error: 'Cannot delete your own account' });
    if (!(await otherActiveAdminExists(id)))
      return res.status(400).json({ error: 'Cannot delete the last active superadmin' });
    const { error } = await supabase.from('superadmin_users').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// "Replace" a superadmin. Superadmins are global and own no org-scoped data,
// so there is nothing to reassign — replacing hands over to the chosen
// (active) successor and deactivates the outgoing admin.
async function handleReplaceAdmin(req, res, admin) {
  const { old_admin_id, new_admin_id, deactivate_old = true } = req.body || {};
  if (!old_admin_id || !new_admin_id)
    return res.status(400).json({ error: 'old_admin_id and new_admin_id required' });
  if (String(old_admin_id) === String(new_admin_id))
    return res.status(400).json({ error: 'Pick two different superadmins' });

  const { data: pair } = await supabase
    .from('superadmin_users').select('id, name, email, is_active').in('id', [old_admin_id, new_admin_id]);
  const oldA = (pair || []).find(a => String(a.id) === String(old_admin_id));
  const newA = (pair || []).find(a => String(a.id) === String(new_admin_id));
  if (!oldA || !newA) return res.status(404).json({ error: 'Superadmin not found' });

  if (deactivate_old) {
    if (String(old_admin_id) === String(admin.id))
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    if (newA.is_active === false)
      return res.status(400).json({ error: 'The replacement superadmin must be active' });
    await supabase.from('superadmin_users').update({ is_active: false }).eq('id', old_admin_id);
  }
  return res.json({ success: true, from: oldA.name, to: newA.name, deactivated: !!deactivate_old });
}

// Cross-org feature request management for superadmins.
// approved_by_id is intentionally omitted — it FK-references the users table,
// not superadmin_users; the text approved_by field carries the identity instead.
async function handleFeatureRequests(req, res, admin) {
  const { id, org_id, status: statusFilter, priority: priorityFilter } = req.query;

  if (req.method === 'GET') {
    let query = supabase
      .from('feature_requests')
      .select('*, organizations(id, name)')
      .order('created_at', { ascending: false });
    if (org_id) query = query.eq('org_id', org_id);
    if (statusFilter) query = query.eq('status', statusFilter);
    if (priorityFilter) query = query.eq('priority', priorityFilter);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const { action, rejection_reason, title, description, related_to, priority, expected_rollout_date, status } = req.body || {};
    const now = new Date().toISOString();

    if (action === 'approve') {
      const { data, error } = await supabase
        .from('feature_requests')
        .update({ status: 'approved', approved_by: admin.name, approved_at: now, updated_at: now })
        .eq('id', id)
        .select('*, organizations(id, name)')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    if (action === 'reject') {
      if (!rejection_reason?.trim()) return res.status(400).json({ error: 'rejection_reason required' });
      const { data, error } = await supabase
        .from('feature_requests')
        .update({ status: 'rejected', rejection_reason: rejection_reason.trim(), approved_by: admin.name, approved_at: now, updated_at: now })
        .eq('id', id)
        .select('*, organizations(id, name)')
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    const updates = { updated_at: now };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description || null;
    if (related_to !== undefined) updates.related_to = related_to || null;
    if (priority !== undefined) updates.priority = priority;
    if (expected_rollout_date !== undefined) updates.expected_rollout_date = expected_rollout_date || null;
    if (status !== undefined) updates.status = status;
    if (Object.keys(updates).length === 1) return res.status(400).json({ error: 'Nothing to update' });

    const { data, error } = await supabase
      .from('feature_requests')
      .update(updates)
      .eq('id', id)
      .select('*, organizations(id, name)')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabase.from('feature_requests').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
