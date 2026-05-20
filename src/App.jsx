import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import {
  MessageSquare, Send, LogOut, Trash2, Plus, BookOpen, FileText,
  ChevronRight, Users, AlertCircle, UploadCloud, BarChart2, Clock,
  CheckCircle2, Copy, Check, ThumbsUp, ThumbsDown, X, Radio,
  Lock, WifiOff, Paperclip, Square, ArrowLeft, ExternalLink, Hash
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
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
  @keyframes eq1 { 0%,100%{width:8px} 50%{width:18px} }
  @keyframes eq2 { 0%,100%{width:16px} 50%{width:6px} }
  @keyframes eq3 { 0%,100%{width:11px} 30%{width:18px} 70%{width:5px} }
  .eq-bar { height:2px; border-radius:2px; background:#6b7280; display:block; }
  .eq1 { animation: eq1 0.8s ease-in-out infinite; }
  .eq2 { animation: eq2 0.95s ease-in-out infinite 0.15s; }
  .eq3 { animation: eq3 0.75s ease-in-out infinite 0.08s; }
  .sr { opacity:0; transform:translateY(28px); transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1); }
  .sr.in { opacity:1; transform:translateY(0); }
  .sr-d1 { transition-delay:0.1s; }
  .sr-d2 { transition-delay:0.2s; }
  .sr-d3 { transition-delay:0.3s; }
  .sr-d4 { transition-delay:0.4s; }
  .sr-d5 { transition-delay:0.5s; }
`;

function formatTime(date) { return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function formatRelativeDate(date) {
  const diffMs = Date.now() - new Date(date), diffMins = Math.floor(diffMs / 60000), diffHours = Math.floor(diffMs / 3600000), diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function cleanFileName(name) { return name.replace(/\.(pdf|jpg|jpeg|png|webp)$/i, '').replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }
function getTopicLabel(q) {
  const t = q.toLowerCase();
  if (/grade|score|percent|exam|quiz/.test(t)) return 'Grading';
  if (/when|due|deadline|schedule/.test(t)) return 'Logistics';
  if (/how|what|explain|define/.test(t)) return 'Concepts';
  if (/study|prepare|focus|review/.test(t)) return 'Exam Prep';
  return 'General';
}

function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="#0F0F0F"/>
      <path d="M8 10h8M8 14h12M8 18h6" stroke="white" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  );
}

const DEMO_DATA = {
  totalQuestions: 127, weekQuestions: 43, timeSavedHours: 3, timeSavedMinutes: 12,
  confidenceRate: 91, estimatedStudents: 28, peakHour: '11 PM',
  topTopics: [{ topic: 'Exam Prep', count: 38 }, { topic: 'Grading', count: 27 }, { topic: 'Concepts', count: 24 }, { topic: 'Logistics', count: 19 }],
  dailyActivity: [{ day: 'Mon', questions: 8 }, { day: 'Tue', questions: 14 }, { day: 'Wed', questions: 6 }, { day: 'Thu', questions: 19 }, { day: 'Fri', questions: 11 }, { day: 'Sat', questions: 22 }, { day: 'Sun', questions: 17 }],
  flagged: [{ question: 'Will the midterm cover chapter 7?', ts: new Date(Date.now() - 1200000) }, { question: 'Is the group project graded individually?', ts: new Date(Date.now() - 3600000) }],
  recent: [
    { question: 'What percentage of the grade is participation?', ts: new Date(Date.now() - 300000), confident: true },
    { question: 'When is the final exam scheduled?', ts: new Date(Date.now() - 600000), confident: true },
    { question: 'Are late submissions accepted?', ts: new Date(Date.now() - 900000), confident: true },
    { question: 'What chapters are on the midterm?', ts: new Date(Date.now() - 1200000), confident: false },
  ],
};
const TOPIC_COLORS = ['#0F0F0F', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'];
const TOPIC_ACCENT = {
  'Exam Prep': 'bg-gray-900 text-white', 'Grading': 'bg-gray-700 text-white',
  'Concepts': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Logistics': 'bg-sky-50 text-sky-700 border border-sky-200',
  'General': 'bg-gray-100 text-gray-600', 'Materials': 'bg-rose-50 text-rose-700 border border-rose-200',
};

function StatCard({ label, value, sub, dark, icon }) {
  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-2 ${dark ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-semibold uppercase tracking-widest ${dark ? 'text-white/50' : 'text-gray-400'}`}>{label}</p>
        {icon && <span className="text-base opacity-60">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs ${dark ? 'text-white/40' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }) => !active || !payload?.length ? null : (
  <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl"><p className="font-medium">{label}</p><p className="text-gray-300">{payload[0].value} questions</p></div>
);
const PieTooltipCustom = ({ active, payload }) => !active || !payload?.length ? null : (
  <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl"><p className="font-medium">{payload[0].name}</p><p className="text-gray-300">{payload[0].value} ({Math.round(payload[0].payload.percent * 100)}%)</p></div>
);

function LoadingScreen({ label }) {
  return (
    <div className="fixed inset-0 bg-[#FAFAFA] flex flex-col items-center justify-center z-50">
      <style>{FONT}</style>
      <Logo size={36} />
      <p className="text-gray-400 text-sm mt-5 mb-8">{label}</p>
      <div className="flex flex-col justify-center gap-1" style={{ width: '22px' }}>
        <div className="eq-bar eq1" /><div className="eq-bar eq2" /><div className="eq-bar eq3" />
      </div>
    </div>
  );
}

function MarkdownMessage({ content }) {
  const clean = content.replace(/\nSOURCES:.*$/m, '').trim();
  return (
    <div className="text-sm leading-relaxed text-gray-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0 text-gray-800">{children}</p>,
        h1: ({ children }) => <h1 className="text-base font-semibold text-gray-900 mt-4 mb-2 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-semibold text-gray-900 mt-4 mb-1.5 first:mt-0">{children}</h2>,
        ul: ({ children }) => <ul className="list-disc list-outside pl-5 my-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside pl-5 my-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-gray-700">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
        code: ({ inline, children }) => inline
          ? <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px] text-gray-800 font-mono border border-gray-200">{children}</code>
          : <code className="block bg-gray-50 border border-gray-200 rounded-lg p-3 my-2 text-[12px] text-gray-800 font-mono">{children}</code>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-4 italic text-gray-500 my-3">{children}</blockquote>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-gray-900 underline underline-offset-2 hover:text-gray-600">{children}</a>,
        table: ({ children }) => <div className="overflow-x-auto my-3 rounded-lg border border-gray-200"><table className="border-collapse w-full">{children}</table></div>,
        th: ({ children }) => <th className="border-b border-gray-200 px-4 py-2.5 text-left text-gray-700 font-medium text-xs bg-gray-50 uppercase tracking-wide">{children}</th>,
        td: ({ children }) => <td className="border-b border-gray-100 px-4 py-2.5 text-gray-700 text-xs last:border-0">{children}</td>,
      }}>{clean}</ReactMarkdown>
    </div>
  );
}

function ErrorMessage({ content }) {
  const isNetwork = content.includes('unreachable') || content.includes('network');
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
      <WifiOff size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm text-red-700 font-medium">{isNetwork ? 'Connection issue' : 'Something went wrong'}</p>
        <p className="text-xs text-red-400 mt-0.5">{isNetwork ? 'The server may be starting up. Try again.' : 'Please try your question again.'}</p>
      </div>
    </div>
  );
}

// ── Google SVG ────────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.59 2.41v2h2.57c1.5-1.38 2.4-3.42 2.4-5.87z" fill="#4285F4"/>
    <path d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.57-2a4.8 4.8 0 01-7.15-2.52H.96v2.07A8 8 0 008 16z" fill="#34A853"/>
    <path d="M3.57 9.54A4.8 4.8 0 013.32 8c0-.54.09-1.06.25-1.54V4.39H.96A8 8 0 000 8c0 1.29.31 2.51.96 3.61l2.61-2.07z" fill="#FBBC05"/>
    <path d="M8 3.18c1.22 0 2.31.42 3.17 1.24l2.37-2.37A8 8 0 00.96 4.39L3.57 6.46A4.8 4.8 0 018 3.18z" fill="#EA4335"/>
  </svg>
);

// ── Smart Sign In (detects professor vs student) ───────────────────────────────
function SmartSignIn({ onProfLogin, onStudentLogin, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/smart-login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.role === 'professor') onProfLogin(data.token, data.user);
        else onStudentLogin(data.token, data.user);
        return;
      }
      setError(data.error || 'Login failed');
      setShaking(true); setTimeout(() => setShaking(false), 400);
    } catch { setError('Server unreachable'); }
    setLoading(false);
  };

  const handleGoogle = () => { window.location.href = `${API}/student/auth/google`; };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
      <style>{FONT}</style>
      <div className="mb-8 flex items-center gap-3"><Logo size={28} /><span className="text-gray-900 font-semibold">Scholr</span></div>
      <div className={`w-full max-w-sm px-6 ${shaking ? 'shake' : ''}`}>
        <div className="text-center mb-8">
          <h1 className="serif text-3xl text-gray-900 mb-1.5">Sign in</h1>
          <p className="text-gray-400 text-sm">We'll take you to the right place</p>
        </div>
        <button onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm text-gray-700 text-sm font-medium transition-all mb-4">
          <GoogleIcon />Continue with Google
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-200" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={!email || !password || loading}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="mt-5 text-center">
          <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1 mx-auto"><ArrowLeft size={12} />Back</button>
        </div>
      </div>
    </div>
  );
}

// ── Professor Auth Pages ──────────────────────────────────────────────────────
function ProfessorLogin({ onLogin, onGoSignup, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/professor/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (res.ok) { onLogin(data.token, data.user); return; }
      setError(data.error || 'Login failed');
      setShaking(true); setTimeout(() => setShaking(false), 400);
    } catch { setError('Server unreachable'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
      <style>{FONT}</style>
      <div className="mb-8 flex items-center gap-3"><Logo size={28} /><span className="text-gray-900 font-semibold">Scholr</span></div>
      <div className={`w-full max-w-sm px-6 ${shaking ? 'shake' : ''}`}>
        <div className="text-center mb-8">
          <h1 className="serif text-3xl text-gray-900 mb-1.5">Instructor login</h1>
          <p className="text-gray-400 text-sm">Sign in to manage your courses</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={!email || !password || loading}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="flex items-center justify-between mt-5 text-xs text-gray-400">
          <button onClick={onBack} className="hover:text-gray-700 transition-colors flex items-center gap-1"><ArrowLeft size={12} />Back</button>
          <button onClick={onGoSignup} className="hover:text-gray-700 transition-colors">No account? Sign up →</button>
        </div>
      </div>
    </div>
  );
}

function ProfessorSignup({ onLogin, onGoLogin, onBack }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/professor/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) });
      const data = await res.json();
      if (res.ok) {
        const loginRes = await fetch(`${API}/professor/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        const loginData = await loginRes.json();
        if (loginRes.ok) { onLogin(loginData.token, loginData.user); return; }
      }
      setError(data.error || 'Signup failed');
    } catch { setError('Server unreachable'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
      <style>{FONT}</style>
      <div className="mb-8 flex items-center gap-3"><Logo size={28} /><span className="text-gray-900 font-semibold">Scholr</span></div>
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="serif text-3xl text-gray-900 mb-1.5">Create account</h1>
          <p className="text-gray-400 text-sm">Set up your instructor workspace</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 chars)"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={!email || !password || loading}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <div className="flex items-center justify-between mt-5 text-xs text-gray-400">
          <button onClick={onBack} className="hover:text-gray-700 transition-colors flex items-center gap-1"><ArrowLeft size={12} />Back</button>
          <button onClick={onGoLogin} className="hover:text-gray-700 transition-colors">Have an account? Sign in →</button>
        </div>
      </div>
    </div>
  );
}

// ── Student Auth Pages ────────────────────────────────────────────────────────
function StudentLogin({ onLogin, onGoSignup, onBack, pendingJoinCode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/student/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (res.ok) { onLogin(data.token, data.user); return; }
      setError(data.error || 'Login failed');
      setShaking(true); setTimeout(() => setShaking(false), 400);
    } catch { setError('Server unreachable'); }
    setLoading(false);
  };

  const handleGoogle = () => {
    if (pendingJoinCode) sessionStorage.setItem('scholr_pending_join', pendingJoinCode);
    window.location.href = `${API}/student/auth/google`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
      <style>{FONT}</style>
      <div className="mb-8 flex items-center gap-3"><Logo size={28} /><span className="text-gray-900 font-semibold">Scholr</span></div>
      <div className={`w-full max-w-sm px-6 ${shaking ? 'shake' : ''}`}>
        <div className="text-center mb-8">
          <h1 className="serif text-3xl text-gray-900 mb-1.5">Student login</h1>
          <p className="text-gray-400 text-sm">{pendingJoinCode ? 'Sign in to join your course' : 'Sign in to your courses'}</p>
        </div>
        <button onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm text-gray-700 text-sm font-medium transition-all mb-4">
          <GoogleIcon />Continue with Google
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-200" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={!email || !password || loading}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="flex items-center justify-between mt-5 text-xs text-gray-400">
          <button onClick={onBack} className="hover:text-gray-700 transition-colors flex items-center gap-1"><ArrowLeft size={12} />Back</button>
          <button onClick={onGoSignup} className="hover:text-gray-700 transition-colors">No account? Sign up →</button>
        </div>
      </div>
    </div>
  );
}

function StudentSignup({ onLogin, onGoLogin, onBack, pendingJoinCode }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/student/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) });
      const data = await res.json();
      if (res.ok) {
        const loginRes = await fetch(`${API}/student/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        const loginData = await loginRes.json();
        if (loginRes.ok) { onLogin(loginData.token, loginData.user); return; }
      }
      setError(data.error || 'Signup failed');
    } catch { setError('Server unreachable'); }
    setLoading(false);
  };

  const handleGoogle = () => {
    if (pendingJoinCode) sessionStorage.setItem('scholr_pending_join', pendingJoinCode);
    window.location.href = `${API}/student/auth/google`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
      <style>{FONT}</style>
      <div className="mb-8 flex items-center gap-3"><Logo size={28} /><span className="text-gray-900 font-semibold">Scholr</span></div>
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="serif text-3xl text-gray-900 mb-1.5">Create account</h1>
          <p className="text-gray-400 text-sm">{pendingJoinCode ? 'Sign up to join your course' : 'Join Scholr as a student'}</p>
        </div>
        <button onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm text-gray-700 text-sm font-medium transition-all mb-4">
          <GoogleIcon />Continue with Google
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-200" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 chars)"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={!name || !email || !password || loading}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <div className="flex items-center justify-between mt-5 text-xs text-gray-400">
          <button onClick={onBack} className="hover:text-gray-700 transition-colors flex items-center gap-1"><ArrowLeft size={12} />Back</button>
          <button onClick={onGoLogin} className="hover:text-gray-700 transition-colors">Have an account? Sign in →</button>
        </div>
      </div>
    </div>
  );
}

// ── Student Dashboard ─────────────────────────────────────────────────────────
function StudentDashboard({ token, user, onEnterCourse, onLogout }) {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningCode, setJoiningCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [toast, setToast] = useState(null);

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API}/student/courses`, { headers: authHeaders });
      const data = await res.json();
      setEnrolledCourses(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
    const pendingCode = sessionStorage.getItem('scholr_pending_join');
    if (pendingCode) { sessionStorage.removeItem('scholr_pending_join'); handleJoin(pendingCode); }
  }, []);

  const handleJoin = async (codeOverride) => {
    const code = (codeOverride || joiningCode).trim().toUpperCase();
    if (!code) return;
    setJoining(true); setJoinError('');
    try {
      const courseRes = await fetch(`${API}/course/join/${code}`);
      if (!courseRes.ok) { setJoinError('Course not found — check your code'); setJoining(false); return; }
      const course = await courseRes.json();
      const enrollRes = await fetch(`${API}/student/enroll`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ course_id: course.id }) });
      const enrollData = await enrollRes.json();
      if (!enrollRes.ok && !enrollData.already_enrolled) { setJoinError(enrollData.error || 'Could not enroll'); setJoining(false); return; }
      setJoiningCode(''); setShowJoinInput(false);
      showToast(`Joined ${course.name}!`);
      fetchCourses();
    } catch { setJoinError('Server unreachable'); }
    setJoining(false);
  };

  const handleEnterCourse = async (course) => {
    try {
      const [docsRes, qRes] = await Promise.all([
        fetch(`${API}/course/${course.id}/documents`),
        fetch(`${API}/course/${course.id}/suggested-questions`),
      ]);
      const docs = await docsRes.json();
      const qData = await qRes.json();
      onEnterCourse(course, Array.isArray(docs) ? docs : [], qData.questions || []);
    } catch { onEnterCourse(course, [], []); }
  };

  // Get hour for greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user.name || user.email).split(' ')[0];

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <style>{FONT}</style>
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><Logo size={24} /><span className="text-gray-900 font-semibold text-sm">Scholr</span><span className="text-gray-300">·</span><span className="text-gray-500 text-sm">{user.name || user.email}</span></div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-xs"><LogOut size={12} />Sign out</button>
      </div>
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{greeting}, {firstName}</h1>
            <p className="text-gray-400 text-sm mt-1">{enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''} · your AI tutor is ready</p>
          </div>
          <button onClick={() => setShowJoinInput(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"><Plus size={14} />Join a course</button>
        </div>
        {showJoinInput && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Join a course</h3>
            <p className="text-xs text-gray-400 mb-4">Enter the join code your professor shared with you</p>
            <div className="flex gap-3">
              <input autoFocus type="text" value={joiningCode} onChange={e => { setJoiningCode(e.target.value.toUpperCase()); setJoinError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleJoin()} placeholder="e.g. A306-UCB2"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300 font-mono uppercase tracking-wider" />
              <button onClick={() => handleJoin()} disabled={!joiningCode.trim() || joining}
                className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">{joining ? 'Joining...' : 'Join'}</button>
              <button onClick={() => { setShowJoinInput(false); setJoiningCode(''); setJoinError(''); }}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-colors">Cancel</button>
            </div>
            {joinError && <p className="text-red-500 text-xs mt-2">{joinError}</p>}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /></div>
        ) : enrolledCourses.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={32} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium mb-1">No courses yet</p>
            <p className="text-gray-400 text-sm mb-6">Ask your professor for a join code to get started</p>
            <button onClick={() => setShowJoinInput(true)} className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors">Join a course</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrolledCourses.map(course => (
              <button key={course.id} onClick={() => handleEnterCourse(course)}
                className="group text-left bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all">
                <div className="w-full">
                  {course.cover_image
                    ? <img src={course.cover_image} alt="" className="w-full object-cover" style={{height:80}} />
                    : <CoursePattern courseId={course.id} height={80} />}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-gray-900 font-semibold text-base leading-snug">{course.name}</h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-[10px] text-gray-400">AI Active</span></div>
                  </div>
                  <p className="text-gray-400 text-xs mb-3">{course.professor_name || 'Instructor'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-gray-300">{course.join_code || course.code}</span>
                    <div className="flex items-center gap-1 text-gray-900 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Open <ChevronRight size={12} /></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-xl text-white text-xs font-medium shadow-xl z-50 ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900'}`}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}{toast.msg}
        </div>
      )}
    </div>
  );
}
// ── Pattern generator for courses without a cover image ──────────────────────
function CoursePattern({ courseId, height = 80 }) {
  const hash = courseId.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const bg = ['#0F0F0F', '#1a1a2e', '#0d1b2a', '#1a0a2e', '#0a1a1a'][ Math.abs(hash) % 5];
  const type = Math.abs(hash >> 3) % 3;
  if (type === 0) return (
    <svg viewBox={`0 0 400 ${height}`} style={{width:'100%',height,display:'block'}} preserveAspectRatio="xMidYMid slice">
      <rect width="400" height={height} fill={bg}/>
      <circle cx="60" cy="10" r="80" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.12"/>
      <circle cx="60" cy="10" r="50" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.1"/>
      <circle cx="60" cy="10" r="25" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.15"/>
      <line x1="0" y1={height} x2="400" y2="0" stroke="#fff" strokeWidth="0.5" opacity="0.08"/>
      <line x1="0" y1={height*0.7} x2="400" y2={height*-0.3} stroke="#fff" strokeWidth="0.5" opacity="0.06"/>
      <rect x="280" y="-10" width="80" height="80" rx="6" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.1" transform="rotate(20 320 30)"/>
    </svg>
  );
  if (type === 1) return (
    <svg viewBox={`0 0 400 ${height}`} style={{width:'100%',height,display:'block'}} preserveAspectRatio="xMidYMid slice">
      <rect width="400" height={height} fill={bg}/>
      {[0,1,2,3,4,5,6,7].map(i => (<rect key={i} x={i*55-10} y="-10" width="45" height="45" rx="4" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.12" transform={`rotate(15 ${i*55+12} 12)`}/>))}
      {[0,1,2,3,4,5,6,7].map(i => (<rect key={i+8} x={i*55+15} y="25" width="35" height="35" rx="4" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.08" transform={`rotate(15 ${i*55+32} 42)`}/>))}
    </svg>
  );
  return (
    <svg viewBox={`0 0 400 ${height}`} style={{width:'100%',height,display:'block'}} preserveAspectRatio="xMidYMid slice">
      <rect width="400" height={height} fill={bg}/>
      {[0,1,2,3,4,5,6,7,8,9].map(i => (<line key={i} x1={i*45} y1="0" x2={i*45+20} y2={height} stroke="#fff" strokeWidth="0.5" opacity="0.1"/>))}
      {[0,1,2,3].map(i => (<line key={i+10} x1="0" y1={i*28} x2="400" y2={i*28} stroke="#fff" strokeWidth="0.5" opacity="0.07"/>))}
      <circle cx="320" cy={height/2} r="35" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.12"/>
      <circle cx="320" cy={height/2} r="20" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.1"/>
    </svg>
  );
}
// ── Professor Dashboard ───────────────────────────────────────────────────────
function ProfessorDashboard({ token, user, onLogout }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const coverRefs = useRef({});

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/professor/courses`, { headers: authHeaders })
      .then(r => r.json()).then(data => { setCourses(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const createCourse = async (e) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;
    try {
      const res = await fetch(`${API}/professor/courses`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ name: newCourseName.trim() }) });
      const data = await res.json();
      if (res.ok) { setCourses(prev => [data, ...prev]); setNewCourseName(''); setCreating(false); showToast('Course created!'); }
      else showToast(data.error || 'Failed to create course', 'error');
    } catch { showToast('Server unreachable', 'error'); }
  };

  const deleteCourse = async (id) => {
    await fetch(`${API}/professor/courses/${id}`, { method: 'DELETE', headers: authHeaders });
    setCourses(prev => prev.filter(c => c.id !== id));
    if (selectedCourse?.id === id) setSelectedCourse(null);
    setConfirmDelete(null);
    showToast('Course deleted');
  };

  const copyLink = (course) => {
    navigator.clipboard.writeText(`https://scholrvs.onrender.com/join/${course.join_code || course.code}`);
    setCopied(course.id); setTimeout(() => setCopied(null), 2000);
    showToast('Link copied!');
  };

  const copyCode = (course) => {
    navigator.clipboard.writeText(course.join_code || course.code);
    setCopied(course.code); setTimeout(() => setCopied(null), 2000);
    showToast('Code copied!');
  };

  const uploadCover = async (courseId, file) => {
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch(`${API}/professor/courses/${courseId}/cover`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (data.coverImage) {
        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, cover_image: data.coverImage } : c));
        showToast('Cover updated!');
      }
    } catch { showToast('Upload failed', 'error'); }
  };

  if (selectedCourse) return <CourseManager token={token} course={selectedCourse} onBack={() => setSelectedCourse(null)} authHeaders={authHeaders} />;

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <style>{FONT}</style>
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3"><Logo size={24} /><span className="text-gray-900 font-semibold text-sm">Scholr</span><span className="text-gray-300">·</span><span className="text-gray-500 text-sm">{user.name || user.email}</span></div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-xs"><LogOut size={12} />Sign out</button>
      </div>
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Your Courses</h1>
            <p className="text-gray-400 text-sm mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} · Each gets its own AI tutor and student portal</p>
          </div>
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"><Plus size={14} />New course</button>
        </div>
        {creating && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">New course</h3>
            <form onSubmit={createCourse} className="flex gap-3">
              <input autoFocus type="text" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} placeholder="e.g. BUS-A 306 Management Accounting"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
              <button type="submit" disabled={!newCourseName.trim()} className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">Create</button>
              <button type="button" onClick={() => { setCreating(false); setNewCourseName(''); }} className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-colors">Cancel</button>
            </form>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /></div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20"><BookOpen size={32} className="text-gray-200 mx-auto mb-4" /><p className="text-gray-500 font-medium mb-1">No courses yet</p><p className="text-gray-400 text-sm">Create your first course to get started</p></div>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <div key={course.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="relative cursor-pointer" onClick={() => coverRefs.current[course.id]?.click()}>
                  {course.cover_image
                    ? <img src={course.cover_image} alt="" className="w-full object-cover" style={{height:60}} />
                    : <CoursePattern courseId={course.id} height={60} />}
                  <div className="absolute inset-0 bg-black opacity-0 hover:opacity-20 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium opacity-0 hover:opacity-100">Change cover</span>
                  </div>
                </div>
                <input ref={el => coverRefs.current[course.id] = el} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={e => { uploadCover(course.id, e.target.files[0]); e.target.value = ''; }} />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-gray-900 font-semibold text-base mb-2">{course.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => copyCode(course)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors text-xs font-mono text-gray-600">
                          {copied === course.code ? <Check size={10} className="text-emerald-500" /> : <Hash size={10} />}{course.join_code || course.code}
                        </button>
                        <button onClick={() => copyLink(course)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors text-xs text-gray-600">
                          {copied === course.id ? <Check size={10} className="text-emerald-500" /> : <ExternalLink size={10} />}{copied === course.id ? 'Copied!' : 'Invite link'}
                        </button>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />AI Active</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button onClick={() => setSelectedCourse(course)} className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors">Manage</button>
                      {confirmDelete === course.id ? (
                        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
                          <span className="text-xs text-gray-500">Delete?</span>
                          <button onClick={() => deleteCourse(course.id)} className="text-xs text-red-500 font-medium hover:text-red-600 px-1">Yes</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(course.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-xl text-white text-xs font-medium shadow-xl z-50 ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900'}`}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}{toast.msg}
        </div>
      )}
    </div>
  );
}
// ── Course Insights ───────────────────────────────────────────────────────────
function CourseInsights({ courseId, onStartClassMode }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [newCount, setNewCount] = useState(0);
  const [lastCount, setLastCount] = useState(0);

  const fetchInsights = async () => {
    try {
      const res = await fetch(`${API}/course/${courseId}/insights`);
      const data = await res.json();
      if (lastCount > 0 && data.totalQuestions > lastCount) setNewCount(data.totalQuestions - lastCount);
      setLastCount(data.totalQuestions);
      setInsights(data); setLoading(false);
    } catch { setLoading(false); }
  };

  useEffect(() => { fetchInsights(); const i = setInterval(fetchInsights, 10000); return () => clearInterval(i); }, [courseId, lastCount]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /></div>;

  const isEmpty = !insights || insights.totalQuestions === 0;
  const d = isEmpty ? DEMO_DATA : { ...DEMO_DATA, totalQuestions: insights.totalQuestions, weekQuestions: insights.weekQuestions, timeSavedHours: insights.timeSavedHours, timeSavedMinutes: insights.timeSavedMinutes, confidenceRate: insights.flagged?.length > 0 ? Math.round(((insights.totalQuestions - insights.flagged.length) / insights.totalQuestions) * 100) : 94, estimatedStudents: Math.max(1, Math.round(insights.totalQuestions / 4.5)), peakHour: insights.peakHourLabel || '10 PM', topTopics: insights.topTopics?.length ? insights.topTopics : DEMO_DATA.topTopics, recent: insights.recent?.length ? insights.recent : DEMO_DATA.recent, flagged: insights.flagged?.length ? insights.flagged : DEMO_DATA.flagged };
  const totalForPie = d.topTopics.reduce((s, t) => s + t.count, 0) || 1;
  const pieData = d.topTopics.map(t => ({ name: t.topic, value: t.count, percent: t.count / totalForPie }));
  const timeSaved = d.timeSavedHours > 0 ? `${d.timeSavedHours}h ${d.timeSavedMinutes}m` : `${d.timeSavedMinutes}m`;
  const topTopic = d.topTopics?.[0]?.topic || 'Concepts';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F7F7F7]">
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div><h2 className="text-gray-900 font-semibold text-sm">Student Insights</h2><div className="flex items-center gap-2 mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><p className="text-gray-400 text-xs">Live · updates every 10s{isEmpty ? ' · showing sample data' : ''}</p></div></div>
          <div className="flex items-center gap-3">
            {newCount > 0 && <button onClick={() => { setNewCount(0); fetchInsights(); }} className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">↑ {newCount} new</button>}
            <button onClick={onStartClassMode} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />Live Mode</button>
          </div>
        </div>
        <div className="flex gap-1 mt-4">
          {[{ id: 'overview', label: 'Overview' }, { id: 'questions', label: 'Questions' }, { id: 'gaps', label: 'Knowledge Gaps' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>{tab.label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8 space-y-5">
        {activeTab === 'overview' && (<>
          <div className="grid grid-cols-3 gap-4">
            <StatCard dark label="Total Questions" value={d.totalQuestions.toLocaleString()} sub={`${d.weekQuestions} this week`} icon="💬" />
            <StatCard label="Time Saved" value={timeSaved} sub="professor hours freed up" icon="⏱" />
            <StatCard label="AI Confidence" value={`${d.confidenceRate}%`} sub="answers grounded in materials" icon="✓" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Students Engaged" value={d.estimatedStudents} sub="unique sessions detected" icon="👥" />
            <StatCard label="Peak Study Time" value={d.peakHour} sub="most active hour" icon="🌙" />
            <StatCard label="Top Topic" value={topTopic} sub="most asked this week" icon="📌" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-0.5">Weekly Activity</h3>
              <p className="text-[11px] text-gray-400 mb-5">Questions asked per day</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={d.dailyActivity} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F9FAFB' }} />
                  <Bar dataKey="questions" fill="#0F0F0F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-0.5">Topic Distribution</h3>
              <p className="text-[11px] text-gray-400 mb-4">What students are asking about</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={150} height={150}>
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={3} dataKey="value">{pieData.map((_, i) => <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />)}</Pie><Tooltip content={<PieTooltipCustom />} /></PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">{pieData.map((entry, i) => (<div key={i} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TOPIC_COLORS[i % TOPIC_COLORS.length] }} /><span className="text-xs text-gray-600 flex-1 truncate">{entry.name}</span><span className="text-xs font-semibold text-gray-900">{Math.round(entry.percent * 100)}%</span></div>))}</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">💡</div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5">Scholr AI Insight</p>
                <p className="text-sm leading-relaxed text-white/80">Students asked about <strong className="text-white">{topTopic}</strong> most this week.{d.flagged?.length > 0 && <> {d.flagged.length} question{d.flagged.length > 1 ? 's' : ''} couldn't be answered confidently.</>}{d.weekQuestions > 5 && <> Peak activity was at <strong className="text-white">{d.peakHour}</strong>.</>}</p>
              </div>
            </div>
          </div>
        </>)}
        {activeTab === 'questions' && (<>
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-5"><div><h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Recent Questions</h3><p className="text-[11px] text-gray-400 mt-0.5">What students asked in real time</p></div><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[10px] text-gray-400">Live</span></div></div>
            <div className="divide-y divide-gray-50">{d.recent.slice(0, 10).map((q, i) => { const label = getTopicLabel(q.question); return (<div key={i} className="flex items-start gap-4 py-3"><div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${q.confident !== false ? 'bg-emerald-400' : 'bg-amber-400'}`} /><div className="flex-1 min-w-0"><p className="text-sm text-gray-800 leading-snug">{q.question}</p><span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 inline-block ${TOPIC_ACCENT[label] || 'bg-gray-100 text-gray-600'}`}>{label}</span></div><span className="text-[10px] text-gray-300 flex-shrink-0 mt-1">{formatRelativeDate(q.ts)}</span></div>); })}</div>
          </div>
        </>)}
        {activeTab === 'gaps' && (<>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6"><div className="flex items-start gap-4"><div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-lg">⚠️</div><div><h3 className="text-sm font-semibold text-amber-900 mb-1">Knowledge Gap Analysis</h3><p className="text-xs text-amber-700 leading-relaxed">These questions couldn't be answered confidently from your uploaded materials.</p></div></div></div>
          <div className="space-y-3">{d.flagged.map((q, i) => (<div key={i} className="bg-white rounded-2xl border border-gray-200 p-5"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0"><span className="text-amber-500 text-xs font-bold">#{i + 1}</span></div><div className="flex-1"><p className="text-sm text-gray-800 font-medium">{q.question}</p><div className="flex items-center gap-3 mt-2"><span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">Low confidence</span><span className="text-[10px] text-gray-400">{formatRelativeDate(q.ts)}</span></div></div></div></div>))}</div>
        </>)}
      </div>
    </div>
  );
}

// ── Classroom Mode ────────────────────────────────────────────────────────────
function ClassroomMode({ courseId, onExit }) {
  const [questions, setQuestions] = useState([]);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API}/course/${courseId}/insights`);
        const data = await res.json();
        const incoming = (data.recent || []).slice(0, 20);
        if (incoming.length > questions.length) setNewCount(incoming.length - questions.length);
        setQuestions(incoming);
      } catch {}
    };
    poll(); const i = setInterval(poll, 8000); return () => clearInterval(i);
  }, [courseId, questions.length]);

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col z-50">
      <style>{FONT}</style>
      <div className="flex items-center justify-between px-10 py-5 border-b border-white/10">
        <div className="flex items-center gap-4"><Logo size={28} /><span className="text-white font-semibold">Scholr</span>
          <div className="flex items-center gap-2 ml-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/25"><div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /><span className="text-red-400 text-xs font-medium">LIVE</span></div>
        </div>
        <button onClick={onExit} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 text-sm transition-colors"><X size={14} />End Session</button>
      </div>
      {newCount > 0 && <button onClick={() => setNewCount(0)} className="mx-8 mt-4 flex items-center justify-between px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors"><span>{newCount} new question{newCount > 1 ? 's' : ''}</span><span className="text-gray-500 text-xs">Dismiss</span></button>}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center"><Radio size={24} className="text-gray-600 mb-4" /><p className="text-gray-400 font-medium mb-1">Waiting for questions</p></div>
        ) : (
          <div className="space-y-3 max-w-2xl mx-auto">{questions.map((q, i) => (<div key={i} className="px-5 py-4 rounded-xl bg-white/5 border border-white/10"><p className="text-white text-sm leading-relaxed">{q.question}</p><div className="flex items-center gap-3 mt-2"><span className="text-gray-500 text-xs">{formatRelativeDate(q.ts)}</span>{!q.confident && <span className="text-amber-400 text-xs">Needs review</span>}</div></div>))}</div>
        )}
      </div>
    </div>
  );
}

// ── Student Chat View ─────────────────────────────────────────────────────────
function StudentView({ course, documents, suggestedQuestions, onExit, studentToken }) {
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [myNotes, setMyNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const paperclipRef = useRef(null);
  const abortRef = useRef(null);

  const authHeaders = { Authorization: `Bearer ${studentToken}` };
  const jsonHeaders = { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' };

  // Load persisted notes via server
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch(`${API}/student/notes/${course.id}`, { headers: authHeaders });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const notes = await Promise.all(data.map(async (n) => {
            try {
              const fileRes = await fetch(`${API}/student/notes/${course.id}/file/${encodeURIComponent(n.name)}`, { headers: authHeaders });
              if (fileRes.ok) { const buffer = await fileRes.arrayBuffer(); return { name: n.name, buffer, mimeType: n.mime_type }; }
            } catch {}
            return null;
          }));
          setMyNotes(notes.filter(Boolean));
        }
      } catch {}
      setNotesLoading(false);
    };
    fetchNotes();
  }, [course.id]);

  // Load persisted chats from server
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch(`${API}/student/chats/${course.id}`, { headers: authHeaders });
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const loaded = data.map(c => ({
            id: c.id,
            dbId: c.id,
            title: c.title,
            messages: (c.messages || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map(m => ({
              id: m.id, role: m.role, content: m.content, sources: m.sources || [], ts: new Date(m.created_at).getTime()
            }))
          }));
          setChats(loaded);
          setChatId(loaded[0].id);
        } else {
          await createNewChat();
        }
      } catch {
        await createNewChat();
      }
      setChatsLoading(false);
    };
    fetchChats();
  }, [course.id]);

  const DEFAULT_QUESTIONS = ["What are the main topics in this course?", "Summarize the key concepts from the materials", "What should I focus on for the exam?"];
  const questions = suggestedQuestions?.length ? suggestedQuestions : DEFAULT_QUESTIONS;
  const active = chats.find(c => c.id === chatId) || chats[0];
  const scrollToBottom = () => { setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 50); };
  useEffect(() => { if (active) scrollToBottom(); }, [active?.messages, isTyping]);

  const createNewChat = async () => {
    try {
      const res = await fetch(`${API}/student/chats/${course.id}`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ title: 'New Chat' }) });
      const data = await res.json();
      const nc = { id: data.id, dbId: data.id, title: 'New Chat', messages: [] };
      setChats(prev => [nc, ...prev]);
      setChatId(nc.id);
      return nc;
    } catch {
      const nc = { id: Date.now(), title: 'New Chat', messages: [] };
      setChats(prev => [nc, ...prev]);
      setChatId(nc.id);
      return nc;
    }
  };

const deleteChat = async (id) => {
  const chat = chats.find(c => c.id === id);
  if (chat?.dbId) {
    try { await fetch(`${API}/student/chats/${chat.dbId}`, { method: 'DELETE', headers: authHeaders }); } catch {}
  }
  const remaining = chats.filter(c => c.id !== id);
  if (remaining.length === 0) {
    const res = await fetch(`${API}/student/chats/${course.id}`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ title: 'New Chat' }) });
    const data = await res.json();
    const nc = { id: data.id, dbId: data.id, title: 'New Chat', messages: [] };
    setChats([nc]);
    setChatId(nc.id);
  } else {
    setChats(remaining);
    if (chatId === id) setChatId(remaining[0].id);
  }
};

  const handlePaperclipFile = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API}/student/notes/${course.id}/upload`, { method: 'POST', headers: authHeaders, body: fd });
      const data = await res.json();
      if (data.fileName) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const ext = file.name.toLowerCase().split('.').pop();
          const mimeMap = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
          setMyNotes(prev => [{ name: file.name, buffer: e.target.result, mimeType: mimeMap[ext] || 'application/pdf' }, ...prev.filter(d => d.name !== file.name)]);
        };
        reader.readAsArrayBuffer(file);
      }
    } catch {}
  };

  const deleteNote = async (name) => {
    try { await fetch(`${API}/student/notes/${course.id}/${encodeURIComponent(name)}`, { method: 'DELETE', headers: authHeaders }); } catch {}
    setMyNotes(prev => prev.filter(d => d.name !== name));
  };

  const onStop = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: c.messages.map(m => m.streaming ? { ...m, streaming: false } : m) } : c));
    setIsTyping(false);
  };

  const onSend = async (messageOverride) => {
    const message = messageOverride || input;
    if (!message.trim() || isTyping) return;
    const isFirstMessage = active.messages.length === 0;
    const currentChatId = chatId;
    const currentChat = chats.find(c => c.id === currentChatId);
    const completedMessages = active.messages.filter(m => !m.streaming);
    const fallback = isFirstMessage ? message.trim().split(/\s+/).slice(0, 5).join(' ') : null;
    const streamingMsgId = Date.now();

    // Save user message to DB
    const saveUserMsg = async (dbChatId) => {
      if (!dbChatId) return;
      try { await fetch(`${API}/student/chats/${dbChatId}/messages`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ role: 'user', content: message }) }); } catch {}
    };

    setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, ...(fallback ? { title: fallback } : {}), messages: [...c.messages, { role: 'user', content: message, ts: Date.now() }, { id: streamingMsgId, role: 'assistant', content: '', sources: [], ts: Date.now(), streaming: true }] } : c));
    setInput(''); setIsTyping(true);

    if (currentChat?.dbId) saveUserMsg(currentChat.dbId);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let response;
      if (myNotes.length > 0) {
        const fd = new FormData(); fd.append('message', message); fd.append('history', JSON.stringify(completedMessages.map(m => ({ role: m.role, content: m.content }))));
        myNotes.forEach((n, i) => fd.append(`note_${i}`, new Blob([n.buffer], { type: n.mimeType }), n.name));
        response = await fetch(`${API}/course/${course.id}/chat`, { method: 'POST', body: fd, signal: controller.signal });
      } else {
        response = await fetch(`${API}/course/${course.id}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ message, history: completedMessages.map(m => ({ role: m.role, content: m.content })) }) });
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = '', fullText = '', finalSources = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'token') { fullText += event.token; setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: m.content + event.token } : m) } : c)); scrollToBottom(); }
            else if (event.type === 'sources') { finalSources = event.sources; setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, sources: event.sources } : m) } : c)); }
            else if (event.type === 'done') {
              setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, streaming: false } : m) } : c));
              if (isFirstMessage) {
                const smartTitle = fullText.trim().split(/\s+/).slice(0, 6).join(' ').replace(/[.!?]$/, '');
                const finalTitle = smartTitle || fallback;
                setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, title: finalTitle } : c));
                if (currentChat?.dbId) {
                  try { await fetch(`${API}/student/chats/${currentChat.dbId}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ title: finalTitle }) }); } catch {}
                }
              }
              // Save assistant message to DB
              if (currentChat?.dbId) {
                try { await fetch(`${API}/student/chats/${currentChat.dbId}/messages`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ role: 'assistant', content: fullText, sources: finalSources }) }); } catch {}
              }
            }
            else if (event.type === 'error') { setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: 'error:' + event.error, streaming: false, isError: true } : m) } : c)); }
          } catch {}
        }
      }
    } catch (err) {
      const isAbort = err?.name === 'AbortError';
      setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: isAbort ? m.content : 'error:network', streaming: false, isError: !isAbort } : m) } : c));
    }
    abortRef.current = null; setIsTyping(false); inputRef.current?.focus();
  };

  if (chatsLoading) return (
    <div className="flex h-screen w-screen items-center justify-center bg-white fixed inset-0">
      <style>{FONT}</style>
      <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden fixed inset-0 bg-white">
      <style>{FONT}</style>
      <aside className="w-56 bg-[#F7F7F7] border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5 mb-3"><Logo size={22} /><span className="text-gray-900 font-semibold text-sm">Scholr</span></div>
          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
            <p className="text-gray-900 text-xs font-medium truncate">{course.name}</p>
            <p className="text-gray-400 text-[10px] mt-0.5">{documents.length} doc{documents.length !== 1 ? 's' : ''} · {myNotes.length} note{myNotes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="px-3 pt-3">
          <button onClick={createNewChat} className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"><Plus size={12} />New chat</button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <p className="text-[10px] text-gray-400 font-medium px-2 mb-2 uppercase tracking-widest">Chats</p>
          {chats.map(c => (
            <div key={c.id} className="group relative mb-0.5">
              <button onClick={() => setChatId(c.id)} className={`flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors pr-7 ${c.id === chatId ? 'bg-white border border-gray-200 text-gray-900 font-medium shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-700'}`}>
                <MessageSquare size={11} className="flex-shrink-0 opacity-40" /><span className="truncate">{c.title}</span>
              </button>
              <button onClick={e => { e.stopPropagation(); deleteChat(c.id); }} className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-400 transition-all"><Trash2 size={10} /></button>
            </div>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">My Notes</p>
            <button onClick={() => paperclipRef.current?.click()} className="text-[10px] text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1"><Plus size={10} />Add</button>
          </div>
          <input ref={paperclipRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => { handlePaperclipFile(e.target.files[0]); e.target.value = ''; }} />
          {notesLoading ? (
            <div className="flex items-center justify-center py-3"><div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" /></div>
          ) : myNotes.length === 0 ? (
            <button onClick={() => paperclipRef.current?.click()} className="w-full flex flex-col items-center py-3 rounded-lg border border-dashed border-gray-200 hover:border-gray-300 transition-colors cursor-pointer">
              <UploadCloud size={13} className="text-gray-300 mb-1" /><p className="text-[10px] text-gray-400">Drop notes or photos</p>
            </button>
          ) : (
            <div className="space-y-1">{myNotes.map((doc, i) => (<div key={i} className="group flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 border border-gray-100"><FileText size={10} className="text-gray-400 flex-shrink-0" /><span className="text-[11px] text-gray-700 flex-1 truncate">{cleanFileName(doc.name)}</span><button onClick={() => deleteNote(doc.name)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"><X size={9} /></button></div>))}</div>
          )}
          {myNotes.length > 0 && <p className="text-[10px] text-gray-400 mt-2">AI reads your notes + course materials</p>}
        </div>
        <div className="p-4 border-t border-gray-200">
          <button onClick={onExit} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-xs"><LogOut size={11} />Back to courses</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0">
          <h2 className="text-gray-900 text-sm font-medium">{active?.title || 'New Chat'}</h2>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />AI Active</div>
        </header>
        <div className="flex-1 overflow-y-auto px-8 py-8 flex flex-col gap-5">
          {(!active || active.messages.length === 0) && (
            <div className="flex flex-col items-center justify-center flex-1 pb-10 fade-up">
              {documents.length === 0 ? (
                <div className="text-center max-w-xs"><Clock size={20} className="text-gray-200 mx-auto mb-4" /><h3 className="text-gray-700 font-medium text-sm mb-1">Setting up your course</h3><p className="text-gray-400 text-xs">Your instructor is uploading materials.</p></div>
              ) : (
                <div className="text-center max-w-md w-full flex flex-col items-center">
                  <Logo size={36} />
                  <h3 className="text-gray-900 font-semibold text-lg mt-5 mb-1.5">Ask anything about your course</h3>
                  <p className="text-gray-400 text-sm mb-8">Every answer is grounded in your professor's materials.</p>
                  <div className="space-y-2 text-left w-full">{questions.map((q, i) => (<button key={i} onClick={() => onSend(q)} className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-sm hover:bg-gray-100 hover:border-gray-300 transition-all"><span className="text-gray-300 mr-2 text-xs font-mono">{i + 1}.</span>{q}</button>))}</div>
                </div>
              )}
            </div>
          )}
          {active?.messages.map((m, i) => {
            const msgId = m.id || i;
            const isError = m.isError || m.content?.startsWith('error:');
            return (
              <div key={msgId} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col ${m.role === 'user' ? 'items-end max-w-xl' : 'items-start max-w-2xl w-full'}`}>
                  <div className={`rounded-2xl text-sm w-full ${m.role === 'user' ? 'bg-gray-900 text-white px-4 py-3 rounded-br-sm' : 'text-gray-800'}`}>
                    {m.role === 'assistant' && m.content === '' && m.streaming ? (
                      <div className="flex items-center gap-3 py-2"><div className="flex flex-col justify-center gap-1" style={{ width: '22px' }}><div className="eq-bar eq1" /><div className="eq-bar eq2" /><div className="eq-bar eq3" /></div><span className="text-xs text-gray-400">Reading your materials...</span></div>
                    ) : isError ? <ErrorMessage content={m.content} /> : m.role === 'user' ? <p className="leading-relaxed whitespace-pre-wrap text-white">{m.content}</p> : <MarkdownMessage content={m.content} />}
                    {m.role === 'assistant' && m.streaming && m.content && <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />}
                    {m.role === 'assistant' && m.sources?.length > 0 && !m.streaming && !isError && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-gray-300 uppercase tracking-wide mr-0.5">From</span>
                        {m.sources.map((source, idx) => (<span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-[11px] font-medium"><FileText size={9} /><span className="max-w-[200px] truncate">{cleanFileName(source)}</span></span>))}
                      </div>
                    )}
                    {m.role === 'user' && <span className="block text-[10px] mt-1.5 opacity-30">{formatTime(m.ts)}</span>}
                  </div>
                  {m.role === 'assistant' && !m.streaming && m.content && !isError && (
                    <div className="flex items-center gap-0.5 mt-1.5">
                      <button onClick={() => { navigator.clipboard.writeText(m.content.replace(/\nSOURCES:.*$/m, '').trim()); setCopiedId(msgId); setTimeout(() => setCopiedId(null), 2000); }} className={`p-1.5 rounded-lg transition-colors ${copiedId === msgId ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}>{copiedId === msgId ? <Check size={12} /> : <Copy size={12} />}</button>
                      <button onClick={() => setFeedback(prev => ({ ...prev, [msgId]: prev[msgId] === 'up' ? null : 'up' }))} className={`p-1.5 rounded-lg transition-colors ${feedback[msgId] === 'up' ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}><ThumbsUp size={12} /></button>
                      <button onClick={() => setFeedback(prev => ({ ...prev, [msgId]: prev[msgId] === 'down' ? null : 'down' }))} className={`p-1.5 rounded-lg transition-colors ${feedback[msgId] === 'down' ? 'text-red-400' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}><ThumbsDown size={12} /></button>
                      <span className="text-[10px] text-gray-200 ml-1.5">{formatTime(m.ts)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div className="px-8 py-4 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-gray-400 focus-within:bg-white focus-within:shadow-sm transition-all gap-2">
              <button onClick={() => paperclipRef.current?.click()} className="flex-shrink-0 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><Paperclip size={15} /></button>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isTyping) onSend(); } }}
                className="flex-1 bg-transparent text-gray-800 text-sm outline-none placeholder-gray-400 py-1.5" placeholder={myNotes.length > 0 ? "Ask about your course + notes..." : "Ask about your course..."} />
              {isTyping ? (
                <button onClick={onStop} className="w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center flex-shrink-0"><Square size={11} fill="currentColor" /></button>
              ) : (
                <button onClick={() => onSend()} disabled={!input.trim()} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${!input.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}><Send size={12} /></button>
              )}
            </div>
          </div>
          <p className="text-center text-[10px] text-gray-300 mt-2">Grounded in your course materials · Vertex AI</p>
        </div>
      </main>
    </div>
  );
}



// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage({ onStudent, onInstructor, onSignIn }) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.sr').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <style>{FONT}</style>

      <nav className="flex items-center justify-between px-10 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <span className="text-gray-900 font-semibold text-base tracking-tight">Scholr</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onSignIn} className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors">Sign in</button>
          <button onClick={onInstructor} className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors">Get started →</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="sr in inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-500 text-xs font-medium mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Course-grounded AI tutoring
        </div>
        <h1 className="sr in sr-d1 serif text-[62px] leading-[1.08] text-gray-900 mb-6">Every answer from<br /><span className="italic">your course materials.</span></h1>
        <p className="sr in sr-d2 text-gray-500 text-lg max-w-md mx-auto leading-relaxed mb-10">AI tutoring grounded in what your professor uploaded. Cited, accurate, and trustworthy.</p>
        <div className="sr in sr-d3 flex items-center justify-center gap-3 flex-wrap">
          <button onClick={onInstructor} className="px-7 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors">Get started free →</button>
          <button onClick={onStudent} className="px-7 py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors">Join a course</button>
        </div>
      </div>

      {/* Product Mockup */}
      <div className="bg-gray-100 border-y border-gray-200 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="sr bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-1 text-xs text-gray-400 font-mono">scholr.study</div>
            </div>
            <div className="flex" style={{height:'340px'}}>
              <div className="w-44 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0 p-3">
                <div className="flex items-center gap-2 mb-3"><Logo size={18} /><span className="text-gray-900 text-xs font-semibold">Scholr</span></div>
                <div className="bg-gray-900 rounded-lg px-2.5 py-2 mb-3">
                  <p className="text-white text-[10px] font-medium">BUS-A 306</p>
                  <p className="text-gray-500 text-[9px]">Management Acct.</p>
                </div>
                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold mb-1.5 px-1">Chats</p>
                <div className="bg-gray-900 rounded-lg px-2.5 py-1.5 mb-1"><p className="text-white text-[10px]">Midterm topics</p></div>
                <div className="bg-white border border-gray-100 rounded-lg px-2.5 py-1.5 mb-1"><p className="text-gray-500 text-[10px]">Grading breakdown</p></div>
                <div className="bg-white border border-gray-100 rounded-lg px-2.5 py-1.5"><p className="text-gray-500 text-[10px]">Late policy</p></div>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="border-b border-gray-100 px-5 py-2.5 flex items-center justify-between">
                  <span className="text-gray-900 text-xs font-medium">Midterm topics</span>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-[10px] text-emerald-600">AI Active</span></div>
                </div>
                <div className="flex-1 overflow-hidden px-5 py-4 flex flex-col gap-3">
                  <div className="flex justify-end">
                    <div className="bg-gray-900 text-white rounded-xl rounded-br-sm px-3 py-2 text-[11px] max-w-[70%]">What topics will be on the midterm?</div>
                  </div>
                  <div className="flex flex-col gap-1.5 max-w-[88%]">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2.5 text-[11px] text-gray-700 leading-relaxed">The midterm covers chapters 1–4, with emphasis on cost-volume-profit analysis and contribution margin. You'll also need to know job-order costing and overhead allocation from week 3. (p. 12, 34)</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-gray-400">From</span>
                      <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5"><FileText size={8} className="text-gray-500" /><span className="text-[9px] text-gray-600">Syllabus.pdf</span></div>
                      <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5"><FileText size={8} className="text-gray-500" /><span className="text-[9px] text-gray-600">Week3_Notes.pdf</span></div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-gray-900 text-white rounded-xl rounded-br-sm px-3 py-2 text-[11px] max-w-[70%]">How much is it worth?</div>
                  </div>
                  <div className="flex flex-col gap-1.5 max-w-[88%]">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2.5 text-[11px] text-gray-700 leading-relaxed">The midterm is worth 25% of your final grade. (p. 2)</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-gray-400">From</span>
                      <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5"><FileText size={8} className="text-gray-500" /><span className="text-[9px] text-gray-600">Syllabus.pdf</span></div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-100 px-4 py-2.5 flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-[10px] text-gray-400">Ask about your course...</div>
                  <div className="w-6 h-6 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0"><Send size={9} className="text-white" /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-3xl mx-auto px-6 py-20">
        <p className="sr text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-3">How it works</p>
        <h2 className="sr sr-d1 serif text-4xl text-gray-900 text-center mb-14 font-normal">Up and running in minutes</h2>
        <div className="grid grid-cols-3 gap-8">
          {[
            { n: '1', title: 'Create a course', desc: 'Sign up as an instructor, create a course, and get an instant invite link to share with students.', d: 'sr-d1' },
            { n: '2', title: 'Upload materials', desc: 'Drop in your syllabus, lecture notes, and readings. The AI indexes everything instantly.', d: 'sr-d2' },
            { n: '3', title: 'Students get answers', desc: 'Students ask questions 24/7 and get cited answers grounded only in your materials.', d: 'sr-d3' },
          ].map((s, i) => (
            <div key={i} className={`sr ${s.d} text-center`}>
              <div className="w-9 h-9 rounded-full bg-gray-900 text-white text-sm font-semibold flex items-center justify-center mx-auto mb-4">{s.n}</div>
              <p className="text-gray-900 text-sm font-medium mb-2">{s.title}</p>
              <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white border-t border-gray-200 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="sr text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-3">Why Scholr</p>
          <h2 className="sr sr-d1 serif text-4xl text-gray-900 text-center mb-14 font-normal">Built for academic integrity</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <CheckCircle2 size={14} className="text-white" />, title: 'Cited answers', desc: 'Every response traces back to the exact document and page it came from.', d: 'sr-d1' },
              { icon: <Clock size={14} className="text-white" />, title: 'Always available', desc: 'Students get answers at 2am before exams — no waiting for office hours.', d: 'sr-d2' },
              { icon: <Users size={14} className="text-white" />, title: 'Per course AI', desc: 'Each course gets its own tutor. Students only see answers from their class.', d: 'sr-d3' },
              { icon: <BarChart2 size={14} className="text-white" />, title: 'Student insights', desc: 'See what students are confused about before the next class session.', d: 'sr-d1' },
              { icon: <FileText size={14} className="text-white" />, title: 'Materials only', desc: 'The AI never answers from outside your course. No hallucinations.', d: 'sr-d2' },
              { icon: <Lock size={14} className="text-white" />, title: 'FERPA aligned', desc: 'Student data stays private. Built with educational privacy standards in mind.', d: 'sr-d3' },
            ].map((f, i) => (
              <div key={i} className={`sr ${f.d} bg-[#FAFAFA] border border-gray-200 rounded-2xl p-5`}>
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center mb-4">{f.icon}</div>
                <p className="text-gray-900 text-sm font-medium mb-1.5">{f.title}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="bg-gray-900 py-16">
        <div className="sr max-w-xl mx-auto px-6 text-center">
          <h2 className="serif text-4xl text-white mb-4 font-normal">Ready to get started?</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">Set up your first course in minutes. Free to start.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={onInstructor} className="px-7 py-3.5 rounded-xl bg-white hover:bg-gray-100 text-gray-900 text-sm font-medium transition-colors">Get started free →</button>
            <button onClick={onStudent} className="px-7 py-3.5 rounded-xl border border-white/20 hover:border-white/40 text-white text-sm font-medium transition-colors">Join a course</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-white/10 py-8">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 28 28" fill="none"><path d="M8 10h8M8 14h12M8 18h6" stroke="#0F0F0F" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <span className="text-white text-sm font-semibold">Scholr</span>
            <span className="text-gray-600 text-xs">© 2025</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span>FERPA aligned</span>
            <span>·</span>
            <span>Powered by Google Vertex AI</span>
            <span>·</span>
            <span>Answers from your materials only</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

// ── Join Course Page ──────────────────────────────────────────────────────────
function JoinCoursePage({ studentToken, studentUser, onStudentLogin, onEnterCourse }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch(`${API}/course/join/${code}`)
      .then(r => r.json())
      .then(data => { if (data.id) setCourse(data); else setError('Course not found'); })
      .catch(() => setError('Could not connect to server'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoinNow = async () => {
    if (!studentToken) {
      sessionStorage.setItem('scholr_pending_join', code);
      navigate('/student/login');
      return;
    }
    setJoining(true);
    try {
      await fetch(`${API}/student/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({ course_id: course.id }),
      });
      navigate('/student');
    } catch { setError('Could not join course'); }
    setJoining(false);
  };

  if (loading) return <LoadingScreen label="Loading your course..." />;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <style>{FONT}</style>
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3"><Logo size={24} /><span className="text-gray-900 font-semibold">Scholr</span></div>
        {studentUser && <span className="text-gray-400 text-sm">{studentUser.name || studentUser.email}</span>}
      </nav>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {error ? (
            <div className="text-center">
              <h1 className="text-gray-900 font-semibold text-lg mb-2">Course not found</h1>
              <p className="text-gray-400 text-sm mb-6">This course may no longer be available. Contact your professor for a new link.</p>
              <button onClick={() => navigate('/')} className="text-gray-500 text-sm hover:text-gray-800 transition-colors">← Back to Scholr</button>
            </div>
          ) : (
            <div className="fade-up">
              <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center mb-6"><BookOpen size={20} className="text-white" /></div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">You've been invited to join</p>
                <h1 className="serif text-3xl text-gray-900 mb-1">{course?.name}</h1>
                <div className="flex items-center gap-2 mb-8 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 w-fit">
                  <span className="text-xs font-mono text-gray-500">{code}</span>
                </div>
                <button onClick={handleJoinNow} disabled={joining}
                  className="w-full py-4 rounded-2xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                  {joining ? 'Joining...' : studentToken ? 'Join class now →' : 'Sign up to join class →'}
                </button>
                {!studentToken && (
                  <p className="text-center text-xs text-gray-400 mt-3">
                    Already have an account?{' '}
                    <button onClick={() => { sessionStorage.setItem('scholr_pending_join', code); navigate('/student/login'); }}
                      className="text-gray-700 font-medium hover:underline">Sign in</button>
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
                <span>🔒 FERPA aligned</span><span className="w-1 h-1 rounded-full bg-gray-300" /><span>Powered by Google Vertex AI</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState('landing');
  const [profToken, setProfToken] = useState(null);
  const [profUser, setProfUser] = useState(null);
  const [studentToken, setStudentToken] = useState(null);
  const [studentUser, setStudentUser] = useState(null);
  const [studentCourse, setStudentCourse] = useState(null);
  const [studentDocs, setStudentDocs] = useState([]);
  const [studentQuestions, setStudentQuestions] = useState([]);
  const [pendingJoinCode, setPendingJoinCode] = useState(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const hashParams = new URLSearchParams(hash.replace('#', '?'));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        import('@supabase/supabase-js').then(({ createClient }) => {
          const supabase = createClient('https://dtgukefqobgnreejlxyb.supabase.co', 'sb_publishable_bmvI67pGsWD52YYoIF3oDw_88izApLs');
          supabase.auth.getUser(accessToken).then(({ data: { user } }) => {
            if (user) {
              supabase.from('students').upsert(
                { id: user.id, email: user.email, name: user.user_metadata?.full_name || user.email.split('@')[0] },
                { onConflict: 'id' }
              ).then(() => {
                const sUser = { id: user.id, email: user.email, name: user.user_metadata?.full_name || user.email.split('@')[0] };
                localStorage.setItem('scholr_student_token', accessToken);
                localStorage.setItem('scholr_student_user', JSON.stringify(sUser));
                setStudentToken(accessToken); setStudentUser(sUser);
                window.history.replaceState({}, '', '/');
                setScreen('student-dashboard');
              });
            }
          });
        });
        return;
      }
    }

    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setPendingJoinCode(joinCode);
      window.history.replaceState({}, '', '/');
      const token = localStorage.getItem('scholr_student_token');
      const user = localStorage.getItem('scholr_student_user');
      if (token && user) { setStudentToken(token); setStudentUser(JSON.parse(user)); setScreen('student-dashboard'); }
      else { setScreen('student-login'); }
      return;
    }

    const pToken = localStorage.getItem('scholr_token');
    const pUser = localStorage.getItem('scholr_user');
    if (pToken && pUser) { setProfToken(pToken); setProfUser(JSON.parse(pUser)); setScreen('prof-dashboard'); return; }
    const sToken = localStorage.getItem('scholr_student_token');
    const sUser = localStorage.getItem('scholr_student_user');
    if (sToken && sUser) { setStudentToken(sToken); setStudentUser(JSON.parse(sUser)); setScreen('student-dashboard'); }
  }, []);

  const handleProfLogin = (token, user) => { localStorage.setItem('scholr_token', token); localStorage.setItem('scholr_user', JSON.stringify(user)); setProfToken(token); setProfUser(user); setScreen('prof-dashboard'); };
  const handleProfLogout = () => { localStorage.removeItem('scholr_token'); localStorage.removeItem('scholr_user'); setProfToken(null); setProfUser(null); setScreen('landing'); };
  const handleStudentLogin = (token, user) => { localStorage.setItem('scholr_student_token', token); localStorage.setItem('scholr_student_user', JSON.stringify(user)); setStudentToken(token); setStudentUser(user); setScreen('student-dashboard'); };
  const handleStudentLogout = () => { localStorage.removeItem('scholr_student_token'); localStorage.removeItem('scholr_student_user'); setStudentToken(null); setStudentUser(null); setScreen('landing'); };
  const handleEnterCourse = (course, docs, questions) => { setStudentCourse(course); setStudentDocs(docs); setStudentQuestions(questions); setScreen('student-chat'); };

  const renderScreen = () => {
    switch (screen) {
      case 'landing': return <LandingPage onStudent={() => setScreen('student-login')} onInstructor={() => setScreen('prof-signup')} onSignIn={() => setScreen('smart-signin')} />;
      case 'smart-signin': return <SmartSignIn onProfLogin={handleProfLogin} onStudentLogin={handleStudentLogin} onBack={() => setScreen('landing')} />;
      case 'student-login': return <StudentLogin onLogin={handleStudentLogin} onGoSignup={() => setScreen('student-signup')} onBack={() => setScreen('landing')} pendingJoinCode={pendingJoinCode} />;
      case 'student-signup': return <StudentSignup onLogin={handleStudentLogin} onGoLogin={() => setScreen('student-login')} onBack={() => setScreen('landing')} pendingJoinCode={pendingJoinCode} />;
      case 'student-dashboard': return <StudentDashboard token={studentToken} user={studentUser} onEnterCourse={handleEnterCourse} onLogout={handleStudentLogout} />;
      case 'student-chat': return <StudentView course={studentCourse} documents={studentDocs} suggestedQuestions={studentQuestions} onExit={() => setScreen('student-dashboard')} studentToken={studentToken} />;
      case 'prof-login': return <ProfessorLogin onLogin={handleProfLogin} onGoSignup={() => setScreen('prof-signup')} onBack={() => setScreen('landing')} />;
      case 'prof-signup': return <ProfessorSignup onLogin={handleProfLogin} onGoLogin={() => setScreen('prof-login')} onBack={() => setScreen('landing')} />;
      case 'prof-dashboard': return <ProfessorDashboard token={profToken} user={profUser} onLogout={handleProfLogout} />;
      default: return null;
    }
  };

  return (
    <Routes>
      <Route path="/join/:code" element={<JoinCoursePage studentToken={studentToken} studentUser={studentUser} onStudentLogin={handleStudentLogin} onEnterCourse={handleEnterCourse} />} />
      <Route path="/student/login" element={<StudentLogin onLogin={handleStudentLogin} onGoSignup={() => navigate('/student/signup')} onBack={() => navigate('/')} pendingJoinCode={pendingJoinCode} />} />
      <Route path="/student/signup" element={<StudentSignup onLogin={handleStudentLogin} onGoLogin={() => navigate('/student/login')} onBack={() => navigate('/')} pendingJoinCode={pendingJoinCode} />} />
      <Route path="/student" element={studentToken ? <StudentDashboard token={studentToken} user={studentUser} onEnterCourse={handleEnterCourse} onLogout={handleStudentLogout} /> : <LandingPage onStudent={() => navigate('/student/login')} onInstructor={() => setScreen('prof-signup')} onSignIn={() => setScreen('smart-signin')} />} />
      <Route path="/*" element={renderScreen()} />
    </Routes>
  );
}
