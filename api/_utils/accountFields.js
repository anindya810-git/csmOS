// Account fields writable via POST /api/accounts and PUT /api/accounts/:id.
// Shared by the UI and the open REST API.
export const ACCOUNT_EDITABLE_FIELDS = [
  'account_name','tenant_id','industry','mrr_tier','mrr','region','csm_lead','csm',
  'closure_eta','cp','tam_assigned','billing_frequency','renewal_date','renewal_status',
  'churn_status','churn_reason','renewal_comments','implementation_status','implementation_type',
  'ps_engagement','ps_solutioning','account_understanding_session','new_csm_intro_done',
  'csm_escalation_matrix_shared','ring_fence_meeting_initiated','meeting_planned_date',
  'meeting_done','issue_mapping_sheet_updated','review_cadence_alignment',
  'adoption_score','stickiness_score','rag_status','rag_reason','actions_taken',
  'contraction_risk','churn_risk','grr','nps','adoption_rate','sa_status','golive_date',
  'poc1_name','poc1_email','poc1_phone','poc1_designation',
  'poc2_name','poc2_email','poc2_phone','poc2_designation',
  'poc3_name','poc3_email','poc3_phone','poc3_designation',
];
