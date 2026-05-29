import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import {
  MessageSquare, Send, LogOut, Trash2, Plus, BookOpen, FileText,
  ChevronRight, Users, AlertCircle, UploadCloud, BarChart2, Clock,
  CheckCircle2, Copy, Check, ThumbsUp, ThumbsDown, X,
  Lock, WifiOff, Paperclip, Square, ArrowLeft, ExternalLink, Hash, Menu,
  ListChecks, RotateCcw, Sparkles, ChevronLeft, MoreHorizontal, Pencil
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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
  @keyframes pageEnter { from { opacity:0; } to { opacity:1; } }
  .page-enter { animation: pageEnter 0.22s ease-out both; }
  @media (prefers-reduced-motion: reduce) {
    .page-enter, .fade-up { animation: none; }
  }
  @keyframes eq1 { 0%,100%{width:8px} 50%{width:18px} }
  @keyframes eq2 { 0%,100%{width:16px} 50%{width:6px} }
  @keyframes eq3 { 0%,100%{width:11px} 30%{width:18px} 70%{width:5px} }
  .eq-bar { height:2.5px; border-radius:2px; background:#374151; display:block; }
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

// Rotates through a few "thinking" phrases while the AI is generating.
function ThinkingText() {
  const phrases = ['Reading your materials…', 'Checking your course materials…', 'Thinking it through…', 'Pulling the details together…'];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI(p => (p + 1) % phrases.length), 1900);
    return () => clearInterval(id);
  }, []);
  return <span className="text-sm text-gray-400 inline-block py-1 transition-opacity">{phrases[i]}</span>;
}

// The AI identity: three black lines (no square). While `thinking`, the line
// widths animate (the same motion as the typing indicator); at rest they settle
// to middle-longest / top-second / bottom-shortest and stay as the avatar.
function AiMark({ thinking = false }) {
  return (
    <div className="flex flex-col gap-[3px]" style={{ width: 20 }}>
      <div className={`h-[2.5px] rounded-full bg-gray-900 ${thinking ? 'eq1' : ''}`} style={thinking ? undefined : { width: 13 }} />
      <div className={`h-[2.5px] rounded-full bg-gray-900 ${thinking ? 'eq2' : ''}`} style={thinking ? undefined : { width: 19 }} />
      <div className={`h-[2.5px] rounded-full bg-gray-900 ${thinking ? 'eq3' : ''}`} style={thinking ? undefined : { width: 9 }} />
    </div>
  );
}

// True on md+ viewports — resize only applies on desktop (mobile sidebars are
// full-height drawers).
function useIsDesktop() {
  const [d, setD] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const h = e => setD(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return d;
}

// Draggable sidebar width, persisted to localStorage. Returns [width, startDrag].
const SIDEBAR_MIN = 220, SIDEBAR_MAX = 480;
function useSidebarWidth(storageKey, def = 288) {
  const [width, setWidth] = useState(() => {
    const saved = parseInt(localStorage.getItem(storageKey) || '', 10);
    return saved >= SIDEBAR_MIN && saved <= SIDEBAR_MAX ? saved : def;
  });
  const startDrag = (e) => {
    e.preventDefault();
    const startX = e.clientX, startW = width;
    const onMove = (ev) => setWidth(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startW + (ev.clientX - startX))));
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setWidth(w => { localStorage.setItem(storageKey, String(w)); return w; });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  return [width, startDrag];
}

// The thin drag bar on a sidebar's right edge (desktop only).
function ResizeHandle({ onMouseDown }) {
  return <div onMouseDown={onMouseDown} title="Drag to resize" className="hidden md:block absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-gray-200 active:bg-gray-300 transition-colors z-50" />;
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
        {icon && <span className={dark ? 'text-white/40' : 'text-gray-300'}>{icon}</span>}
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

// ─── Styled in-app confirmation modal (replaces native confirm()) ──────────
function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 fade-up" onClick={onCancel}>
      <style>{FONT}</style>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <h3 className="text-gray-900 font-semibold text-base mb-2">{title}</h3>
        {body && <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line mb-5">{body}</p>}
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors">{cancelLabel}</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-white text-xs font-medium transition-colors ${destructive ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-900 hover:bg-gray-800'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton loaders ────────────────────────────────────────────────────
// Use these instead of spinners. They show a grey placeholder shaped like the
// real content with a subtle shimmer — modern apps (Stripe, Linear, Notion)
// all do this and it reads as faster even when load time is identical.
function Skeleton({ className = '' }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}
function SkeletonCourseCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <Skeleton className="w-full h-[60px] rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-lg" />
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
function SkeletonStatCard({ dark = false }) {
  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-3 ${dark ? 'bg-gray-900' : 'bg-white border border-gray-200'}`}>
      <Skeleton className={`h-3 w-24 ${dark ? 'bg-white/10' : ''}`} />
      <Skeleton className={`h-8 w-20 ${dark ? 'bg-white/15' : ''}`} />
      <Skeleton className={`h-3 w-32 ${dark ? 'bg-white/10' : ''}`} />
    </div>
  );
}
function SkeletonChatRow() {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2">
      <Skeleton className="w-3 h-3 rounded-full" />
      <Skeleton className="flex-1 h-3" />
    </div>
  );
}

// Inline spinner for use inside buttons during async actions
function ButtonSpinner({ light = false }) {
  return <span className={`inline-block w-3 h-3 border-2 ${light ? 'border-white/40 border-t-white' : 'border-gray-400 border-t-gray-900'} rounded-full animate-spin`} />;
}

// ─── Toast banner — replaces native alert() ─────────────────────────────────
function ToastBanner({ message, type = 'info', onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [message, onClose]);
  if (!message) return null;
  const styles = {
    info: 'bg-gray-900 text-white',
    error: 'bg-red-500 text-white',
    success: 'bg-emerald-500 text-white',
  };
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[110] px-5 py-3 rounded-xl shadow-xl text-sm font-medium max-w-sm fade-up" style={{ background: type === 'error' ? '#EF4444' : type === 'success' ? '#10B981' : '#0F0F0F', color: 'white' }}>
      {message}
    </div>
  );
}

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
  const clean = content
    .replace(/\nSOURCES:.*$/m, '')
    // LLMs sometimes emit LaTeX text-styling commands outside math mode, where
    // KaTeX renders them as broken red text. Convert the common ones to Markdown
    // so e.g. \textbf{77.25%} becomes proper **bold** instead of a parse error.
    .replace(/\\textbf\{([^{}]*)\}/g, '**$1**')
    .replace(/\\textit\{([^{}]*)\}/g, '*$1*')
    // Strip inline page citations like "(p. 6)" / "(pp. 12-14)" / "(page 6)" —
    // the source is shown below the answer instead. Cleans new and old messages.
    .replace(/\s*\((?:pp?\.?|page)\s*\d[\d\s,&\-–]*\)/gi, '')
    .trim();
  return (
    <div className="text-sm leading-relaxed text-gray-800">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false, errorColor: '#6b7280' }]]} components={{
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

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.59 2.41v2h2.57c1.5-1.38 2.4-3.42 2.4-5.87z" fill="#4285F4"/>
    <path d="M8 16c2.16 0 3.97-.72 5.29-1.94l-2.57-2a4.8 4.8 0 01-7.15-2.52H.96v2.07A8 8 0 008 16z" fill="#34A853"/>
    <path d="M3.57 9.54A4.8 4.8 0 013.32 8c0-.54.09-1.06.25-1.54V4.39H.96A8 8 0 000 8c0 1.29.31 2.51.96 3.61l2.61-2.07z" fill="#FBBC05"/>
    <path d="M8 3.18c1.22 0 2.31.42 3.17 1.24l2.37-2.37A8 8 0 00.96 4.39L3.57 6.46A4.8 4.8 0 018 3.18z" fill="#EA4335"/>
  </svg>
);

// Role chooser — replaces the old "smart" sign-in that auto-detected role.
// Forces the user to pick the same role they signed up as so they always land
// in the right portal.
function SmartSignIn({ onPickStudent, onPickProfessor, onBack }) {
  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col items-center justify-center px-6 page-enter" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <style>{FONT}</style>
      <div className="mb-8 flex items-center gap-3"><Logo size={28} /><span className="text-gray-900 font-semibold">Scholr</span></div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="serif text-3xl text-gray-900 mb-1.5">Welcome back</h1>
          <p className="text-gray-400 text-sm">Sign in to the portal you signed up for</p>
        </div>
        <div className="space-y-3">
          <button onClick={onPickStudent}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all text-left group">
            <div>
              <p className="text-gray-900 font-semibold text-sm">I'm a student</p>
              <p className="text-gray-400 text-xs mt-0.5">Sign in to your courses</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 transition-colors" />
          </button>
          <button onClick={onPickProfessor}
            className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all text-left group">
            <div>
              <p className="text-gray-900 font-semibold text-sm">I'm a teacher</p>
              <p className="text-gray-400 text-xs mt-0.5">Sign in to your courses + analytics</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-600 transition-colors" />
          </button>
        </div>
        <div className="mt-6 text-center">
          <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1 mx-auto"><ArrowLeft size={12} />Back</button>
        </div>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center page-enter">
      <style>{FONT}</style>
      <div className="mb-8 flex items-center gap-3"><Logo size={28} /><span className="text-gray-900 font-semibold">Scholr</span></div>
      <div className={`w-full max-w-sm px-6 ${shaking ? 'shake' : ''}`}>
        <div className="text-center mb-8">
          <h1 className="serif text-3xl text-gray-900 mb-1.5">Instructor login</h1>
          <p className="text-gray-400 text-sm">Sign in to manage your courses</p>
        </div>
        <button onClick={() => { window.location.href = `${API}/professor/auth/google`; }}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm text-gray-700 text-sm font-medium transition-all mb-4">
          <GoogleIcon />Continue with Google
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-200" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input id="prof-email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input id="prof-password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={!email || !password || loading}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {loading ? <span className="flex items-center justify-center gap-2"><ButtonSpinner light />Signing in…</span> : 'Sign in'}
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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center page-enter">
      <style>{FONT}</style>
      <div className="mb-8 flex items-center gap-3"><Logo size={28} /><span className="text-gray-900 font-semibold">Scholr</span></div>
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="serif text-3xl text-gray-900 mb-1.5">Create account</h1>
          <p className="text-gray-400 text-sm">Set up your instructor workspace</p>
        </div>
        <button onClick={() => { window.location.href = `${API}/professor/auth/google`; }}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm text-gray-700 text-sm font-medium transition-all mb-4">
          <GoogleIcon />Continue with Google
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-200" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input id="prof-signup-name" name="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input id="prof-signup-email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input id="prof-signup-password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 chars)"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={!name || !email || !password || loading}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {loading ? <span className="flex items-center justify-center gap-2"><ButtonSpinner light />Creating account…</span> : 'Create account'}
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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center page-enter">
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
          <input id="student-email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input id="student-password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={!email || !password || loading}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {loading ? <span className="flex items-center justify-center gap-2"><ButtonSpinner light />Signing in…</span> : 'Sign in'}
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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center page-enter">
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
          <input id="student-signup-name" name="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input id="student-signup-email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          <input id="student-signup-password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (min 6 chars)"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button type="submit" disabled={!name || !email || !password || loading}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            {loading ? <span className="flex items-center justify-center gap-2"><ButtonSpinner light />Creating account…</span> : 'Create account'}
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
      // Expired/invalid session → don't show an empty "no courses" screen with a
      // dead token; send them to sign in again for a fresh token.
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      setEnrolledCourses(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    // Wait until the auth token is actually available — on the OAuth path this
    // component can render before the token lands, and enrolling without it
    // would 401. We do NOT remove the pending code here; handleJoin clears it
    // only after a successful enroll, so a too-early run can safely retry.
    if (!token) return;
    fetchCourses();
    const pendingCode = sessionStorage.getItem('scholr_pending_join');
    if (pendingCode) handleJoin(pendingCode);
  }, [token]);

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
      // Enroll succeeded (or already enrolled) — safe to clear the pending code now.
      sessionStorage.removeItem('scholr_pending_join');
      setJoiningCode(''); setShowJoinInput(false);
      showToast(`Joined ${course.name}!`);
      fetchCourses();
    } catch { setJoinError('Server unreachable'); }
    setJoining(false);
  };

  const handleEnterCourse = (course) => {
    // Navigate immediately — StudentView fetches docs + suggested-questions
    // in its own background effects so the click feels instant. Previously
    // we awaited both before transitioning, which blocked up to 5s on
    // Gemini for the questions.
    onEnterCourse(course, [], []);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = (user.name || user.email).split(' ')[0];

  return (
    <div className="min-h-[100dvh] bg-[#F7F7F7] page-enter" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <style>{FONT}</style>
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 md:gap-3 min-w-0 hover:opacity-80 transition-opacity" aria-label="Scholr home"><Logo size={24} /><span className="text-gray-900 font-semibold text-sm">Scholr</span><span className="text-gray-300 hidden sm:inline">·</span><span className="text-gray-500 text-sm truncate hidden sm:inline">{user.name || user.email}</span></button>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-xs flex-shrink-0"><LogOut size={12} />Sign out</button>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="flex items-start justify-between mb-6 md:mb-8 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">{greeting}, {firstName}</h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">{enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''} · your AI tutor is ready</p>
          </div>
          <button onClick={() => setShowJoinInput(true)} className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs md:text-sm font-medium transition-colors flex-shrink-0"><Plus size={14} />Join a course</button>
        </div>
        {showJoinInput && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Join a course</h3>
            <p className="text-xs text-gray-400 mb-4">Enter the join code your professor shared with you</p>
            <div className="flex gap-3">
              <input autoFocus id="join-code" name="join-code" type="text" value={joiningCode} onChange={e => { setJoiningCode(e.target.value.toUpperCase()); setJoinError(''); }}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1].map(i => <SkeletonCourseCard key={i} />)}
          </div>
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
                  {course.cover_image?.startsWith('http')
                    ? <img src={course.cover_image} alt="" className="w-full object-cover" style={{height:80}} />
                    : <CoursePattern courseId={course.id} patternId={coverPatternId(course)} height={80} />}
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

const COURSE_PATTERN_BGS = ['#0F0F0F', '#1a1a2e', '#0d1b2a', '#1a0a2e', '#0a1a1a', '#1f1147', '#0b2545', '#13262f', '#2a1a0a'];
// Parse a stored "pattern:N" cover into its index, else null.
function coverPatternId(course) {
  const m = /^pattern:(\d+)$/.exec(course?.cover_image || '');
  return m ? parseInt(m[1], 10) : null;
}
// Renders a chosen pattern (patternId 0–8) or, if none, a deterministic one
// derived from the courseId.
function CoursePattern({ courseId = '', patternId = null, height = 80 }) {
  let bg, type;
  if (patternId != null && patternId >= 0) {
    bg = COURSE_PATTERN_BGS[patternId % COURSE_PATTERN_BGS.length];
    type = patternId % 3;
  } else {
    const hash = courseId.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
    bg = COURSE_PATTERN_BGS[Math.abs(hash) % COURSE_PATTERN_BGS.length];
    type = Math.abs(hash >> 3) % 3;
  }
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

function ProfessorDashboard({ token, user, onLogout }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [patternPicker, setPatternPicker] = useState(null); // course whose cover is being chosen

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

  const savePattern = async (courseId, patternId) => {
    setPatternPicker(null);
    try {
      const res = await fetch(`${API}/professor/courses/${courseId}/cover`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ patternId }) });
      const data = await res.json();
      if (data.coverImage) {
        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, cover_image: data.coverImage } : c));
        showToast('Cover updated!');
      }
    } catch { showToast('Upload failed', 'error'); }
  };

  if (selectedCourse) return <CourseManager token={token} course={selectedCourse} onBack={() => setSelectedCourse(null)} authHeaders={authHeaders} />;

  return (
    <div className="min-h-[100dvh] bg-[#F7F7F7] page-enter" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <style>{FONT}</style>
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 md:gap-3 min-w-0 hover:opacity-80 transition-opacity" aria-label="Scholr home"><Logo size={24} /><span className="text-gray-900 font-semibold text-sm">Scholr</span><span className="text-gray-300 hidden sm:inline">·</span><span className="text-gray-500 text-sm truncate hidden sm:inline">{user.name || user.email}</span></button>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-xs flex-shrink-0"><LogOut size={12} />Sign out</button>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10">
        <div className="flex items-start justify-between mb-6 md:mb-8 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Your Courses</h1>
            <p className="text-gray-400 text-xs md:text-sm mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} · Each gets its own AI tutor and student portal</p>
          </div>
          <button onClick={() => setCreating(true)} className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs md:text-sm font-medium transition-colors flex-shrink-0"><Plus size={14} />New course</button>
        </div>
        {creating && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">New course</h3>
            <form onSubmit={createCourse} className="flex gap-3">
              <input autoFocus id="new-course-name" name="course-name" type="text" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} placeholder="e.g. BUS-A 306 Management Accounting"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
              <button type="submit" disabled={!newCourseName.trim()} className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">Create</button>
              <button type="button" onClick={() => { setCreating(false); setNewCourseName(''); }} className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-colors">Cancel</button>
            </form>
          </div>
        )}
        {loading ? (
          <div className="space-y-4">
            {[0, 1].map(i => <SkeletonCourseCard key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-6 py-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-gray-900 mx-auto mb-4 flex items-center justify-center"><BookOpen size={20} className="text-white" /></div>
            <h2 className="serif text-2xl text-gray-900 mb-2">Set up your first course</h2>
            <p className="text-gray-500 text-sm mb-1 max-w-sm mx-auto leading-relaxed">Create a course, upload your syllabus, and share the join code. Your students can start asking questions in minutes.</p>
            <button onClick={() => setCreating(true)} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"><Plus size={14} />Create your first course</button>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <div key={course.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="group/cover relative cursor-pointer" onClick={() => setPatternPicker(course)}>
                  {course.cover_image?.startsWith('http')
                    ? <img src={course.cover_image} alt="" className="w-full object-cover" style={{height:60}} />
                    : <CoursePattern courseId={course.id} patternId={coverPatternId(course)} height={60} />}
                  <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs font-medium opacity-0 group-hover/cover:opacity-100">Change cover</span>
                  </div>
                </div>
                <div className="p-4 md:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
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
                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
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
      {patternPicker && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 fade-up" onClick={() => setPatternPicker(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-gray-900 font-semibold text-base">Choose a cover</h3>
              <button onClick={() => setPatternPicker(null)} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
            </div>
            <p className="text-gray-400 text-xs mb-4">Students see this on their course card too.</p>
            <div className="grid grid-cols-3 gap-3">
              {[0,1,2,3,4,5,6,7,8].map(i => {
                const selected = coverPatternId(patternPicker) === i;
                return (
                  <button key={i} onClick={() => savePattern(patternPicker.id, i)}
                    className={`rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.03] ${selected ? 'border-gray-900' : 'border-transparent hover:border-gray-300'}`}>
                    <CoursePattern patternId={i} height={56} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CourseManager({ token, course, onBack, authHeaders }) {
  const [mods, setMods] = useState([]);
  const [loadingMods, setLoadingMods] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(null);  // { name, sizeKb }
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('materials');
  const [copied, setCopied] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const [sidebarW, startSidebarDrag] = useSidebarWidth('scholr_prof_sidebar_w');
  const fileRef = useRef(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    setLoadingMods(true);
    fetch(`${API}/course/${course.id}/documents`, { headers: authHeaders })
      .then(r => r.json()).then(data => {
        setMods((Array.isArray(data) ? data : []).map(d => ({ id: d.name, name: d.name, sizeKb: d.sizeKb, uploaded: new Date(d.uploadedAt) })));
      }).catch(() => showToast('Could not load documents', 'error'))
      .finally(() => setLoadingMods(false));
  }, [course.id]);

  const handleFile = (file) => {
    const supported = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    if (!file || !supported.some(ext => file.name.toLowerCase().endsWith(ext))) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadingFile({ name: file.name, sizeKb: Math.round(file.size / 1024) });
    const fd = new FormData(); fd.append('file', file);
    // Use XMLHttpRequest so we can subscribe to upload progress events
    // (fetch does not expose upload progress yet).
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener('load', () => {
      setUploading(false);
      setUploadProgress(0);
      setUploadingFile(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            setMods(prev => [{ id: data.fileName, name: data.fileName, sizeKb: data.sizeKb, uploaded: new Date() }, ...prev]);
            showToast(`${file.name} uploaded`);
            return;
          }
          showToast(data.error || 'Upload failed', 'error');
        } catch {
          showToast('Upload failed', 'error');
        }
      } else {
        showToast(`Upload failed (${xhr.status})`, 'error');
      }
    });
    xhr.addEventListener('error', () => {
      setUploading(false);
      setUploadProgress(0);
      setUploadingFile(null);
      showToast('Server unreachable', 'error');
    });
    xhr.open('POST', `${API}/course/${course.id}/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(fd);
  };

  const onDelete = async (mod) => {
    setMods(prev => prev.filter(m => m.id !== mod.id));
    await fetch(`${API}/course/${course.id}/document/${encodeURIComponent(mod.name)}`, { method: 'DELETE', headers: authHeaders });
    showToast(`${cleanFileName(mod.name)} removed`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`https://scholrvs.onrender.com/join/${course.join_code || course.code}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    showToast('Student link copied!');
  };

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#F7F7F7] fixed inset-0 page-enter">
      <style>{FONT}</style>
      {/* Mobile top bar — hamburger + course name. Hidden on desktop. */}
      <div className="md:hidden fixed top-0 inset-x-0 z-20 bg-white border-b border-gray-200 flex items-center gap-3 px-4 h-14 pt-[env(safe-area-inset-top)]" style={{ height: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="p-2 -ml-2 text-gray-700">
          <Menu size={20} />
        </button>
        <button type="button" onClick={onBack} className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity" aria-label="Scholr home"><Logo size={20} /><span className="text-gray-900 font-semibold text-sm truncate">{course.name}</span></button>
      </div>
      {/* Backdrop when mobile nav is open */}
      {mobileNavOpen && <div onClick={closeMobileNav} className="md:hidden fixed inset-0 bg-black/40 z-30" />}
      <aside style={isDesktop ? { width: sidebarW } : undefined} className={`fixed md:relative inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transform transition-transform md:transform-none ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} pt-[env(safe-area-inset-top)]`}>
        <ResizeHandle onMouseDown={startSidebarDrag} />
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-xs transition-colors"><ArrowLeft size={12} />All courses</button>
            <button onClick={closeMobileNav} aria-label="Close menu" className="md:hidden p-1 text-gray-400"><X size={16} /></button>
          </div>
          <button type="button" onClick={onBack} className="flex items-center gap-2.5 mb-3 hover:opacity-80 transition-opacity" aria-label="Scholr home"><Logo size={22} /><span className="text-gray-900 font-semibold text-sm">Scholr</span></button>
          <div className="bg-gray-900 rounded-lg px-3 py-2.5">
            <p className="text-white text-xs font-medium truncate">{course.name}</p>
            <p className="text-gray-500 text-[10px] mt-0.5 font-mono">{course.join_code || course.code}</p>
          </div>
        </div>
        <nav className="p-3 flex-1">
          {[{ id: 'materials', label: 'Materials', icon: FileText }, { id: 'insights', label: 'Insights', icon: BarChart2 }].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setActiveTab(id); closeMobileNav(); }}
              className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors mb-0.5 ${activeTab === id ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
              <Icon size={15} className={activeTab === id ? 'text-gray-700' : 'text-gray-400'} />{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button onClick={copyLink} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors">
            {copied ? <Check size={11} className="text-emerald-500" /> : <ExternalLink size={11} />}{copied ? 'Copied!' : 'Copy student link'}
          </button>
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div><span className="text-[10px] text-gray-400">Vertex AI connected</span></div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden pt-14 md:pt-0" style={{ paddingTop: 'max(3.5rem + env(safe-area-inset-top), 0px)' }}>
        {activeTab === 'materials' ? (
          <>
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex-shrink-0 flex items-center justify-between">
              <div><h2 className="text-gray-900 text-sm font-semibold">Course Materials</h2><p className="text-gray-400 text-xs mt-0.5">{mods.length} file{mods.length !== 1 ? 's' : ''} indexed · live for all students</p></div>
              <div className="flex items-center gap-3">
                <input type="file" ref={fileRef} onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" />
                <button onClick={() => fileRef.current.click()} disabled={uploading}
                  className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors">
                  <UploadCloud size={13} />{uploading ? `Uploading ${uploadProgress}%` : 'Upload'}
                </button>
              </div>
            </header>
            {uploading && uploadingFile && (
              <div className="bg-white border-b border-gray-200 px-8 py-3 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <UploadCloud size={12} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-900 text-xs font-medium truncate">{cleanFileName(uploadingFile.name)}</p>
                      <p className="text-gray-400 text-[11px]">{uploadingFile.sizeKb}kb · uploading</p>
                    </div>
                  </div>
                  <span className="text-gray-700 text-xs font-medium tabular-nums ml-3 flex-shrink-0">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900 transition-all duration-150 ease-out rounded-full" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-8">
              {loadingMods ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[0,1,2].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 mb-3" />
                      <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-50 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : mods.length === 0 ? (
                <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }} onClick={() => fileRef.current.click()}
                  className={`flex flex-col items-center justify-center text-center px-6 py-14 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                  <div className="w-12 h-12 rounded-2xl bg-gray-900 mb-4 flex items-center justify-center"><UploadCloud size={20} className="text-white" /></div>
                  <h2 className="serif text-xl text-gray-900 mb-2">{dragOver ? 'Drop to upload' : 'Drop in your first material'}</h2>
                  <p className="text-gray-500 text-sm max-w-sm leading-relaxed mb-1">Start with your syllabus — students will be able to ask about deadlines, late policy, and grading the moment you upload it.</p>
                  <p className="text-gray-400 text-xs mt-3">Drag and drop or click · PDF, JPG, PNG</p>
                </div>
              ) : (
                <div>
                  <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }} onClick={() => fileRef.current.click()}
                    className={`mb-6 flex items-center gap-3 px-5 py-3 rounded-xl border border-dashed cursor-pointer transition-all ${dragOver ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <UploadCloud size={14} className="text-gray-300" /><span className="text-gray-400 text-xs">Drop another file — PDF or image</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {mods.map(m => (
                      <div key={m.id} className="group bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center">
                            {/\.(jpg|jpeg|png|webp)$/i.test(m.name) ? <span className="text-white text-[10px] font-bold">IMG</span> : <FileText size={14} className="text-white" />}
                          </div>
                          <button onClick={() => onDelete(m)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                        </div>
                        <p className="text-gray-900 text-sm font-medium line-clamp-2">{cleanFileName(m.name)}</p>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-[11px] text-gray-400">Live</span></div>
                          <span className="text-[11px] text-gray-300">{m.sizeKb || 0}kb · {formatRelativeDate(m.uploaded)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : <CourseInsights course={course} token={token} onSwitchToMaterials={() => setActiveTab('materials')} />}
      </main>
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-xl text-white text-xs font-medium shadow-xl z-50 ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900'}`}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}{toast.msg}
        </div>
      )}
    </div>
  );
}

function CourseInsights({ course, token, onSwitchToMaterials }) {
  const courseId = course.id;
  const joinCode = course.join_code || course.code;
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [lastCount, setLastCount] = useState(0);
  const [summary, setSummary] = useState(null);
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [copiedJoin, setCopiedJoin] = useState(false);

  const fetchInsights = async () => {
    try {
      const res = await fetch(`${API}/course/${courseId}/insights`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (lastCount > 0 && data.totalQuestions > lastCount) setNewCount(data.totalQuestions - lastCount);
      setLastCount(data.totalQuestions);
      setInsights(data); setLoading(false);
    } catch { setLoading(false); }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`${API}/course/${courseId}/ai-summary`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setSummaryGeneratedAt(data.generatedAt);
      } else {
        setSummary(null);
      }
    } catch {}
    setSummaryLoading(false);
  };

  const clearData = () => setConfirmingClear(true);

  const performClear = async () => {
    setClearing(true); setClearError('');
    try {
      const res = await fetch(`${API}/course/${courseId}/insights-data`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setClearError(err.error || 'Could not clear data');
        setClearing(false);
        return;
      }
      // Reset local state and refetch
      setSummary(null);
      setSummaryGeneratedAt(null);
      setLastCount(0);
      setNewCount(0);
      fetchInsights();
      setConfirmingClear(false);
    } catch {
      setClearError('Server unreachable');
    }
    setClearing(false);
  };

  useEffect(() => { fetchInsights(); const i = setInterval(fetchInsights, 10000); return () => clearInterval(i); }, [courseId, lastCount]);
  // Fetch the AI summary once on mount and again whenever total question count crosses a threshold
  useEffect(() => { if (insights?.totalQuestions > 0 && !summary) fetchSummary(); }, [insights?.totalQuestions]);

  if (loading) return (
    <div className="flex-1 flex flex-col bg-[#F7F7F7]">
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-5 flex-shrink-0">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <SkeletonStatCard dark />
          <SkeletonStatCard />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <Skeleton className="h-3 w-32 mb-2" />
          <Skeleton className="h-3 w-44 mb-5" />
          <Skeleton className="h-[180px] w-full" />
        </div>
      </div>
    </div>
  );

  const isEmpty = !insights || insights.totalQuestions === 0;
  if (isEmpty) {
    return (
      <div className="flex-1 flex flex-col bg-[#F7F7F7]">
        <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-5 flex-shrink-0">
          <h2 className="text-gray-900 font-semibold text-sm">Student Insights</h2>
          <div className="flex items-center gap-2 mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><p className="text-gray-400 text-xs">Live · updates every 10s</p></div>
        </div>
        <div className="flex-1 flex items-center justify-center px-4 md:px-8 py-6">
          <div className="bg-white rounded-2xl border border-gray-200 px-6 py-10 text-center max-w-lg w-full">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4"><BarChart2 size={20} className="text-gray-400" /></div>
            <h3 className="serif text-2xl text-gray-900 mb-2">No questions yet</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto leading-relaxed">Share your join code with students — once they start asking the AI questions, you'll see what topics they're focused on right here.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/join/${joinCode}`;
                  navigator.clipboard.writeText(url);
                  setCopiedJoin(true);
                  setTimeout(() => setCopiedJoin(false), 2000);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors">
                {copiedJoin ? <><Check size={14} />Copied!</> : <><Copy size={14} />Copy student link</>}
              </button>
              {(!insights || insights.totalQuestions === 0) && onSwitchToMaterials && (
                <button onClick={onSwitchToMaterials}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-sm font-medium transition-colors">
                  Manage materials <ChevronRight size={14} />
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-4 font-mono">{joinCode}</p>
          </div>
        </div>
      </div>
    );
  }
  const totalAnswered = insights.totalQuestions || 0;
  const flaggedCount = insights.flagged?.length || 0;
  const d = {
    totalQuestions: totalAnswered,
    weekQuestions: insights.weekQuestions || 0,
    timeSavedHours: insights.timeSavedHours || 0,
    timeSavedMinutes: insights.timeSavedMinutes || 0,
    // Confidence = % of questions NOT flagged. With no flags, that's 100%.
    confidenceRate: totalAnswered > 0 ? Math.round(((totalAnswered - flaggedCount) / totalAnswered) * 100) : 0,
    estimatedStudents: Math.max(1, Math.round(totalAnswered / 4.5)),
    peakHour: insights.peakHourLabel || '—',
    topTopics: insights.topTopics || [],
    recent: insights.recent || [],
    flagged: insights.flagged || [],
    dailyActivity: insights.dailyActivity || [],
  };
  const totalForPie = d.topTopics.reduce((s, t) => s + t.count, 0) || 1;
  const pieData = d.topTopics.map(t => ({ name: t.topic, value: t.count, percent: t.count / totalForPie }));
  const timeSaved = d.timeSavedHours > 0 ? `${d.timeSavedHours}h ${d.timeSavedMinutes}m` : `${d.timeSavedMinutes}m`;
  const topTopic = d.topTopics?.[0]?.topic || '—';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F7F7F7]">
      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-5 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div><h2 className="text-gray-900 font-semibold text-sm">Student Insights</h2><div className="flex items-center gap-2 mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><p className="text-gray-400 text-xs">Live · updates every 10s</p></div></div>
          <div className="flex items-center gap-2 flex-wrap">
            {newCount > 0 && <button onClick={() => { setNewCount(0); fetchInsights(); }} className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">↑ {newCount} new</button>}
            <button onClick={clearData} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-red-300 hover:text-red-600 text-gray-500 text-xs font-medium transition-colors">Clear data</button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <StatCard dark label="Total Questions" value={d.totalQuestions.toLocaleString()} sub={`${d.weekQuestions} this week`} icon={<MessageSquare size={15} />} />
          <StatCard label="Time Saved" value={timeSaved} sub="professor hours freed up" icon={<Clock size={15} />} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-0.5">Weekly Activity</h3>
          <p className="text-[11px] text-gray-400 mb-5">Questions asked per day</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.dailyActivity} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={20} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F9FAFB' }} />
              <Bar dataKey="questions" fill="#0F0F0F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gray-900 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0"><Sparkles size={18} className="text-white/80" /></div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">AI Summary</p>
                <button onClick={fetchSummary} disabled={summaryLoading} className="text-[10px] text-white/40 hover:text-white/80 transition-colors disabled:opacity-40">{summaryLoading ? 'Refreshing…' : 'Refresh'}</button>
              </div>
              {summaryLoading && !summary ? (
                <p className="text-sm text-white/60">Generating summary from recent student questions…</p>
              ) : summary ? (
                <>
                  <p className="text-sm leading-relaxed text-white/85 whitespace-pre-line">{summary}</p>
                  {summaryGeneratedAt && <p className="text-[10px] text-white/30 mt-3">Updated {formatRelativeDate(summaryGeneratedAt)}</p>}
                </>
              ) : (
                <p className="text-sm text-white/60">Waiting for more student activity to summarize.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmingClear}
        title="Clear all insights data?"
        body={"This wipes the Total Questions count, Weekly Activity chart, and AI Summary.\n\nStudent chat history and uploaded materials are not affected.\n\nThis cannot be undone."}
        confirmLabel={clearing ? 'Clearing…' : 'Yes, clear data'}
        cancelLabel="Cancel"
        destructive
        onConfirm={clearing ? undefined : performClear}
        onCancel={clearing ? undefined : () => { setConfirmingClear(false); setClearError(''); }}
      />
      <ToastBanner message={clearError} type="error" onClose={() => setClearError('')} />
    </div>
  );
}

// ── StudentView — all three bugs fixed ────────────────────────────────────────
function StudentView({ course, documents: initialDocuments, suggestedQuestions: initialSuggestedQuestions, onExit, studentToken }) {
  const [documents, setDocuments] = useState(initialDocuments || []);
  const [suggestedQuestions, setSuggestedQuestions] = useState(initialSuggestedQuestions || []);
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [myNotes, setMyNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [mobileChatsOpen, setMobileChatsOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const [sidebarW, startSidebarDrag] = useSidebarWidth('scholr_student_sidebar_w');
  const [recentsOpen, setRecentsOpen] = useState(true);   // collapse the recents list
  const [allChatsOpen, setAllChatsOpen] = useState(false); // full "Chats" page overlay
  const [chatMenuId, setChatMenuId] = useState(null);      // which chat's "..." menu is open
  const [renamingId, setRenamingId] = useState(null);      // which chat is being renamed
  const [renameVal, setRenameVal] = useState('');
  const RECENT_LIMIT = 8;

  const [quizOpen, setQuizOpen] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizDone, setQuizDone] = useState(false);
  const [quizTopic, setQuizTopic] = useState('');
  const quizChatRef = useRef({ id: null, dbId: null }); // chat the quiz was launched from
  const quizRecordedRef = useRef(false);                // record the result once per generated quiz

  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const paperclipRef = useRef(null);
  const abortRef = useRef(null);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);

  const authHeaders = { Authorization: `Bearer ${studentToken}` };
  const jsonHeaders = { Authorization: `Bearer ${studentToken}`, 'Content-Type': 'application/json' };

  const isFullQuizRequest = (msg) => {
    const m = msg.toLowerCase();
    if (/\b(make|create|generate|build)\b.{0,25}\bquiz\b/i.test(m)) return true;
    if (/\bpractice quiz\b/i.test(m)) return true;
    if (/\bgive me a quiz\b/i.test(m)) return true;
    if (/\bstart a quiz\b/i.test(m)) return true;
    if (/\bquiz me\b.{0,30}\b(on|about|over|the|this)\b/i.test(m)) return true;
    return false;
  };

  const extractQuizTopic = (msg) => {
    const patterns = [
      /quiz.{0,15}(?:on|about|over|covering)\s+(.+)/i,
      /(?:on|about|over)\s+(.+?)\s+(?:quiz|questions)/i,
      /quiz me on\s+(.+)/i,
    ];
    for (const p of patterns) {
      const m = msg.match(p);
      if (m) return m[1].trim().slice(0, 80);
    }
    return '';
  };

  const generateQuiz = async (topic) => {
    setQuizOpen(true);
    setQuizLoading(true);
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizAnswers({});
    setQuizDone(false);
    setQuizTopic(topic);
    quizRecordedRef.current = false;
    try {
      const res = await fetch(`${API}/course/${course.id}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (data.questions?.length) setQuizQuestions(data.questions);
      else setQuizQuestions([]);
    } catch {
      setQuizQuestions([]);
    }
    setQuizLoading(false);
  };

  const handleQuizAnswer = (questionIndex, optionIndex) => {
    if (quizAnswers[questionIndex] !== undefined) return;
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const quizScore = Object.entries(quizAnswers).filter(([qi, ai]) =>
    quizQuestions[parseInt(qi)]?.correct === ai
  ).length;

  // When a quiz is finished, drop a result message into the chat it came from
  // so it shows when scrolling back (and persists across sessions). No separate
  // quiz-history store needed — it rides on the existing chat persistence.
  const recordQuizResult = async () => {
    const total = quizQuestions.length;
    if (!total) return;
    const pct = Math.round((quizScore / total) * 100);
    const content = `Quiz complete — you scored **${quizScore}/${total}** (${pct}%)${quizTopic ? ` on ${quizTopic}` : ''}.`;
    const { id: targetId, dbId } = quizChatRef.current || {};
    const chatLocalId = targetId || chatId;
    setChats(prev => prev.map(c => c.id === chatLocalId
      ? { ...c, messages: [...c.messages, { role: 'assistant', content, sources: [], ts: Date.now() }] }
      : c));
    if (dbId && !String(dbId).startsWith('local-')) {
      try {
        await fetch(`${API}/student/chats/${dbId}/messages`, {
          method: 'POST', headers: jsonHeaders,
          body: JSON.stringify({ role: 'assistant', content }),
        });
      } catch {}
    }
  };

  useEffect(() => {
    if (quizDone && quizQuestions.length > 0 && !quizRecordedRef.current) {
      quizRecordedRef.current = true;
      recordQuizResult();
    }
  }, [quizDone]);

  // Background: fetch docs + suggested-questions in parallel so the chat
  // view renders instantly without waiting for either. Suggested-questions
  // is the slow one (calls Gemini) — students see the sidebar render first
  // and questions pop in when ready.
  useEffect(() => {
    if (initialDocuments?.length) return; // dashboard pre-fetched (legacy path)
    fetch(`${API}/course/${course.id}/documents`, { headers: authHeaders })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDocuments(data); })
      .catch(() => {});
  }, [course.id]);

  useEffect(() => {
    if (initialSuggestedQuestions?.length) return;
    fetch(`${API}/course/${course.id}/suggested-questions`, { headers: authHeaders })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data.questions)) setSuggestedQuestions(data.questions); })
      .catch(() => {});
  }, [course.id]);

  // Notes: load metadata fast so UI renders immediately, then download
  // each PDF blob in the background. Blobs are only needed when sending
  // a chat message — by the time the student types, they're usually ready.
  useEffect(() => {
    let cancelled = false;
    const fetchNotes = async () => {
      try {
        const res = await fetch(`${API}/student/notes/${course.id}`, { headers: authHeaders });
        if (cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          // Show note names immediately with no buffer yet
          setMyNotes(data.map(n => ({ name: n.name, buffer: null, mimeType: n.mime_type })));
          setNotesLoading(false);
          // Background: fetch blobs one-by-one, update state as each arrives
          for (const n of data) {
            if (cancelled) return;
            try {
              const fileRes = await fetch(`${API}/student/notes/${course.id}/file/${encodeURIComponent(n.name)}`, { headers: authHeaders });
              if (cancelled) return;
              if (fileRes.ok) {
                const buffer = await fileRes.arrayBuffer();
                if (cancelled) return;
                setMyNotes(prev => prev.map(p => p.name === n.name ? { ...p, buffer } : p));
              }
            } catch {}
          }
        } else {
          setNotesLoading(false);
        }
      } catch {
        if (!cancelled) setNotesLoading(false);
      }
    };
    fetchNotes();
    return () => { cancelled = true; };
  }, [course.id]);

  // ── FIX 1: Load chats with safe messages fallback ─────────────────────────
  useEffect(() => {
    let cancelled = false;
    // Safety net: if loading hangs past 12s (cold backend, network hiccup),
    // render the UI anyway with a local fallback chat so the student isn't stuck.
    const safetyTimer = setTimeout(() => {
      if (cancelled) return;
      console.warn('[Scholr] chats fetch took >12s, rendering with local fallback');
      const localId = `local-${Date.now()}`;
      setChats(prev => prev.length > 0 ? prev : [{ id: localId, title: 'New Chat', messages: [] }]);
      setChatId(prev => prev || localId);
      setChatsLoading(false);
    }, 12000);
    const fetchChats = async () => {
      try {
        console.log('[Scholr] fetching chats for', course.id);
        const res = await fetch(`${API}/student/chats/${course.id}`, { headers: authHeaders });
        console.log('[Scholr] chats response status', res.status);
        if (cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          const loaded = data.map(c => ({
            id: c.id,
            dbId: c.id,
            title: c.title || 'New Chat',
            // FIX: safe fallback if messages is null/undefined
            messages: Array.isArray(c.messages)
              ? c.messages
                  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                  .map(m => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    sources: m.sources || [],
                    ts: new Date(m.created_at).getTime(),
                  }))
              : [],
          }));
          setChats(loaded);
          setChatId(loaded[0].id);
          setChatsLoading(false);
        } else {
          // No chats — create the first one. Cancellation guards prevent
          // StrictMode's double-effect from creating two empty chats.
          if (cancelled) return;
          try {
            const res2 = await fetch(`${API}/student/chats/${course.id}`, {
              method: 'POST',
              headers: jsonHeaders,
              body: JSON.stringify({ title: 'New Chat' }),
            });
            if (cancelled) return;
            const newChat = await res2.json();
            if (cancelled) return;
            if (newChat.id) {
              const nc = { id: newChat.id, dbId: newChat.id, title: 'New Chat', messages: [] };
              setChats([nc]);
              setChatId(nc.id);
            } else {
              throw new Error('No id returned');
            }
          } catch {
            if (cancelled) return;
            const nc = { id: `local-${Date.now()}`, title: 'New Chat', messages: [] };
            setChats([nc]);
            setChatId(nc.id);
          }
          setChatsLoading(false);
        }
      } catch {
        if (cancelled) return;
        const nc = { id: `local-${Date.now()}`, title: 'New Chat', messages: [] };
        setChats([nc]);
        setChatId(nc.id);
        setChatsLoading(false);
      }
    };
    fetchChats();
    return () => { cancelled = true; clearTimeout(safetyTimer); };
  }, [course.id]);

  const DEFAULT_QUESTIONS = ["What are the main topics in this course?", "Summarize the key concepts from the materials", "What should I focus on for the exam?"];
  const questions = suggestedQuestions?.length ? suggestedQuestions : DEFAULT_QUESTIONS;
  // Personalized greeting for the new-chat empty state.
  const firstName = (() => { try { const n = (JSON.parse(localStorage.getItem('scholr_student_user') || '{}').name || '').split(' ')[0]; return n ? n.charAt(0).toUpperCase() + n.slice(1) : ''; } catch { return ''; } })();
  const greetHr = new Date().getHours();
  const greeting = greetHr < 12 ? 'Good morning' : greetHr < 17 ? 'Good afternoon' : 'Good evening';
  // Rotate the suggested questions through the input placeholder on an empty chat.
  const [phIdx, setPhIdx] = useState(0);
  useEffect(() => {
    if (!questions.length) return;
    const id = setInterval(() => setPhIdx(i => (i + 1) % questions.length), 3200);
    return () => clearInterval(id);
  }, [questions.length]);
  const active = chats.find(c => c.id === chatId) || chats[0];
  // Smart autoscroll: only scroll to bottom if the user is already within
  // 150px of the bottom. If they've scrolled up to re-read something, leave
  // them alone — and pop a "↓ New" pill so they can jump back when ready.
  const isNearBottom = () => {
    const c = scrollContainerRef.current;
    if (!c) return true;
    return c.scrollHeight - c.scrollTop - c.clientHeight < 150;
  };
  const scrollToBottom = (force = false) => {
    setTimeout(() => {
      if (force || isNearBottom()) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        setShowNewMessageIndicator(false);
      } else {
        // user is reading scrollback while a new message arrived; show jump pill
        setShowNewMessageIndicator(true);
      }
    }, 50);
  };
  useEffect(() => { if (active) scrollToBottom(); }, [active?.messages, isTyping]);
  // When the user manually scrolls back to the bottom, hide the pill
  useEffect(() => {
    const c = scrollContainerRef.current;
    if (!c) return;
    const onScroll = () => { if (isNearBottom()) setShowNewMessageIndicator(false); };
    c.addEventListener('scroll', onScroll, { passive: true });
    return () => c.removeEventListener('scroll', onScroll);
  }, [active?.id]);

  const createNewChat = async () => {
    try {
      const res = await fetch(`${API}/student/chats/${course.id}`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const data = await res.json();
      if (data.id) {
        const nc = { id: data.id, dbId: data.id, title: 'New Chat', messages: [] };
        setChats(prev => [nc, ...prev]);
        setChatId(nc.id);
        return nc;
      }
    } catch {}
    const nc = { id: `local-${Date.now()}`, title: 'New Chat', messages: [] };
    setChats(prev => [nc, ...prev]);
    setChatId(nc.id);
    return nc;
  };

  const renameChat = async (id, title) => {
    const t = (title || '').trim();
    setRenamingId(null);
    if (!t) return;
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: t } : c));
    const chat = chats.find(c => c.id === id);
    if (chat?.dbId && !String(chat.dbId).startsWith('local-')) {
      try { await fetch(`${API}/student/chats/${chat.dbId}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ title: t }) }); } catch {}
    }
  };

  const deleteChat = async (id) => {
    const chat = chats.find(c => c.id === id);
    if (chat?.dbId && !String(chat.dbId).startsWith('local-')) {
      try { await fetch(`${API}/student/chats/${chat.dbId}`, { method: 'DELETE', headers: authHeaders }); } catch {}
    }
    const remaining = chats.filter(c => c.id !== id);
    if (remaining.length === 0) {
      try {
        const res = await fetch(`${API}/student/chats/${course.id}`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ title: 'New Chat' }),
        });
        const data = await res.json();
        if (data.id) {
          const nc = { id: data.id, dbId: data.id, title: 'New Chat', messages: [] };
          setChats([nc]);
          setChatId(nc.id);
          return;
        }
      } catch {}
      const nc = { id: `local-${Date.now()}`, title: 'New Chat', messages: [] };
      setChats([nc]);
      setChatId(nc.id);
    } else {
      setChats(remaining);
      if (chatId === id) setChatId(remaining[0].id);
    }
  };

  const handlePaperclipFile = async (file) => {
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
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
    setChats(prev => prev.map(c => c.id === chatId
      ? { ...c, messages: c.messages.map(m => m.streaming ? { ...m, streaming: false } : m) }
      : c
    ));
    setIsTyping(false);
  };

  const onSend = async (messageOverride) => {
    const message = messageOverride || input;
    if (!message.trim() || isTyping) return;

    // Quiz shortcut
    if (isFullQuizRequest(message)) {
      const topic = extractQuizTopic(message);
      setInput('');
      const currentChatId = chatId;
      const currentActive = chats.find(c => c.id === currentChatId) || chats[0];
      const currentChatDbId = currentActive?.dbId || null;
      quizChatRef.current = { id: currentChatId, dbId: currentChatDbId };
      const streamingMsgId = Date.now();
      setChats(prev => prev.map(c => c.id === currentChatId ? {
        ...c,
        messages: [
          ...c.messages,
          { role: 'user', content: message, ts: Date.now() },
          { id: streamingMsgId, role: 'assistant', content: `Generating your quiz${topic ? ` on **${topic}**` : ''} — see the panel on the right.`, sources: [], ts: Date.now(), streaming: false },
        ],
      } : c));
      // Persist the request so the chat has context on reload — the result
      // message is appended when the student finishes the quiz.
      if (currentChatDbId && !String(currentChatDbId).startsWith('local-')) {
        try { await fetch(`${API}/student/chats/${currentChatDbId}/messages`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ role: 'user', content: message }) }); } catch {}
      }
      generateQuiz(topic);
      return;
    }

    // ── FIX 2: capture isFirstMessage BEFORE the optimistic state update ──
    const currentActive = chats.find(c => c.id === chatId) || chats[0];
    const isFirstMessage = (currentActive?.messages || []).filter(m => !m.streaming).length === 0;

    const currentChatId = chatId;
    const currentChatDbId = currentActive?.dbId || null;

    // ── FIX 3: title from user's question (reliable), not AI response ──
    const titleFromQuestion = message.trim().split(/\s+/).slice(0, 6).join(' ').replace(/[.!?]$/, '');

    const completedMessages = (currentActive?.messages || []).filter(m => !m.streaming);
    const streamingMsgId = Date.now();

    // Optimistic UI update
    setChats(prev => prev.map(c => c.id === currentChatId ? {
      ...c,
      title: isFirstMessage ? titleFromQuestion : c.title,
      messages: [
        ...c.messages,
        { role: 'user', content: message, ts: Date.now() },
        { id: streamingMsgId, role: 'assistant', content: '', sources: [], ts: Date.now(), streaming: true },
      ],
    } : c));
    setInput('');
    setIsTyping(true);

    // Save user message to DB
    if (currentChatDbId && !String(currentChatDbId).startsWith('local-')) {
      try {
        await fetch(`${API}/student/chats/${currentChatDbId}/messages`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ role: 'user', content: message }),
        });
      } catch {}
    }

    // Persist title immediately on first message
    if (isFirstMessage && currentChatDbId && !String(currentChatDbId).startsWith('local-')) {
      try {
        await fetch(`${API}/student/chats/${currentChatDbId}`, {
          method: 'PATCH',
          headers: jsonHeaders,
          body: JSON.stringify({ title: titleFromQuestion }),
        });
      } catch {}
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let response;
      const loadedNotes = myNotes.filter(n => n.buffer);
      if (loadedNotes.length > 0) {
        const fd = new FormData();
        fd.append('message', message);
        fd.append('history', JSON.stringify(completedMessages.map(m => ({ role: m.role, content: m.content }))));
        loadedNotes.forEach((n, i) => fd.append(`note_${i}`, new Blob([n.buffer], { type: n.mimeType }), n.name));
        response = await fetch(`${API}/course/${course.id}/chat`, { method: 'POST', headers: { Authorization: `Bearer ${studentToken}` }, body: fd, signal: controller.signal });
      } else {
        response = await fetch(`${API}/course/${course.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
          signal: controller.signal,
          body: JSON.stringify({ message, history: completedMessages.map(m => ({ role: m.role, content: m.content })) }),
        });
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
            if (event.type === 'token') {
              fullText += event.token;
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: m.content + event.token } : m) }
                : c
              ));
              scrollToBottom();
            } else if (event.type === 'sources') {
              finalSources = event.sources;
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, sources: event.sources } : m) }
                : c
              ));
            } else if (event.type === 'done') {
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, streaming: false } : m) }
                : c
              ));
              // Save assistant message to DB
              if (currentChatDbId && !String(currentChatDbId).startsWith('local-')) {
                try {
                  await fetch(`${API}/student/chats/${currentChatDbId}/messages`, {
                    method: 'POST',
                    headers: jsonHeaders,
                    body: JSON.stringify({ role: 'assistant', content: fullText, sources: finalSources }),
                  });
                } catch {}
              }
            } else if (event.type === 'error') {
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: 'error:' + event.error, streaming: false, isError: true } : m) }
                : c
              ));
            }
          } catch {}
        }
      }
    } catch (err) {
      const isAbort = err?.name === 'AbortError';
      setChats(prev => prev.map(c => c.id === currentChatId
        ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: isAbort ? m.content : 'error:network', streaming: false, isError: !isAbort } : m) }
        : c
      ));
    }
    abortRef.current = null;
    setIsTyping(false);
    inputRef.current?.focus();
  };

  if (chatsLoading) return (
    <div className="flex h-screen w-screen items-center justify-center bg-white fixed inset-0">
      <style>{FONT}</style>
      <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const closeMobile = () => setMobileChatsOpen(false);

  const isEmpty = !active || active.messages.length === 0;
  // Shared composer — rendered centered with the greeting on an empty chat, or
  // pinned to the bottom once the conversation has messages (ChatGPT/Claude style).
  const inputBox = (
    <div className="flex items-center bg-white border border-gray-200 rounded-2xl px-3.5 py-2.5 focus-within:border-gray-400 transition-colors gap-2">
      <button onClick={() => paperclipRef.current?.click()} className="flex-shrink-0 text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors"><Plus size={18} /></button>
      <input
        ref={inputRef}
        id="chat-input"
        name="chat-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isTyping) onSend(); } }}
        className="flex-1 bg-transparent text-gray-800 text-[15px] outline-none placeholder-gray-400 py-1.5"
        placeholder={isEmpty && questions.length ? questions[phIdx % questions.length] : (myNotes.length > 0 ? "Ask about your course + notes..." : "Ask about your course...")}
        autoComplete="off"
      />
      {isTyping ? (
        <button onClick={onStop} className="w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center flex-shrink-0"><Square size={11} fill="currentColor" /></button>
      ) : input.trim() ? (
        <button onClick={() => onSend()} className="w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center flex-shrink-0 fade-up"><Send size={12} /></button>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden fixed inset-0 bg-white page-enter">
      <style>{FONT}</style>

      {/* Backdrop on mobile when drawer is open */}
      {mobileChatsOpen && <div onClick={closeMobile} className="md:hidden fixed inset-0 bg-black/40 z-30" />}

      {/* ── Left sidebar / mobile drawer ── */}
      <aside style={isDesktop ? { width: sidebarW } : undefined} className={`fixed md:relative inset-y-0 left-0 z-40 w-72 bg-[#F7F7F7] border-r border-gray-200 flex flex-col flex-shrink-0 transform transition-transform md:transform-none ${mobileChatsOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} pt-[env(safe-area-inset-top)]`}>
        <ResizeHandle onMouseDown={startSidebarDrag} />
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={onExit} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" aria-label="Scholr home"><Logo size={22} /><span className="text-gray-900 font-semibold text-sm">Scholr</span></button>
            <button onClick={closeMobile} aria-label="Close menu" className="md:hidden p-1 text-gray-400"><X size={16} /></button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
            <p className="text-gray-900 text-xs font-medium truncate">{course.name}</p>
            <p className="text-gray-400 text-[10px] mt-0.5">{documents.length} doc{documents.length !== 1 ? 's' : ''} · {myNotes.length} note{myNotes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="px-3 pt-3">
          <button onClick={() => { createNewChat(); closeMobile(); }} className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-gray-700 text-[13px] font-medium hover:bg-gray-200/60 transition-colors"><Plus size={15} className="text-gray-500" />New chat</button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="group/recents flex items-center justify-between px-2 mb-2">
            <button onClick={() => setRecentsOpen(o => !o)} className="flex items-center gap-1 text-[11px] text-gray-500 font-semibold hover:text-gray-700 transition-colors">
              <ChevronRight size={11} className={`transition-transform ${recentsOpen ? 'rotate-90' : ''}`} />Recents
            </button>
            {recentsOpen && (
              <button
                onClick={() => { setAllChatsOpen(true); closeMobile(); }}
                className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-700 font-medium opacity-0 group-hover/recents:opacity-100 transition-opacity">
                View all<ChevronRight size={10} />
              </button>
            )}
          </div>
          {recentsOpen && chats.slice(0, RECENT_LIMIT).map(c => (
            <div key={c.id} className="group relative mb-0.5">
              {renamingId === c.id ? (
                <input
                  autoFocus value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={() => renameChat(c.id, renameVal)}
                  onKeyDown={e => { if (e.key === 'Enter') renameChat(c.id, renameVal); if (e.key === 'Escape') setRenamingId(null); }}
                  className="w-full px-2.5 py-2 rounded-lg text-[13px] bg-white border border-gray-300 outline-none focus:border-gray-500"
                />
              ) : (
                <>
                  <button onClick={() => { setChatId(c.id); closeMobile(); }} className={`flex items-center w-full text-left px-2.5 py-2 rounded-lg text-[13px] transition-colors pr-8 ${c.id === chatId ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-200/60'}`}>
                    <span className="truncate">{c.title || 'New Chat'}</span>
                  </button>
                  <button onClick={e => { e.stopPropagation(); setChatMenuId(chatMenuId === c.id ? null : c.id); }}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-all ${chatMenuId === c.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <MoreHorizontal size={14} />
                  </button>
                  {chatMenuId === c.id && (
                    <div className="absolute right-1 top-9 z-50 w-36 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
                      <button onClick={() => { setRenameVal(c.title || ''); setRenamingId(c.id); setChatMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"><Pencil size={12} />Rename</button>
                      <button onClick={() => { setChatMenuId(null); deleteChat(c.id); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} />Delete</button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>
        {chatMenuId && <div className="fixed inset-0 z-40" onClick={() => setChatMenuId(null)} />}
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

      {/* ── Main chat ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {allChatsOpen && (
          <div className="absolute inset-0 z-40 bg-white flex flex-col">
            <header className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-gray-100 flex-shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
              <h2 className="serif text-2xl text-gray-900">Chats</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { createNewChat(); setAllChatsOpen(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors"><Plus size={12} />New chat</button>
                <button onClick={() => setAllChatsOpen(false)} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><X size={16} /></button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-4">
                {chats.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-16">No chats yet.</p>
                ) : chats.map(c => (
                  <div key={c.id} onClick={() => { setChatId(c.id); setAllChatsOpen(false); }} className="group flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                    <MessageSquare size={14} className="text-gray-300 flex-shrink-0" />
                    <span className="text-gray-800 text-sm truncate flex-1">{c.title || 'New Chat'}</span>
                    <button onClick={e => { e.stopPropagation(); deleteChat(c.id); }} className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <header className="bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 py-2 md:h-12 flex-shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileChatsOpen(true)} aria-label="Open chats" className="md:hidden p-1 -ml-1 text-gray-600">
              <Menu size={20} />
            </button>
            <div className="flex flex-col min-w-0 leading-tight">
              <h2 className="text-gray-900 text-sm font-medium truncate">{active?.title || 'New Chat'}</h2>
              <p className="text-[11px] text-gray-400 truncate">{course.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {quizOpen && (
              <button onClick={() => setQuizOpen(false)} className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors">
                <X size={11} /><span className="hidden md:inline">Close quiz</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-[11px] font-medium text-emerald-600"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="hidden sm:inline">AI Active</span></div>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          {/* Chat messages */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {isEmpty ? (
              <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-6 fade-up">
                {documents.length === 0 ? (
                  <div className="text-center max-w-xs"><Clock size={20} className="text-gray-300 mx-auto mb-4" /><h3 className="text-gray-700 font-medium text-sm mb-1">Setting up your course</h3><p className="text-gray-400 text-xs">Your instructor is uploading materials.</p></div>
                ) : (
                  <div className="w-full max-w-2xl flex flex-col items-center">
                    <h2 className="serif text-4xl md:text-5xl leading-tight text-gray-900 mb-4 text-center tracking-tight">{greeting}{firstName ? `, ${firstName}` : ''}</h2>
                    <p className="text-[15px] text-gray-500 text-center mb-10 max-w-md leading-relaxed">Ask anything about {course.name} — grounded in your professor's materials.</p>
                    <div className="w-full">{inputBox}</div>
                  </div>
                )}
              </div>
            ) : (
              <>
              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
                <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-8 min-h-full">
              {active?.messages.map((m, i) => {
                const msgId = m.id || i;
                const isError = m.isError || m.content?.startsWith('error:');
                const quizMatch = m.role === 'assistant' && !m.streaming && !isError
                  ? /Quiz complete — you scored \*\*(\d+)\/(\d+)\*\* \((\d+)%\)(?: on (.+?))?\.?\s*$/.exec(m.content || '')
                  : null;
                return (
                  <div key={msgId} className={`group flex ${m.role === 'user' ? 'justify-end' : 'gap-3'}`}>
                    {m.role === 'assistant' && <div className="flex-shrink-0 mt-1.5"><AiMark thinking={m.streaming} /></div>}
                    <div className={`flex flex-col min-w-0 ${m.role === 'user' ? 'items-end max-w-[85%]' : 'items-start flex-1'}`}>
                      {quizMatch ? (
                        <div className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0"><ListChecks size={16} className="text-white" /></div>
                          <div>
                            <p className="text-[11px] text-gray-400">Practice quiz{quizMatch[4] ? ` · ${quizMatch[4]}` : ''}</p>
                            <p className="text-sm font-semibold text-gray-900">Scored {quizMatch[1]}/{quizMatch[2]} <span className="text-gray-400 font-normal">({quizMatch[3]}%)</span></p>
                          </div>
                        </div>
                      ) : (
                        <div className={`rounded-2xl text-sm w-full ${m.role === 'user' ? 'bg-gray-100 text-gray-900 px-4 py-3 rounded-br-sm' : 'text-gray-800'}`}>
                          {m.role === 'assistant' && m.content === '' && m.streaming ? (
                            <ThinkingText />
                          ) : isError ? <ErrorMessage content={m.content} /> : m.role === 'user' ? <p className="leading-relaxed whitespace-pre-wrap text-gray-900">{m.content}</p> : <MarkdownMessage content={m.content} />}
                          {m.role === 'assistant' && m.streaming && m.content && <span className="inline-block w-[3px] h-[16px] bg-gray-800 animate-pulse ml-1 align-middle rounded-sm" />}
                          {m.role === 'assistant' && m.sources?.length > 0 && !m.streaming && !isError && (
                            <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1.5 items-center">
                              <span className="text-[10px] text-gray-300 uppercase tracking-wide mr-0.5">From</span>
                              {m.sources.map((source, idx) => (<span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-[11px] font-medium"><FileText size={9} /><span className="max-w-[200px] truncate">{cleanFileName(source)}</span></span>))}
                            </div>
                          )}
                          {m.role === 'user' && <span className="block text-[10px] mt-1.5 text-gray-400">{formatTime(m.ts)}</span>}
                        </div>
                      )}
                      {m.role === 'assistant' && !m.streaming && m.content && !isError && !quizMatch && (
                        <div className="flex items-center gap-0.5 mt-1 overflow-hidden max-h-8 opacity-100 md:max-h-0 md:opacity-0 md:group-hover:max-h-8 md:group-hover:opacity-100 transition-all duration-200">
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
            </div>
            {showNewMessageIndicator && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 fade-up">
                <button
                  onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); setShowNewMessageIndicator(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium shadow-lg transition-colors">
                  ↓ New message
                </button>
              </div>
            )}
            <div className="px-4 md:px-8 py-3 md:py-4 bg-white border-t border-gray-100 flex-shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <div className="max-w-4xl mx-auto">{inputBox}</div>
              <p className="text-center text-[10px] text-gray-300 mt-2">Grounded in your course materials · Vertex AI</p>
            </div>
            </>
            )}
          </div>

          {/* ── Quiz panel — full-screen overlay on mobile, sidebar on desktop ── */}
          {quizOpen && (
            <div className="fixed md:static inset-0 md:inset-auto z-30 md:w-[360px] md:border-l border-gray-200 bg-white flex flex-col md:flex-shrink-0 overflow-hidden pt-[env(safe-area-inset-top)] md:pt-0">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <ListChecks size={15} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-900 text-sm font-semibold leading-tight">Practice Quiz</p>
                    <p className="text-gray-400 text-[11px] truncate">{quizTopic || 'From your course materials'}</p>
                  </div>
                </div>
                {!quizLoading && quizQuestions.length > 0 && !quizDone && (
                  <span className="text-[11px] font-medium text-gray-400 tabular-nums flex-shrink-0 ml-2">{quizIndex + 1} / {quizQuestions.length}</span>
                )}
              </div>
              {!quizLoading && quizQuestions.length > 0 && !quizDone && (
                <div className="h-1 bg-gray-100 flex-shrink-0">
                  <div className="h-full bg-gray-900 transition-all duration-300 ease-out" style={{ width: `${((quizIndex + (quizAnswers[quizIndex] !== undefined ? 1 : 0)) / quizQuestions.length) * 100}%` }} />
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-5 md:p-6">
                {quizLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-xs text-center">Generating your quiz from course materials…</p>
                  </div>
                )}
                {!quizLoading && quizQuestions.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <AlertCircle size={24} className="text-gray-200" />
                    <p className="text-gray-500 text-sm font-medium">Couldn't generate quiz</p>
                    <p className="text-gray-400 text-xs">Try asking again with a specific topic</p>
                  </div>
                )}
                {!quizLoading && quizDone && quizQuestions.length > 0 && (() => {
                  const total = quizQuestions.length;
                  const right = quizQuestions.filter((q, i) => quizAnswers[i] === q.correct).length;
                  const wrong = quizQuestions.filter((q, i) => { const a = quizAnswers[i]; return a !== undefined && a !== -1 && a !== q.correct; }).length;
                  const skipped = total - right - wrong;
                  const pct = Math.round((right / total) * 100);
                  const C = 2 * Math.PI * 42;
                  return (
                    <div className="flex flex-col gap-5">
                      {/* Score card */}
                      <div className="rounded-2xl bg-gray-50 p-5 flex items-center gap-5">
                        <div className="relative w-28 h-28 flex-shrink-0">
                          <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#111827" strokeWidth="9" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke="#22c55e" strokeWidth="9" strokeLinecap="round"
                              strokeDasharray={C} strokeDashoffset={C * (1 - right / total)} style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-gray-900 leading-none">{right}/{total}</span>
                            <span className="text-xs text-gray-400 mt-1">{pct}%</span>
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col gap-2.5 text-sm">
                          <div className="flex items-center justify-between"><span className="text-gray-500">Right</span><span className="font-semibold text-emerald-600 tabular-nums">{right}</span></div>
                          <div className="flex items-center justify-between"><span className="text-gray-500">Wrong</span><span className="font-semibold text-gray-900 tabular-nums">{wrong}</span></div>
                          <div className="flex items-center justify-between"><span className="text-gray-500">Skipped</span><span className="font-semibold text-gray-400 tabular-nums">{skipped}</span></div>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <button onClick={() => { setQuizIndex(0); setQuizAnswers({}); setQuizDone(false); }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors">
                          <RotateCcw size={14} />Retake quiz
                        </button>
                        <button onClick={() => generateQuiz(quizTopic)}
                          className="w-full py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-sm font-medium transition-colors">Generate a new quiz</button>
                      </div>
                    </div>
                  );
                })()}
                {!quizLoading && !quizDone && quizQuestions.length > 0 && (() => {
                  const q = quizQuestions[quizIndex];
                  const answered = quizAnswers[quizIndex];
                  const isAnswered = answered !== undefined && answered !== -1;
                  const isCorrect = answered === q.correct;
                  const isLast = quizIndex === quizQuestions.length - 1;
                  const advance = () => { if (isLast) setQuizDone(true); else setQuizIndex(i => i + 1); };
                  const skip = () => { setQuizAnswers(prev => (prev[quizIndex] === undefined ? { ...prev, [quizIndex]: -1 } : prev)); advance(); };
                  return (
                    <div className="flex flex-col gap-5">
                      <p className="text-gray-900 text-[15px] md:text-base font-semibold leading-relaxed">{q.question}</p>
                      <div className="flex flex-col gap-2.5">
                        {q.options.map((opt, oi) => {
                          const letter = String.fromCharCode(65 + oi);
                          const text = opt.replace(/^\s*[A-D][).:]\s*/, '');
                          let card = 'bg-gray-50 border-transparent hover:bg-gray-100';
                          let letterColor = 'text-gray-400';
                          if (isAnswered) {
                            if (oi === q.correct) { card = 'bg-emerald-50 border-emerald-200'; letterColor = 'text-emerald-600'; }
                            else if (oi === answered) { card = 'bg-red-50 border-red-200'; letterColor = 'text-red-500'; }
                            else { card = 'bg-gray-50 border-transparent opacity-50'; }
                          }
                          return (
                            <button key={oi} onClick={() => handleQuizAnswer(quizIndex, oi)} disabled={isAnswered}
                              className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all flex items-start gap-3 ${card} ${!isAnswered ? 'cursor-pointer' : 'cursor-default'}`}>
                              <span className={`text-sm font-semibold flex-shrink-0 w-4 ${letterColor}`}>{letter}.</span>
                              <span className="text-[13px] md:text-sm leading-snug text-gray-700 flex-1">{text}</span>
                              {isAnswered && oi === q.correct && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />}
                              {isAnswered && oi === answered && oi !== q.correct && <X size={16} className="text-red-400 flex-shrink-0 mt-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                      {isAnswered && (
                        <div className="rounded-2xl bg-gray-50 p-4">
                          <p className={`text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${isCorrect ? 'text-emerald-600' : 'text-gray-900'}`}>
                            {isCorrect ? <CheckCircle2 size={13} /> : <X size={13} className="text-red-400" />}
                            {isCorrect ? 'Correct' : 'Not quite'}
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button onClick={() => setQuizIndex(i => Math.max(0, i - 1))} disabled={quizIndex === 0}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl text-gray-400 hover:text-gray-700 disabled:opacity-0 text-sm font-medium transition-colors">
                          <ChevronLeft size={15} />Back
                        </button>
                        {isAnswered ? (
                          <button onClick={advance} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors">
                            {isLast ? 'See results' : 'Next'}{!isLast && <ChevronRight size={15} />}
                          </button>
                        ) : (
                          <button onClick={skip} className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 text-sm font-medium transition-colors">
                            Skip
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Modal for entering a join code on the landing page (for students without
// a direct invite link). Submitting navigates to /join/CODE which renders
// the existing JoinCoursePage flow — no change to the link-arrival path.
function JoinCodeModal({ open, onClose }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setCode(''); setError(''); } }, [open]);
  if (!open) return null;
  const submit = (e) => {
    e?.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) { setError('Enter a join code'); return; }
    navigate(`/join/${encodeURIComponent(clean)}`);
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 fade-up" onClick={onClose}>
      <style>{FONT}</style>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center mb-4"><BookOpen size={18} className="text-white" /></div>
        <h3 className="text-gray-900 font-semibold text-base mb-1">Enter your join code</h3>
        <p className="text-gray-500 text-sm mb-5">Your professor shared a join code with you. Paste it below — it usually looks like <span className="font-mono text-gray-700">BUS-A306-9X4F</span>.</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            autoFocus
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
            placeholder="Paste your join code"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300 font-mono uppercase tracking-wider"
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors">Continue →</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LandingPage({ onStudent, onInstructor, onSignIn }) {
  const navigate = useNavigate();
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.sr').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col page-enter">
      <style>{FONT}</style>
      <nav className="flex items-center justify-between px-4 md:px-10 py-3 md:py-4 border-b border-gray-200 bg-white sticky top-0 z-10" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 hover:opacity-80 transition-opacity" aria-label="Scholr home"><Logo size={28} /><span className="text-gray-900 font-semibold text-base tracking-tight">Scholr</span></button>
        <button onClick={onSignIn} className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors">Sign in</button>
      </nav>
      <div className="max-w-3xl mx-auto px-6 pt-16 md:pt-20 pb-16 text-center">
        <div className="sr in inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-500 text-xs font-medium mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Course-grounded AI tutoring
        </div>
        <h1 className="sr in sr-d1 serif text-5xl md:text-[62px] leading-[1.08] text-gray-900 mb-6">Every answer from<br /><span className="italic">your course materials.</span></h1>
        <p className="sr in sr-d2 text-gray-500 text-base md:text-lg max-w-md mx-auto leading-relaxed mb-10">AI tutoring grounded in what your professor uploaded. Cited, accurate, and trustworthy.</p>
        <div className="sr in sr-d3 flex flex-col items-center gap-4">
          <button onClick={onInstructor} className="px-8 py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors shadow-sm">Start a course free →</button>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>Joining a class?</span>
            <button onClick={() => setJoinModalOpen(true)} className="text-gray-700 hover:text-gray-900 font-medium underline-offset-4 hover:underline transition-colors">Enter your join code →</button>
          </div>
        </div>
      </div>
      <JoinCodeModal open={joinModalOpen} onClose={() => setJoinModalOpen(false)} />
      <div className="bg-gray-100 border-y border-gray-200 px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="sr bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" /></div>
              <div className="flex-1 bg-white border border-gray-200 rounded-md px-3 py-1 text-xs text-gray-400 font-mono">scholr.study</div>
            </div>
            <div className="flex" style={{height:'340px'}}>
              <div className="w-44 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0 p-3">
                <div className="flex items-center gap-2 mb-3"><Logo size={18} /><span className="text-gray-900 text-xs font-semibold">Scholr</span></div>
                <div className="bg-gray-900 rounded-lg px-2.5 py-2 mb-3"><p className="text-white text-[10px] font-medium">BUS-A 306</p><p className="text-gray-500 text-[9px]">Management Acct.</p></div>
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
                  <div className="flex justify-end"><div className="bg-gray-900 text-white rounded-xl rounded-br-sm px-3 py-2 text-[11px] max-w-[70%]">What topics will be on the midterm?</div></div>
                  <div className="flex flex-col gap-1.5 max-w-[88%]">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2.5 text-[11px] text-gray-700 leading-relaxed">The midterm covers chapters 1–4, with emphasis on cost-volume-profit analysis and contribution margin. (p. 12, 34)</div>
                    <div className="flex items-center gap-1.5"><span className="text-[9px] text-gray-400">From</span><div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5"><FileText size={8} className="text-gray-500" /><span className="text-[9px] text-gray-600">Syllabus.pdf</span></div></div>
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
      <div className="bg-gray-900 py-16">
        <div className="sr max-w-xl mx-auto px-6 text-center">
          <h2 className="serif text-4xl text-white mb-4 font-normal">Ready to get started?</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">Set up your first course in minutes. Free to start.</p>
          <div className="flex flex-col items-center gap-4">
            <button onClick={onInstructor} className="px-8 py-3.5 rounded-xl bg-white hover:bg-gray-100 text-gray-900 text-sm font-medium transition-colors">Start a course free →</button>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>Joining a class?</span>
              <button onClick={() => setJoinModalOpen(true)} className="text-gray-200 hover:text-white font-medium underline-offset-4 hover:underline transition-colors">Enter your join code →</button>
            </div>
          </div>
        </div>
      </div>
      <footer className="bg-gray-900 border-t border-white/10 py-8">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 28 28" fill="none"><path d="M8 10h8M8 14h12M8 18h6" stroke="#0F0F0F" strokeWidth="2" strokeLinecap="round"/></svg></div>
            <span className="text-white text-sm font-semibold">Scholr</span>
            <span className="text-gray-600 text-xs">© 2026</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap justify-center">
            <span>FERPA aligned</span>
            <span className="hidden sm:inline">·</span>
            <span>Powered by Google Vertex AI</span>
            <span className="hidden sm:inline">·</span>
            <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy</button>
            <span className="hidden sm:inline">·</span>
            <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Legal pages ──────────────────────────────────────────────────────────
function LegalPageLayout({ title, children }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col page-enter" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <style>{FONT}</style>
      <nav className="flex items-center justify-between px-4 md:px-10 py-3 md:py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity" aria-label="Scholr home"><Logo size={24} /><span className="text-gray-900 font-semibold">Scholr</span></button>
        <button onClick={() => navigate('/')} className="text-xs text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"><ArrowLeft size={12} />Back</button>
      </nav>
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 md:px-8 py-10 md:py-16">
        <h1 className="serif text-4xl md:text-5xl text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated May 26, 2026</p>
        <div className="prose prose-gray max-w-none text-gray-700 text-[15px] leading-relaxed space-y-6">
          {children}
        </div>
      </main>
      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="max-w-3xl mx-auto px-5 md:px-8 flex items-center justify-between text-xs text-gray-400">
          <span>© 2026 Scholr</span>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/privacy')} className="hover:text-gray-700">Privacy</button>
            <button onClick={() => navigate('/terms')} className="hover:text-gray-700">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <p>Scholr ("we", "our") provides an AI tutoring service for university courses. We believe a student's relationship with their education is private, and the materials a professor uploads to their course are theirs. This policy explains what we collect, why, and how we protect it.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">1. Information we collect</h2>
      <p><strong>Account information.</strong> When you sign up we collect your email address, a hashed password (we never see your plaintext password), and a display name you choose. If you sign in with Google we receive your email address and full name from Google.</p>
      <p><strong>Course content.</strong> Professors upload PDFs, images, and other course materials. Students may upload their own personal study notes. We process these to power the AI tutor.</p>
      <p><strong>Usage data.</strong> We log the questions students ask the AI tutor, the AI's responses, and basic metadata like timestamps. This is what makes the Insights view possible for professors.</p>
      <p><strong>Technical data.</strong> Like any web service, our servers log IP addresses, browser types, and request timestamps for security and operational purposes. We do not use third-party analytics or advertising cookies.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">2. How we use it</h2>
      <p>Course materials and student notes are sent to Google Cloud's Vertex AI (specifically the Gemini 2.5 Flash model) to generate grounded answers. We do not use your data to train AI models. Google's Vertex AI terms explicitly prohibit training on customer prompts and content.</p>
      <p>Aggregated, non-identifying usage data may be used to improve Scholr (for example, to learn that students are asking many short questions versus long ones). We never share identifiable user data with anyone.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">3. Who can see what</h2>
      <p><strong>Course materials:</strong> only enrolled students in that course and the professor who owns the course can access them through the AI.</p>
      <p><strong>Personal student notes:</strong> only the student who uploaded them. Professors cannot see student notes.</p>
      <p><strong>Chat history:</strong> only the student who had the conversation. Professors see aggregate question counts and topics in Insights but cannot read individual student chats.</p>
      <p><strong>Questions log (Insights data):</strong> only the professor who owns the course. Question text is logged anonymized to the course (no student identifier).</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">4. FERPA alignment</h2>
      <p>Scholr is designed with FERPA principles in mind. Educational records (chat history, uploaded notes, questions logs) are not shared with third parties for marketing or any non-educational purpose. Each professor's course is its own isolated environment. We act as a service provider to the educational institution or instructor using Scholr.</p>
      <p>We are not a covered entity under FERPA ourselves; the educational institution is. If your institution has specific FERPA requirements (a Data Processing Agreement, for example), email us and we'll work with you.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">5. Data storage and security</h2>
      <p>User accounts, courses, enrollments, chats, and metadata are stored in Supabase (a Postgres database hosted in the US). Uploaded PDFs and images are stored in Google Cloud Storage in the United States. All connections are encrypted in transit (HTTPS / TLS).</p>
      <p>We follow standard security practices: passwords are hashed (bcrypt via Supabase Auth), API endpoints require authentication, and database access is restricted to the Scholr backend service.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">6. Data retention and deletion</h2>
      <p>We keep your data as long as your account exists. You may delete your account at any time by contacting us; this removes your role record, your chat history, your notes, your enrollment records, and any courses you own (with all their materials and student data).</p>
      <p>If you'd like a copy of your data before deletion, email us and we'll export it.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">7. Children's privacy</h2>
      <p>Scholr is intended for users 13 years and older. We do not knowingly collect information from children under 13. If you are a K-12 educator who needs Scholr for younger students, contact us first.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">8. Cookies and local storage</h2>
      <p>We use browser local storage to keep you logged in across sessions. We do not use tracking cookies, advertising cookies, or third-party analytics.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">9. Changes to this policy</h2>
      <p>We may update this policy as Scholr evolves. Material changes will be highlighted at the top of this page and the "last updated" date above will change. Continued use of Scholr after a change constitutes acceptance.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">10. Contact</h2>
      <p>Questions, data requests, or concerns: email <a href="mailto:hello@scholr.study" className="text-gray-900 underline hover:no-underline">hello@scholr.study</a>.</p>
    </LegalPageLayout>
  );
}

function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service">
      <p>Welcome to Scholr. These terms govern your use of the Scholr service at scholr.study. Using Scholr means you agree to them.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">1. What Scholr is</h2>
      <p>Scholr is an AI tutoring service that answers student questions about a specific course's materials. Professors upload course content; students ask questions about that content; the AI generates answers grounded in the uploaded materials.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">2. Your account</h2>
      <p>You're responsible for keeping your password secure and for all activity on your account. Don't share your account. Don't impersonate someone else. If you suspect your account has been compromised, contact us.</p>
      <p>You must be 13 or older to use Scholr.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">3. Your content</h2>
      <p>You retain ownership of everything you upload — course materials, personal study notes, chat questions. By uploading, you grant Scholr a non-exclusive license to process that content through Google Cloud's Vertex AI for the sole purpose of generating answers in your course context. You may revoke this license by deleting the content.</p>
      <p>Do not upload content you don't have the right to share. If a copyright holder believes their work has been uploaded without permission, they may contact us and we'll review the request.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">4. Acceptable use</h2>
      <p>Don't use Scholr to:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Cheat on exams or assignments where AI assistance is prohibited by your instructor or institution.</li>
        <li>Upload content you don't have permission to share.</li>
        <li>Attempt to reverse-engineer Scholr, attack our infrastructure, or extract our underlying AI models.</li>
        <li>Harass, harm, or impersonate other users.</li>
      </ul>
      <p>Professors are responsible for setting their own course policies on AI use and communicating those to their students.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">5. AI accuracy and academic integrity</h2>
      <p>Scholr's AI is designed to ground answers in the materials a professor uploaded. It will sometimes be wrong. It may misread a PDF, miss context, or generate an answer that sounds plausible but isn't accurate. Treat its responses the way you'd treat advice from a smart classmate: useful, but verify against the source material or with your instructor before relying on it for an exam or graded work.</p>
      <p>Scholr is not a substitute for your professor, your TAs, or office hours.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">6. Service availability</h2>
      <p>We work hard to keep Scholr available, but we make no guarantees of uptime. Scheduled maintenance and unscheduled outages happen. We are not liable for harm caused by Scholr being unavailable.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">7. Termination</h2>
      <p>You may delete your account at any time. We may suspend or close accounts that violate these terms, abuse the service, or fail to pay (if you're on a paid plan in the future).</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">8. Limitation of liability</h2>
      <p>To the maximum extent allowed by law, Scholr is provided "as is" without warranty. We are not liable for indirect, incidental, or consequential damages — including, for example, the consequences of an AI-generated answer being wrong on an exam.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">9. Changes to these terms</h2>
      <p>We may update these terms as Scholr evolves. Material changes will be highlighted at the top of this page and the "last updated" date will change. If you continue using Scholr after a change, you accept the new terms.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">10. Governing law</h2>
      <p>These terms are governed by the laws of the State of Indiana, United States, without regard to conflict-of-laws principles.</p>

      <h2 className="serif text-2xl text-gray-900 mt-10 mb-3">11. Contact</h2>
      <p>Questions about these terms: email <a href="mailto:hello@scholr.study" className="text-gray-900 underline hover:no-underline">hello@scholr.study</a>.</p>
    </LegalPageLayout>
  );
}

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
      navigate('/student/signup');
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`${API}/student/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({ course_id: course.id }),
      });
      // Stale/expired session — re-authenticate, then the join completes
      // automatically once they're back on the dashboard (pending_join).
      if (res.status === 401) {
        sessionStorage.setItem('scholr_pending_join', code);
        localStorage.removeItem('scholr_student_token');
        localStorage.removeItem('scholr_student_user');
        navigate('/student/login');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.already_enrolled) {
        setError(data.error || "Couldn't join — please try again.");
        setJoining(false);
        return;
      }
      navigate('/student');
    } catch { setError('Could not join course'); }
    setJoining(false);
  };

  if (loading) return <LoadingScreen label="Loading your course..." />;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col page-enter">
      <style>{FONT}</style>
      <nav className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-gray-200 bg-white" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity" aria-label="Scholr home"><Logo size={24} /><span className="text-gray-900 font-semibold">Scholr</span></button>
        {studentUser && <span className="text-gray-400 text-sm truncate ml-3">{studentUser.name || studentUser.email}</span>}
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
                <span className="flex items-center gap-1"><Lock size={11} />FERPA aligned</span><span className="w-1 h-1 rounded-full bg-gray-300" /><span>Powered by Google Vertex AI</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  // Initialize state lazily from localStorage so returning users skip the
  // landing page entirely on first paint — no flash before redirect.
  const initialAuth = (() => {
    if (typeof window === 'undefined') return { screen: 'landing', profToken: null, profUser: null, studentToken: null, studentUser: null };
    try {
      const pt = localStorage.getItem('scholr_token');
      const pu = localStorage.getItem('scholr_user');
      if (pt && pu) return { screen: 'prof-dashboard', profToken: pt, profUser: JSON.parse(pu), studentToken: null, studentUser: null };
      const st = localStorage.getItem('scholr_student_token');
      const su = localStorage.getItem('scholr_student_user');
      if (st && su) return { screen: 'student-dashboard', profToken: null, profUser: null, studentToken: st, studentUser: JSON.parse(su) };
    } catch {}
    return { screen: 'landing', profToken: null, profUser: null, studentToken: null, studentUser: null };
  })();
  const [screen, setScreen] = useState(initialAuth.screen);
  const [profToken, setProfToken] = useState(initialAuth.profToken);
  const [profUser, setProfUser] = useState(initialAuth.profUser);
  const [studentToken, setStudentToken] = useState(initialAuth.studentToken);
  const [studentUser, setStudentUser] = useState(initialAuth.studentUser);
  const [studentCourse, setStudentCourse] = useState(null);
  const [studentDocs, setStudentDocs] = useState([]);
  const [studentQuestions, setStudentQuestions] = useState([]);
  const [pendingJoinCode, setPendingJoinCode] = useState(null);
  const [globalToast, setGlobalToast] = useState(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const hashParams = new URLSearchParams(hash.replace('#', '?'));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        // Role comes from the redirect_to URL the backend set when kicking
        // off OAuth (?role=professor for the teacher flow, ?role=student
        // for the student flow). Defaults to student for backward compat.
        const role = new URLSearchParams(window.location.search).get('role') === 'professor' ? 'professor' : 'student';
        // Sync the role row server-side (service key) — the frontend must not
        // write to professors/students directly, so those tables stay locked
        // by RLS against the public key.
        fetch(`${API}/auth/sync-oauth-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken, role }),
        }).then(r => r.json()).then(data => {
          if (data.conflict) {
            setGlobalToast({ message: `This Google account is already registered as a ${role === 'professor' ? 'student' : 'teacher'}. Sign in with that role instead.`, type: 'error' });
            window.history.replaceState({}, '', '/');
            setScreen('landing');
            return;
          }
          if (!data.user) {
            setGlobalToast({ message: 'Sign-in failed. Please try again.', type: 'error' });
            window.history.replaceState({}, '', '/');
            setScreen('landing');
            return;
          }
          const u = data.user;
          if (role === 'professor') {
            localStorage.setItem('scholr_token', accessToken);
            localStorage.setItem('scholr_user', JSON.stringify(u));
            setProfToken(accessToken); setProfUser(u);
            window.history.replaceState({}, '', '/');
            setScreen('prof-dashboard');
          } else {
            localStorage.setItem('scholr_student_token', accessToken);
            localStorage.setItem('scholr_student_user', JSON.stringify(u));
            setStudentToken(accessToken); setStudentUser(u);
            window.history.replaceState({}, '', '/');
            setScreen('student-dashboard');
          }
        }).catch(() => {
          setGlobalToast({ message: 'Sign-in failed. Please try again.', type: 'error' });
          window.history.replaceState({}, '', '/');
          setScreen('landing');
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
  const handleStudentLogin = (token, user) => { localStorage.setItem('scholr_student_token', token); localStorage.setItem('scholr_student_user', JSON.stringify(user)); setStudentToken(token); setStudentUser(user); setScreen('student-dashboard'); navigate('/student'); };
  const handleStudentLogout = () => { localStorage.removeItem('scholr_student_token'); localStorage.removeItem('scholr_student_user'); setStudentToken(null); setStudentUser(null); setScreen('landing'); };
  const handleEnterCourse = (course, docs, questions) => { setStudentCourse(course); setStudentDocs(docs); setStudentQuestions(questions); setScreen('student-chat'); };

  const renderScreen = () => {
    switch (screen) {
      case 'landing': return <LandingPage onStudent={() => setScreen('student-login')} onInstructor={() => setScreen('prof-signup')} onSignIn={() => setScreen('smart-signin')} />;
      case 'smart-signin': return <SmartSignIn onPickStudent={() => setScreen('student-login')} onPickProfessor={() => setScreen('prof-login')} onBack={() => setScreen('landing')} />;
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
    <>
      <Routes>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/join/:code" element={<JoinCoursePage studentToken={studentToken} studentUser={studentUser} onStudentLogin={handleStudentLogin} onEnterCourse={handleEnterCourse} />} />
        <Route path="/student/login" element={<StudentLogin onLogin={handleStudentLogin} onGoSignup={() => navigate('/student/signup')} onBack={() => navigate('/')} pendingJoinCode={pendingJoinCode} />} />
        <Route path="/student/signup" element={<StudentSignup onLogin={handleStudentLogin} onGoLogin={() => navigate('/student/login')} onBack={() => navigate('/')} pendingJoinCode={pendingJoinCode} />} />
        <Route path="/student" element={
          studentToken
            ? (screen === 'student-chat' && studentCourse
                ? <StudentView course={studentCourse} documents={studentDocs} suggestedQuestions={studentQuestions} onExit={() => setScreen('student-dashboard')} studentToken={studentToken} />
                : <StudentDashboard token={studentToken} user={studentUser} onEnterCourse={handleEnterCourse} onLogout={handleStudentLogout} />)
            : <LandingPage onStudent={() => navigate('/student/login')} onInstructor={() => setScreen('prof-signup')} onSignIn={() => setScreen('smart-signin')} />
        } />
        <Route path="/*" element={renderScreen()} />
      </Routes>
      <ToastBanner message={globalToast?.message} type={globalToast?.type} onClose={() => setGlobalToast(null)} />
    </>
  );
}
