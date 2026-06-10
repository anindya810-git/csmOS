-- Escalations table creation and seed data
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.escalations (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT REFERENCES public.accounts(id) ON DELETE SET NULL,
  tenant_id TEXT,
  account_name TEXT,
  date_of_escalation DATE,
  month TEXT,
  description TEXT,
  action_taken TEXT,
  ownership TEXT,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Partly Resolved', 'Resolved')),
  csm TEXT,
  eta TEXT,
  email_subject TEXT,
  ps_leader TEXT,
  escalated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalations_account_id ON public.escalations(account_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON public.escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_csm ON public.escalations(csm);

-- Seed data (37 escalation records)
INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '75128%' LIMIT 1),
  '75128',
  'Manipal',
  '2026-04-23',
  'April',
  'KPI Dashboard Requirement taken but not delivered',
  'Met Cx multiple times, aligned PS + Product Team to resolve it on priority',
  'CSM + PS',
  'Resolved',
  'Amarjeet Ghatak',
  '14/5/2026',
  NULL,
  'Hirak',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '68986%' LIMIT 1),
  '68986',
  'Be10x / Mad About Sports',
  '2026-04-18',
  'April',
  'Chatbot + UDS was failing',
  'Running War room with PS + Product + Visiting Cx in person + regular cadence, and now the product changes is in Progress, ETA provided to the Cx. + Pitched CloneDB for different Cx Use cases + Reimplementation in the talks',
  'Product',
  'In Progress',
  'Amarjeet Ghatak',
  '4/6/26',
  NULL,
  'Hirak',
  'CSM'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '78213%' LIMIT 1),
  '78213',
  'Tutopia',
  '2026-04-17',
  'April',
  'Implementation Issues + Adoption of CRM Issue',
  'In person meeting with the Cx + Changes in Implementation and configuration and changes are being done.',
  'CSM + PS',
  'In Progress',
  'Amarjeet Ghatak',
  '12/6/26',
  NULL,
  'Hirak',
  'CSM'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '62253%' LIMIT 1),
  '62253',
  'International Tractors Limited',
  '2026-05-23',
  'May',
  'Customer never approves efforts; Large forms for field sales agents; TMS<>LSQ Integration gaps; Mobile Dashboards pending on reports team; less issue resolution due to absence of efforts; Solis Tractor (international brand) In-house CRM developed',
  'Working with Mckinsey team (their consultants) to increase stickiness on LSQ; Working with their marketing team to start WA campaigning on LSQ; Working with Sonalika''s call centre head to deliver them reports; Working with them on new Lead Scoring Model; Working with customer SPOC and PS to shorten the forms for field agents to increase stickiness; Nudged customer multiple times to approve PS efforts; Consolidated and started working as per tracker',
  'PS + CSM + Support',
  'In Progress',
  'Bhoomit Ahlawat',
  '12/5/26',
  NULL,
  'Hirak',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '48992%' LIMIT 1),
  '48992',
  'Amity Noida',
  '2026-04-23',
  'April',
  'Multiple critical issues reported in LSQ, including lead stage discrepancies, missing opportunities, lead capture failures, OTP verification errors, and incorrect mobile number overwrites impacting data integrity and user operations.',
  'Lead capture, Lead stage, Missing opportunity, OTP issues occurred due to lapp failures. We have deployed the lapp with new updated settings and same has been tested by client and feedback is positive. For Incorrect phone number issue intermittent fix deployed, permanent fix will be deployed by 15th May.',
  'PS DEV + Product + CSM',
  'Partly Resolved',
  'Abhishek Bhargav',
  NULL,
  'Urgent : Multiple Critical Issues in LSQ - Immediate Action Required',
  'Hirak',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '79205%' LIMIT 1),
  '79205',
  'upGradSOT',
  '2026-04-14',
  'April',
  'Publisher Lead Sync issue due to incorrect source & Publisher API (Capture API was provided); Delay in providing updates on CR.',
  'Collected missing leads from Cx and worked with Product team to sync the leads into Publisher Panel. Worked with PS to fasttrack the CR and deliver. Currently pending OF signing by customer, as of 7-May-2026.',
  'Support + Engg + PS + CSM',
  'Resolved',
  'Abhishek Reddy',
  '5-May-26',
  NULL,
  'Hirak',
  'Nilesh'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '71625%' LIMIT 1),
  '71625',
  'Dayananda Sagar University',
  '2026-04-23',
  'April',
  'Discrepancy in Publisher Lead Count - CollegeHai',
  'Worked with Support and Product to sync the missing leads. Informed Cx on email on 6-May.',
  'Support + Engg + PS + CSM',
  'Resolved',
  'Abhishek Reddy',
  '6-May-26',
  NULL,
  'Ambrish',
  'Vivek'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '64107%' LIMIT 1),
  '64107',
  'Housing.com (Locon)',
  '2026-04-15',
  'April',
  'Active Ring Fence / churn-risk account. Customer sentiment turned negative ahead of renewal due to a coalition of unresolved issues: reports committed at onboarding still not delivered; FSC batch job scheduled for 4 AM ran at 4 PM with no alerting; account-owner sync mismatch between Housing''s CRM (Lookup) and LSQ; LSQ-Lookup integration unstable (iframe failures, city/UUID/OwnerID sync). Customer formally demanded a BRD audit and has stopped sharing new requirements.',
  'Raised Housing.com as a formal Ring Fence escalation to leadership (Hirak). Escalated Account Owner Mismatch (LSQ-Lookup) as P0. Delivered FSE Reimbursement Report and Sales Connect V2 Report. Replaced previous DRM with senior PS SPOC (Preran + Sandeep); DRM agenda redesigned. Stood up a war room with weekly cadence; initiated full wishlist/BRD audit. Identified 400+ user DIY Business Onboarding opportunity.',
  'CSM + PS',
  'Partly Resolved',
  'Bhoomit Ahlawat',
  '4/6/26',
  NULL,
  'Ambrish',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '79190%' LIMIT 1),
  '79190',
  'Rainbow Hospitals',
  '2026-04-30',
  'April',
  'Multiple issues raised: 1. Data sync 2. Calling 3. Distribution not working for unit spoc 4. Website integration 5. Unit level data visibility',
  'For now FB data is getting sync correctly. Ozonetel integration is working now.',
  'PS - bhavayata',
  'Partly Resolved',
  'Abhishek Bhargav',
  NULL,
  '[#1884395] RE: Leads Not Syncing in LSQ',
  'Hirak',
  'Nilesh'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '48992%' LIMIT 1),
  '48992',
  'Amity Noida',
  '2026-04-24',
  'April',
  'TAM feedback and multiple issues going on with lapp, LPP and Data sync',
  'For now all the lapp issues sorted, LPP permanent fix deployed.',
  NULL,
  'Resolved',
  'Abhishek Bhargav',
  NULL,
  'Urgent: Unacceptable Delay in Providing Renewal Data - Immediate Action Required',
  'Ambrish',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '79205%' LIMIT 1),
  '79205',
  'upGrad',
  '2026-04-14',
  'April',
  'MoM | LSQ Publisher Panel - Lead Visibility Issue',
  'Migrated to new publisher and issue resolved now.',
  NULL,
  'Resolved',
  'Abhishek Bhargav',
  NULL,
  'Re: Onboarding Discussion',
  'Hirak',
  'Vivek'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '62253%' LIMIT 1),
  '62253',
  'Sonalika',
  '2026-05-23',
  'May',
  'McKinsey-recommended integration scope to be finalised across Gupshup UDS, WhatsApp Connector, FB Conversion, Google AdWords and Lead Capture API. Underlying account risk: man-days approval blocked for over a year with no Sales-led closure, large field-sales forms reducing adoption, TMS-LSQ integration gaps, and Mobile Dashboards pending on Reports team - Solis in-house CRM posing stickiness risk.',
  'Aligned final scope and ownership with Solutions (Akshat); consolidated LSQ effort at 7 man-days across five workstreams. Shared scope+ownership on the customer thread and a separate effort/commercial-approval ask to Piyush. Drove EVPS CR for bulk lead deletion and dedupe. Stickiness program with McKinsey in motion: WhatsApp campaigning, call-centre weekly-review reports, Invorto AI for less-interested bucket, new Lead Scoring model. Nudged customer repeatedly for man-days approval.',
  'PS + CSM + Support',
  'In Progress',
  'Bhoomit Ahlawat',
  'Waiting on Efforts Approval from CP',
  NULL,
  'Hirak',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '23400%' LIMIT 1),
  '23400',
  'Amity C6',
  '2026-04-01',
  'April',
  'Project delivery timelines escalation from client',
  'The updated timelines shared with the client in April and delivered as per the timelines. The basic setup has been given to client.',
  'PS',
  'Resolved',
  'Abhishek Bhargav',
  NULL,
  NULL,
  'Hirak',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '57771%' LIMIT 1),
  '57771',
  'Greenply',
  '2026-05-07',
  'May',
  'New tenant (object-based) delivered and ready from LSQ since 20 March 2026 but go-live has stalled. Leadership transitions (new CIO, new PLY and MDF sales leadership) have held up business approval to nominate power users, and the customer''s own SAP changes are pending. UAT has not been initiated across MDF / PLY / KAT / B2B.',
  'Documented on email to senior leadership (Rajesh Sahay) that the new tenant has been ready since 20 March and that LSQ has been following up over several weeks for power users. Requested three specific commitments: business approval to involve power users, power-user nominees from each BU, and a committed UAT kick-off timeline. Running a war room with PS, PS Dev, Reports and Support. Escalated for Vivek to meet Greenply stakeholders to unblock go-live.',
  'PS + CSM',
  'In Progress',
  'Bhoomit Ahlawat',
  'Pending on Customer to give Power Users',
  NULL,
  'Hirak',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '41989%' LIMIT 1),
  '41989',
  'CK Birla',
  '2026-05-22',
  'May',
  'Delay in facebook lead sync. Impact was for 2 days 20th & 21st. Customer escalated because we were not able to share RCS. Reason given by support and dev: customer updated fb form and post updations, logs are not available at our end for analysis.',
  'PS & CSM monitoring lead sync everyday for all the active facebook campaign form. Also a smart view created for them for new created lead from facebook and revisited leads. Customer sharing D-1 data from facebook and we are reconciling it on LSQ. No Discrepancy/delay lead sync reported so far.',
  'Support + Engg + PS + CSM',
  'Resolved',
  'Poorva Pandya',
  '22-May-26',
  '[#1895359] Slowness with LeadSquared',
  'Hirak',
  'CSM'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '55%' LIMIT 1),
  '55',
  'Toprankers',
  '2026-05-25',
  'May',
  'Multiple open items tracked across LAPP integration, Student ID generation, telephony, automation, and activity management. Most issues have identified workarounds or are under review with respective teams.',
  'Connected with the client and discussed all the issues. Himanshu Thakur from PS discussed all the issues in details.',
  'CSM + PS + Support',
  'In Progress',
  'Abhishek Bhargav',
  NULL,
  'Re: Urgent: Recurring LSQ Issues Need Immediate Resolution',
  'Hirak',
  'Prashant'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '62528%' LIMIT 1),
  '62528',
  'Hindware',
  '2026-05-13',
  'May',
  'Customer requested data related to user login, ticket history, list of all SKU''s which are part of agreement. They needed this data to close the overdue renewal. CSM was occupied in workshop, asked to connect with CP. Cx did not get the satisfactory response and escalated.',
  'Requested data has been shared.',
  'CSM + CP',
  'Resolved',
  'Poorva Pandya',
  NULL,
  NULL,
  'Hirak',
  'CSM'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '76287%' LIMIT 1),
  '76287',
  'Prism Johnson',
  '2026-05-07',
  'May',
  'Retailer onboarding delayed by unresolved dealer onboarding issues and an incorrect approval flow (approvals routed to the wrong approver). PAN showing as duplicate during form fill despite not existing in system; district values not fetching based on state code. Customer pushing on go-live and flagging scope still pending against the original commitment.',
  'Reframed dealer onboarding issues as resolvable process items; pushed customer to confirm formal initiation and commit a go-live date. Sukant (PS) aligned to drive resolution timelines. Retailer Onboarding BRD signed off during 19-20 May F2F with dev target 8 June. PAN-duplicate and state-code/district form issues raised as P0 support tickets. Running war room with PS, PS Dev, Reports and Support.',
  'PS + CSM',
  'Resolved',
  'Bhoomit Ahlawat',
  NULL,
  NULL,
  'Hirak',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '52908%' LIMIT 1),
  '52908',
  'Alliance Infra (Urbanrise)',
  '2026-05-30',
  'May',
  'Post Sierra-migration system-report defects raised by customer (Gayathri), impacting weekly management reporting: Lead Field Audit Report missing Phone/Lead Number and hyperlink; Lead Ownership Audit Report mislabels Created Date vs the relevant Activity/Modified date; Lead Distribution Analysis export converts columns to rows on multi-page and numbers mismatch UI vs Excel; No Task Report missing across tenants post-migration.',
  'Documented every issue with tenant mapping (52908/76483/5529/5526), separating system-report constraints from actionable items with owners and ETAs. Locked a customer + PS + CSM review; updated Lead Field Audit and Lead Ownership reports shared with customer; Lead Distribution export columns-to-rows raised as a product ticket; No Task Report replication scoped. Sierra training for stakeholders planned. Stood up Engineering+Support war room.',
  'CSM + PS',
  'Partly Resolved',
  'Bhoomit Ahlawat',
  '1/6/26',
  NULL,
  'Ambrish',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '72117%' LIMIT 1),
  '72117',
  'Sleep Company',
  '2026-05-08',
  'May',
  'Customer has reported multiple times that they are experiencing slowness/downtime in LSQ. Support tickets raised: 1894635, 1895359, 1888765, 1893089, 1899886.',
  'Engineering and Infrastructure teams immediately investigated the issue and performed the necessary corrective actions to restore the affected services. The services are now stable and functioning as expected. The issue has been addressed from the backend, and the concerned teams are continuously monitoring the services.',
  'CSM + Engg + Support',
  'Resolved',
  'Nikhil Chand',
  NULL,
  NULL,
  'Hirak',
  'CSM'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '60847%' LIMIT 1),
  '60847',
  'Bajaj ACE Reports',
  '2025-10-18',
  'October',
  'Job failures due to spot instance evictions. Pipeline compute was running on AWS EC2 Spot instances, which AWS can reclaim. Jobs had no checkpointing or graceful failover, so any reclaim mid-execution caused a full job failure.',
  'Migrated pipeline compute from Spot to stable on-demand instances - permanent infrastructure change.',
  'CSM + PS + Engg',
  'Resolved',
  'Nikhil Chand',
  NULL,
  'Re: Escalation: Delays & Challenges from LS Team in Netcore CRM Integration',
  'Hirak',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '60847%' LIMIT 1),
  '60847',
  'Bajaj ACE Reports',
  '2026-03-15',
  'March',
  'Job failures due to database query timeouts. Sub-goal count for the template increased from 799 to 3,041, driving a large jump in data volume the job had to write. As a result, queries exceeded the configured timeout and were killed before completion, causing the write step to fail and the job to fail overall.',
  'Increased the query timeout parameter in job configuration. Scaled RDS from medium to large. Monitored subsequent runs to confirm stability.',
  'CSM + PS + Engg',
  'Resolved',
  'Nikhil Chand',
  NULL,
  'Bajaj ACE (Experience)',
  'Hirak',
  'Vivek'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '60847%' LIMIT 1),
  '60847',
  'Bajaj ACE Reports',
  '2026-03-15',
  'March',
  'SLA breach - processing exceeding 9 PM delivery window. A new template (Retail_MC_Clone 12002) was onboarded with 11,000+ sub-goals. The legacy export job processed sub-goals sequentially in a for-loop on Airflow/RDS (DB-bound), so runtime grew non-linearly with sub-goal count and consistently breached the 9 PM SLA.',
  'Short-term: SLA window extended from 9 PM to 11 PM; RDS scaled. Long-term: re-engineered the export job to a parallel processing architecture, reducing end-to-end runtime by approximately 73% (from roughly three hours to approximately forty minutes). Jobs now completing by 10 PM.',
  'CSM + PS + Engg',
  'Resolved',
  'Nikhil Chand',
  NULL,
  'Bajaj ACE (Experience)',
  'Hirak',
  'CSM'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '60847%' LIMIT 1),
  '60847',
  'Bajaj ACE Reports',
  '2026-05-20',
  'May',
  'Template update not reflecting in UI. Upstream schema change in an upstream platform attribute - Enquiry score column type changed from double to int. This broke the template update job''s write step, so updated template data was never persisted to the table backing the UI and stale data continued to display.',
  'Schema change was fixed and pipeline was re-run. Issue confirmed resolved; RCA closed - root cause was a schema change only.',
  'CSM + PS + Engg',
  'Resolved',
  'Nikhil Chand',
  NULL,
  'Leadsquared Enhancements Requirement',
  'Hirak',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '54598%' LIMIT 1),
  '54598',
  'Jaro',
  '2026-05-18',
  'May',
  'Cx raised concerns over ongoing delays and challenges they have been facing with the LS for Netcore integration project. The project began in October, and despite investing significant time and effort from all stakeholders, they are still unable to complete the end-to-end integration successfully. Observed challenges include: Lack of clarity during initial implementation phase; Significant time spent on repeated discussions and trial-and-error approaches; Multiple re-implementations due to failures or limitations in previously suggested methods; Delays caused by cost-related dependencies and approach changes during critical stages.',
  'A call was pre-scheduled between Netcore, Jaro, LSQ to streamline the process on 19th May. The previous integration went live on 22nd April and testing was successful. When integration worked on live data, API rate limit errors were observed. To solve this, cloneDB approach was used where a user was created for Netcore and queries were shared with Netcore team.',
  'CSM + Engg + PS',
  'Partly Resolved',
  'Nikhil Chand',
  '5/6/26',
  'Introduction & LSQ Collaboration Discussion',
  'Hirak',
  'Prashant'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '63859%' LIMIT 1),
  '63859',
  'IIDE',
  '2026-05-07',
  'May',
  'During Renewal in 2025, Cx was promised AI features demo and adoption as well as account audit from PS. But these were not delivered. Lead propensity was parked by product. Invorto and Zip Teams demo did not happen formally.',
  'Demo for Invorto and Zip Teams was given to Cx on 29th May. PS audit is raised to Harshit. ETA to be received yet.',
  'CSM + CP + PS',
  'Partly Resolved',
  'Nikhil Chand',
  NULL,
  'Critical Client Escalation - Urgent Intervention Required on Support Experience & TAM Concern',
  'Hirak',
  'CSM'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '63074%' LIMIT 1),
  '63074',
  'Infinity Learn',
  '2026-05-20',
  'May',
  'There was global mobile login, checkin-checkout and usage issue on 19th May which impacted Infinity Learn as well. The Cx also faced downtime in May twice.',
  'Engineering and Infrastructure teams immediately investigated the issue and performed the necessary corrective actions to restore the affected services. The services are now stable and functioning as expected. The issue has been addressed from the backend, and the concerned teams are continuously monitoring the services.',
  'CSM + Engg + Support',
  'Resolved',
  'Nikhil Chand',
  NULL,
  'MoM | LSQ Publisher Panel - Lead Visibility Issue & Action Plan',
  'Hirak',
  'CSM'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '79205%' LIMIT 1),
  '79205',
  'upGrad',
  '2026-05-04',
  'May',
  'New change request has been shared and got delayed.',
  'For now this is implemented and made live.',
  'PS + CSM',
  'Resolved',
  'Abhishek Bhargav',
  NULL,
  NULL,
  'Hirak',
  'Nilesh'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '123%' LIMIT 1),
  '123',
  'Topranker',
  '2026-04-07',
  'April',
  'Feature request for landing page usage in walk-in centers. App changes; issue frequency reduced, but app failures and data mismatches still need correction. Automation setup issues causing student referral pass values to be captured incorrectly. Database size concerns requiring manual cleanup; reports occasionally fail to sync/open. Integration configuration completed, but one template with multiple variables is still causing issues. Call logs are not visible due to an API error from Exotel.',
  'Feature request raised. Lapp failure frequency reduced with recent changes, still need more correction. Automation setup logic not implemented correctly - workaround shared with client. Manual deletion request raised to dev team. Template issue needs to be checked with Gupshup team.',
  'CSM + Support',
  'In Progress',
  'Abhishek Bhargav',
  NULL,
  'Ongoing concerns in topranker',
  'Hirak',
  'CSM'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '78694%' LIMIT 1),
  '78694',
  'CK Birla Hospital',
  '2026-05-04',
  'May',
  'Delay in report and dashboard delivery. This is new tenant, under implementation.',
  'P0 reports delivered on next day. For other reports ETA was for 3 working days. Now reports are delivered. Will get go live by 4th June.',
  'PS + CSM',
  'Resolved',
  'Poorva Pandya',
  '9/5/26',
  '[#1893613] Re: LinkedIn Connector Issue',
  'Hirak',
  'Vivek'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '55343%' LIMIT 1),
  '55343',
  'Lakshya',
  '2026-05-12',
  'May',
  'LinkedIn connector issue.',
  'The issue was with the mapping of the fields at LSQ connector. Connected with product team and mapping corrected. Issue resolved now.',
  'Support + CSM',
  'Resolved',
  'Abhishek Bhargav',
  NULL,
  'Urgent - Project Status',
  'Hirak',
  'CSM'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '52010%' LIMIT 1),
  '52010',
  'Pagarbook',
  '2026-06-05',
  'May',
  'Cx has requested to include Zipteams of approximately 2 lakhs in the pricing or MRR. However, this has been rejected by the Sales team, creating dissatisfaction and making the account a potential churn risk. Additionally, the customer has exported leads multiple times over the last week, which may indicate churn intent. The customer had also reported a slowness issue earlier.',
  'The pricing request has been reviewed with Sales, and their rejection has been noted. The slowness issue reported by the customer has been resolved. Lead export activity has been identified as a churn signal, and the account should be closely monitored with proactive engagement to mitigate churn risk.',
  'Sales + CSM',
  'Resolved',
  'Amarjeet Ghatak',
  '6/5/26',
  'Leadsquared is very very slow',
  'Hirak',
  'CSM'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '71625%' LIMIT 1),
  '71625',
  'DSU',
  '2026-05-21',
  'May',
  'DDC connector is not working as expected, lead fields have the data still not getting added in the Document.',
  'The application generated through document designer not picking the data on the Document designer. Solution to be provided by the product on this. For now wait card needs to be implemented.',
  'Support + Product + CSM',
  'Partly Resolved',
  'Abhishek Bhargav',
  NULL,
  '[#1903398] Applicant Name, Parent Name, Declaration Date is blank In Application PDF',
  'Ambrish',
  'Vivek'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '76244%' LIMIT 1),
  '76244',
  'Physics Wallah Pvt. Ltd.',
  '2026-05-05',
  'May',
  'Data Purge Issue which was impacting Cx sentiments and was hitting the billing process as well. Out of 27.23 crore total records consuming 4,269 GB, about 23.98 crore records (~88%) will be deleted, freeing up 3,338 GB. The database will shrink to ~931 GB post-purge.',
  'A one-time + ongoing data purge plan for Physics Wallah''s LSQ instance to reclaim storage across 4 entity types. Billing protection - Storage pending deletion will not be charged. Top concern flagged - Audit log retention is being reduced to 30 days, but WON opportunities are retained for 365 days. Running war room with PS, Engg and Support to monitor purge execution.',
  'Support + Engg + PS + CSM',
  'Resolved',
  'Vaibhav Bali',
  '21-May-26',
  'Minutes of meeting - PhysicsWallah Purging - Internal Connect',
  'Ambrish',
  'Vivek / Pritam'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  NULL,
  NULL,
  'Care Hospital',
  '2026-05-13',
  'May',
  'The customer (CARE Hospitals) reported that APIs were not working, specifically: Specialty and doctors data were not loading. This was impacting their call centre operations and marked as urgent/critical.',
  'API parameters were updated and corrected by PS.',
  'CSM + PS',
  'Resolved',
  'Vaibhav Bali',
  NULL,
  '[#1898326] (No Subject)',
  'Hirak',
  'CSM'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  NULL,
  NULL,
  'Manipal Hospitals',
  '2026-06-04',
  'June',
  'This escalation was comprised of several delays specifically from the dev team and responses from Support team.',
  'We introduced an escalation matrix for the support team till Udit. Also informed that for support tickets which are logged and waiting on dev team, there is a specific dev SPOC who would be picking Support tickets from Manipal on priority.',
  'Support + CSM',
  'Resolved',
  'Amarjeet Ghatak',
  '5/6/26',
  'Re:[## 1710281 ##] Re: users Unable to access Opportunities',
  'Hirak',
  'Prashant'
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '71625%' LIMIT 1),
  '71625',
  'Dayanand Sagar University',
  '2026-06-04',
  'June',
  'The Customer was not able to access the MS due to that they were not able to add the email credits eventually hampered the Email communications.',
  'We have connected with Billings team on priority and added the FOC email credits to unblock the client. The MS has been enabled however as it took 24 hours to be visible at the client end, we added the FOC emails. Separate OF for these emails has been sent to client.',
  'CSM + Billings',
  'Resolved',
  'Abhishek Bhargav',
  '4/6/26',
  '[#1911809] Subscription access to 66450',
  'Ambrish',
  'CSM'
);

