// Provider-agnostic AI helper (BYOK). Supports Anthropic, OpenAI and Google
// Gemini. Keys live in the ai_config table and never leave the server.
// NOTE: Vercel Hobby caps function duration at ~10s, so we use fast models,
// modest token budgets and a hard client-side timeout.

export const PROVIDERS = ['anthropic', 'openai', 'gemini'];

export const DEFAULT_MODELS = {
  anthropic: 'claude-3-5-haiku-latest',
  openai:    'gpt-4o-mini',
  gemini:    'gemini-3.1-flash-lite',
};

// Per-section default system instructions. The admin's custom instruction
// (from Settings → AI) is appended to these at request time.
export const AI_SECTIONS = {
  account_summary: {
    label: 'Account Summary',
    system: 'You are a Customer Success analyst. Write a single executive summary of this account in NO MORE THAN 200 words. Cover: health (RAG status + why), commercials (MRR, renewal), adoption/stickiness, open escalations and issues with their severity, and the top risks and recommended next actions. Be specific, use the data provided, and never invent facts. Prefer short paragraphs or tight bullets.',
    maxTokens: 700,
  },
  account_escalations: {
    label: 'Account Escalations',
    system: 'You are a Customer Success analyst. Summarize this account\'s escalations in under 120 words: dominant themes, severity, what is open vs resolved, ageing/ETA concerns, and the most urgent items needing attention. Use the data provided; do not invent.',
    maxTokens: 450,
  },
  account_issues: {
    label: 'Account Issues',
    system: 'You are a Customer Success analyst. Summarize this account\'s issues in under 120 words: dominant themes/types, priority distribution, what is open vs resolved, and the most urgent items needing attention. Use the data provided; do not invent.',
    maxTokens: 450,
  },
  feature_request: {
    label: 'Feature Request Recommendation',
    system: 'You are a product prioritization assistant. Using ONLY the linked accounts, escalations and issues provided, recommend whether this feature request should be taken up, assign a priority (P0, P1, P2 or P3), and a suggested ETA (a rough timeframe). Justify briefly using affected MRR, severity and frequency. Respond with these labelled sections: "Recommendation:", "Priority:", "Suggested ETA:", "Rationale:".',
    maxTokens: 600,
  },
  rag: {
    label: 'RAG Analysis',
    system: 'You are a Customer Success portfolio analyst. Analyze the accounts in this RAG band. Summarize the common drivers, where risk/MRR is concentrated, notable accounts, and recommended plays. Be concise and data-grounded.',
    maxTokens: 700,
  },
  issues_overview: {
    label: 'Issues Overview',
    system: 'You are a Customer Success analyst. Summarize the issues currently in view (already filtered by the user): dominant themes, priority/severity distribution, notable accounts, and the top 3 recommended focus areas. Be concise.',
    maxTokens: 700,
  },
  escalations_overview: {
    label: 'Escalations Overview',
    system: 'You are a Customer Success analyst. Summarize the escalations currently in view (already filtered by the user): dominant themes, status/severity distribution, notable accounts, ageing and ETA concerns, and the top 3 recommended focus areas. Be concise.',
    maxTokens: 700,
  },
  issue_next_steps: {
    label: 'Issue Next Steps',
    system: 'You are a Customer Success analyst. Given this single issue, recommend concrete next steps as 3–5 short bullets, suggest who should own it, and flag any risk. Be specific and concise.',
    maxTokens: 400,
  },
  escalation_next_steps: {
    label: 'Escalation Next Steps',
    system: 'You are a Customer Success analyst. Given this single escalation, recommend concrete next steps as 3–5 short bullets, suggest who should own it, and flag any risk. Be specific and concise.',
    maxTokens: 400,
  },
};

function withTimeout(ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
}

async function callAnthropic({ key, model, system, user, maxTokens }) {
  const to = withTimeout(9500);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: to.signal,
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || `Anthropic error ${r.status}`);
    return (j.content || []).map(b => b.text || '').join('').trim();
  } finally { to.clear(); }
}

async function callOpenAI({ key, model, system, user, maxTokens }) {
  const to = withTimeout(9500);
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: to.signal,
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || `OpenAI error ${r.status}`);
    return (j.choices?.[0]?.message?.content || '').trim();
  } finally { to.clear(); }
}

async function callGemini({ key, model, system, user, maxTokens }) {
  const to = withTimeout(9500);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const r = await fetch(url, {
      method: 'POST',
      signal: to.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || `Gemini error ${r.status}`);
    return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  } finally { to.clear(); }
}

export async function callAI({ provider, key, model, system, user, maxTokens = 600 }) {
  if (!key) throw new Error('No API key configured for the selected provider');
  const m = model || DEFAULT_MODELS[provider];
  if (provider === 'anthropic') return callAnthropic({ key, model: m, system, user, maxTokens });
  if (provider === 'openai')    return callOpenAI({ key, model: m, system, user, maxTokens });
  if (provider === 'gemini')    return callGemini({ key, model: m, system, user, maxTokens });
  throw new Error(`Unknown AI provider: ${provider}`);
}

// ──────────────────────────────────────────────────────────────────────────
// Tool-calling support for the conversational Assistant.
//
// A provider-neutral `turns` array drives a multi-step agent loop. Each turn:
//   { role: 'user',      text }
//   { role: 'assistant', text, toolUses: [{ id, name, input }] }
//   { role: 'tool',      results: [{ id, name, content }] }
// Per-provider serializers translate it to each wire format; parsers normalize
// the response to { text, toolUses, stopReason }.
// ──────────────────────────────────────────────────────────────────────────

function anthropicMessages(turns) {
  return turns.map(t => {
    if (t.role === 'user')   return { role: 'user', content: t.text };
    if (t.role === 'tool')   return { role: 'user', content: t.results.map(r => ({ type: 'tool_result', tool_use_id: r.id, content: r.content })) };
    // assistant
    const content = [];
    if (t.text) content.push({ type: 'text', text: t.text });
    (t.toolUses || []).forEach(tu => content.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input }));
    return { role: 'assistant', content };
  });
}

async function toolCallAnthropic({ key, model, system, turns, tools, maxTokens, timeoutMs }) {
  const to = withTimeout(timeoutMs);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: to.signal,
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model, max_tokens: maxTokens, system,
        messages: anthropicMessages(turns),
        ...(tools.length ? { tools: tools.map(t => ({ name: t.name, description: t.description, input_schema: t.parameters })) } : {}),
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || `Anthropic error ${r.status}`);
    const blocks = j.content || [];
    const text = blocks.filter(b => b.type === 'text').map(b => b.text || '').join('').trim();
    const toolUses = blocks.filter(b => b.type === 'tool_use').map(b => ({ id: b.id, name: b.name, input: b.input || {} }));
    return { text, toolUses, stopReason: j.stop_reason };
  } finally { to.clear(); }
}

function openaiMessages(system, turns) {
  const msgs = [{ role: 'system', content: system }];
  for (const t of turns) {
    if (t.role === 'user') msgs.push({ role: 'user', content: t.text });
    else if (t.role === 'tool') t.results.forEach(r => msgs.push({ role: 'tool', tool_call_id: r.id, content: r.content }));
    else msgs.push({
      role: 'assistant',
      content: t.text || null,
      ...(t.toolUses?.length ? { tool_calls: t.toolUses.map(tu => ({ id: tu.id, type: 'function', function: { name: tu.name, arguments: JSON.stringify(tu.input || {}) } })) } : {}),
    });
  }
  return msgs;
}

async function toolCallOpenAI({ key, model, system, turns, tools, maxTokens, timeoutMs }) {
  const to = withTimeout(timeoutMs);
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: to.signal,
      headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model, max_tokens: maxTokens,
        messages: openaiMessages(system, turns),
        ...(tools.length ? { tools: tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })) } : {}),
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || `OpenAI error ${r.status}`);
    const msg = j.choices?.[0]?.message || {};
    const toolUses = (msg.tool_calls || []).map(tc => {
      let input = {};
      try { input = JSON.parse(tc.function?.arguments || '{}'); } catch {}
      return { id: tc.id, name: tc.function?.name, input };
    });
    return { text: (msg.content || '').trim(), toolUses, stopReason: j.choices?.[0]?.finish_reason };
  } finally { to.clear(); }
}

function geminiContents(turns) {
  const asObj = (s) => { try { return JSON.parse(s); } catch { return { result: s }; } };
  return turns.map(t => {
    if (t.role === 'user') return { role: 'user', parts: [{ text: t.text }] };
    if (t.role === 'tool') return { role: 'user', parts: t.results.map(r => ({ functionResponse: { name: r.name, response: asObj(r.content) } })) };
    const parts = [];
    if (t.text) parts.push({ text: t.text });
    (t.toolUses || []).forEach(tu => parts.push({ functionCall: { name: tu.name, args: tu.input || {} } }));
    return { role: 'model', parts };
  });
}

async function toolCallGemini({ key, model, system, turns, tools, maxTokens, timeoutMs }) {
  const to = withTimeout(timeoutMs);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const r = await fetch(url, {
      method: 'POST', signal: to.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: geminiContents(turns),
        ...(tools.length ? { tools: [{ functionDeclarations: tools.map(t => ({ name: t.name, description: t.description, parameters: t.parameters })) }] } : {}),
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || `Gemini error ${r.status}`);
    const parts = j.candidates?.[0]?.content?.parts || [];
    const text = parts.filter(p => p.text).map(p => p.text).join('').trim();
    const toolUses = parts.filter(p => p.functionCall).map((p, i) => ({ id: `${p.functionCall.name}-${i}`, name: p.functionCall.name, input: p.functionCall.args || {} }));
    return { text, toolUses, stopReason: j.candidates?.[0]?.finishReason };
  } finally { to.clear(); }
}

export async function callAIWithTools({ provider, key, model, system, turns, tools, maxTokens = 1200, timeoutMs = 20000 }) {
  if (!key) throw new Error('No API key configured for the selected provider');
  const m = model || DEFAULT_MODELS[provider];
  const args = { key, model: m, system, turns, tools, maxTokens, timeoutMs };
  if (provider === 'anthropic') return toolCallAnthropic(args);
  if (provider === 'openai')    return toolCallOpenAI(args);
  if (provider === 'gemini')    return toolCallGemini(args);
  throw new Error(`Unknown AI provider: ${provider}`);
}
