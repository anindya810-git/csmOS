import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

function Logo({ size = 30, id = 'logo' }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0EA47E" />
          <stop offset="1" stopColor="#2DD4A7" />
        </linearGradient>
      </defs>
      <path d="M47 20 A18 18 0 1 0 47 44" fill="none" stroke={`url(#${id})`} strokeWidth="10" strokeLinecap="round" />
      <polygon points="49,24.5 51.55,29.45 56.5,32 51.55,34.55 49,39.5 46.45,34.55 41.5,32 46.45,29.45" fill="#2DD4A7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function SparkIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2 13.9 8.1 20 10 13.9 11.9 12 18 10.1 11.9 4 10 10.1 8.1z" />
    </svg>
  );
}

export default function LandingPage() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('lp-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.lp-rv').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp">

      {/* ── NAV ── */}
      <nav className="lp-nav">
        <div className="lp-nav-in">
          <a className="lp-brand" href="#top">
            <Logo size={30} id="lg-nav" />
            <span>Cust<span className="lp-a">ally</span></span>
          </a>
          <div className="lp-nav-links">
            <a href="#product">Product</a>
            <a href="#how">How it works</a>
            <a href="#personas">Who it's for</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="lp-nav-cta">
            <Link className="lp-signin" to="/login">Sign in</Link>
            <Link className="lp-btn lp-btn-primary lp-btn-sm" to="/login">Book a demo</Link>
          </div>
        </div>
      </nav>

      <main id="top">

        {/* ── HERO ── */}
        <header className="lp-hero">
          <div className="lp-wrap">
            <div className="lp-eyebrow-row">
              <span className="lp-brand-pill"><span className="lp-dot" />{' '}The all-in-one customer success platform</span>
            </div>
            <h1>Customer experience,{' '}<span className="lp-hl">simplified.</span></h1>
            <p className="lp-lead">One platform for everything customer success — escalations, issues, feature requests, renewals, customer health, CSM workload, POC mapping and reporting. With AI built into all of it.</p>
            <div className="lp-hero-cta">
              <Link className="lp-btn lp-btn-primary" to="/login">Start free</Link>
              <a className="lp-btn lp-btn-ghost" href="#product">Explore the platform</a>
            </div>
            <p className="lp-hero-note">Free for your first 3 seats · No credit card required</p>

            {/* Product mock */}
            <div className="lp-mockframe lp-rv">
              <div className="lp-winbar">
                <span className="lp-wdot" style={{ background: '#FF5F57' }} />
                <span className="lp-wdot" style={{ background: '#FEBC2E' }} />
                <span className="lp-wdot" style={{ background: '#28C840' }} />
                <span className="lp-url">app.custally.com/reports/custom/builder</span>
                <span className="lp-tag">Custom Report Builder</span>
              </div>
              <div className="lp-builder">
                <div className="lp-config">
                  <div className="lp-config-card">
                    <h5>Data sources</h5>
                    <div className="lp-sources">
                      <div className="lp-src lp-acc lp-on"><span className="lp-sdot" />Accounts</div>
                      <div className="lp-src lp-iss lp-on"><span className="lp-sdot" />Issues</div>
                      <div className="lp-src lp-esc"><span className="lp-sdot" />Escalations</div>
                      <div className="lp-src lp-tsk"><span className="lp-sdot" />Tasks</div>
                    </div>
                  </div>
                  <div className="lp-config-card">
                    <h5>Columns</h5>
                    <div className="lp-chips">
                      <span className="lp-chip2 lp-acc"><span className="lp-cdot" />Account</span>
                      <span className="lp-chip2 lp-acc"><span className="lp-cdot" />RAG status</span>
                      <span className="lp-chip2 lp-acc"><span className="lp-cdot" />MRR</span>
                      <span className="lp-chip2 lp-cmp"><span className="lp-cdot" />Open Issues</span>
                      <span className="lp-chip2 lp-iss"><span className="lp-cdot" />Priority</span>
                      <span className="lp-chip2 lp-add">+ Add column</span>
                    </div>
                  </div>
                  <div className="lp-config-card" style={{ marginBottom: 0 }}>
                    <h5>Visualisation</h5>
                    <div className="lp-chips">
                      <span className="lp-chip2 lp-cmp" style={{ background: 'var(--brand-tint)', color: 'var(--brand-deep)' }}>
                        <span className="lp-cdot" style={{ background: 'var(--brand)' }} />Bar chart · grouped by team
                      </span>
                    </div>
                  </div>
                  <Link className="lp-btn lp-btn-primary lp-run" to="/login" style={{ marginTop: 14, textAlign: 'center', display: 'block', borderRadius: 'var(--r-pill)' }}>
                    Run preview
                  </Link>
                </div>
                <div className="lp-preview">
                  <div className="lp-pv-head">
                    <h4>Portfolio health</h4>
                    <span className="lp-rows">Showing 50 of 142 rows</span>
                  </div>
                  <div className="lp-kpis">
                    <div className="lp-kpi"><div className="lp-lbl">Renewal rate</div><div className="lp-val">93.4%</div><div className="lp-delta lp-up">▲ 2.1 pts</div></div>
                    <div className="lp-kpi"><div className="lp-lbl">MRR at risk</div><div className="lp-val">$284k</div><div className="lp-delta lp-dn">▼ across 9 accts</div></div>
                    <div className="lp-kpi"><div className="lp-lbl">Open escalations</div><div className="lp-val">17</div><div className="lp-delta lp-up">▲ 4 this week</div></div>
                  </div>
                  <div className="lp-chartcard">
                    <div className="lp-ct">Open issues by owner team</div>
                    <div className="lp-bars">
                      <div className="lp-bar"><div className="lp-col" style={{ height: '82%' }} /><span className="lp-bl">Support</span></div>
                      <div className="lp-bar"><div className="lp-col" style={{ height: '64%' }} /><span className="lp-bl">Onboarding</span></div>
                      <div className="lp-bar"><div className="lp-col" style={{ height: '48%' }} /><span className="lp-bl">Billing</span></div>
                      <div className="lp-bar"><div className="lp-col" style={{ height: '38%' }} /><span className="lp-bl">Success</span></div>
                      <div className="lp-bar"><div className="lp-col" style={{ height: '26%', background: 'var(--brand-bright)' }} /><span className="lp-bl">Product</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── LOGO STRIP ── */}
        <section className="lp-strip">
          <div className="lp-wrap">
            <p>The platform customer success teams run on</p>
            <div className="lp-names">
              <span>Northbeam</span><span>Helio</span><span>Cadence</span><span>Orbital</span><span>Meridian</span><span>Pathline</span>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="lp-sec" id="product">
          <div className="lp-wrap">
            <div className="lp-head lp-rv">
              <div className="lp-eyebrow-row"><span className="lp-brand-pill"><span className="lp-dot" /> The platform</span></div>
              <h2>Everything customer success, in one place</h2>
              <p className="lp-lead">From the first escalation to the renewal, Custally keeps every signal, every account and every task together — so your team always knows who needs them, and why.</p>
            </div>

            <div className="lp-modules">
              {[
                { icon: 'M22 12h-4l-3 9L9 3l-3 9H2', title: 'Customer health', desc: 'RAG scoring with adoption & stickiness signals, so you always know who needs you next.' },
                { icon: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01', title: 'Escalation handling', desc: 'Triage, assign ownership and track triggers from the first flag through to resolution.' },
                { icon: 'm12 2 9 4.9-9 4.9-9-4.9zm-9 10 9 4.9 9-4.9m-18 5 9 4.9 9-4.9', title: 'Issue management', desc: 'Capture, prioritise and categorise issues by type, sub-type and owner team — nothing slips.' },
                { icon: 'M9 18h6M10 22h4M15.1 14a5 5 0 1 0-6.2 0c.7.5 1.1 1.3 1.1 2.2h4c0-.9.4-1.7 1.1-2.2z', title: 'Feature requests', desc: 'Collect, theme and weigh what customers ask for — then close the loop when you ship it.' },
                { icon: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5', title: 'Renewals', desc: 'Track renewal dates and MRR at risk, and never let a renewal quietly slip past unseen.' },
                { icon: 'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0M13.4 10.6l3.6-3.6M4.2 19a10 10 0 1 1 15.6 0', title: 'CSM workload', desc: 'See capacity and task load across the team, and balance the book of business fairly.' },
                { icon: 'M12 5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM5 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM19 19a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 7.5v2.8M10.6 12.4 6.6 16.6m6.8-4.2 4 4.2', title: 'POC mapping', desc: 'Map every stakeholder and point of contact per account, with roles and relationships.' },
                { icon: 'M3 3v18h18M7 17V11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v6M12 17V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v10M17 17v-2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2', title: 'Custom reports', desc: 'The no-code builder: tables, bar & line charts and KPI boards from live data in minutes.' },
              ].map(m => (
                <div key={m.title} className="lp-mod lp-rv">
                  <div className="lp-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={m.icon} />
                    </svg>
                  </div>
                  <h3>{m.title}</h3>
                  <p>{m.desc}</p>
                </div>
              ))}
            </div>

            {/* AI band */}
            <div className="lp-ai lp-rv">
              <div className="lp-inner">
                <span className="lp-pill2"><SparkIcon />{' '}AI built into everything</span>
                <h2>An ally that thinks ahead</h2>
                <p className="lp-sub">Custally's AI runs quietly across every module — sorting the noise, spotting the risk, and writing the summary — so your team can spend their time on customers, not admin.</p>
                <div className="lp-ai-grid">
                  {[
                    ['Ask in plain English.', '"Accounts with open P1s renewing in 30 days" becomes a report, instantly.'],
                    ['Auto-categorisation.', 'Issues and escalations sorted by type and owner the moment they land.'],
                    ['Health & churn forecasting.', 'See which accounts are trending red before they turn.'],
                    ['Escalation risk signals.', 'Surfaces the accounts likely to escalate — and the reason why.'],
                    ['Insight summaries.', 'Every report gets a plain-language readout and anomaly flags.'],
                    ['Smart workload balancing.', 'Suggests how to share the book fairly across the team.'],
                  ].map(([b, t]) => (
                    <div key={b} className="lp-ai-item">
                      <SparkIcon />
                      <div><b>{b}</b>{' '}{t}</div>
                    </div>
                  ))}
                </div>
                <div className="lp-ask">
                  <SparkIcon className="lp-sp" />
                  <span className="lp-q">Ask Custally — which accounts are at risk this quarter?</span>
                  <button className="lp-go">Ask</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="lp-sec" id="how" style={{ background: 'var(--paper-2)' }}>
          <div className="lp-wrap">
            <div className="lp-head lp-rv">
              <div className="lp-eyebrow-row"><span className="lp-brand-pill"><span className="lp-dot" /> How it works</span></div>
              <h2>How customer success runs on Custally</h2>
            </div>
            <div className="lp-steps">
              {[
                ['STEP 01', 'Bring it all together', 'Accounts, issues, escalations, tasks, renewals and contacts live in one connected workspace — no more spreadsheets or tab-hopping.'],
                ['STEP 02', 'Let AI surface what matters', 'Health scores, churn forecasts, escalation-risk signals and auto-categorisation flag the accounts that need you today — before they turn red.'],
                ['STEP 03', 'Act, report & renew', 'Resolve escalations, balance the team\'s workload, build the report for the review, and carry every account to a confident renewal.'],
              ].map(([num, title, desc]) => (
                <div key={num} className="lp-step lp-rv">
                  <div className="lp-num">{num}</div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <div className="lp-line" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PERSONAS ── */}
        <section className="lp-sec" id="personas">
          <div className="lp-wrap">
            <div className="lp-head lp-rv">
              <div className="lp-eyebrow-row"><span className="lp-brand-pill"><span className="lp-dot" /> Who it's for</span></div>
              <h2>Built for every seat on the CS team</h2>
            </div>
            <div className="lp-personas">
              {[
                ['CSM', 'Portfolio health, weekly', 'Run a filterable list of open P1 issues across your book of business — no spreadsheet gymnastics.', 'Fast, filterable tables without SQL'],
                ['CSM Lead', 'Stakeholder reviews', 'A bar chart of issue volume by owner team, ready to drop into the Monday escalation review.', 'Shareable charts for reviews'],
                ['CX Strategy', 'Board-ready snapshots', 'KPI cards for renewal rate, open escalations and MRR at risk — the executive view, on demand.', 'Big-number summary views'],
                ['Ops / Admin', 'Operational rigour', 'Task completion rates by assignee, validated against live data and re-run whenever you need it.', 'Reliable, repeatable reports'],
              ].map(([role, title, desc, need]) => (
                <div key={role} className="lp-persona lp-rv">
                  <div className="lp-role">{role}</div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <div className="lp-need">{need}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="lp-sec" id="pricing" style={{ background: 'var(--paper-2)' }}>
          <div className="lp-wrap">
            <div className="lp-head lp-rv">
              <div className="lp-eyebrow-row"><span className="lp-brand-pill"><span className="lp-dot" /> Pricing</span></div>
              <h2>Simple plans, priced per CSM</h2>
              <p className="lp-lead">Start free, upgrade when your team does. Illustrative pricing — talk to us for your rollout.</p>
            </div>
            <div className="lp-price-grid">
              <div className="lp-tier lp-rv">
                <div className="lp-tname">Starter</div>
                <div className="lp-amt">$0</div>
                <div className="lp-desc">For small teams getting their first reports off engineering's plate.</div>
                <ul>
                  <li><CheckIcon />Up to 3 seats</li>
                  <li><CheckIcon />All four visualisations</li>
                  <li><CheckIcon />10 saved reports</li>
                </ul>
                <Link className="lp-btn lp-btn-ghost lp-tier .lp-btn" to="/login">Get started</Link>
              </div>
              <div className="lp-tier lp-feature lp-rv">
                <div className="lp-badge">MOST POPULAR</div>
                <div className="lp-tname">Team</div>
                <div className="lp-amt">$24<small> / CSM / mo</small></div>
                <div className="lp-desc">For CS orgs that run on self-service reporting every week.</div>
                <ul>
                  <li><CheckIcon />Unlimited seats &amp; reports</li>
                  <li><CheckIcon />Org-wide sharing</li>
                  <li><CheckIcon />Computed metrics &amp; joins</li>
                  <li><CheckIcon />Priority support</li>
                </ul>
                <Link className="lp-btn lp-btn-primary lp-tier .lp-btn" to="/login">Start free trial</Link>
              </div>
              <div className="lp-tier lp-rv">
                <div className="lp-tname">Enterprise</div>
                <div className="lp-amt">Custom</div>
                <div className="lp-desc">For larger orgs with security, scale and rollout needs.</div>
                <ul>
                  <li><CheckIcon />SSO &amp; audit logs</li>
                  <li><CheckIcon />Scheduled runs &amp; export</li>
                  <li><CheckIcon />Dedicated success manager</li>
                </ul>
                <Link className="lp-btn lp-btn-ghost lp-tier .lp-btn" to="/login">Contact sales</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="lp-sec" id="cta" style={{ paddingTop: 0 }}>
          <div className="lp-wrap">
            <div className="lp-cta-block lp-rv">
              <h2>Give every CSM the power to answer.</h2>
              <p>Stop waiting on tickets. Build the report you need, share it with your team, and get back to your customers.</p>
              <div className="lp-hero-cta" style={{ marginTop: 32 }}>
                <Link className="lp-btn lp-btn-primary" to="/login">Start building free</Link>
                <Link className="lp-btn lp-btn-ghost" to="/login">Book a demo</Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-foot">
            <div>
              <a className="lp-brand" href="#top">
                <Logo size={32} id="lg-foot" />
                <span>Cust<span className="lp-a">ally</span></span>
              </a>
              <p className="lp-tag">Customer experience, simplified. Self-service reporting built natively into your CS platform.</p>
            </div>
            <div>
              <h6>Product</h6>
              <ul>
                <li><a href="#product">Report builder</a></li>
                <li><a href="#product">Visualisations</a></li>
                <li><a href="#how">How it works</a></li>
                <li><a href="#pricing">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h6>Company</h6>
              <ul>
                <li><a href="#top">About</a></li>
                <li><a href="#personas">Customers</a></li>
                <li><a href="#top">Careers</a></li>
                <li><a href="#top">Contact</a></li>
              </ul>
            </div>
            <div>
              <h6>Resources</h6>
              <ul>
                <li><a href="#top">Docs</a></li>
                <li><a href="#top">Changelog</a></li>
                <li><a href="#top">Security</a></li>
                <li><a href="#top">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="lp-foot-bot">
            <span>© 2026 Custally. All rights reserved.</span>
            <span>
              <Link to="/login" style={{ textDecoration: 'none', color: 'var(--slate-400)' }}>Sign in</Link>
              {' '}·{' '}
              <a href="#top" style={{ textDecoration: 'none', color: 'var(--slate-400)' }}>Back to top</a>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
