import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Send, LogOut,
  Trash2, ShieldCheck, Plus, BookOpen, FileText,
  ChevronRight, Users, AlertCircle,
  UploadCloud, BarChart2, Zap, Clock, CheckCircle2,
  Copy, Check, ThumbsUp, ThumbsDown,
  TrendingUp, AlertTriangle, Activity, X, Radio, Lock, WifiOff, Paperclip
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://scholrvs.onrender.com';

const FONT = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
  * { font-family: 'Inter', system-ui, sans-serif; }
  .serif { font-family: 'Instrument Serif', Georgia, serif; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  .shake { animation: shake 0.35s ease-in-out; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .fade-up { animation: fadeUp 0.4s ease forwards; }
`;

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatRelativeDate(date) {
  const now = new Date(), d = new Date(date), diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000), diffHours = Math.floor(diffMs / 3600000), diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function cleanFileName(name) {
  return name.replace(/\.(pdf|jpg|jpeg|png|webp)$/i, '').replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
function getTopicColor(topic) {
  const colors = {
    'Grading': 'bg-violet-50 text-violet-700 border-violet-200',
    'Logistics': 'bg-sky-50 text-sky-700 border-sky-200',
    'Concepts': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Exam Prep': 'bg-amber-50 text-amber-700 border-amber-200',
    'Materials': 'bg-rose-50 text-rose-700 border-rose-200',
    'General': 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return colors[topic] || colors['General'];
}

// ── Logo mark ─────────────────────────────────────────────────────────────────
function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="#0F0F0F"/>
      <path d="M8 10h8M8 14h12M8 18h6" stroke="white" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  );
}

// ── Password Gate ─────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }), signal: AbortSignal.timeout(60000) });
      if (res.ok) { onUnlock(); return; }
      setError(true); setShaking(true); setPassword('');
      setTimeout(() => { setShaking(false); setError(false); }, 1500);
    } catch {
      setError(true); setShaking(true); setPassword('');
      setTimeout(() => { setShaking(false); setError(false); }, 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
      <style>{FONT}</style>
      <div className="mb-10 flex items-center gap-3">
        <Logo size={32} />
        <span className="text-gray-900 font-semibold text-lg tracking-tight">Scholr</span>
      </div>
      <div className={`w-full max-w-xs px-4 ${shaking ? 'shake' : ''}`}>
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mx-auto mb-5">
            <Lock size={18} className="text-gray-400" />
          </div>
          <h1 className="serif text-3xl text-gray-900 mb-1.5">Restricted access</h1>
          <p className="text-gray-400 text-sm">Enter your course access code</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className={`bg-white border rounded-xl px-4 py-3 transition-all ${error ? 'border-red-300' : 'border-gray-200 focus-within:border-gray-400 focus-within:shadow-sm'}`}>
            <input ref={inputRef} type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-transparent text-gray-900 text-sm outline-none placeholder-gray-300 tracking-widest"
              placeholder="••••••••" />
          </div>
          {error && <p className="text-red-500 text-xs text-center">Incorrect code — try again</p>}
          <button type="submit" disabled={!password.trim() || loading}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {loading ? 'Verifying...' : 'Continue'}
          </button>
        </form>
        {loading && <p className="text-center text-gray-300 text-xs mt-3">Server may take a moment to wake up...</p>}
      </div>
      <p className="mt-12 text-gray-300 text-xs tracking-wide">SCHOLR · PRIVATE BETA</p>
    </div>
  );
}

// ── Markdown rendering ────────────────────────────────────────────────────────
function PlainMessage({ content }) {
  return <p className="m-0 leading-relaxed whitespace-pre-wrap text-gray-800">{content}</p>;
}
function MarkdownMessage({ content }) {
  const cleanContent = content.replace(/\nSOURCES:.*$/m, '').trim();
  return (
    <div className="text-sm leading-relaxed text-gray-800 prose-scholr">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0 text-gray-800">{children}</p>,
        h1: ({ children }) => <h1 className="text-base font-semibold text-gray-900 mt-4 mb-2 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-semibold text-gray-900 mt-4 mb-1.5 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-medium text-gray-900 mt-3 mb-1 first:mt-0">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc list-outside pl-5 my-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside pl-5 my-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-gray-700">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
        code: ({ inline, children }) => inline
          ? <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px] text-gray-800 font-mono border border-gray-200">{children}</code>
          : <code className="block bg-gray-50 border border-gray-200 rounded-lg p-3 my-2 overflow-x-auto text-[12px] text-gray-800 font-mono">{children}</code>,
        pre: ({ children }) => <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 my-2 overflow-x-auto text-[12px] font-mono">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-4 italic text-gray-500 my-3">{children}</blockquote>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-gray-900 underline underline-offset-2 hover:text-gray-600">{children}</a>,
        hr: () => <hr className="my-4 border-gray-100" />,
        table: ({ children }) => <div className="overflow-x-auto my-3 rounded-lg border border-gray-200"><table className="border-collapse w-full">{children}</table></div>,
        th: ({ children }) => <th className="border-b border-gray-200 px-4 py-2.5 text-left text-gray-700 font-medium text-xs bg-gray-50 uppercase tracking-wide">{children}</th>,
        td: ({ children }) => <td className="border-b border-gray-100 px-4 py-2.5 text-gray-700 text-xs last:border-0">{children}</td>,
      }}>{cleanContent}</ReactMarkdown>
    </div>
  );
}
function MessageText({ role, content }) {
  if (role === 'user') return <PlainMessage content={content} />;
  return <MarkdownMessage content={content} />;
}

function ErrorMessage({ content }) {
  const isNetwork = content.includes('unreachable') || content.includes('network');
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
      <WifiOff size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm text-red-700 font-medium">{isNetwork ? 'Connection issue' : 'Something went wrong'}</p>
        <p className="text-xs text-red-400 mt-0.5">{isNetwork ? 'The server may be starting up. Wait a moment and try again.' : 'Please try your question again.'}</p>
      </div>
    </div>
  );
}

// ── Document Card (Teacher) ───────────────────────────────────────────────────
function DocumentCard({ m, onDelete }) {
  const displayName = cleanFileName(m.name);
  const isImg = /\.(jpg|jpeg|png|webp)$/i.test(m.name);
  return (
    <div className="group bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-150">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
          {isImg ? <span className="text-white text-[10px] font-bold">IMG</span> : <FileText size={14} className="text-white" />}
        </div>
        <button onClick={() => onDelete(m)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400">
          <Trash2 size={12} />
        </button>
      </div>
      <p className="text-gray-900 text-sm font-medium leading-snug mb-1 line-clamp-2">{displayName}</p>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          <span className="text-[11px] text-gray-400">Live</span>
        </div>
        <span className="text-[11px] text-gray-300">{m.sizeKb || 0}kb · {formatRelativeDate(m.uploaded)}</span>
      </div>
    </div>
  );
}

// ── Loading Screen ────────────────────────────────────────────────────────────
function LoadingScreen({ label }) {
  return (
    <div className="fixed inset-0 bg-[#FAFAFA] flex flex-col items-center justify-center z-50">
      <style>{FONT}</style>
      <Logo size={36} />
      <p className="text-gray-400 text-sm mt-5 mb-8">{label}</p>
      <div className="flex gap-1.5">
        {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
      </div>
    </div>
  );
}

// ── Classroom Mode ────────────────────────────────────────────────────────────
function ClassroomMode({ onExit }) {
  const [questions, setQuestions] = useState([]);
  const [newCount, setNewCount] = useState(0);
  const [lastSeen, setLastSeen] = useState(Date.now());

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API}/insights`);
        const data = await res.json();
        const incoming = (data.recent || []).filter(q => new Date(q.ts).getTime() > lastSeen - 30000);
        if (incoming.length > questions.length) setNewCount(incoming.length - questions.length);
        setQuestions(incoming.slice(0, 20));
      } catch {}
    };
    poll();
    const i = setInterval(poll, 8000);
    return () => clearInterval(i);
  }, [questions.length, lastSeen]);

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col z-50">
      <style>{FONT}</style>
      <div className="flex items-center justify-between px-10 py-5 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Logo size={28} />
          <span className="text-white font-semibold tracking-tight">Scholr</span>
          <div className="flex items-center gap-2 ml-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/25">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></div>
            <span className="text-red-400 text-xs font-medium tracking-wide">LIVE</span>
          </div>
        </div>
        <button onClick={onExit} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 text-sm transition-colors">
          <X size={14} /> End Session
        </button>
      </div>
      {newCount > 0 && (
        <button onClick={() => { setNewCount(0); setLastSeen(Date.now()); }}
          className="mx-8 mt-4 flex items-center justify-between px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors">
          <span>{newCount} new question{newCount > 1 ? 's' : ''}</span>
          <span className="text-gray-500 text-xs">Dismiss</span>
        </button>
      )}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Radio size={24} className="text-gray-600 mb-4" />
            <p className="text-gray-400 font-medium mb-1">Waiting for questions</p>
            <p className="text-gray-600 text-sm">Students are using the portal now</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">
            {questions.map((q, i) => (
              <div key={q.id || i} className="px-5 py-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white text-sm leading-relaxed">{q.question}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-gray-500 text-xs">{formatRelativeDate(q.ts)}</span>
                  {!q.confident && <span className="text-amber-400 text-xs">Needs review</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-8 py-4 border-t border-white/10 text-center">
        <p className="text-gray-600 text-xs">Updates every 8 seconds</p>
      </div>
    </div>
  );
}

// ── Student Insights ──────────────────────────────────────────────────────────
function StudentInsights({ onStartClassMode }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [lastCount, setLastCount] = useState(0);

  const fetchInsights = async () => {
    try {
      const res = await fetch(`${API}/insights`);
      const data = await res.json();
      if (lastCount > 0 && data.totalQuestions > lastCount) setNewCount(data.totalQuestions - lastCount);
      setLastCount(data.totalQuestions);
      setInsights(data);
      setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => {
    fetchInsights();
    const i = setInterval(fetchInsights, 10000);
    return () => clearInterval(i);
  }, [lastCount]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="flex gap-1.5">{[0,150,300].map(d=><div key={d} className="w-1.5 h-1.5 rounded-full bg-gray-200 animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</div></div>;

  const noData = !insights || insights.totalQuestions === 0;
  const formatTimeSaved = () => {
    const h = insights.timeSavedHours, m = insights.timeSavedMinutes;
    if (h === 0 && m === 0) return <span>0<span className="text-sm font-normal text-gray-400 ml-1">min</span></span>;
    return (<>{h > 0 && <>{h}<span className="text-sm font-normal text-gray-400 ml-1">hr </span></>}{m > 0 && <>{m}<span className="text-sm font-normal text-gray-400 ml-1">min</span></>}</>);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-gray-900 text-sm font-semibold">Student Insights</h2>
          <p className="text-gray-400 text-xs mt-0.5">Live activity from your class</p>
        </div>
        <button onClick={onStartClassMode} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors">
          <Radio size={12} />Live Mode
        </button>
      </div>

      {newCount > 0 && (
        <button onClick={() => { setNewCount(0); fetchInsights(); }} className="w-full mb-5 flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-sm hover:bg-gray-100 transition-colors">
          <span className="flex items-center gap-2 text-xs"><Activity size={13} />{newCount} new question{newCount > 1 ? 's' : ''}</span>
          <span className="text-gray-400 text-xs">Refresh</span>
        </button>
      )}

      {noData ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <BarChart2 size={24} className="text-gray-200 mb-4" />
          <h3 className="text-gray-600 font-medium text-sm mb-1">No activity yet</h3>
          <p className="text-gray-400 text-xs max-w-xs">Student questions will appear here as they use the portal.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Time saved this week', value: formatTimeSaved(), sub: `${insights.weekQuestions} questions` },
              { label: 'Total questions', value: insights.totalQuestions, sub: `${insights.weekQuestions} this week` },
              { label: 'Last question', value: insights.lastQuestion ? <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{insights.lastQuestion.question}</p> : <span>—</span>, sub: insights.lastQuestion ? formatRelativeDate(insights.lastQuestion.ts) : '' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mb-2">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.sub}</p>
              </div>
            ))}
          </div>

          {insights.topTopics?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4"><TrendingUp size={13} className="text-gray-400" /><h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Top Topics</h3></div>
              <div className="space-y-3">
                {insights.topTopics.map(t => (
                  <div key={t.topic} className="flex items-center gap-3">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border w-24 text-center flex-shrink-0 ${getTopicColor(t.topic)}`}>{t.topic}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-900 rounded-full transition-all" style={{ width: `${Math.round((t.count / insights.weekQuestions) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.flagged?.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <div className="flex items-center gap-2 mb-3"><AlertTriangle size={13} className="text-amber-500" /><h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Flagged Questions</h3><span className="ml-auto text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{insights.flagged.length}</span></div>
              <p className="text-xs text-amber-600 mb-3">ScholrAI wasn't confident on these — consider uploading more material.</p>
              <div className="space-y-2">
                {insights.flagged.slice(0, 5).map((q, i) => (
                  <div key={q.id || i} className="flex items-start gap-2 px-3 py-2.5 bg-white rounded-lg border border-amber-100">
                    <AlertTriangle size={10} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-700">{q.question}</p>
                    <span className="ml-auto text-[10px] text-gray-300 flex-shrink-0">{formatRelativeDate(q.ts)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={13} className="text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Recent Questions</h3>
              <div className="ml-auto flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div><span className="text-[10px] text-gray-400">Live</span></div>
            </div>
            <div className="space-y-1">
              {insights.recent.slice(0, 15).map((q, i) => {
                const text = q.question.toLowerCase();
                const label = /grade|score|percent|exam|quiz/.test(text) ? 'Grading' : /when|due|deadline|schedule/.test(text) ? 'Logistics' : /how|what|explain|define/.test(text) ? 'Concepts' : /study|prepare|focus|review/.test(text) ? 'Exam Prep' : 'General';
                return (
                  <div key={q.id || i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${getTopicColor(label)}`}>{label}</span>
                        {!q.confident && <span className="text-[10px] text-amber-500">Flagged</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-300 flex-shrink-0 mt-1">{formatRelativeDate(q.ts)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DEFAULT_QUESTIONS = [
  "What are the main topics in this course?",
  "Summarize the key concepts from the materials",
  "What should I focus on for the exam?",
];

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onSelect }) {
  const [loading, setLoading] = useState(null);

  const handleSelect = async (role) => {
    setLoading(role);
    if (role === 'student') {
      try {
        const [docsRes, qRes] = await Promise.all([fetch(`${API}/documents`), fetch(`${API}/suggested-questions`)]);
        const docs = await docsRes.json();
        const qData = await qRes.json();
        const questions = qData.questions?.length ? qData.questions : DEFAULT_QUESTIONS;
        await new Promise(r => setTimeout(r, 400));
        onSelect(role, { questions, documents: Array.isArray(docs) ? docs : [] });
      } catch {
        await new Promise(r => setTimeout(r, 400));
        onSelect(role, { questions: DEFAULT_QUESTIONS, documents: [] });
      }
    } else {
      await new Promise(r => setTimeout(r, 400));
      onSelect(role, {});
    }
  };

  if (loading) return <LoadingScreen label={loading === 'student' ? 'Loading your portal...' : 'Loading instructor view...'} />;

  return (
    <div className="min-h-screen w-screen bg-[#FAFAFA] flex flex-col">
      <style>{FONT}</style>
      <nav className="flex items-center justify-between px-10 py-5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <span className="text-gray-900 font-semibold tracking-tight">Scholr</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          Google Vertex AI
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium mb-8">
              Course-grounded AI tutoring
            </div>
            <h1 className="serif text-[64px] leading-[1.1] text-gray-900 mb-5">
              Every answer from<br />
              <span className="italic">your course materials</span>
            </h1>
            <p className="text-gray-500 text-base max-w-sm mx-auto leading-relaxed">
              AI tutoring grounded in what your professor uploaded. Cited, accurate, trustworthy.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto mb-10">
            <button onClick={() => handleSelect('student')}
              className="group text-left p-6 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200">
              <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center mb-5">
                <Users size={16} className="text-white" />
              </div>
              <h2 className="text-gray-900 font-semibold text-sm mb-1">Student</h2>
              <p className="text-gray-400 text-xs leading-relaxed mb-5">Ask questions, get cited answers from course materials.</p>
              <div className="flex items-center gap-1 text-gray-900 text-xs font-medium">
                Enter portal <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            <button onClick={() => handleSelect('teacher')}
              className="group text-left p-6 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200">
              <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center mb-5">
                <BookOpen size={16} className="text-white" />
              </div>
              <h2 className="text-gray-900 font-semibold text-sm mb-1">Instructor</h2>
              <p className="text-gray-400 text-xs leading-relaxed mb-5">Upload materials, deploy an AI tutor for your class.</p>
              <div className="flex items-center gap-1 text-gray-900 text-xs font-medium">
                Enter portal <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
            <span>🔒 FERPA aligned</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span>Answers from your materials only</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span>Powered by Google Vertex AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Teacher View ──────────────────────────────────────────────────────────────
function TeacherView({ onExit }) {
  const [mods, setMods] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('materials');
  const [classroomMode, setClassroomMode] = useState(false);
  const fileRef = useRef(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch(`${API}/documents`).then(r => r.json()).then(data => {
      const docs = Array.isArray(data) ? data : (data.documents || []);
      setMods(docs.map(d => ({ id: d.name, name: d.name, sizeKb: d.sizeKb, uploaded: new Date(d.uploadedAt) })));
    }).catch(() => showToast('Could not connect to server.', 'error'));
  }, []);

  const handleFile = async (file) => {
    const supported = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    if (!file || !supported.some(ext => file.name.toLowerCase().endsWith(ext))) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setMods(prev => [{ id: data.fileName, name: data.fileName, sizeKb: data.sizeKb, uploaded: new Date() }, ...prev]);
        showToast(`${file.name} uploaded`);
      } else { showToast(data.error || 'Upload failed', 'error'); }
    } catch { showToast('Server unreachable', 'error'); }
    setUploading(false);
  };

  const onUpload = (e) => { handleFile(e.target.files[0]); e.target.value = ''; };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };
  const onDelete = async (mod) => {
    setMods(prev => prev.filter(m => m.id !== mod.id));
    await fetch(`${API}/document/${encodeURIComponent(mod.name)}`, { method: 'DELETE' });
    showToast(`${cleanFileName(mod.name)} removed`);
  };

  if (classroomMode) return <ClassroomMode onExit={() => setClassroomMode(false)} />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F7F7] fixed inset-0">
      <style>{FONT}</style>
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5 mb-5">
            <Logo size={24} />
            <span className="text-gray-900 font-semibold text-sm">Scholr</span>
          </div>
          <div className="bg-gray-900 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-2"><BookOpen size={12} className="text-gray-400" /><span className="text-white text-xs font-medium">Instructor</span></div>
            <p className="text-gray-500 text-[10px] mt-0.5">Course management</p>
          </div>
        </div>
        <nav className="p-3 flex-1">
          {[
            { id: 'materials', label: 'Materials', icon: FileText },
            { id: 'insights', label: 'Insights', icon: BarChart2 },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors mb-0.5 ${activeTab === id ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div><span className="text-[10px] text-gray-400">Vertex AI connected</span></div>
          <button onClick={onExit} className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-xs"><LogOut size={12} />Exit</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'materials' ? (
          <>
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex-shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-gray-900 text-sm font-semibold">Course Materials</h2>
                <p className="text-gray-400 text-xs mt-0.5">{mods.length} file{mods.length !== 1 ? 's' : ''} indexed · live for all students</p>
              </div>
              <div className="flex items-center gap-3">
                <input type="file" ref={fileRef} onChange={onUpload} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" />
                <button onClick={() => fileRef.current.click()} disabled={uploading}
                  className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors">
                  <UploadCloud size={13} />{uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-8">
              {mods.length === 0 ? (
                <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} onClick={() => fileRef.current.click()}
                  className={`flex flex-col items-center justify-center h-56 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <UploadCloud size={24} className="text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm font-medium mb-1">{dragOver ? 'Drop to upload' : 'Upload course materials'}</p>
                  <p className="text-gray-400 text-xs">PDF, JPG, PNG — drag and drop or click</p>
                </div>
              ) : (
                <div>
                  <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} onClick={() => fileRef.current.click()}
                    className={`mb-6 flex items-center gap-3 px-5 py-3 rounded-xl border border-dashed cursor-pointer transition-all ${dragOver ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <UploadCloud size={14} className="text-gray-300" />
                    <span className="text-gray-400 text-xs">Drop another file — PDF or image</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {mods.map(m => <DocumentCard key={m.id} m={m} onDelete={onDelete} />)}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : <StudentInsights onStartClassMode={() => setClassroomMode(true)} />}
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-xl text-white text-xs font-medium shadow-xl z-50 ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900'}`}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Student Note Upload ───────────────────────────────────────────────────────
function StudentNoteUpload({ myDocs, onFilesChange }) {
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    const supported = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    if (!file || !supported.some(ext => file.name.toLowerCase().endsWith(ext))) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const ext = file.name.toLowerCase().split('.').pop();
      const mimeMap = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      const mimeType = mimeMap[ext] || 'application/pdf';
      const newDoc = { name: file.name, buffer: e.target.result, size: Math.round(file.size / 1024), mimeType };
      onFilesChange([newDoc, ...myDocs.filter(d => d.name !== file.name)]);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="px-3 py-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">My Notes</p>
        <button onClick={() => fileRef.current.click()} className="text-[10px] text-gray-500 hover:text-gray-800 font-medium transition-colors flex items-center gap-1">
          <Plus size={10} />Add
        </button>
      </div>
      <input type="file" ref={fileRef} onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" />

      {myDocs.length === 0 ? (
        <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current.click()}
          className={`flex flex-col items-center justify-center py-4 rounded-lg border border-dashed cursor-pointer transition-all ${dragOver ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
          <UploadCloud size={14} className="text-gray-300 mb-1.5" />
          <p className="text-[11px] text-gray-400">Drop notes or photos</p>
          <p className="text-[10px] text-gray-300">PDF or image · session only</p>
        </div>
      ) : (
        <div className="space-y-1">
          {myDocs.map((doc, i) => (
            <div key={i} className="group flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 border border-gray-100">
              <FileText size={11} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-700 font-medium truncate">{cleanFileName(doc.name)}</p>
              </div>
              <button onClick={() => onFilesChange(myDocs.filter(d => d.name !== doc.name))} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400">
                <X size={10} />
              </button>
            </div>
          ))}
          <button onClick={() => fileRef.current.click()} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-gray-200 hover:border-gray-300 transition-colors cursor-pointer">
            <Plus size={10} className="text-gray-300" />
            <span className="text-[11px] text-gray-400">Add another</span>
          </button>
        </div>
      )}
      {myDocs.length > 0 && (
        <p className="text-[10px] text-gray-400 mt-2 px-1">AI reads your notes + course materials</p>
      )}
    </div>
  );
}

// ── Student View ──────────────────────────────────────────────────────────────
function StudentView({ onExit, initialQuestions, initialDocuments }) {
  const [chats, setChats] = useState([{ id: 1, title: 'New Chat', messages: [] }]);
  const [chatId, setChatId] = useState(1);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [documents] = useState(initialDocuments || []);
  const [suggestedQuestions] = useState(initialQuestions || DEFAULT_QUESTIONS);
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [myNotes, setMyNotes] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const paperclipRef = useRef(null);

  const active = chats.find(c => c.id === chatId) || chats[0];
  const scrollToBottom = () => { setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 50); };
  useEffect(() => { scrollToBottom(); }, [active.messages, isTyping]);

  const handlePaperclipFile = (file) => {
    if (!file) return;
    const supported = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    if (!supported.some(ext => file.name.toLowerCase().endsWith(ext))) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const ext = file.name.toLowerCase().split('.').pop();
      const mimeMap = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      const mimeType = mimeMap[ext] || 'application/pdf';
      setMyNotes(prev => [{ name: file.name, buffer: e.target.result, size: Math.round(file.size / 1024), mimeType }, ...prev.filter(d => d.name !== file.name)]);
    };
    reader.readAsArrayBuffer(file);
  };

  const createNewChat = () => {
    const nc = { id: Date.now(), title: 'New Chat', messages: [] };
    setChats(prev => [...prev, nc]);
    setChatId(nc.id);
  };

  const generateAITitle = async (question, answer) => {
    try {
      const res = await fetch(`${API}/generate-title`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, answer }) });
      const data = await res.json();
      return data.title || question.trim().split(/\s+/).slice(0, 4).join(' ');
    } catch {
      return question.trim().split(/\s+/).slice(0, 4).join(' ');
    }
  };

  const copyMessage = (content, id) => {
    navigator.clipboard.writeText(content.replace(/\nSOURCES:.*$/m, '').trim());
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const giveFeedback = (id, type) => {
    setFeedback(prev => ({ ...prev, [id]: prev[id] === type ? null : type }));
  };

  const onSend = async (messageOverride) => {
    const message = messageOverride || input;
    if (!message.trim() || isTyping) return;

    const userMsg = { role: 'user', content: message, sources: [], ts: Date.now() };
    const isFirstMessage = active.messages.length === 0;
    const currentChatId = chatId;
    const completedMessages = active.messages.filter(m => !m.streaming);

    setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: [...c.messages, userMsg] } : c));
    setInput('');
    setIsTyping(true);

    const streamingMsgId = Date.now();
    setChats(prev => prev.map(c => c.id === currentChatId
      ? { ...c, messages: [...c.messages, { id: streamingMsgId, role: 'assistant', content: '', sources: [], ts: Date.now(), streaming: true }] } : c));

    try {
      let response;
      if (myNotes.length > 0) {
        const fd = new FormData();
        fd.append('message', message);
        fd.append('history', JSON.stringify(completedMessages.map(m => ({ role: m.role, content: m.content }))));
        myNotes.forEach((n, i) => fd.append(`note_${i}`, new Blob([n.buffer], { type: n.mimeType || 'application/pdf' }), n.name));
        response = await fetch(`${API}/chat`, { method: 'POST', body: fd });
      } else {
        response = await fetch(`${API}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, history: completedMessages.map(m => ({ role: m.role, content: m.content })) }) });
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'token') {
              setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: m.content + event.token } : m) } : c));
              scrollToBottom();
            } else if (event.type === 'sources') {
              setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, sources: event.sources } : m) } : c));
            } else if (event.type === 'done') {
              setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, streaming: false } : m) } : c));
              if (isFirstMessage) {
                const currentMsgs = (await new Promise(resolve => { setChats(prev => { resolve(prev); return prev; }); })).find(c => c.id === currentChatId)?.messages || [];
                const aiContent = currentMsgs.find(m => m.id === streamingMsgId)?.content || '';
                generateAITitle(message, aiContent).then(title => {
                  setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, title } : c));
                });
              }
            } else if (event.type === 'error') {
              setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: 'error:' + event.error, streaming: false, isError: true } : m) } : c));
            }
          } catch {}
        }
      }
    } catch {
      setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: 'error:network', streaming: false, isError: true } : m) } : c));
    }
    setIsTyping(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden fixed inset-0 bg-white">
      <style>{FONT}</style>

      {/* Sidebar */}
      <aside className="w-56 bg-[#F7F7F7] border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5 mb-4">
            <Logo size={24} />
            <span className="text-gray-900 font-semibold text-sm">Scholr</span>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
            <p className="text-gray-900 text-xs font-medium">Student Portal</p>
            <p className="text-gray-400 text-[10px] mt-0.5">{documents.length} course doc{documents.length !== 1 ? 's' : ''} · {myNotes.length} note{myNotes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="px-3 pt-3">
          <button onClick={createNewChat} className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors">
            <Plus size={12} />New chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <p className="text-[10px] text-gray-400 font-medium px-2 mb-2 uppercase tracking-widest">Chats</p>
          {chats.map(c => (
            <button key={c.id} onClick={() => setChatId(c.id)}
              className={`flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors mb-0.5 ${c.id === chatId ? 'bg-white border border-gray-200 text-gray-900 font-medium shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-700'}`}>
              <MessageSquare size={11} className="flex-shrink-0 opacity-40" />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </nav>

        <StudentNoteUpload myDocs={myNotes} onFilesChange={setMyNotes} />

        <div className="p-4 border-t border-gray-200">
          <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Answers grounded in course materials{myNotes.length > 0 ? ' + your notes' : ''}</p>
          <button onClick={onExit} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-xs"><LogOut size={11} />Exit</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-gray-900 text-sm font-medium">{active.title}</h2>
            {myNotes.length > 0 && (
              <span className="text-[11px] text-gray-400">· {myNotes.length} note{myNotes.length > 1 ? 's' : ''} active</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
            AI Active
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-8 flex flex-col gap-5">
          {active.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 pb-10 fade-up">
              {documents.length === 0 && myNotes.length === 0 ? (
                <div className="text-center max-w-xs">
                  <Clock size={20} className="text-gray-200 mx-auto mb-4" />
                  <h3 className="text-gray-700 font-medium text-sm mb-1">Setting up your course</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">Your instructor is uploading materials. You can also add personal notes in the sidebar.</p>
                </div>
              ) : (
                <div className="text-center max-w-md w-full">
                  <Logo size={36} />
                  <h3 className="text-gray-900 font-semibold text-lg mt-5 mb-1.5">Ask anything about your course</h3>
                  <p className="text-gray-400 text-sm mb-8">Every answer is grounded in your professor's materials — cited and accurate.</p>
                  <div className="space-y-2 text-left">
                    {suggestedQuestions.map((q, i) => (
                      <button key={i} onClick={() => onSend(q)}
                        className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-sm hover:bg-gray-100 hover:border-gray-300 transition-all group">
                        <span className="text-gray-300 mr-2 text-xs font-mono">{i + 1}.</span>{q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {active.messages.map((m, i) => {
            const msgId = m.id || i;
            const fb = feedback[msgId];
            const isError = m.isError || m.content?.startsWith('error:');
            return (
              <div key={msgId} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col ${m.role === 'user' ? 'items-end max-w-xl' : 'items-start max-w-2xl w-full'}`}>
                  <div className={`rounded-2xl text-sm w-full ${m.role === 'user' ? 'bg-gray-900 text-white px-4 py-3 rounded-br-sm' : 'text-gray-800'}`}>
                    {m.role === 'assistant' && m.content === '' && m.streaming ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="flex gap-1">
                          {[0,150,300].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                        </div>
                        <span className="text-xs text-gray-400">Reading your materials...</span>
                      </div>
                    ) : isError ? (
                      <ErrorMessage content={m.content} />
                    ) : (
                      <MessageText role={m.role} content={m.content} />
                    )}
                    {m.role === 'assistant' && m.streaming && m.content && (
                      <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
                    )}
                    {m.role === 'assistant' && m.sources?.length > 0 && !m.streaming && !isError && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-gray-300 uppercase tracking-wide mr-0.5">From</span>
                        {m.sources.map((source, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-[11px] font-medium">
                            <FileText size={9} className="flex-shrink-0" />
                            <span className="max-w-[200px] truncate">{cleanFileName(source)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {m.role === 'user' && <span className="block text-[10px] mt-1.5 opacity-30">{formatTime(m.ts)}</span>}
                  </div>

                  {m.role === 'assistant' && !m.streaming && m.content && !isError && (
                    <div className="flex items-center gap-0.5 mt-1.5">
                      <button onClick={() => copyMessage(m.content, msgId)} className={`p-1.5 rounded-lg transition-colors ${copiedId === msgId ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}>
                        {copiedId === msgId ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                      <button onClick={() => giveFeedback(msgId, 'up')} className={`p-1.5 rounded-lg transition-colors ${fb === 'up' ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}>
                        <ThumbsUp size={12} />
                      </button>
                      <button onClick={() => giveFeedback(msgId, 'down')} className={`p-1.5 rounded-lg transition-colors ${fb === 'down' ? 'text-red-400' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}>
                        <ThumbsDown size={12} />
                      </button>
                      <span className="text-[10px] text-gray-200 ml-1.5">{formatTime(m.ts)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-8 py-4 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="flex gap-3 items-center max-w-3xl mx-auto">
            <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-gray-400 focus-within:bg-white focus-within:shadow-sm transition-all gap-2.5">
              <button onClick={() => paperclipRef.current?.click()} title="Attach file"
                className="flex-shrink-0 text-gray-300 hover:text-gray-600 transition-colors p-0.5">
                <Paperclip size={15} />
              </button>
              <input ref={paperclipRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={e => { handlePaperclipFile(e.target.files[0]); e.target.value = ''; }} />
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
                className="flex-1 bg-transparent text-gray-800 text-sm outline-none placeholder-gray-400"
                placeholder={myNotes.length > 0 ? "Ask about your course + notes..." : "Ask about your course..."} />
            </div>
            <button onClick={() => onSend()} disabled={!input.trim() || isTyping}
              className="w-10 h-10 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-white flex items-center justify-center flex-shrink-0 transition-colors">
              <Send size={14} />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-300 mt-2">
            {myNotes.length > 0 ? `${documents.length} course doc${documents.length !== 1 ? 's' : ''} + ${myNotes.length} note${myNotes.length !== 1 ? 's' : ''} · Vertex AI` : 'Grounded in your course materials · Vertex AI'}
          </p>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [role, setRole] = useState(null);
  const [preloaded, setPreloaded] = useState({});
  const handleSelect = (role, data) => { setPreloaded(data || {}); setRole(role); };
  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  if (!role) return <LoginScreen onSelect={handleSelect} />;
  if (role === 'teacher') return <TeacherView onExit={() => setRole(null)} />;
  return <StudentView onExit={() => setRole(null)} initialQuestions={preloaded.questions} initialDocuments={preloaded.documents} />;
}
