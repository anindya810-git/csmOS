-- Escalations table creation and seed data
-- Run this in a fresh Supabase SQL Editor tab

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
  $$E1$$75128$$E1$$,
  $$E1$$Manipal$$E1$$,
  '2026-04-23',
  $$E1$$April$$E1$$,
  $$E1$$KPI Dashboard Requirement taken but not delivered$$E1$$,
  $$E1$$Met Cx multiple times, aligned PS + Product Team to resolve it on priority$$E1$$,
  $$E1$$CSM + PS$$E1$$,
  $$E1$$Resolved$$E1$$,
  $$E1$$Amarjeet Ghatak$$E1$$,
  $$E1$$14/5/2026$$E1$$,
  NULL,
  $$E1$$Hirak$$E1$$,
  $$E1$$Vivek / Pritam$$E1$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '68986%' LIMIT 1),
  $$E2$$68986$$E2$$,
  $$E2$$Be10x / Mad About Sports$$E2$$,
  '2026-04-18',
  $$E2$$April$$E2$$,
  $$E2$$Chatbot + UDS was failing$$E2$$,
  $$E2$$Running War room with PS + Product + Visiting Cx in person + regular cadence, and now the product changes is in Progress, ETA provided to the Cx. Pitched CloneDB for different Cx Use cases + Reimplementation in the talks$$E2$$,
  $$E2$$Product$$E2$$,
  $$E2$$In Progress$$E2$$,
  $$E2$$Amarjeet Ghatak$$E2$$,
  $$E2$$4/6/26$$E2$$,
  NULL,
  $$E2$$Hirak$$E2$$,
  $$E2$$CSM$$E2$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '78213%' LIMIT 1),
  $$E3$$78213$$E3$$,
  $$E3$$Tutopia$$E3$$,
  '2026-04-17',
  $$E3$$April$$E3$$,
  $$E3$$Implementation Issues + Adoption of CRM Issue$$E3$$,
  $$E3$$In person meeting with the Cx + Changes in Implementation and configuration and changes are being done.$$E3$$,
  $$E3$$CSM + PS$$E3$$,
  $$E3$$In Progress$$E3$$,
  $$E3$$Amarjeet Ghatak$$E3$$,
  $$E3$$12/6/26$$E3$$,
  NULL,
  $$E3$$Hirak$$E3$$,
  $$E3$$CSM$$E3$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '62253%' LIMIT 1),
  $$E4$$62253$$E4$$,
  $$E4$$International Tractors Limited$$E4$$,
  '2026-05-23',
  $$E4$$May$$E4$$,
  $$E4$$Customer never approves efforts; Large forms for field sales agents; TMS-LSQ Integration gaps; Mobile Dashboards pending on reports team; less issue resolution due to absence of efforts; Solis Tractor (international brand) In-house CRM developed$$E4$$,
  $$E4$$Working with Mckinsey team (their consultants) to increase stickiness on LSQ; Working with their marketing team to start WA campaigning on LSQ; Working with Sonalika's call centre head to deliver them reports; Working with them on new Lead Scoring Model; Working with customer SPOC and PS to shorten the forms for field agents; Nudged customer multiple times to approve PS efforts; Consolidated and started working as per tracker$$E4$$,
  $$E4$$PS + CSM + Support$$E4$$,
  $$E4$$In Progress$$E4$$,
  $$E4$$Bhoomit Ahlawat$$E4$$,
  $$E4$$12/5/26$$E4$$,
  NULL,
  $$E4$$Hirak$$E4$$,
  $$E4$$Vivek / Pritam$$E4$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '48992%' LIMIT 1),
  $$E5$$48992$$E5$$,
  $$E5$$Amity Noida$$E5$$,
  '2026-04-23',
  $$E5$$April$$E5$$,
  $$E5$$Multiple critical issues reported in LSQ, including lead stage discrepancies, missing opportunities, lead capture failures, OTP verification errors, and incorrect mobile number overwrites impacting data integrity and user operations.$$E5$$,
  $$E5$$Lead capture, Lead stage, Missing opportunity, OTP issues occurred due to lapp failures. We have deployed the lapp with new updated settings and same has been tested by client and feedback is positive. For Incorrect phone number issue intermittent fix deployed, permanent fix will be deployed by 15th May.$$E5$$,
  $$E5$$PS DEV + Product + CSM$$E5$$,
  $$E5$$Partly Resolved$$E5$$,
  $$E5$$Abhishek Bhargav$$E5$$,
  NULL,
  $$E5$$Urgent: Multiple Critical Issues in LSQ - Immediate Action Required$$E5$$,
  $$E5$$Hirak$$E5$$,
  $$E5$$Vivek / Pritam$$E5$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '79205%' LIMIT 1),
  $$E6$$79205$$E6$$,
  $$E6$$upGradSOT$$E6$$,
  '2026-04-14',
  $$E6$$April$$E6$$,
  $$E6$$Publisher Lead Sync issue due to incorrect source and Publisher API (Capture API was provided); Delay in providing updates on CR.$$E6$$,
  $$E6$$Collected missing leads from Cx and worked with Product team to sync the leads into Publisher Panel. Worked with PS to fasttrack the CR and deliver. Currently pending OF signing by customer, as of 7-May-2026.$$E6$$,
  $$E6$$Support + Engg + PS + CSM$$E6$$,
  $$E6$$Resolved$$E6$$,
  $$E6$$Abhishek Reddy$$E6$$,
  $$E6$$5-May-26$$E6$$,
  NULL,
  $$E6$$Hirak$$E6$$,
  $$E6$$Nilesh$$E6$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '71625%' LIMIT 1),
  $$E7$$71625$$E7$$,
  $$E7$$Dayananda Sagar University$$E7$$,
  '2026-04-23',
  $$E7$$April$$E7$$,
  $$E7$$Discrepancy in Publisher Lead Count - CollegeHai$$E7$$,
  $$E7$$Worked with Support and Product to sync the missing leads. Informed Cx on email on 6-May.$$E7$$,
  $$E7$$Support + Engg + PS + CSM$$E7$$,
  $$E7$$Resolved$$E7$$,
  $$E7$$Abhishek Reddy$$E7$$,
  $$E7$$6-May-26$$E7$$,
  NULL,
  $$E7$$Ambrish$$E7$$,
  $$E7$$Vivek$$E7$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '64107%' LIMIT 1),
  $$E8$$64107$$E8$$,
  $$E8$$Housing.com (Locon)$$E8$$,
  '2026-04-15',
  $$E8$$April$$E8$$,
  $$E8$$Active Ring Fence / churn-risk account. Customer sentiment turned negative ahead of renewal due to a coalition of unresolved issues: reports committed at onboarding still not delivered; FSC batch job scheduled for 4 AM ran at 4 PM with no alerting; account-owner sync mismatch between Housing's CRM (Lookup) and LSQ; LSQ-Lookup integration unstable (iframe failures, city/UUID/OwnerID sync). Customer formally demanded a BRD audit and has stopped sharing new requirements.$$E8$$,
  $$E8$$Raised Housing.com as a formal Ring Fence escalation to leadership (Hirak). Escalated Account Owner Mismatch (LSQ-Lookup) as P0. Delivered FSE Reimbursement Report and Sales Connect V2 Report. Replaced previous DRM with senior PS SPOC (Preran + Sandeep); DRM agenda redesigned. Stood up a war room with weekly cadence; initiated full wishlist/BRD audit. Identified 400+ user DIY Business Onboarding opportunity.$$E8$$,
  $$E8$$CSM + PS$$E8$$,
  $$E8$$Partly Resolved$$E8$$,
  $$E8$$Bhoomit Ahlawat$$E8$$,
  $$E8$$4/6/26$$E8$$,
  NULL,
  $$E8$$Ambrish$$E8$$,
  $$E8$$Vivek / Pritam$$E8$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '79190%' LIMIT 1),
  $$E9$$79190$$E9$$,
  $$E9$$Rainbow Hospitals$$E9$$,
  '2026-04-30',
  $$E9$$April$$E9$$,
  $$E9$$Multiple issues raised: 1. Data sync 2. Calling 3. Distribution not working for unit spoc 4. Website integration 5. Unit level data visibility$$E9$$,
  $$E9$$For now FB data is getting sync correctly. Ozonetel integration is working now.$$E9$$,
  $$E9$$PS - bhavayata$$E9$$,
  $$E9$$Partly Resolved$$E9$$,
  $$E9$$Abhishek Bhargav$$E9$$,
  NULL,
  $$E9$$[#1884395] RE: Leads Not Syncing in LSQ$$E9$$,
  $$E9$$Hirak$$E9$$,
  $$E9$$Nilesh$$E9$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '48992%' LIMIT 1),
  $$E10$$48992$$E10$$,
  $$E10$$Amity Noida$$E10$$,
  '2026-04-24',
  $$E10$$April$$E10$$,
  $$E10$$TAM feedback and multiple issues going on with lapp, LPP and Data sync$$E10$$,
  $$E10$$For now all the lapp issues sorted, LPP permanent fix deployed.$$E10$$,
  NULL,
  $$E10$$Resolved$$E10$$,
  $$E10$$Abhishek Bhargav$$E10$$,
  NULL,
  $$E10$$Urgent: Unacceptable Delay in Providing Renewal Data - Immediate Action Required$$E10$$,
  $$E10$$Ambrish$$E10$$,
  $$E10$$Vivek / Pritam$$E10$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '79205%' LIMIT 1),
  $$E11$$79205$$E11$$,
  $$E11$$upGrad$$E11$$,
  '2026-04-14',
  $$E11$$April$$E11$$,
  $$E11$$LSQ Publisher Panel - Lead Visibility Issue$$E11$$,
  $$E11$$Migrated to new publisher and issue resolved now.$$E11$$,
  NULL,
  $$E11$$Resolved$$E11$$,
  $$E11$$Abhishek Bhargav$$E11$$,
  NULL,
  $$E11$$Re: Onboarding Discussion$$E11$$,
  $$E11$$Hirak$$E11$$,
  $$E11$$Vivek$$E11$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '62253%' LIMIT 1),
  $$E12$$62253$$E12$$,
  $$E12$$Sonalika$$E12$$,
  '2026-05-23',
  $$E12$$May$$E12$$,
  $$E12$$McKinsey-recommended integration scope to be finalised across Gupshup UDS, WhatsApp Connector, FB Conversion, Google AdWords and Lead Capture API. Underlying account risk: man-days approval blocked for over a year with no Sales-led closure, large field-sales forms reducing adoption, TMS-LSQ integration gaps, and Mobile Dashboards pending on Reports team - Solis in-house CRM posing stickiness risk.$$E12$$,
  $$E12$$Aligned final scope and ownership with Solutions (Akshat); consolidated LSQ effort at 7 man-days across five workstreams. Shared scope+ownership on the customer thread and a separate effort/commercial-approval ask to Piyush. Drove EVPS CR for bulk lead deletion and dedupe. Stickiness program with McKinsey in motion: WhatsApp campaigning, call-centre weekly-review reports, Invorto AI for less-interested bucket, new Lead Scoring model. Nudged customer repeatedly for man-days approval.$$E12$$,
  $$E12$$PS + CSM + Support$$E12$$,
  $$E12$$In Progress$$E12$$,
  $$E12$$Bhoomit Ahlawat$$E12$$,
  $$E12$$Waiting on Efforts Approval from CP$$E12$$,
  NULL,
  $$E12$$Hirak$$E12$$,
  $$E12$$Vivek / Pritam$$E12$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '23400%' LIMIT 1),
  $$E13$$23400$$E13$$,
  $$E13$$Amity C6$$E13$$,
  '2026-04-01',
  $$E13$$April$$E13$$,
  $$E13$$Project delivery timelines escalation from client$$E13$$,
  $$E13$$The updated timelines shared with the client in April and delivered as per the timelines. The basic setup has been given to client.$$E13$$,
  $$E13$$PS$$E13$$,
  $$E13$$Resolved$$E13$$,
  $$E13$$Abhishek Bhargav$$E13$$,
  NULL,
  NULL,
  $$E13$$Hirak$$E13$$,
  $$E13$$Vivek / Pritam$$E13$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '57771%' LIMIT 1),
  $$E14$$57771$$E14$$,
  $$E14$$Greenply$$E14$$,
  '2026-05-07',
  $$E14$$May$$E14$$,
  $$E14$$New tenant (object-based) delivered and ready from LSQ since 20 March 2026 but go-live has stalled. Leadership transitions (new CIO, new PLY and MDF sales leadership) have held up business approval to nominate power users, and the customer's own SAP changes are pending. UAT has not been initiated across MDF / PLY / KAT / B2B.$$E14$$,
  $$E14$$Documented on email to senior leadership (Rajesh Sahay) that the new tenant has been ready since 20 March and that LSQ has been following up over several weeks for power users. Requested three specific commitments: business approval to involve power users, power-user nominees from each BU, and a committed UAT kick-off timeline. Running a war room with PS, PS Dev, Reports and Support. Escalated for Vivek to meet Greenply stakeholders to unblock go-live.$$E14$$,
  $$E14$$PS + CSM$$E14$$,
  $$E14$$In Progress$$E14$$,
  $$E14$$Bhoomit Ahlawat$$E14$$,
  $$E14$$Pending on Customer to give Power Users$$E14$$,
  NULL,
  $$E14$$Hirak$$E14$$,
  $$E14$$Vivek / Pritam$$E14$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '41989%' LIMIT 1),
  $$E15$$41989$$E15$$,
  $$E15$$CK Birla$$E15$$,
  '2026-05-22',
  $$E15$$May$$E15$$,
  $$E15$$Delay in facebook lead sync. Impact was for 2 days 20th and 21st. Customer escalated because we were not able to share RCS. Reason given by support and dev: customer updated fb form and post updations, logs are not available at our end for analysis.$$E15$$,
  $$E15$$PS and CSM monitoring lead sync everyday for all the active facebook campaign form. Also a smart view created for them for new created lead from facebook and revisited leads. Customer sharing D-1 data from facebook and we are reconciling it on LSQ. No Discrepancy/delay lead sync reported so far.$$E15$$,
  $$E15$$Support + Engg + PS + CSM$$E15$$,
  $$E15$$Resolved$$E15$$,
  $$E15$$Poorva Pandya$$E15$$,
  $$E15$$22-May-26$$E15$$,
  $$E15$$[#1895359] Slowness with LeadSquared$$E15$$,
  $$E15$$Hirak$$E15$$,
  $$E15$$CSM$$E15$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '55%' LIMIT 1),
  $$E16$$55$$E16$$,
  $$E16$$Toprankers$$E16$$,
  '2026-05-25',
  $$E16$$May$$E16$$,
  $$E16$$Multiple open items tracked across LAPP integration, Student ID generation, telephony, automation, and activity management. Most issues have identified workarounds or are under review with respective teams.$$E16$$,
  $$E16$$Connected with the client and discussed all the issues. Himanshu Thakur from PS discussed all the issues in details.$$E16$$,
  $$E16$$CSM + PS + Support$$E16$$,
  $$E16$$In Progress$$E16$$,
  $$E16$$Abhishek Bhargav$$E16$$,
  NULL,
  $$E16$$Re: Urgent: Recurring LSQ Issues Need Immediate Resolution$$E16$$,
  $$E16$$Hirak$$E16$$,
  $$E16$$Prashant$$E16$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '62528%' LIMIT 1),
  $$E17$$62528$$E17$$,
  $$E17$$Hindware$$E17$$,
  '2026-05-13',
  $$E17$$May$$E17$$,
  $$E17$$Customer requested data related to user login, ticket history, list of all SKUs which are part of agreement. They needed this data to close the overdue renewal. CSM was occupied in workshop, asked to connect with CP. Cx did not get the satisfactory response and escalated.$$E17$$,
  $$E17$$Requested data has been shared.$$E17$$,
  $$E17$$CSM + CP$$E17$$,
  $$E17$$Resolved$$E17$$,
  $$E17$$Poorva Pandya$$E17$$,
  NULL,
  NULL,
  $$E17$$Hirak$$E17$$,
  $$E17$$CSM$$E17$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '76287%' LIMIT 1),
  $$E18$$76287$$E18$$,
  $$E18$$Prism Johnson$$E18$$,
  '2026-05-07',
  $$E18$$May$$E18$$,
  $$E18$$Retailer onboarding delayed by unresolved dealer onboarding issues and an incorrect approval flow (approvals routed to the wrong approver). PAN showing as duplicate during form fill despite not existing in system; district values not fetching based on state code. Customer pushing on go-live and flagging scope still pending against the original commitment.$$E18$$,
  $$E18$$Reframed dealer onboarding issues as resolvable process items; pushed customer to confirm formal initiation and commit a go-live date. Sukant (PS) aligned to drive resolution timelines. Retailer Onboarding BRD signed off during 19-20 May F2F with dev target 8 June. PAN-duplicate and state-code/district form issues raised as P0 support tickets. Running war room with PS, PS Dev, Reports and Support.$$E18$$,
  $$E18$$PS + CSM$$E18$$,
  $$E18$$Resolved$$E18$$,
  $$E18$$Bhoomit Ahlawat$$E18$$,
  NULL,
  NULL,
  $$E18$$Hirak$$E18$$,
  $$E18$$Vivek / Pritam$$E18$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '52908%' LIMIT 1),
  $$E19$$52908$$E19$$,
  $$E19$$Alliance Infra (Urbanrise)$$E19$$,
  '2026-05-30',
  $$E19$$May$$E19$$,
  $$E19$$Post Sierra-migration system-report defects raised by customer (Gayathri), impacting weekly management reporting: Lead Field Audit Report missing Phone/Lead Number and hyperlink; Lead Ownership Audit Report mislabels Created Date; Lead Distribution Analysis export converts columns to rows on multi-page and numbers mismatch UI vs Excel; No Task Report missing across tenants post-migration.$$E19$$,
  $$E19$$Documented every issue with tenant mapping (52908/76483/5529/5526), separating system-report constraints from actionable items with owners and ETAs. Locked a customer + PS + CSM review; updated Lead Field Audit and Lead Ownership reports shared with customer; Lead Distribution export columns-to-rows raised as a product ticket; No Task Report replication scoped. Sierra training for stakeholders planned. Stood up Engineering+Support war room.$$E19$$,
  $$E19$$CSM + PS$$E19$$,
  $$E19$$Partly Resolved$$E19$$,
  $$E19$$Bhoomit Ahlawat$$E19$$,
  $$E19$$1/6/26$$E19$$,
  NULL,
  $$E19$$Ambrish$$E19$$,
  $$E19$$Vivek / Pritam$$E19$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '72117%' LIMIT 1),
  $$E20$$72117$$E20$$,
  $$E20$$Sleep Company$$E20$$,
  '2026-05-08',
  $$E20$$May$$E20$$,
  $$E20$$Customer has reported multiple times that they are experiencing slowness/downtime in LSQ. Support tickets raised: 1894635, 1895359, 1888765, 1893089, 1899886.$$E20$$,
  $$E20$$Engineering and Infrastructure teams immediately investigated the issue and performed the necessary corrective actions to restore the affected services. The services are now stable and functioning as expected. The issue has been addressed from the backend, and the concerned teams are continuously monitoring the services.$$E20$$,
  $$E20$$CSM + Engg + Support$$E20$$,
  $$E20$$Resolved$$E20$$,
  $$E20$$Nikhil Chand$$E20$$,
  NULL,
  NULL,
  $$E20$$Hirak$$E20$$,
  $$E20$$CSM$$E20$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '60847%' LIMIT 1),
  $$E21$$60847$$E21$$,
  $$E21$$Bajaj ACE Reports$$E21$$,
  '2025-10-18',
  $$E21$$October$$E21$$,
  $$E21$$Job failures due to spot instance evictions. Pipeline compute was running on AWS EC2 Spot instances, which AWS can reclaim. Jobs had no checkpointing or graceful failover, so any reclaim mid-execution caused a full job failure.$$E21$$,
  $$E21$$Migrated pipeline compute from Spot to stable on-demand instances - permanent infrastructure change.$$E21$$,
  $$E21$$CSM + PS + Engg$$E21$$,
  $$E21$$Resolved$$E21$$,
  $$E21$$Nikhil Chand$$E21$$,
  NULL,
  $$E21$$Re: Escalation: Delays and Challenges from LS Team in Netcore CRM Integration$$E21$$,
  $$E21$$Hirak$$E21$$,
  $$E21$$Vivek / Pritam$$E21$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '60847%' LIMIT 1),
  $$E22$$60847$$E22$$,
  $$E22$$Bajaj ACE Reports$$E22$$,
  '2026-03-15',
  $$E22$$March$$E22$$,
  $$E22$$Job failures due to database query timeouts. Sub-goal count for the template increased from 799 to 3,041, driving a large jump in data volume the job had to write. As a result, queries exceeded the configured timeout and were killed before completion, causing the write step to fail and the job to fail overall.$$E22$$,
  $$E22$$Increased the query timeout parameter in job configuration. Scaled RDS from medium to large. Monitored subsequent runs to confirm stability.$$E22$$,
  $$E22$$CSM + PS + Engg$$E22$$,
  $$E22$$Resolved$$E22$$,
  $$E22$$Nikhil Chand$$E22$$,
  NULL,
  $$E22$$Bajaj ACE Experience$$E22$$,
  $$E22$$Hirak$$E22$$,
  $$E22$$Vivek$$E22$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '60847%' LIMIT 1),
  $$E23$$60847$$E23$$,
  $$E23$$Bajaj ACE Reports$$E23$$,
  '2026-03-15',
  $$E23$$March$$E23$$,
  $$E23$$SLA breach - processing exceeding 9 PM delivery window. A new template (Retail_MC_Clone 12002) was onboarded with 11,000+ sub-goals. The legacy export job processed sub-goals sequentially in a for-loop on Airflow/RDS (DB-bound), so runtime grew non-linearly with sub-goal count and consistently breached the 9 PM SLA.$$E23$$,
  $$E23$$Short-term: SLA window extended from 9 PM to 11 PM; RDS scaled. Long-term: re-engineered the export job to a parallel processing architecture, reducing end-to-end runtime by approximately 73% (from roughly three hours to approximately forty minutes). Jobs now completing by 10 PM.$$E23$$,
  $$E23$$CSM + PS + Engg$$E23$$,
  $$E23$$Resolved$$E23$$,
  $$E23$$Nikhil Chand$$E23$$,
  NULL,
  $$E23$$Bajaj ACE Experience$$E23$$,
  $$E23$$Hirak$$E23$$,
  $$E23$$CSM$$E23$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '60847%' LIMIT 1),
  $$E24$$60847$$E24$$,
  $$E24$$Bajaj ACE Reports$$E24$$,
  '2026-05-20',
  $$E24$$May$$E24$$,
  $$E24$$Template update not reflecting in UI. Upstream schema change in an upstream platform attribute - Enquiry score column type changed from double to int. This broke the template update job write step, so updated template data was never persisted to the table backing the UI and stale data continued to display.$$E24$$,
  $$E24$$Schema change was fixed and pipeline was re-run. Issue confirmed resolved; RCA closed - root cause was a schema change only.$$E24$$,
  $$E24$$CSM + PS + Engg$$E24$$,
  $$E24$$Resolved$$E24$$,
  $$E24$$Nikhil Chand$$E24$$,
  NULL,
  $$E24$$Leadsquared Enhancements Requirement$$E24$$,
  $$E24$$Hirak$$E24$$,
  $$E24$$Vivek / Pritam$$E24$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '54598%' LIMIT 1),
  $$E25$$54598$$E25$$,
  $$E25$$Jaro$$E25$$,
  '2026-05-18',
  $$E25$$May$$E25$$,
  $$E25$$Cx raised concerns over ongoing delays and challenges they have been facing with the LS for Netcore integration project. The project began in October, and despite investing significant time and effort from all stakeholders, they are still unable to complete the end-to-end integration successfully. Observed challenges include: Lack of clarity during initial implementation phase; Significant time spent on repeated discussions and trial-and-error approaches; Multiple re-implementations due to failures or limitations in previously suggested methods.$$E25$$,
  $$E25$$A call was pre-scheduled between Netcore, Jaro, LSQ to streamline the process on 19th May. The previous integration went live on 22nd April and testing was successful. When integration worked on live data, API rate limit errors were observed. To solve this, cloneDB approach was used where a user was created for Netcore and queries were shared with Netcore team.$$E25$$,
  $$E25$$CSM + Engg + PS$$E25$$,
  $$E25$$Partly Resolved$$E25$$,
  $$E25$$Nikhil Chand$$E25$$,
  $$E25$$5/6/26$$E25$$,
  $$E25$$Introduction and LSQ Collaboration Discussion$$E25$$,
  $$E25$$Hirak$$E25$$,
  $$E25$$Prashant$$E25$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '63859%' LIMIT 1),
  $$E26$$63859$$E26$$,
  $$E26$$IIDE$$E26$$,
  '2026-05-07',
  $$E26$$May$$E26$$,
  $$E26$$During Renewal in 2025, Cx was promised AI features demo and adoption as well as account audit from PS. But these were not delivered. Lead propensity was parked by product. Invorto and Zip Teams demo did not happen formally.$$E26$$,
  $$E26$$Demo for Invorto and Zip Teams was given to Cx on 29th May. PS audit is raised to Harshit. ETA to be received yet.$$E26$$,
  $$E26$$CSM + CP + PS$$E26$$,
  $$E26$$Partly Resolved$$E26$$,
  $$E26$$Nikhil Chand$$E26$$,
  NULL,
  $$E26$$Critical Client Escalation - Urgent Intervention Required on Support Experience and TAM Concern$$E26$$,
  $$E26$$Hirak$$E26$$,
  $$E26$$CSM$$E26$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '63074%' LIMIT 1),
  $$E27$$63074$$E27$$,
  $$E27$$Infinity Learn$$E27$$,
  '2026-05-20',
  $$E27$$May$$E27$$,
  $$E27$$There was global mobile login, checkin-checkout and usage issue on 19th May which impacted Infinity Learn as well. The Cx also faced downtime in May twice.$$E27$$,
  $$E27$$Engineering and Infrastructure teams immediately investigated the issue and performed the necessary corrective actions to restore the affected services. The services are now stable and functioning as expected. The issue has been addressed from the backend, and the concerned teams are continuously monitoring the services.$$E27$$,
  $$E27$$CSM + Engg + Support$$E27$$,
  $$E27$$Resolved$$E27$$,
  $$E27$$Nikhil Chand$$E27$$,
  NULL,
  $$E27$$LSQ Publisher Panel - Lead Visibility Issue and Action Plan$$E27$$,
  $$E27$$Hirak$$E27$$,
  $$E27$$CSM$$E27$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '79205%' LIMIT 1),
  $$E28$$79205$$E28$$,
  $$E28$$upGrad$$E28$$,
  '2026-05-04',
  $$E28$$May$$E28$$,
  $$E28$$New change request has been shared and got delayed.$$E28$$,
  $$E28$$For now this is implemented and made live.$$E28$$,
  $$E28$$PS + CSM$$E28$$,
  $$E28$$Resolved$$E28$$,
  $$E28$$Abhishek Bhargav$$E28$$,
  NULL,
  NULL,
  $$E28$$Hirak$$E28$$,
  $$E28$$Nilesh$$E28$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '123%' LIMIT 1),
  $$E29$$123$$E29$$,
  $$E29$$Topranker$$E29$$,
  '2026-04-07',
  $$E29$$April$$E29$$,
  $$E29$$Feature request for landing page usage in walk-in centers. App changes; issue frequency reduced, but app failures and data mismatches still need correction. Automation setup issues causing student referral pass values to be captured incorrectly. Database size concerns requiring manual cleanup; reports occasionally fail to sync/open. Integration configuration completed, but one template with multiple variables is still causing issues. Call logs are not visible due to an API error from Exotel.$$E29$$,
  $$E29$$Feature request raised. Lapp failure frequency reduced with recent changes, still need more correction. Automation setup logic not implemented correctly - workaround shared with client. Manual deletion request raised to dev team. Template issue needs to be checked with Gupshup team.$$E29$$,
  $$E29$$CSM + Support$$E29$$,
  $$E29$$In Progress$$E29$$,
  $$E29$$Abhishek Bhargav$$E29$$,
  NULL,
  $$E29$$Ongoing concerns in topranker$$E29$$,
  $$E29$$Hirak$$E29$$,
  $$E29$$CSM$$E29$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '78694%' LIMIT 1),
  $$E30$$78694$$E30$$,
  $$E30$$CK Birla Hospital$$E30$$,
  '2026-05-04',
  $$E30$$May$$E30$$,
  $$E30$$Delay in report and dashboard delivery. This is new tenant, under implementation.$$E30$$,
  $$E30$$P0 reports delivered on next day. For other reports ETA was for 3 working days. Now reports are delivered. Will get go live by 4th June.$$E30$$,
  $$E30$$PS + CSM$$E30$$,
  $$E30$$Resolved$$E30$$,
  $$E30$$Poorva Pandya$$E30$$,
  $$E30$$9/5/26$$E30$$,
  $$E30$$[#1893613] Re: LinkedIn Connector Issue$$E30$$,
  $$E30$$Hirak$$E30$$,
  $$E30$$Vivek$$E30$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '55343%' LIMIT 1),
  $$E31$$55343$$E31$$,
  $$E31$$Lakshya$$E31$$,
  '2026-05-12',
  $$E31$$May$$E31$$,
  $$E31$$LinkedIn connector issue.$$E31$$,
  $$E31$$The issue was with the mapping of the fields at LSQ connector. Connected with product team and mapping corrected. Issue resolved now.$$E31$$,
  $$E31$$Support + CSM$$E31$$,
  $$E31$$Resolved$$E31$$,
  $$E31$$Abhishek Bhargav$$E31$$,
  NULL,
  $$E31$$Urgent - Project Status$$E31$$,
  $$E31$$Hirak$$E31$$,
  $$E31$$CSM$$E31$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '52010%' LIMIT 1),
  $$E32$$52010$$E32$$,
  $$E32$$Pagarbook$$E32$$,
  '2026-06-05',
  $$E32$$May$$E32$$,
  $$E32$$Cx has requested to include Zipteams of approximately 2 lakhs in the pricing or MRR. However, this has been rejected by the Sales team, creating dissatisfaction and making the account a potential churn risk. Additionally, the customer has exported leads multiple times over the last week, which may indicate churn intent. The customer had also reported a slowness issue earlier.$$E32$$,
  $$E32$$The pricing request has been reviewed with Sales, and their rejection has been noted. The slowness issue reported by the customer has been resolved. Lead export activity has been identified as a churn signal, and the account should be closely monitored with proactive engagement to mitigate churn risk.$$E32$$,
  $$E32$$Sales + CSM$$E32$$,
  $$E32$$Resolved$$E32$$,
  $$E32$$Amarjeet Ghatak$$E32$$,
  $$E32$$6/5/26$$E32$$,
  $$E32$$Leadsquared is very very slow$$E32$$,
  $$E32$$Hirak$$E32$$,
  $$E32$$CSM$$E32$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '71625%' LIMIT 1),
  $$E33$$71625$$E33$$,
  $$E33$$DSU$$E33$$,
  '2026-05-21',
  $$E33$$May$$E33$$,
  $$E33$$DDC connector is not working as expected, lead fields have the data still not getting added in the Document.$$E33$$,
  $$E33$$The application generated through document designer not picking the data on the Document designer. Solution to be provided by the product on this. For now wait card needs to be implemented.$$E33$$,
  $$E33$$Support + Product + CSM$$E33$$,
  $$E33$$Partly Resolved$$E33$$,
  $$E33$$Abhishek Bhargav$$E33$$,
  NULL,
  $$E33$$[#1903398] Applicant Name, Parent Name, Declaration Date is blank In Application PDF$$E33$$,
  $$E33$$Ambrish$$E33$$,
  $$E33$$Vivek$$E33$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '76244%' LIMIT 1),
  $$E34$$76244$$E34$$,
  $$E34$$Physics Wallah Pvt. Ltd.$$E34$$,
  '2026-05-05',
  $$E34$$May$$E34$$,
  $$E34$$Data Purge Issue which was impacting Cx sentiments and was hitting the billing process as well. Out of 27.23 crore total records consuming 4,269 GB, about 23.98 crore records (88%) will be deleted, freeing up 3,338 GB. The database will shrink to 931 GB post-purge.$$E34$$,
  $$E34$$A one-time plus ongoing data purge plan for Physics Wallah LSQ instance to reclaim storage across 4 entity types. Billing protection - Storage pending deletion will not be charged. Top concern flagged - Audit log retention is being reduced to 30 days, but WON opportunities are retained for 365 days. Running war room with PS, Engg and Support to monitor purge execution.$$E34$$,
  $$E34$$Support + Engg + PS + CSM$$E34$$,
  $$E34$$Resolved$$E34$$,
  $$E34$$Vaibhav Bali$$E34$$,
  $$E34$$21-May-26$$E34$$,
  $$E34$$Minutes of meeting - PhysicsWallah Purging - Internal Connect$$E34$$,
  $$E34$$Ambrish$$E34$$,
  $$E34$$Vivek / Pritam$$E34$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  NULL,
  NULL,
  $$E35$$Care Hospital$$E35$$,
  '2026-05-13',
  $$E35$$May$$E35$$,
  $$E35$$The customer (CARE Hospitals) reported that APIs were not working, specifically: Specialty and doctors data were not loading. This was impacting their call centre operations and marked as urgent/critical.$$E35$$,
  $$E35$$API parameters were updated and corrected by PS.$$E35$$,
  $$E35$$CSM + PS$$E35$$,
  $$E35$$Resolved$$E35$$,
  $$E35$$Vaibhav Bali$$E35$$,
  NULL,
  $$E35$$[#1898326] (No Subject)$$E35$$,
  $$E35$$Hirak$$E35$$,
  $$E35$$CSM$$E35$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  NULL,
  NULL,
  $$E36$$Manipal Hospitals$$E36$$,
  '2026-06-04',
  $$E36$$June$$E36$$,
  $$E36$$This escalation was comprised of several delays specifically from the dev team and responses from Support team.$$E36$$,
  $$E36$$We introduced an escalation matrix for the support team till Udit. Also informed that for support tickets which are logged and waiting on dev team, there is a specific dev SPOC who would be picking Support tickets from Manipal on priority.$$E36$$,
  $$E36$$Support + CSM$$E36$$,
  $$E36$$Resolved$$E36$$,
  $$E36$$Amarjeet Ghatak$$E36$$,
  $$E36$$5/6/26$$E36$$,
  $$E36$$Re: users Unable to access Opportunities$$E36$$,
  $$E36$$Hirak$$E36$$,
  $$E36$$Prashant$$E36$$
);

INSERT INTO public.escalations (account_id, tenant_id, account_name, date_of_escalation, month, description, action_taken, ownership, status, csm, eta, email_subject, ps_leader, escalated_by) VALUES (
  (SELECT id FROM public.accounts WHERE tenant_id LIKE '71625%' LIMIT 1),
  $$E37$$71625$$E37$$,
  $$E37$$Dayanand Sagar University$$E37$$,
  '2026-06-04',
  $$E37$$June$$E37$$,
  $$E37$$The Customer was not able to access the MS due to that they were not able to add the email credits eventually hampered the Email communications.$$E37$$,
  $$E37$$We have connected with Billings team on priority and added the FOC email credits to unblock the client. The MS has been enabled however as it took 24 hours to be visible at the client end, we added the FOC emails. Separate OF for these emails has been sent to client.$$E37$$,
  $$E37$$CSM + Billings$$E37$$,
  $$E37$$Resolved$$E37$$,
  $$E37$$Abhishek Bhargav$$E37$$,
  $$E37$$4/6/26$$E37$$,
  $$E37$$[#1911809] Subscription access to 66450$$E37$$,
  $$E37$$Ambrish$$E37$$,
  $$E37$$CSM$$E37$$
);

