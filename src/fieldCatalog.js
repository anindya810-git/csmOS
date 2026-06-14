// Canonical field catalog for every object in the system — the single source
// of truth. Used by: column visibility toggles, Settings → Field Management,
// ADVANCED FILTER field lists and BULK UPDATE field lists (pages derive both
// from here, so a field added once automatically shows up everywhere).
//
// Metadata per field:
//   type        'text' | 'number' | 'date' | 'select' | 'bool'
//   opts        static dropdown options (also the fallback when dynamic empty)
//   filtersKey  options come from the page's filters/derived data (e.g. CSM list)
//   ddKey       options come from dropdown_config (Settings → Dropdowns)
//   bulkGroup   group label in the bulk-update field picker; omit to exclude
//               the field from bulk updates (identity/unique fields)

export const ACCOUNT_FIELDS = [
  { key: 'account_name',          label: 'Account Name',          type: 'text' },
  { key: 'tenant_id',             label: 'Tenant ID',             type: 'text' },
  { key: 'industry',              label: 'Industry',              type: 'select', filtersKey: 'industries', bulkGroup: 'Account Info' },
  { key: 'mrr_tier',              label: 'MRR Tier',              type: 'select', filtersKey: 'tiers', bulkGroup: 'Account Info' },
  { key: 'mrr',                   label: 'MRR',                   type: 'number', bulkGroup: 'Account Info' },
  { key: 'region',                label: 'Region',                type: 'select', filtersKey: 'regions', opts: ['North','South','East','West'], bulkGroup: 'Account Info' },
  { key: 'csm_lead',              label: 'CSM Lead',              type: 'select', filtersKey: 'csmLeads', bulkGroup: 'Team & Commercial' },
  { key: 'csm',                   label: 'CSM',                   type: 'select', filtersKey: 'csms', bulkGroup: 'Team & Commercial' },
  { key: 'cp',                    label: 'CP',                    type: 'text', bulkGroup: 'Team & Commercial' },
  { key: 'tam_assigned',          label: 'TAM Assigned',          type: 'select', opts: ['Yes','No'], bulkGroup: 'Team & Commercial' },
  { key: 'sa_status',             label: 'SA Status',             type: 'text', bulkGroup: 'Team & Commercial' },
  { key: 'billing_frequency',     label: 'Billing Frequency',     type: 'select', ddKey: 'billing_frequency', opts: ['Monthly','Quarterly','Half-Yearly','Annually'], bulkGroup: 'Team & Commercial' },
  { key: 'golive_date',           label: 'Go-live Date',          type: 'date' },
  { key: 'renewal_date',          label: 'Renewal Date',          type: 'date', bulkGroup: 'Team & Commercial' },
  { key: 'renewal_status',        label: 'Renewal Status',        type: 'select', ddKey: 'renewal_status', opts: ['Renewed','At Risk','Lost','Pending'], bulkGroup: 'Team & Commercial' },
  { key: 'churn_status',          label: 'Churn Status',          type: 'select', ddKey: 'churn_status', opts: ['Churn Activated','Churn Predicted','Churn Executed','Contraction Predicted'], bulkGroup: 'Churn & Risk' },
  { key: 'churn_reason',          label: 'Churn Reason',          type: 'text', bulkGroup: 'Churn & Risk' },
  { key: 'contraction_risk',      label: 'Contraction Risk',      type: 'select', ddKey: 'contraction_risk', opts: ['High','Medium','Low','None'], bulkGroup: 'Churn & Risk' },
  { key: 'churn_risk',            label: 'Churn Risk',            type: 'select', ddKey: 'churn_risk', opts: ['High','Medium','Low','None'], bulkGroup: 'Churn & Risk' },
  { key: 'rag_status',            label: 'RAG Status',            type: 'select', ddKey: 'rag_status', opts: ['Green','Amber','Red'], bulkGroup: 'RAG & Health' },
  { key: 'rag_reason',            label: 'RAG Reason',            type: 'text' },
  { key: 'actions_taken',         label: 'Actions Taken',         type: 'text' },
  { key: 'adoption_score',        label: 'Adoption Score',        type: 'number', bulkGroup: 'RAG & Health' },
  { key: 'stickiness_score',      label: 'Stickiness Score',      type: 'number', bulkGroup: 'RAG & Health' },
  { key: 'adoption_rate',         label: 'Adoption Rate',         type: 'number', bulkGroup: 'RAG & Health' },
  { key: 'grr',                   label: 'GRR',                   type: 'number', bulkGroup: 'Churn & Risk' },
  { key: 'nps',                   label: 'NPS',                   type: 'number', bulkGroup: 'Churn & Risk' },
  { key: 'implementation_status', label: 'Implementation Status', type: 'select', ddKey: 'implementation_status', opts: ['Not Started','In Progress','Completed','On Hold'], bulkGroup: 'Implementation' },
  { key: 'implementation_type',   label: 'Implementation Type',   type: 'text', bulkGroup: 'Implementation' },
  { key: 'ps_engagement',         label: 'PS Engagement',         type: 'select', opts: ['Yes','No'], bulkGroup: 'Implementation' },
  { key: 'account_understanding_session', label: 'Account Understanding Session', type: 'select', opts: ['Yes','No'], bulkGroup: 'Ring Fence' },
  { key: 'new_csm_intro_done',            label: 'New CSM Intro Done',            type: 'select', opts: ['Yes','No'], bulkGroup: 'Ring Fence' },
  { key: 'csm_escalation_matrix_shared',  label: 'CSM Escalation Matrix Shared',  type: 'select', opts: ['Yes','No'], bulkGroup: 'Ring Fence' },
  { key: 'ring_fence_meeting_initiated',  label: 'Ring Fence Meeting Initiated',  type: 'select', opts: ['Yes','No'], bulkGroup: 'Ring Fence' },
  { key: 'meeting_planned_date',  label: 'Meeting Planned Date',  type: 'date', bulkGroup: 'Ring Fence' },
  { key: 'meeting_done',          label: 'Meeting Done',          type: 'select', opts: ['Yes','No'], bulkGroup: 'Ring Fence' },
  { key: 'issue_mapping_sheet_updated',   label: 'Issue Mapping Sheet Updated',   type: 'select', opts: ['Yes','No'], bulkGroup: 'Ring Fence' },
  { key: 'review_cadence_alignment',      label: 'Review Cadence Alignment',      type: 'select', opts: ['Yes','No'], bulkGroup: 'Ring Fence' },
  { key: 'poc1_name',             label: 'POC 1 Name',            type: 'text' },
  { key: 'poc1_email',            label: 'POC 1 Email',           type: 'text' },
  { key: 'poc2_name',             label: 'POC 2 Name',            type: 'text' },
  { key: 'poc2_email',            label: 'POC 2 Email',           type: 'text' },
];

const MONTH_OPTS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ISSUE_TYPE_OPTS = ['Configuration Failures','PS','Reports & Dashboards','Integration Failures','Platform Issue','Misc','Support'];

export const ESCALATION_FIELDS = [
  { key: 'account_name',         label: 'Account',              type: 'text' },
  { key: 'rag_status',           label: 'RAG',                  type: 'select', opts: ['Green','Amber','Red'] },
  { key: 'tenant_id',            label: 'Tenant ID',            type: 'text' },
  { key: 'date_of_escalation',   label: 'Date',                 type: 'date' },
  { key: 'month',                label: 'Month',                type: 'select', opts: MONTH_OPTS, bulkGroup: 'Classification' },
  { key: 'description',          label: 'Description',          type: 'text' },
  { key: 'action_taken',         label: 'Action Taken',         type: 'text', bulkGroup: 'Status & Resolution' },
  { key: 'status',               label: 'Status',               type: 'select', ddKey: 'escalation_status', opts: ['Open','In Progress','Partly Resolved','Resolved'], bulkGroup: 'Status & Resolution' },
  { key: 'csm',                  label: 'CSM',                  type: 'select', filtersKey: 'csms' },
  { key: 'ownership',            label: 'Ownership',            type: 'select', ddKey: 'ownership', bulkGroup: 'Assignment' },
  { key: 'eta',                  label: 'ETA',                  type: 'date', bulkGroup: 'Status & Resolution' },
  { key: 'email_subject',        label: 'Email Subject',        type: 'text' },
  { key: 'ps_leader',            label: 'PS Leader',            type: 'select', ddKey: 'ps_leader', bulkGroup: 'Assignment' },
  { key: 'escalated_by',         label: 'Escalated By',         type: 'select', ddKey: 'escalated_by', bulkGroup: 'Assignment' },
  { key: 'trigger_reason',       label: 'Trigger Reason',       type: 'select', ddKey: 'trigger_reason', bulkGroup: 'Classification' },
  { key: 'source_of_escalation', label: 'Source of Escalation', type: 'select', ddKey: 'source_of_escalation', bulkGroup: 'Classification' },
  { key: 'issue_type',           label: 'Issue Type',           type: 'select', ddKey: 'issue_type', opts: ISSUE_TYPE_OPTS, bulkGroup: 'Classification' },
  { key: 'issue_sub_type',       label: 'Issue Sub-Type',       type: 'text', bulkGroup: 'Classification' },
];

export const ISSUE_FIELDS = [
  { key: 'account_name',   label: 'Account',        type: 'text' },
  { key: 'tenant_id',      label: 'Tenant ID',      type: 'text' },
  { key: 'priority',       label: 'Priority',       type: 'select', opts: ['P0','P1','P2','P3'], bulkGroup: 'Status & Priority' },
  { key: 'description',    label: 'Description',    type: 'text' },
  { key: 'issue_type',     label: 'Issue Type',     type: 'select', ddKey: 'issue_type', opts: ISSUE_TYPE_OPTS, bulkGroup: 'Classification' },
  { key: 'issue_sub_type', label: 'Issue Sub-Type', type: 'text', bulkGroup: 'Classification' },
  { key: 'owner_team',     label: 'Owner',          type: 'select', filtersKey: 'ownerTeams', bulkGroup: 'Assignment' },
  { key: 'status',         label: 'Status',         type: 'select', opts: ['Open','In Progress','Deferred','Resolved','Closed'], bulkGroup: 'Status & Priority' },
  { key: 'reported_date',  label: 'Reported',       type: 'date' },
  { key: 'closure_date',   label: 'Closure Date',   type: 'text', bulkGroup: 'Notes' },
  { key: 'csm',            label: 'CSM',            type: 'select', filtersKey: 'csms', bulkGroup: 'Assignment' },
  { key: 'csm_lead',       label: 'CSM Lead',       type: 'text', bulkGroup: 'Assignment' },
  { key: 'support_ticket', label: 'Support Ticket', type: 'number' },
  { key: 'dev_ticket',     label: 'Dev Ticket',     type: 'number' },
  { key: 'next_steps',     label: 'Next Steps',     type: 'text', bulkGroup: 'Notes' },
];

export const TASK_FIELDS = [
  { key: 'task_subject',     label: 'Subject',      type: 'text' },
  { key: 'task_description', label: 'Description',  type: 'text' },
  { key: 'nature_of_task',   label: 'Nature',       type: 'text' },
  { key: 'account_name',     label: 'Account',      type: 'text' },
  { key: 'assigned_to',      label: 'Assigned To',  type: 'text' },
  { key: 'assigned_by',      label: 'Assigned By',  type: 'text' },
  { key: 'due_date',         label: 'Due',          type: 'date' },
  { key: 'derived_status',   label: 'Status',       type: 'select', opts: ['Open','Overdue','Completed'] },
  { key: 'completed_at',     label: 'Completed At', type: 'date' },
];

export const FEATURE_REQUEST_FIELDS = [
  { key: 'title',                 label: 'Title',                 type: 'text' },
  { key: 'description',           label: 'Description',           type: 'text' },
  { key: 'related_to',            label: 'Related To',            type: 'text' },
  { key: 'priority',              label: 'Priority',              type: 'select', opts: ['High','Medium','Low'] },
  { key: 'expected_rollout_date', label: 'Expected Rollout Date', type: 'date' },
  { key: 'status',                label: 'Status',                type: 'text' },
  { key: 'created_by',            label: 'Created By',            type: 'text' },
  { key: 'approved_by',           label: 'Approved By',           type: 'text' },
];

export const FIELD_CATALOG = {
  accounts:         { label: 'Accounts',         fields: ACCOUNT_FIELDS },
  escalations:      { label: 'Escalations',      fields: ESCALATION_FIELDS },
  issues:           { label: 'Issues',           fields: ISSUE_FIELDS },
  tasks:            { label: 'Tasks',            fields: TASK_FIELDS },
  feature_requests: { label: 'Feature Requests', fields: FEATURE_REQUEST_FIELDS },
};

// Resolve a catalog entry to a concrete filter fieldDef:
//   dynamicOpts(field) → array | undefined  (page supplies live options for
//   filtersKey/ddKey fields); falls back to the static opts list.
export function toFieldDef(f, dynamicOpts) {
  if (f.type !== 'select') return f;
  const dyn = dynamicOpts ? dynamicOpts(f) : undefined;
  return { ...f, opts: (dyn && dyn.length ? dyn : f.opts) || [] };
}

// Bulk-update field list: every catalog field tagged with bulkGroup, options
// resolved the same way as filters, stably sorted so groups stay contiguous
// in the field picker.
export function toBulkFieldDefs(fields, dynamicOpts) {
  const defs = fields
    .filter(f => f.bulkGroup)
    .map(f => ({ ...toFieldDef(f, dynamicOpts), group: f.bulkGroup }));
  const groupOrder = [...new Set(defs.map(d => d.group))];
  return defs.sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group));
}
