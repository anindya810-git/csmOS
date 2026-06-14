/**
 * One-time seed script for Supabase.
 * Usage:
 *   1. Copy .env.example → .env.local and fill in values
 *   2. npm run seed
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';

// Load .env.local manually (dotenv not installed as prod dep)
try {
  const env = readFileSync('.env.local', 'utf8');
  env.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && !k.startsWith('#')) process.env[k.trim()] = v.join('=').trim();
  });
} catch { /* .env.local not found — rely on real env vars */ }

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const users = [
  { name: 'Anindya Roy',      email: 'anindya@leadsquared.com',             password: 'Admin@123', role: 'admin', csm_name: 'Anindya' },
  { name: 'Abhishek Bhargav', email: 'abhishek.bhargav@leadsquared.com',    password: 'Csm@123',  role: 'csm',   csm_name: 'Abhishek Bhargav' },
  { name: 'Bhoomit Ahlawat',  email: 'bhoomit.ahlawat@leadsquared.com',     password: 'Csm@123',  role: 'csm',   csm_name: 'Bhoomit Ahlawat' },
  { name: 'Nikhil Chand',     email: 'nikhil.chand@leadsquared.com',        password: 'Csm@123',  role: 'csm',   csm_name: 'Nikhil Chand' },
  { name: 'Vaibhav',          email: 'vaibhav@leadsquared.com',             password: 'Csm@123',  role: 'csm',   csm_name: 'Vaibhav' },
  { name: 'Poorva Pandya',    email: 'poorva.pandya@leadsquared.com',       password: 'Csm@123',  role: 'csm',   csm_name: 'Poorva Pandya' },
  { name: 'Amarjeet',         email: 'amarjeet@leadsquared.com',            password: 'Csm@123',  role: 'csm',   csm_name: 'Amarjeet' },
];

// Re-use the same account data from backend/seed.js
const { createRequire } = await import('module');
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));

// Inline the accounts array (same as backend/seed.js)
const accountsRaw = readFileSync(join(__dirname, '../backend/seed.js'), 'utf8');
const match = accountsRaw.match(/const accounts = (\[[\s\S]*?\]);/);
if (!match) throw new Error('Could not parse accounts from backend/seed.js');
const accounts = eval(match[1]); // Safe: local file only

async function seed() {
  console.log('Seeding users…');
  for (const u of users) {
    const hash = bcrypt.hashSync(u.password, 10);
    const { error } = await supabase.from('users').upsert(
      { name: u.name, email: u.email, password_hash: hash, role: u.role, csm_name: u.csm_name },
      { onConflict: 'email' }
    );
    if (error) console.error(`  ✗ ${u.email}:`, error.message);
    else console.log(`  ✓ ${u.email}`);
  }

  console.log('\nSeeding accounts…');
  const rows = accounts.map(a => ({
    account_name: a.account_name,
    tenant_id: a.tenant_id ?? null,
    industry: a.industry ?? null,
    mrr_tier: a.mrr_tier ?? null,
    mrr: a.mrr ?? 0,
    region: a.region ?? null,
    csm_lead: a.csm_lead ?? null,
    csm: a.csm ?? null,
    cp: a.cp ?? null,
    tam_assigned: a.tam_assigned ?? null,
    billing_frequency: a.billing_frequency ?? null,
    renewal_date: a.renewal_date ?? null,
    renewal_status: a.renewal_status ?? null,
    churn_status: a.churn_status ?? null,
    churn_reason: a.churn_reason ?? null,
    renewal_comments: a.renewal_comments ?? null,
    implementation_status: a.implementation_status ?? null,
    implementation_type: a.implementation_type ?? null,
    ps_engagement: a.ps_engagement ?? null,
    ps_solutioning: a.ps_solutioning ?? null,
    account_understanding_session: a.account_understanding_session ?? null,
    new_csm_intro_done: a.new_csm_intro_done ?? null,
    csm_escalation_matrix_shared: a.csm_escalation_matrix_shared ?? null,
    ring_fence_meeting_initiated: a.ring_fence_meeting_initiated ?? null,
    meeting_planned_date: a.meeting_planned_date ?? null,
    meeting_done: a.meeting_done ?? null,
    issue_mapping_sheet_updated: a.issue_mapping_sheet_updated ?? null,
    review_cadence_alignment: a.review_cadence_alignment ?? null,
    adoption_score: a.adoption_score ?? null,
    stickiness_score: a.stickiness_score ?? null,
    rag_status: a.rag_status ?? 'Green',
    rag_reason: a.rag_reason ?? null,
    actions_taken: a.actions_taken ?? null,
    contraction_risk: a.contraction_risk ?? 'No',
    churn_risk: a.churn_risk ?? 'No',
    grr: a.grr ?? null,
    nps: a.nps ?? null,
    adoption_rate: a.adoption_rate ?? null,
    sa_status: a.sa_status ?? null,
  }));

  // Insert in batches of 20
  for (let i = 0; i < rows.length; i += 20) {
    const batch = rows.slice(i, i + 20);
    const { error } = await supabase.from('accounts').insert(batch);
    if (error) { console.error(`  ✗ batch ${i}-${i+20}:`, error.message); break; }
    else console.log(`  ✓ inserted ${i + 1}–${Math.min(i + 20, rows.length)}`);
  }

  console.log('\nDone!');
}

seed().catch(console.error);
