import React, { useState } from 'react';
import axios from 'axios';
import { useAiConfig } from '../context/AiConfigContext';
import { timeAgo, fullTime } from './LastEdited';

const SparkIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const PROVIDER_LABEL = { anthropic: 'Anthropic', openai: 'OpenAI', gemini: 'Gemini' };

// Shared, manual-trigger AI panel. Never auto-generates.
// - section: AI section key (account_summary, rag, next_steps, …)
// - getPayload: () => ({ ...fields }) merged into the generate request, read at click time
// - initialText/initialAt: persisted prior result to prefill (account/FR/issue stamps)
// - onGenerated(text, at): lets the parent keep its local copy in sync
// - compact: tighter layout for inline use under table rows
export default function AiPanel({
  section, title, getPayload, initialText = '', initialAt = null,
  onGenerated, compact = false, hint,
}) {
  const { ai } = useAiConfig();
  const enabled = !!ai?.enabled;

  const [text, setText]       = useState(initialText || '');
  const [at, setAt]           = useState(initialAt || null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showFull, setShowFull] = useState(false);

  // In compact mode (inside expanded rows/cards), clamp long output so the
  // row stays scannable — especially on mobile.
  const CLAMP_AT = 400;
  const isLong   = compact && text.length > CLAMP_AT;
  const visible  = isLong && !showFull ? text.slice(0, CLAMP_AT).trimEnd() + '…' : text;

  const run = async () => {
    setLoading(true); setError('');
    try {
      const payload = (getPayload ? getPayload() : {}) || {};
      const { data } = await axios.post('/api/dropdown-config', { action: 'ai_generate', section, ...payload });
      setText(data.text || ''); setAt(data.generated_at || new Date().toISOString());
      setShowFull(false);
      onGenerated?.(data.text || '', data.generated_at);
    } catch (e) {
      setError(e.response?.data?.error || 'AI request failed');
    } finally { setLoading(false); }
  };

  const providerBadge = ai?.provider ? (
    <span className="text-[10px] uppercase tracking-wide text-gray-400">{PROVIDER_LABEL[ai.provider] || ai.provider}</span>
  ) : null;

  const Button = (
    <button
      onClick={run}
      disabled={!enabled || loading}
      title={!enabled ? 'Configure an AI key in Settings → AI' : ''}
      className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-medium transition
        ${compact ? 'px-2.5 py-1' : 'px-3 py-1.5'}
        ${enabled ? 'bg-brand-50 text-brand-700 hover:bg-brand-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
    >
      {loading
        ? <span className="w-3.5 h-3.5 border-2 border-brand-300 border-t-transparent rounded-full animate-spin" />
        : <SparkIcon className="w-3.5 h-3.5" />}
      {loading ? 'Generating…' : text ? 'Refresh' : 'Generate'}
    </button>
  );

  return (
    <div className={`rounded-xl border ${enabled ? 'border-brand-100 bg-brand-50/30' : 'border-gray-150 bg-gray-50'} ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={enabled ? 'text-brand-500' : 'text-gray-300'}><SparkIcon /></span>
          <h4 className={`font-semibold text-gray-800 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{title}</h4>
          {providerBadge}
        </div>
        {Button}
      </div>

      {!enabled ? (
        <p className="text-xs text-gray-400 mt-2">AI is not configured. An admin can add a provider key in <span className="font-medium">Settings → AI</span>.</p>
      ) : error ? (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">{error}</p>
      ) : text ? (
        <>
          <div className={`text-gray-700 whitespace-pre-wrap leading-relaxed mt-2 ${compact ? 'text-xs' : 'text-sm'}`}>{visible}</div>
          {isLong && (
            <button onClick={() => setShowFull(s => !s)} className="text-[11px] text-brand-600 hover:underline font-medium mt-1">
              {showFull ? 'Show less' : 'Show more'}
            </button>
          )}
          {at && <p className="text-[11px] text-gray-400 mt-2" title={fullTime(at)}>Generated {timeAgo(at)}{ai?.provider ? ` · ${PROVIDER_LABEL[ai.provider] || ai.provider}` : ''}</p>}
        </>
      ) : (
        <p className="text-xs text-gray-400 mt-2">{hint || 'Click Generate to create an AI summary. It only runs when you ask.'}</p>
      )}
    </div>
  );
}
