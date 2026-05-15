import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Send, LogOut,
  Trash2, ShieldCheck, Plus, BookOpen, FileText,
  ChevronRight, Users, AlertCircle,
  UploadCloud, BarChart2, Zap, Clock, Hash, CheckCircle2,
  Copy, Check, ThumbsUp, ThumbsDown, Sparkles,
  TrendingUp, AlertTriangle, Activity, X, Radio, Lock, WifiOff
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://scholrvs.onrender.com';

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeDate(date) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function cleanFileName(name) {
  return name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getTopicColor(topic) {
  const colors = {
    'Grading': 'bg-violet-50 text-violet-600 border-violet-100',
    'Logistics': 'bg-blue-50 text-blue-600 border-blue-100',
    'Concepts': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Exam Prep': 'bg-orange-50 text-orange-600 border-orange-100',
    'Materials': 'bg-pink-50 text-pink-600 border-pink-100',
    'General': 'bg-gray-50 text-gray-500 border-gray-100',
  };
  return colors[topic] || colors['General'];
}

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
      const res = await fetch(`${API}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(60000),
      });
      if (res.ok) {
        onUnlock();
      } else {
        setError(true);
        setShaking(true);
        setPassword('');
        setTimeout(() => { setShaking(false); setError(false); }, 1500);
      }
    } catch {
      setError(true);
      setShaking(true);
      setPassword('');
      setTimeout(() => { setShaking(false); setError(false); }, 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-screen bg-white flex flex-col items-center justify-center" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        .serif { font-family: 'DM Serif Display', Georgia, serif; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
        .shake { animation: shake 0.4s ease-in-out; }
      `}</style>
      <div className="flex items-center gap-2.5 mb-12">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm"><Sparkles size={17} className="text-white" /></div>
        <span className="text-gray-900 font-semibold text-xl tracking-tight">ScholrAI</span>
      </div>
      <div className={`w-full max-w-sm px-4 ${shaking ? 'shake' : ''}`}>
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4"><Lock size={22} className="text-gray-400" /></div>
          <h1 className="serif text-3xl text-gray-900 mb-2">Private access</h1>
          <p className="text-gray-400 text-sm">Enter your access code to continue</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={`flex items-center bg-white border rounded-2xl px-4 py-3.5 mb-3 transition-all ${error ? 'border-red-300 shadow-sm shadow-red-100' : 'border-gray-200 focus-within:border-blue-400 focus-within:shadow-sm focus-within:shadow-blue-100'}`}>
            <input ref={inputRef} type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="flex-1 bg-transparent text-gray-800 text-sm outline-none placeholder-gray-300 tracking-widest"
              placeholder="••••••••" />
          </div>
          {error && <p className="text-red-400 text-xs text-center mb-3">Incorrect access code — try again</p>}
          <button type="submit" disabled={!password.trim() || loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-md shadow-blue-200">
            {loading ? 'Connecting...' : 'Continue'}
          </button>
        </form>
        {loading && <p className="text-center text-gray-300 text-xs mt-3">First load may take a moment...</p>}
      </div>
      <p className="mt-10 text-gray-300 text-xs">ScholrAI · Private Beta</p>
    </div>
  );
}

function PlainMessage({ content }) {
  return <p className="m-0 leading-relaxed whitespace-pre-wrap">{content}</p>;
}

function MarkdownMessage({ content }) {
  const cleanContent = content.replace(/\nSOURCES:.*$/m, '').trim();
  return (
    <div className="text-sm leading-relaxed text-gray-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 mt-4 mb-2 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold text-gray-900 mt-4 mb-2 first:mt-0 uppercase tracking-wide">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mt-3 mb-1 first:mt-0">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc list-outside pl-5 my-2 space-y-1.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside pl-5 my-2 space-y-1.5">{children}</ol>,
        li: ({ children }) => <li className="text-gray-700 leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
        em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
        code: ({ inline, children }) => inline
          ? <code className="bg-blue-50 px-1.5 py-0.5 rounded text-[12px] text-blue-700 font-mono border border-blue-100">{children}</code>
          : <code className="block bg-gray-50 border border-gray-200 rounded-lg p-3 my-2 overflow-x-auto text-[12px] text-gray-800 font-mono">{children}</code>,
        pre: ({ children }) => <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 my-2 overflow-x-auto text-[12px] font-mono whitespace-pre">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="border-l-[3px] border-blue-400 pl-4 italic text-gray-500 my-3 bg-blue-50/50 py-2 rounded-r-lg">{children}</blockquote>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 underline underline-offset-2">{children}</a>,
        hr: () => <hr className="my-4 border-gray-100" />,
        table: ({ children }) => <div className="overflow-x-auto my-3 rounded-lg border border-gray-200"><table className="border-collapse w-full">{children}</table></div>,
        th: ({ children }) => <th className="border-b border-gray-200 px-4 py-2.5 text-left text-gray-700 font-semibold text-xs bg-gray-50 uppercase tracking-wide">{children}</th>,
        td: ({ children }) => <td className="border-b border-gray-100 px-4 py-2.5 text-gray-700 text-xs last:border-0">{children}</td>,
      }}>{cleanContent}</ReactMarkdown>
    </div>
  );
}

function MessageText({ role, content }) {
  if (role === 'user') return <PlainMessage content={content} />;
  return <MarkdownMessage content={content} />;
}

// ── Error message component ───────────────────────────────────────────────────
function ErrorMessage({ content }) {
  const isNetworkError = content.includes('unreachable') || content.includes('fetch');
  const isServerError = content.includes('Error:');
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
      <WifiOff size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm text-red-700 font-medium">
          {isNetworkError ? 'Connection issue — the server may be waking up' : 'Something went wrong'}
        </p>
        <p className="text-xs text-red-400 mt-0.5">
          {isNetworkError ? 'Wait a moment and try again. First load can take ~30 seconds.' : 'Try asking again.'}
        </p>
      </div>
    </div>
  );
}

function DocumentCard({ m, onDelete }) {
  const displayName = cleanFileName(m.name);
  const initials = displayName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = [
    { bg: 'from-blue-500 to-blue-600' },
    { bg: 'from-violet-500 to-violet-600' },
    { bg: 'from-emerald-500 to-emerald-600' },
    { bg: 'from-amber-500 to-orange-500' },
    { bg: 'from-rose-500 to-pink-500' },
  ];
  const color = colors[Math.abs(m.name.charCodeAt(0) + m.name.charCodeAt(1)) % colors.length];
  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-gray-100/80 hover:border-gray-200 transition-all duration-200">
      <div className={`h-1 w-full bg-gradient-to-r ${color.bg}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color.bg} flex items-center justify-center shadow-sm flex-shrink-0`}>
            <span className="text-white text-xs font-bold tracking-tight">{initials}</span>
          </div>
          <button onClick={() => onDelete(m)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400">
            <Trash2 size={13} />
          </button>
        </div>
        <p className="text-gray-900 text-sm font-semibold leading-snug mb-1 line-clamp-2">{displayName}</p>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-gray-400 text-[11px]">{m.sizeKb || 0}kb</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-green-500" />
            <span className="text-[11px] text-green-600 font-medium">Live for students</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-300">
            <Clock size={9} />
            {formatRelativeDate(m.uploaded)}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingPortal({ label, color }) {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&display=swap');`}</style>
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-4 shadow-lg`}><Sparkles size={22} className="text-white" /></div>
      <p className="text-gray-500 text-sm font-medium mb-6">{label}</p>
      <div className="flex gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

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
    const interval = setInterval(poll, 8000);
    return () => clearInterval(interval);
  }, [questions.length, lastSeen]);

  const dismiss = () => { setNewCount(0); setLastSeen(Date.now()); };

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col z-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <div className="flex items-center justify-between px-10 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><Sparkles size={15} className="text-white" /></div>
          <span className="text-white font-semibold text-base tracking-tight">ScholrAI</span>
          <div className="flex items-center gap-2 ml-4 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
            <span className="text-red-400 text-xs font-semibold tracking-wide uppercase">Live Class Mode</span>
          </div>
        </div>
        <button onClick={onExit} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors">
          <X size={14} /> End Class
        </button>
      </div>
      {newCount > 0 && (
        <button onClick={dismiss} className="mx-8 mt-4 flex items-center justify-between px-5 py-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors">
          <span>{newCount} new question{newCount > 1 ? 's' : ''} just came in</span>
          <span className="text-blue-300 text-xs">Tap to refresh</span>
        </button>
      )}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4"><Radio size={24} className="text-gray-500" /></div>
            <p className="text-gray-400 text-lg font-medium mb-2">Waiting for student questions</p>
            <p className="text-gray-600 text-sm">Questions will appear here as students ask them</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {questions.map((q, i) => (
              <div key={q.id || i} className="flex items-start gap-4 p-5 rounded-2xl bg-gray-900 border border-gray-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5"><Sparkles size={13} className="text-white" /></div>
                <div className="flex-1">
                  <p className="text-white text-base leading-relaxed">{q.question}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-gray-500 text-xs">{formatRelativeDate(q.ts)}</span>
                    {!q.confident && <span className="flex items-center gap-1 text-amber-400 text-xs"><AlertTriangle size={10} /> Needs attention</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-8 py-4 border-t border-gray-800 text-center">
        <p className="text-gray-600 text-xs">Questions update every 8 seconds · Students are using the Student Portal</p>
      </div>
    </div>
  );
}

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
    const interval = setInterval(fetchInsights, 10000);
    return () => clearInterval(interval);
  }, [lastCount]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );

  const noData = !insights || insights.totalQuestions === 0;
  const formatTimeSaved = () => {
    const h = insights.timeSavedHours;
    const m = insights.timeSavedMinutes;
    if (h === 0 && m === 0) return <span>0<span className="text-base font-medium text-gray-400 ml-1">min</span></span>;
    return (<>{h > 0 && <>{h}<span className="text-base font-medium text-gray-400 ml-1">hr</span>{m > 0 ? ' ' : ''}</>}{m > 0 && <>{m}<span className="text-base font-medium text-gray-400 ml-1">min</span></>}</>);
  };

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-gray-900 text-base font-semibold">Student Insights</h2><p className="text-gray-400 text-xs mt-0.5">Live data from student interactions</p></div>
        <button onClick={onStartClassMode} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold transition-colors shadow-sm"><Radio size={13} />Start Class Mode</button>
      </div>
      {newCount > 0 && (
        <button onClick={() => { setNewCount(0); fetchInsights(); }} className="w-full mb-5 flex items-center justify-between px-5 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
          <span className="flex items-center gap-2"><Activity size={14} />{newCount} new question{newCount > 1 ? 's' : ''} since you last checked</span>
          <span className="text-blue-500 text-xs">Refresh</span>
        </button>
      )}
      {noData ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4"><BarChart2 size={22} className="text-gray-300" /></div>
          <h3 className="text-gray-700 font-semibold text-sm mb-2">No student activity yet</h3>
          <p className="text-gray-400 text-xs max-w-xs leading-relaxed">Once students start asking questions in the Student Portal, you'll see live insights here.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-1">Your time saved this week</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">{formatTimeSaved()}</p>
              <p className="text-xs text-gray-400">Based on {insights.weekQuestions} questions answered</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-1">Total questions answered</p>
              <p className="text-3xl font-bold text-gray-900 mb-1">{insights.totalQuestions}</p>
              <p className="text-xs text-gray-400">{insights.weekQuestions} this week</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-1">Last question asked</p>
              {insights.lastQuestion ? (<><p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-1">{insights.lastQuestion.question}</p><p className="text-xs text-gray-400">{formatRelativeDate(insights.lastQuestion.ts)}</p></>) : <p className="text-sm text-gray-400">No questions yet</p>}
            </div>
          </div>
          {insights.topTopics && insights.topTopics.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><TrendingUp size={14} className="text-gray-400" /><h3 className="text-sm font-semibold text-gray-900">What students are asking about</h3></div>
              <div className="space-y-3">
                {insights.topTopics.map((t) => (
                  <div key={t.topic} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getTopicColor(t.topic)}`}>{t.topic}</span>
                        <span className="text-xs text-gray-400">{t.count} question{t.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all" style={{ width: `${Math.round((t.count / insights.weekQuestions) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {insights.flagged && insights.flagged.length > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5">
              <div className="flex items-center gap-2 mb-3"><AlertTriangle size={14} className="text-amber-500" /><h3 className="text-sm font-semibold text-amber-800">Needs your attention</h3><span className="ml-auto text-xs text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full">{insights.flagged.length} question{insights.flagged.length !== 1 ? 's' : ''}</span></div>
              <p className="text-xs text-amber-600 mb-3 leading-relaxed">ScholrAI wasn't confident answering these. Consider uploading more material on these topics.</p>
              <div className="space-y-2">
                {insights.flagged.slice(0, 5).map((q, i) => (
                  <div key={q.id || i} className="flex items-start gap-2 px-3 py-2.5 bg-white rounded-xl border border-amber-100">
                    <AlertTriangle size={11} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-700 leading-relaxed">{q.question}</p>
                    <span className="ml-auto text-[10px] text-gray-300 flex-shrink-0">{formatRelativeDate(q.ts)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4"><Activity size={14} className="text-gray-400" /><h3 className="text-sm font-semibold text-gray-900">Recent questions</h3><div className="ml-auto flex items-center gap-1.5 text-[10px] text-gray-300"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>Updates every 10s</div></div>
            <div className="space-y-2">
              {insights.recent.slice(0, 15).map((q, i) => {
                const text = q.question.toLowerCase();
                const topicLabel = /grade|score|percent|exam|quiz|assignment/.test(text) ? 'Grading' : /when|due|deadline|schedule/.test(text) ? 'Logistics' : /how|what|explain|define/.test(text) ? 'Concepts' : /study|prepare|focus|review/.test(text) ? 'Exam Prep' : 'General';
                return (
                  <div key={q.id || i} className="flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5"><Users size={10} className="text-gray-400" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-relaxed">{q.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${getTopicColor(topicLabel)}`}>{topicLabel}</span>
                        {!q.confident && <span className="flex items-center gap-1 text-[10px] text-amber-500"><AlertTriangle size={9} /> Flagged</span>}
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
        const documents = Array.isArray(docs) ? docs : [];
        await new Promise(r => setTimeout(r, 600));
        onSelect(role, { questions, documents });
      } catch {
        await new Promise(r => setTimeout(r, 600));
        onSelect(role, { questions: DEFAULT_QUESTIONS, documents: [] });
      }
    } else {
      await new Promise(r => setTimeout(r, 600));
      onSelect(role, {});
    }
  };

  if (loading) return <LoadingPortal label={loading === 'student' ? 'Loading Student Portal...' : 'Loading Instructor Portal...'} color={loading === 'student' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-indigo-500 to-violet-600'} />;

  return (
    <div className="min-h-screen w-screen bg-white flex flex-col" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        .serif { font-family: 'DM Serif Display', Georgia, serif; }
        .portal-card { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .portal-card:hover { transform: translateY(-3px); box-shadow: 0 20px 40px -12px rgba(0,0,0,0.08); }
      `}</style>
      <nav className="flex items-center justify-between px-10 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm"><Sparkles size={15} className="text-white" /></div>
          <span className="text-gray-900 font-semibold text-lg tracking-tight">ScholrAI</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
          Powered by Google Vertex AI
        </div>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium mb-7"><Zap size={11} />Built for universities</div>
            <h1 className="serif text-6xl text-gray-900 mb-4 leading-tight">Learning grounded in<br /><span className="text-blue-600 italic">your course materials</span></h1>
            <p className="text-gray-400 text-base max-w-md mx-auto leading-relaxed">AI answers tied directly to what your professor uploaded — cited, trustworthy, grounded.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
            <button onClick={() => handleSelect('student')} className="portal-card group text-left p-7 rounded-2xl border border-gray-200 bg-white">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-5 shadow-sm"><Users size={20} className="text-white" /></div>
              <h2 className="text-gray-900 font-semibold text-base mb-1.5">Student Portal</h2>
              <p className="text-gray-400 text-sm mb-5 leading-relaxed">Ask questions, get cited answers from your professor's materials.</p>
              <div className="flex items-center gap-1.5 text-blue-600 text-sm font-medium">Enter as student <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></div>
            </button>
            <button onClick={() => handleSelect('teacher')} className="portal-card group text-left p-7 rounded-2xl border border-gray-200 bg-white">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5 shadow-sm"><BookOpen size={20} className="text-white" /></div>
              <h2 className="text-gray-900 font-semibold text-base mb-1.5">Instructor Portal</h2>
              <p className="text-gray-400 text-sm mb-5 leading-relaxed">Upload course materials and deploy an AI tutor for your class.</p>
              <div className="flex items-center gap-1.5 text-indigo-600 text-sm font-medium">Enter as instructor <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" /></div>
            </button>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-100">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
              <span className="text-xs text-gray-500 font-medium">Powered by the same Google AI that powers NotebookLM</span>
            </div>
            <div className="flex items-center gap-6 text-gray-300 text-xs">
              <span className="flex items-center gap-1.5"><span>🔒</span> FERPA aligned</span>
              <span className="w-1 h-1 rounded-full bg-gray-200"></span>
              <span>Answers from your materials only</span>
              <span className="w-1 h-1 rounded-full bg-gray-200"></span>
              <span>Built for classrooms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherView({ onExit }) {
  const [mods, setMods] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('materials');
  const [classroomMode, setClassroomMode] = useState(false);
  const fileRef = useRef(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    fetch(`${API}/documents`).then(res => res.json()).then(data => {
      const docs = Array.isArray(data) ? data : (data.documents || []);
      setMods(docs.map(d => ({ id: d.name, name: d.name, sizeKb: d.sizeKb, uploaded: new Date(d.uploadedAt) })));
    }).catch(() => showToast('Could not load documents from server.', 'error'));
  }, []);

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith('.pdf')) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      const res = await fetch(`${API}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setMods(prev => [{ id: data.fileName, name: data.fileName, sizeKb: data.sizeKb, uploaded: new Date() }, ...prev]);
        showToast(`"${file.name}" uploaded successfully.`);
      } else { showToast(data.error || 'Upload failed.', 'error'); }
    } catch { showToast('Server unreachable.', 'error'); }
    setUploading(false);
  };

  const onUpload = (e) => { handleFile(e.target.files[0]); e.target.value = ''; };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };
  const onDelete = async (mod) => {
    setMods(prev => prev.filter(m => m.id !== mod.id));
    await fetch(`${API}/document/${encodeURIComponent(mod.name)}`, { method: 'DELETE' });
    showToast(`"${cleanFileName(mod.name)}" removed.`);
  };

  if (classroomMode) return <ClassroomMode onExit={() => setClassroomMode(false)} />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8f9fb] fixed inset-0" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><Sparkles size={13} className="text-white" /></div>
            <span className="text-gray-900 font-semibold text-sm tracking-tight">ScholrAI</span>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2"><BookOpen size={13} className="text-indigo-200" /><span className="text-white text-xs font-semibold">Instructor Portal</span></div>
            <p className="text-indigo-200 text-[10px] mt-0.5">Course management</p>
          </div>
        </div>
        <nav className="p-3 flex-1">
          <p className="text-[10px] text-gray-300 font-semibold px-2 mb-1.5 uppercase tracking-widest">Navigation</p>
          <button onClick={() => setActiveTab('materials')} className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === 'materials' ? 'bg-blue-50 text-blue-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}><FileText size={14} />Course Materials</button>
          <button onClick={() => setActiveTab('insights')} className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-colors mt-0.5 ${activeTab === 'insights' ? 'bg-blue-50 text-blue-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}><BarChart2 size={14} />Student Insights</button>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div><span className="text-[10px] text-gray-400">Vertex AI connected</span></div>
          <button onClick={onExit} className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-xs"><LogOut size={12} /> Exit Portal</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'materials' ? (
          <>
            <header className="bg-white border-b border-gray-100 px-8 py-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div><h2 className="text-gray-900 text-base font-semibold">Course Materials</h2><p className="text-gray-400 text-xs mt-0.5">AI tutor reads all uploaded documents</p></div>
                <div className="flex items-center gap-3">
                  <input type="file" ref={fileRef} onChange={onUpload} className="hidden" accept=".pdf" />
                  <button onClick={() => fileRef.current.click()} disabled={uploading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200">
                    <UploadCloud size={14} />{uploading ? 'Uploading...' : 'Upload PDF'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5 text-xs text-gray-400"><FileText size={12} className="text-gray-300" /><span className="font-semibold text-gray-600">{mods.length}</span> document{mods.length !== 1 ? 's' : ''} indexed</div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>Live for all students</div>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-8">
              {mods.length === 0 ? (
                <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} onClick={() => fileRef.current.click()}
                  className={`flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${dragOver ? 'bg-blue-100' : 'bg-gray-100'}`}><UploadCloud size={24} className={dragOver ? 'text-blue-500' : 'text-gray-400'} /></div>
                  <h3 className="text-gray-700 text-sm font-semibold mb-1">{dragOver ? 'Drop to upload' : 'Upload your first document'}</h3>
                  <p className="text-gray-400 text-xs text-center max-w-xs">Drag and drop a PDF, or click to browse.</p>
                </div>
              ) : (
                <div>
                  <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} onClick={() => fileRef.current.click()}
                    className={`mb-6 flex items-center gap-3 px-5 py-3.5 rounded-xl border border-dashed cursor-pointer transition-all ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                    <UploadCloud size={15} className="text-gray-300" />
                    <span className="text-gray-400 text-xs">Drop another PDF here or click to browse</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mods.map(m => <DocumentCard key={m.id} m={m} onDelete={onDelete} />)}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : <StudentInsights onStartClassMode={() => setClassroomMode(true)} />}
      </main>
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3 rounded-2xl text-white text-xs font-semibold shadow-2xl z-50 ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900'}`}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <ShieldCheck size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function StudentNoteUpload({ onFilesChange }) {
  const [myDocs, setMyDocs] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.pdf')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target.result;
      const newDoc = { name: file.name, buffer, size: Math.round(file.size / 1024) };
      setMyDocs(prev => {
        const updated = [newDoc, ...prev.filter(d => d.name !== file.name)];
        onFilesChange(updated);
        return updated;
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const removeDoc = (name) => {
    setMyDocs(prev => {
      const updated = prev.filter(d => d.name !== name);
      onFilesChange(updated);
      return updated;
    });
  };

  return (
    <div className="px-3 py-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">My Notes</p>
        <button onClick={() => fileRef.current.click()} className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 font-semibold transition-colors"><Plus size={10} /> Add PDF</button>
      </div>
      <input type="file" ref={fileRef} onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} className="hidden" accept=".pdf" />
      {myDocs.length === 0 ? (
        <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current.click()}
          className={`flex flex-col items-center justify-center py-4 rounded-xl border border-dashed cursor-pointer transition-all ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-2 shadow-sm"><UploadCloud size={14} className="text-white" /></div>
          <p className="text-[11px] text-gray-500 font-medium text-center">Drop your notes here</p>
          <p className="text-[10px] text-gray-300 mt-0.5">PDF only · Session only</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {myDocs.map((doc, i) => (
            <div key={i} className="group flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0"><FileText size={10} className="text-white" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-700 font-medium truncate">{cleanFileName(doc.name)}</p>
                <p className="text-[10px] text-gray-400">{doc.size}kb</p>
              </div>
              <button onClick={() => removeDoc(doc.name)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-400"><X size={10} /></button>
            </div>
          ))}
          <button onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current.click()}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer">
            <Plus size={11} className="text-gray-300" />
            <span className="text-[11px] text-gray-400">Add another note</span>
          </button>
        </div>
      )}
      {myDocs.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
          <p className="text-[10px] text-blue-500 font-medium">AI reads your notes + course materials</p>
        </div>
      )}
    </div>
  );
}

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

  const active = chats.find(c => c.id === chatId) || chats[0];
  const scrollToBottom = () => { setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' }); }, 50); };
  useEffect(() => { scrollToBottom(); }, [active.messages, isTyping]);

  const createNewChat = () => {
    const newChat = { id: Date.now(), title: 'New Chat', messages: [] };
    setChats(prev => [...prev, newChat]);
    setChatId(newChat.id);
  };

  const generateTitle = (message) => {
    const words = message.trim().split(/\s+/).slice(0, 5).join(' ');
    return words.length < message.trim().length ? words + '...' : words;
  };

  const copyMessage = (content, id) => {
    const clean = content.replace(/\nSOURCES:.*$/m, '').trim();
    navigator.clipboard.writeText(clean);
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
    const newTitle = isFirstMessage ? generateTitle(message) : null;
    const currentChatId = chatId;

    // Build history to send — only completed (non-streaming) messages
    const completedMessages = active.messages.filter(m => !m.streaming);

    setChats(prev => prev.map(c => c.id === currentChatId
      ? { ...c, messages: [...c.messages, userMsg], ...(newTitle ? { title: newTitle } : {}) } : c));
    setInput('');
    setIsTyping(true);

    const streamingMsgId = Date.now();
    setChats(prev => prev.map(c => c.id === currentChatId
      ? { ...c, messages: [...c.messages, { id: streamingMsgId, role: 'assistant', content: '', sources: [], ts: Date.now(), streaming: true }] } : c));

    try {
      let response;
      if (myNotes.length > 0) {
        const formData = new FormData();
        formData.append('message', message);
        // Send conversation history as JSON string
        formData.append('history', JSON.stringify(completedMessages.map(m => ({ role: m.role, content: m.content }))));
        myNotes.forEach((note, i) => {
          formData.append(`note_${i}`, new Blob([note.buffer], { type: 'application/pdf' }), note.name);
        });
        response = await fetch(`${API}/chat`, { method: 'POST', body: formData });
      } else {
        response = await fetch(`${API}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            history: completedMessages.map(m => ({ role: m.role, content: m.content }))
          })
        });
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'token') {
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: m.content + event.token } : m) } : c));
              scrollToBottom();
            } else if (event.type === 'sources') {
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, sources: event.sources } : m) } : c));
            } else if (event.type === 'done') {
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, streaming: false } : m) } : c));
            } else if (event.type === 'error') {
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: 'error:' + event.error, streaming: false, isError: true } : m) } : c));
            }
          } catch {}
        }
      }
    } catch {
      setChats(prev => prev.map(c => c.id === currentChatId
        ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: 'error:network', streaming: false, isError: true } : m) } : c));
    }
    setIsTyping(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden fixed inset-0" style={{ background: '#f8f9fb', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><Sparkles size={13} className="text-white" /></div>
            <span className="text-gray-900 font-semibold text-sm tracking-tight">ScholrAI</span>
          </div>
          <div className="bg-gray-900 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2"><Users size={12} className="text-gray-400" /><span className="text-white text-xs font-semibold">Student Portal</span></div>
            <p className="text-gray-500 text-[10px] mt-0.5">{documents.length} course doc{documents.length !== 1 ? 's' : ''} · {myNotes.length} my note{myNotes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="px-3 pt-3">
          <button onClick={createNewChat} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 text-xs font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors">
            <Plus size={13} /> New conversation
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <p className="text-[10px] text-gray-300 font-semibold px-2 mb-2 uppercase tracking-widest">Conversations</p>
          {chats.map(c => (
            <button key={c.id} onClick={() => setChatId(c.id)}
              className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-xs transition-colors mb-0.5 ${c.id === chatId ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'}`}>
              <MessageSquare size={12} className="flex-shrink-0 opacity-50" />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </nav>
        <StudentNoteUpload onFilesChange={setMyNotes} />
        <div className="p-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-300 mb-3 leading-relaxed">Answers grounded in your professor's materials{myNotes.length > 0 ? ' + your notes' : ''}</p>
          <button onClick={onExit} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-xs"><LogOut size={12} /> Exit Portal</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-gray-800 text-sm font-semibold">{active.title}</h2>
            <span className="text-gray-200">·</span>
            <p className="text-gray-400 text-xs">{myNotes.length > 0 ? `Course materials + ${myNotes.length} personal note${myNotes.length > 1 ? 's' : ''}` : "Grounded in your professor's materials"}</p>
          </div>
          <div className="flex items-center gap-2">
            {myNotes.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-semibold">
                <FileText size={10} />{myNotes.length} note{myNotes.length > 1 ? 's' : ''} active
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100 text-green-600 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>AI Active
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8 flex flex-col gap-6">
          {active.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 pb-10">
              {documents.length === 0 && myNotes.length === 0 ? (
                <div className="text-center max-w-xs">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 mx-auto"><Clock size={22} className="text-gray-300" /></div>
                  <h3 className="text-gray-700 font-semibold text-sm mb-2">Your course is being set up</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">Your instructor is still uploading course materials. You can also add your own notes in the sidebar.</p>
                </div>
              ) : (
                <div className="text-center max-w-lg w-full">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-5 mx-auto shadow-lg shadow-blue-200/60"><Sparkles size={24} className="text-white" /></div>
                  <h3 className="text-gray-900 font-semibold text-xl mb-2">Ask anything about your course</h3>
                  <p className="text-gray-400 text-sm mb-2 leading-relaxed">Every answer is grounded in your professor's uploaded materials — cited, trustworthy, and accurate.</p>
                  {myNotes.length > 0 && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium mb-6">
                      <FileText size={11} />Also reading your {myNotes.length} personal note{myNotes.length > 1 ? 's' : ''}
                    </div>
                  )}
                  {!myNotes.length && <div className="mb-6" />}
                  <div className="grid grid-cols-1 gap-2.5">
                    {suggestedQuestions.map((q, i) => (
                      <button key={i} onClick={() => onSend(q)}
                        className="text-left px-5 py-3.5 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm group">
                        <span className="text-gray-300 mr-2 text-xs font-mono group-hover:text-blue-400">{i + 1}.</span>{q}
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
                  <div className={`rounded-2xl text-sm w-full ${m.role === 'user' ? 'bg-gray-900 text-white px-4 py-3 rounded-br-sm' : 'text-gray-800 py-1'}`}>
                    {m.role === 'assistant' && m.content === '' && m.streaming ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-gray-400">Searching your materials</span>
                      </div>
                    ) : isError ? (
                      <ErrorMessage content={m.content} />
                    ) : (
                      <MessageText role={m.role} content={m.content} />
                    )}
                    {m.role === 'assistant' && m.streaming && m.content && (
                      <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />
                    )}
                    {m.role === 'assistant' && m.sources && m.sources.length > 0 && !m.streaming && !isError && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-gray-300 font-medium uppercase tracking-wide mr-0.5">From</span>
                          {m.sources.map((source, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-medium">
                              <FileText size={9} className="flex-shrink-0" />
                              <span className="max-w-[200px] truncate">{cleanFileName(source)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {m.role === 'user' && <span className="block text-[10px] mt-1.5 opacity-40">{formatTime(m.ts)}</span>}
                  </div>
                  {m.role === 'assistant' && !m.streaming && m.content && !isError && (
                    <div className="flex items-center gap-0.5 mt-2">
                      <button onClick={() => copyMessage(m.content, msgId)} title="Copy"
                        className={`p-1.5 rounded-lg transition-colors ${copiedId === msgId ? 'text-green-500' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}>
                        {copiedId === msgId ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                      <button onClick={() => giveFeedback(msgId, 'up')} title="Helpful"
                        className={`p-1.5 rounded-lg transition-colors ${fb === 'up' ? 'text-green-500' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}>
                        <ThumbsUp size={13} />
                      </button>
                      <button onClick={() => giveFeedback(msgId, 'down')} title="Not helpful"
                        className={`p-1.5 rounded-lg transition-colors ${fb === 'down' ? 'text-red-400' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}>
                        <ThumbsDown size={13} />
                      </button>
                      <span className="text-[10px] text-gray-200 ml-2">{formatTime(m.ts)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="px-8 py-5 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="flex gap-3 items-center max-w-3xl mx-auto">
            <div className="flex-1 flex items-center bg-[#f8f9fb] border border-gray-200 rounded-2xl px-5 py-3.5 focus-within:border-blue-400 focus-within:bg-white focus-within:shadow-sm focus-within:shadow-blue-100 transition-all">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
                className="flex-1 bg-transparent text-gray-800 text-sm outline-none placeholder-gray-400"
                placeholder={myNotes.length > 0 ? "Ask about your course + personal notes..." : "Ask about your course material..."} />
            </div>
            <button onClick={() => onSend()} disabled={!input.trim() || isTyping}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-30 text-white flex items-center justify-center flex-shrink-0 transition-all shadow-md shadow-blue-200">
              <Send size={15} />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-300 mt-2.5">
            {myNotes.length > 0 ? `Reading ${documents.length} course doc${documents.length !== 1 ? 's' : ''} + ${myNotes.length} personal note${myNotes.length !== 1 ? 's' : ''} · Powered by Google Vertex AI` : "Grounded in your professor's materials · Powered by Vertex AI"}
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
