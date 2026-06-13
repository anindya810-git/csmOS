import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import supabase from './supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'csmos-secret-key-2024';
const API_KEY_PREFIX = 'csmos_';

export function verifyToken(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) throw new Error('No token');
  return jwt.verify(token, JWT_SECRET);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function signSuperadminToken(payload) {
  return jwt.sign({ ...payload, type: 'superadmin' }, JWT_SECRET, { expiresIn: '12h' });
}

export function signImpersonationToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

export function verifySuperadminToken(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) throw new Error('No token');
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.type !== 'superadmin') throw new Error('Not a superadmin token');
  return decoded;
}

export function generateApiKey() {
  return API_KEY_PREFIX + crypto.randomBytes(24).toString('hex');
}

export function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Session JWT (browser) OR API key (external integrations).
// API keys arrive as `Authorization: Bearer csmos_…` or `X-Api-Key: csmos_…`
// and resolve to a service identity: { id: null, role: 'api', name: 'API · <label>', org_id }.
// Superadmin tokens (type: 'superadmin') are rejected — they only work on /api/superadmin.
export async function verifyAuth(req) {
  const bearer = (req.headers.authorization || '').replace('Bearer ', '');
  const token = bearer || req.headers['x-api-key'] || '';
  if (!token) throw new Error('No token');

  if (token.startsWith(API_KEY_PREFIX)) {
    const { data: row } = await supabase
      .from('api_keys')
      .select('id, label, revoked_at, org_id')
      .eq('key_hash', hashApiKey(token))
      .maybeSingle();
    if (!row || row.revoked_at) throw new Error('Invalid API key');
    await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', row.id);
    return { id: null, role: 'api', name: `API · ${row.label}`, apiKeyId: row.id, org_id: row.org_id };
  }

  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.type === 'superadmin') throw new Error('Superadmin token not accepted on this endpoint');
  return decoded;
}
