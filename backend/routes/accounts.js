const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'csmos-secret-key-2024';

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/', auth, (req, res) => {
  const { csm, industry, region, rag_status, churn_status, mrr_tier, search } = req.query;
  let query = 'SELECT * FROM accounts WHERE 1=1';
  const params = [];

  if (csm) { query += ' AND csm = ?'; params.push(csm); }
  if (industry) { query += ' AND industry = ?'; params.push(industry); }
  if (region) { query += ' AND region = ?'; params.push(region); }
  if (rag_status) { query += ' AND rag_status = ?'; params.push(rag_status); }
  if (churn_status) { query += ' AND churn_status = ?'; params.push(churn_status); }
  if (mrr_tier) { query += ' AND mrr_tier = ?'; params.push(mrr_tier); }
  if (search) { query += ' AND account_name LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY account_name ASC';
  const accounts = db.prepare(query).all(...params);
  res.json(accounts);
});

router.get('/stats', auth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count, SUM(mrr) as total_mrr FROM accounts').get();
  const byRag = db.prepare("SELECT rag_status, COUNT(*) as count FROM accounts GROUP BY rag_status").all();
  const byIndustry = db.prepare("SELECT industry, COUNT(*) as count, SUM(mrr) as mrr FROM accounts GROUP BY industry ORDER BY mrr DESC").all();
  const byChurn = db.prepare("SELECT churn_status, COUNT(*) as count FROM accounts WHERE churn_status IS NOT NULL GROUP BY churn_status").all();
  const byCsm = db.prepare("SELECT csm, COUNT(*) as count, SUM(mrr) as mrr FROM accounts GROUP BY csm ORDER BY mrr DESC").all();
  const renewalPending = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE renewal_status = 'Renewal Pending'").get();
  const churnRisk = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE churn_risk = 'Yes' OR churn_status IN ('Churn Activated','Churn Predicted')").get();
  res.json({ total, byRag, byIndustry, byChurn, byCsm, renewalPending, churnRisk });
});

router.get('/filters', auth, (req, res) => {
  const csms = db.prepare('SELECT DISTINCT csm FROM accounts WHERE csm IS NOT NULL ORDER BY csm').all().map(r => r.csm);
  const industries = db.prepare('SELECT DISTINCT industry FROM accounts WHERE industry IS NOT NULL ORDER BY industry').all().map(r => r.industry);
  const regions = db.prepare('SELECT DISTINCT region FROM accounts WHERE region IS NOT NULL ORDER BY region').all().map(r => r.region);
  const tiers = db.prepare('SELECT DISTINCT mrr_tier FROM accounts WHERE mrr_tier IS NOT NULL ORDER BY mrr_tier').all().map(r => r.mrr_tier);
  res.json({ csms, industries, regions, tiers });
});

router.get('/:id', auth, (req, res) => {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Not found' });
  const log = db.prepare('SELECT al.*, u.name as user_name FROM activity_log al JOIN users u ON al.user_id = u.id WHERE al.account_id = ? ORDER BY al.created_at DESC LIMIT 20').all(req.params.id);
  res.json({ ...account, activity_log: log });
});

router.put('/:id', auth, (req, res) => {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Not found' });

  const fields = [
    'account_name','tenant_id','industry','mrr_tier','mrr','region','csm_lead','csm',
    'closure_eta','cp','tam_assigned','billing_frequency','renewal_date','renewal_status',
    'churn_status','churn_reason','renewal_comments','implementation_status','implementation_type',
    'ps_engagement','ps_solutioning','account_understanding_session','new_csm_intro_done',
    'csm_escalation_matrix_shared','ring_fence_meeting_initiated','meeting_planned_date',
    'meeting_done','issue_mapping_sheet_updated','review_cadence_alignment',
    'adoption_score','stickiness_score','rag_status','rag_reason','actions_taken',
    'contraction_risk','churn_risk','grr','nps','adoption_rate','sa_status'
  ];

  const changes = {};
  const updates = [];
  const params = [];

  for (const f of fields) {
    if (req.body[f] !== undefined && req.body[f] !== account[f]) {
      changes[f] = { from: account[f], to: req.body[f] };
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  }

  if (updates.length === 0) return res.json(account);

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);
  db.prepare(`UPDATE accounts SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  db.prepare('INSERT INTO activity_log (account_id, user_id, action, changes) VALUES (?, ?, ?, ?)').run(
    req.params.id, req.user.id, 'update', JSON.stringify(changes)
  );

  const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.post('/', auth, (req, res) => {
  const { account_name, tenant_id, industry, mrr_tier, mrr, region, csm_lead, csm, rag_status } = req.body;
  if (!account_name) return res.status(400).json({ error: 'account_name required' });
  const result = db.prepare(`
    INSERT INTO accounts (account_name, tenant_id, industry, mrr_tier, mrr, region, csm_lead, csm, rag_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(account_name, tenant_id, industry, mrr_tier, mrr ?? 0, region, csm_lead, csm, rag_status ?? 'Green');
  const created = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

module.exports = router;
