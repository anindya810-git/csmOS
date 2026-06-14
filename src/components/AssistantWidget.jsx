import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAiConfig } from '../context/AiConfigContext';
import { useFeatures } from '../hooks/useFeatures';

// ── Tiny Markdown renderer ────────────────────────────────────────────────
// Handles the subset the model emits: tables, bullets, numbered lists,
// headings, bold and paragraphs. Kept inline so the widget is self-contained.
function splitRow(line) {
  const cells = line.split('|').map(s => s.trim());
  if (cells[0] === '') cells.shift();
  if (cells.length && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

function inline(text, keyBase) {
  // Split on **bold**; everything else is plain text.
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={`${keyBase}-${i}`}>{p.slice(2, -2)}</strong>;
    return <React.Fragment key={`${keyBase}-${i}`}>{p}</React.Fragment>;
  });
}

function parseBlocks(text) {
  const lines = String(text).replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0;
  const isBullet = l => /^\s*[-*]\s+/.test(l);
  const isNum = l => /^\s*\d+\.\s+/.test(l);
  const isHead = l => /^#{1,4}\s+/.test(l);
  while (i < lines.length) {
    const line = lines[i];
    if (line.includes('|') && i + 1 < lines.length && lines[i + 1].includes('-') && /^[\s:|-]+$/.test(lines[i + 1])) {
      const header = splitRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|')) { rows.push(splitRow(lines[i])); i++; }
      blocks.push({ type: 'table', header, rows });
      continue;
    }
    if (isBullet(line)) {
      const items = [];
      while (i < lines.length && isBullet(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++; }
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (isNum(line)) {
      const items = [];
      while (i < lines.length && isNum(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
      blocks.push({ type: 'ol', items });
      continue;
    }
    if (isHead(line)) { blocks.push({ type: 'h', text: line.replace(/^#{1,4}\s+/, '') }); i++; continue; }
    if (line.trim() === '') { i++; continue; }
    const para = [line]; i++;
    while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('|') && !isBullet(lines[i]) && !isNum(lines[i]) && !isHead(lines[i])) { para.push(lines[i]); i++; }
    blocks.push({ type: 'p', text: para.join(' ') });
  }
  return blocks;
}

function Markdown({ text }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((b, bi) => {
        if (b.type === 'h') return <p key={bi} className="font-semibold text-gray-900">{inline(b.text, `h${bi}`)}</p>;
        if (b.type === 'p') return <p key={bi}>{inline(b.text, `p${bi}`)}</p>;
        if (b.type === 'ul') return <ul key={bi} className="list-disc pl-4 space-y-0.5">{b.items.map((it, ii) => <li key={ii}>{inline(it, `u${bi}-${ii}`)}</li>)}</ul>;
        if (b.type === 'ol') return <ol key={bi} className="list-decimal pl-4 space-y-0.5">{b.items.map((it, ii) => <li key={ii}>{inline(it, `o${bi}-${ii}`)}</li>)}</ol>;
        if (b.type === 'table') return (
          <div key={bi} className="overflow-x-auto -mx-1">
            <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>{b.header.map((h, hi) => <th key={hi} className="px-2.5 py-1.5 text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">{inline(h, `th${bi}-${hi}`)}</th>)}</tr>
              </thead>
              <tbody>
                {b.rows.map((r, ri) => (
                  <tr key={ri} className="even:bg-gray-50/60">
                    {r.map((c, ci) => <td key={ci} className="px-2.5 py-1.5 text-gray-700 border-b border-gray-100 whitespace-nowrap">{inline(c, `td${bi}-${ri}-${ci}`)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        return null;
      })}
    </div>
  );
}

const BotIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);

export default function AssistantWidget() {
  const { user } = useAuth();
  const { ai } = useAiConfig();
  const { isEnabled } = useFeatures();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const assistant = ai?.assistant;
  const botName = assistant?.name || 'Custally Assistant';
  const available = !!user && isEnabled('ai') && isEnabled('assistant') && !!ai?.enabled && assistant?.enabled !== false;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!available) return null;

  const send = async (override) => {
    const text = (override != null ? override : input).trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/dropdown-config', { action: 'ai_chat', messages: next });
      setMessages(m => [...m, { role: 'assistant', content: data.text || '' }]);
    } catch (e) {
      setError(e.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const SUGGESTIONS = [
    'How many open escalations do we have?',
    'Show my Red accounts by MRR',
    'Break down issues by priority',
    'Which accounts renew in the next 60 days?',
  ];

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-50 bottom-20 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 pl-3.5 pr-4 py-3 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/30 transition group"
          aria-label={`Open ${botName}`}
        >
          <BotIcon className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">Ask {botName.split(' ')[0]}</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed z-50 bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[400px] h-[100dvh] sm:h-[620px] sm:max-h-[calc(100vh-3rem)] flex flex-col bg-white sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <BotIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{botName}</p>
                <p className="text-[11px] text-white/70 leading-tight">AI assistant · sees your data</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={() => { setMessages([]); setError(''); }} title="New chat" className="p-1.5 rounded-lg hover:bg-white/15 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
              )}
              <button onClick={() => setOpen(false)} title="Close" className="p-1.5 rounded-lg hover:bg-white/15 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center mx-auto mb-3">
                  <BotIcon className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-gray-800">{assistant?.greeting || `Hi ${user?.name?.split(' ')[0] || 'there'}! I'm ${botName}.`}</p>
                <p className="text-xs text-gray-500 mt-1 px-4">Ask me about your accounts, issues, escalations, tasks or feature requests.</p>
                <div className="mt-4 space-y-1.5">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="block w-full text-left text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-brand-300 hover:text-brand-700 transition">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${m.role === 'user' ? 'bg-brand-600 text-white rounded-br-md' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'}`}>
                  {m.role === 'user'
                    ? <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    : <Markdown text={m.content} />}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-gray-200 p-2.5 bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={`Ask ${botName.split(' ')[0]}…`}
                className="flex-1 resize-none !py-2 text-sm max-h-28"
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="shrink-0 w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition disabled:opacity-40"
                aria-label="Send"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">{botName} can make mistakes. Verify important numbers.</p>
          </div>
        </div>
      )}
    </>
  );
}
