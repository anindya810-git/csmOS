// Temporary diagnostic: mount each dashboard with fixture data and report runtime errors.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';

import { AuthProvider } from '../src/context/AuthContext';
import { FieldLabelsProvider } from '../src/context/FieldLabelsContext';
import { PermissionsProvider } from '../src/context/PermissionsContext';

import IssuesDashboard from '../src/components/IssuesDashboard';
import EscalationsDashboard from '../src/components/EscalationsDashboard';
import TasksPage from '../src/components/TasksPage';
import AccountsPage from '../src/components/AccountsPage';

const FIXTURES = {
  '/api/auth/me': { id: 1, email: 'admin@test.com', role: 'admin', name: 'Admin' },
  '/api/accounts': [
    { id: 1, account_name: 'Acme Corp', tenant_id: 'acme1', csm: 'CSM One', csm_lead: 'Lead One',
      rag_status: 'Green', region: 'North', industry: 'Tech', mrr: 1000, mrr_tier: 'T1',
      renewal_date: '2026-12-01', golive_date: '2024-01-01', adoption_score: 80, stickiness_score: 70 },
  ],
  '/api/accounts/filters': { industries: ['Tech'], regions: ['North'], csms: ['CSM One'], tiers: ['T1'], csmLeads: ['Lead One'] },
  '/api/issues': [
    { id: 11, account_id: 1, account_name: 'Acme Corp', tenant_id: 'acme1', priority: 'P1',
      description: 'Something broke', issue_type: 'PS', issue_sub_type: '', owner_team: 'CS',
      status: 'Open', reported_date: '2026-01-15', closure_date: null, csm: 'CSM One',
      csm_lead: 'Lead One', support_ticket: 123, dev_ticket: null, next_steps: 'Investigate' },
  ],
  '/api/escalations': [
    { id: 21, account_id: 1, account_name: 'Acme Corp', tenant_id: 'acme1',
      date_of_escalation: '2026-01-10', month: 'January', description: 'Escalated issue',
      action_taken: 'Called them', status: 'Open', csm: 'CSM One', ownership: 'PS',
      eta: '2026-02-01', email_subject: 'URGENT', ps_leader: 'PS Lead', escalated_by: 'Customer',
      trigger_reason: 'Bug', source_of_escalation: 'Email', issue_type: 'PS', issue_sub_type: '',
      accounts: { rag_status: 'Green' } },
  ],
  '/api/tasks': [
    { id: 31, task_subject: 'Follow up', task_description: 'Call client', nature_of_task: 'Call',
      account_id: 1, account_name: 'Acme Corp', assigned_to: 'admin@test.com',
      assigned_by: 'admin@test.com', due_date: '2026-06-20', status: 'Open', completed_at: null },
  ],
  '/api/dropdown-config': {},
  '/api/users': [{ id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin' }],
};

const unknownUrls = [];
axios.get = async (url) => {
  const path = url.split('?')[0];
  if (path in FIXTURES) return { data: FIXTURES[path] };
  unknownUrls.push(url);
  return { data: [] };
};
axios.post = async () => ({ data: {} });
axios.put = async () => ({ data: {} });
axios.delete = async () => ({ data: {} });

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 80)); });

async function mountOne(name, Comp) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const errors = [];
  const origError = console.error;
  console.error = (...args) => { errors.push(args.map(a => (a && a.stack) || String(a)).join(' ')); };
  let failed = false;
  try {
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AuthProvider>
            <FieldLabelsProvider>
              <PermissionsProvider>
                <Comp />
              </PermissionsProvider>
            </FieldLabelsProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });
    await flush();
    await flush();
    const text = host.textContent || '';
    console.error = origError;
    const fatal = errors.filter(e => /error|Error/.test(e) && !/Warning:/.test(e));
    console.log(`\n=== ${name} ===`);
    console.log('rendered chars:', text.length, '| sample:', JSON.stringify(text.slice(0, 120)));
    if (fatal.length || text.length === 0) { failed = true; console.log('ERRORS:\n' + fatal.slice(0, 3).join('\n---\n')); }
    else console.log('no fatal errors');
    root.unmount();
  } catch (err) {
    console.error = origError;
    failed = true;
    console.log(`\n=== ${name} === THREW DURING MOUNT:`);
    console.log(err.stack || err.message);
  }
  host.remove();
  return failed;
}

export async function run() {
  localStorage.setItem('token', 'fake-token');
  let failed = false;
  failed = (await mountOne('IssuesDashboard', IssuesDashboard)) || failed;
  failed = (await mountOne('EscalationsDashboard', EscalationsDashboard)) || failed;
  failed = (await mountOne('TasksPage', TasksPage)) || failed;
  failed = (await mountOne('AccountsPage', AccountsPage)) || failed;
  if (unknownUrls.length) console.log('\nUnmocked URLs:', [...new Set(unknownUrls)].join(', '));
  return failed;
}
