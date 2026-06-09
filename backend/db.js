const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'csmos.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'csm',
    csm_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_name TEXT NOT NULL,
    tenant_id TEXT,
    industry TEXT,
    mrr_tier TEXT,
    mrr REAL DEFAULT 0,
    region TEXT,
    csm_lead TEXT,
    csm TEXT,
    closure_eta TEXT,
    cp TEXT,
    tam_assigned TEXT,
    billing_frequency TEXT,
    renewal_date TEXT,
    renewal_status TEXT,
    churn_status TEXT,
    churn_reason TEXT,
    renewal_comments TEXT,
    implementation_status TEXT,
    implementation_type TEXT,
    ps_engagement TEXT,
    ps_solutioning TEXT,
    account_understanding_session TEXT,
    new_csm_intro_done TEXT,
    csm_escalation_matrix_shared TEXT,
    ring_fence_meeting_initiated TEXT,
    meeting_planned_date TEXT,
    meeting_done TEXT,
    issue_mapping_sheet_updated TEXT,
    review_cadence_alignment TEXT,
    adoption_score REAL,
    stickiness_score REAL,
    rag_status TEXT DEFAULT 'Green',
    rag_reason TEXT,
    actions_taken TEXT,
    contraction_risk TEXT DEFAULT 'No',
    churn_risk TEXT DEFAULT 'No',
    grr REAL,
    nps REAL,
    adoption_rate REAL,
    sa_status TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    user_id INTEGER,
    action TEXT,
    changes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(account_id) REFERENCES accounts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

module.exports = db;
