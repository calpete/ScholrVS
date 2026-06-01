import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import {
  MessageSquare, Send, LogOut, Trash2, Plus, BookOpen, FileText,
  ChevronRight, Users, AlertCircle, UploadCloud, BarChart2, Clock,
  CheckCircle2, Copy, Check, ThumbsUp, ThumbsDown, X,
  Lock, WifiOff, Paperclip, Square, ArrowLeft, ExternalLink, Hash, Menu,
  ListChecks, RotateCcw, Sparkles, ChevronLeft, MoreHorizontal, Pencil, FolderOpen
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
    <div className="scholr-auth choose">
      <style>{AUTH_CSS}</style>
      <div className="choose-wrap">
        <button type="button" className="auth-brand choose-brand" onClick={onBack} aria-label="Scholr home"><LandingLogo s={32} />Scholr</button>
        <div className="choose-eyebrow"><span className="dash" /> Sign in <span className="dash" /></div>
        <h1 className="choose-h">Welcome back.</h1>
        <p className="choose-sub">Sign in to the portal you signed up for.</p>
        <div className="choose-cards">
          <button type="button" className="choose-card" onClick={onPickStudent}>
            <span className="choose-ic"><BookOpen size={18} /></span>
            <span className="choose-text"><b>I'm a student</b><span>Ask questions and get cited answers from your class.</span></span>
            <Ic name="arrow-right" s={16} />
          </button>
          <button type="button" className="choose-card prof" onClick={onPickProfessor}>
            <span className="choose-ic"><Lock size={17} /></span>
            <span className="choose-text"><b>I'm a teacher</b><span>Manage your courses and see what your class is asking.</span></span>
            <Ic name="arrow-right" s={16} />
          </button>
        </div>
        <button type="button" className="choose-back" onClick={onBack}><ArrowLeft size={13} />Back</button>
        <div className="theme-foot"><Lock size={12} /> FERPA aligned <span className="sep" /> Powered by Google Vertex AI</div>
      </div>
    </div>
  );
}

// Shared styling for the student/professor login pages — reuses the exact
// design tokens from the landing (Newsreader + Hanken Grotesk, warm canvas,
// ink buttons), scoped under .scholr-auth so nothing leaks into the app.
const AUTH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500;1,6..72,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
.scholr-auth{--font-display:"Newsreader",Georgia,serif;--font-body:"Hanken Grotesk",system-ui,sans-serif;--bg:#FBFBF9;--bg-2:#F3F2EF;--surface:#FFFFFF;--ink:#15161B;--ink-2:#2A2C33;--muted:#6B6E76;--muted-2:#9A9CA3;--line:#E7E4DD;--accent:#15161B;--radius-lg:22px;--radius-pill:999px;--shadow-sm:0 1px 2px rgba(21,22,27,.04),0 1px 3px rgba(21,22,27,.05);--shadow-float:0 40px 90px -38px rgba(21,22,27,.28),0 8px 26px -16px rgba(21,22,27,.16);min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 20px;background:var(--bg);font-family:var(--font-body);color:var(--ink);-webkit-font-smoothing:antialiased;}
.scholr-auth *{box-sizing:border-box;margin:0;padding:0;}
.scholr-auth ::selection{background:var(--ink);color:var(--bg);}
.scholr-auth.prof{background:var(--bg-2);}
.scholr-auth .auth-brand{display:flex;align-items:center;gap:11px;font-weight:700;font-size:21px;letter-spacing:-.02em;color:var(--ink);background:none;border:none;cursor:pointer;font-family:var(--font-body);margin-bottom:24px;}
.scholr-auth .auth-brand .mark{width:32px;height:32px;flex:none;}
.scholr-auth .auth-card{position:relative;width:100%;max-width:400px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:36px 34px;box-shadow:var(--shadow-float);}
.scholr-auth.shake{animation:auth-shake .4s ease-in-out;}
@keyframes auth-shake{0%,100%{transform:translateX(0);}20%{transform:translateX(-7px);}40%{transform:translateX(7px);}60%{transform:translateX(-4px);}80%{transform:translateX(4px);}}
.scholr-auth .auth-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-2);margin-bottom:16px;}
.scholr-auth .auth-eyebrow svg{width:13px;height:13px;color:var(--muted);}
.scholr-auth .auth-chip{display:inline-flex;align-items:center;gap:8px;padding:6px 13px;border-radius:var(--radius-pill);background:var(--surface);border:1px solid var(--line);font-size:12.5px;font-weight:600;color:var(--ink-2);box-shadow:var(--shadow-sm);margin-bottom:18px;}
.scholr-auth .live{width:7px;height:7px;border-radius:999px;background:#22b07d;position:relative;flex:none;}
.scholr-auth .live::after{content:"";position:absolute;inset:-4px;border-radius:999px;border:1.5px solid #22b07d;opacity:.4;animation:auth-ping 2.4s cubic-bezier(0,0,.2,1) infinite;}
@keyframes auth-ping{0%{transform:scale(.55);opacity:.55;}80%,100%{transform:scale(1.7);opacity:0;}}
.scholr-auth h1{font-family:var(--font-display);font-weight:500;font-size:31px;letter-spacing:-.02em;line-height:1.04;margin-bottom:9px;}
.scholr-auth .auth-sub{font-size:15px;color:var(--muted);line-height:1.5;margin-bottom:26px;}
.scholr-auth .gbtn{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px;border-radius:13px;background:var(--surface);border:1px solid var(--line);color:var(--ink);font-family:var(--font-body);font-size:15px;font-weight:600;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .15s;}
.scholr-auth .gbtn:hover{border-color:var(--muted-2);box-shadow:var(--shadow-sm);transform:translateY(-1px);}
.scholr-auth .gbtn svg{width:18px;height:18px;}
.scholr-auth .divider{display:flex;align-items:center;gap:12px;margin:18px 0;}
.scholr-auth .divider span{font-size:12.5px;color:var(--muted-2);}
.scholr-auth .divider i{flex:1;height:1px;background:var(--line);}
.scholr-auth form{display:flex;flex-direction:column;gap:13px;}
.scholr-auth .auth-field{display:flex;flex-direction:column;gap:6px;}
.scholr-auth .auth-field>label,.scholr-auth .auth-label label{font-size:13px;font-weight:600;color:var(--ink-2);}
.scholr-auth .auth-label{display:flex;align-items:center;justify-content:space-between;}
.scholr-auth .auth-label .forgot{background:none;border:none;font-family:var(--font-body);font-size:12.5px;color:var(--muted);cursor:pointer;}
.scholr-auth .auth-label .forgot:hover{color:var(--ink);}
.scholr-auth input{width:100%;font-family:var(--font-body);font-size:15px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px 14px;outline:none;transition:border-color .15s,background .15s;}
.scholr-auth.prof input{background:#fff;}
.scholr-auth input:focus{border-color:var(--ink);background:var(--surface);}
.scholr-auth input::placeholder{color:var(--muted-2);}
.scholr-auth .auth-hint{font-size:12.5px;color:var(--muted);background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;line-height:1.45;}
.scholr-auth .auth-error{font-size:13px;color:#c0392b;text-align:center;}
.scholr-auth .btn-primary{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:13px;border:none;background:var(--ink);color:#fff;font-family:var(--font-body);font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 1px 2px rgba(21,22,27,.3);transition:background .2s,transform .15s,box-shadow .2s;margin-top:4px;}
.scholr-auth .btn-primary:hover:not(:disabled){background:#000;transform:translateY(-1px);box-shadow:0 8px 22px -10px rgba(21,22,27,.5);}
.scholr-auth .btn-primary:disabled{opacity:.4;cursor:default;}
.scholr-auth .auth-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:22px;}
.scholr-auth .auth-foot .back{display:inline-flex;align-items:center;gap:5px;color:var(--muted-2);background:none;border:none;cursor:pointer;font-family:var(--font-body);font-size:13px;}
.scholr-auth .auth-foot .back:hover{color:var(--ink);}
.scholr-auth .auth-foot .alt{display:inline-flex;align-items:center;gap:5px;color:var(--ink);font-weight:700;background:none;border:none;cursor:pointer;font-family:var(--font-body);font-size:13px;text-align:right;}
.scholr-auth .auth-foot .alt svg{width:14px;height:14px;transition:transform .2s;flex:none;}
.scholr-auth .auth-foot .alt:hover svg{transform:translateX(3px);}
.scholr-auth .spin{width:15px;height:15px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:999px;animation:auth-spin .7s linear infinite;}
@keyframes auth-spin{to{transform:rotate(360deg);}}
@media (max-width:480px){.scholr-auth h1{font-size:27px;}}
/* ---- modern full-page split layout ---- */
.scholr-auth{display:grid;grid-template-columns:1.04fr .96fr;align-items:stretch;padding:0;}
.scholr-auth.shake{animation:none;}
.scholr-auth.shake .auth-card{animation:auth-shake .4s ease-in-out;}
.scholr-auth .auth-aside{position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:44px 52px;overflow:hidden;}
.scholr-auth.stud .auth-aside{background:var(--bg-2);}
.scholr-auth.prof .auth-aside{background:var(--ink);color:#fff;}
.scholr-auth.prof .auth-aside::after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.05) 1.4px,transparent 1.4px);background-size:26px 26px;-webkit-mask-image:radial-gradient(85% 70% at 30% 28%,#000,transparent 75%);mask-image:radial-gradient(85% 70% at 30% 28%,#000,transparent 75%);pointer-events:none;}
.scholr-auth .auth-aside>*{position:relative;z-index:1;}
.scholr-auth .auth-brand{margin-bottom:0;color:inherit;}
.scholr-auth .aside-body{max-width:430px;}
.scholr-auth .aside-eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:12px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;margin-bottom:22px;}
.scholr-auth.stud .aside-eyebrow{color:var(--muted);}
.scholr-auth.prof .aside-eyebrow{color:rgba(255,255,255,.6);}
.scholr-auth .aside-eyebrow svg{width:13px;height:13px;}
.scholr-auth .aside-h{font-family:var(--font-display);font-weight:500;font-size:clamp(30px,3vw,42px);line-height:1.06;letter-spacing:-.022em;margin-bottom:18px;}
.scholr-auth .aside-h .ital{font-style:italic;}
.scholr-auth .aside-p{font-size:16.5px;line-height:1.55;max-width:390px;}
.scholr-auth.stud .aside-p{color:var(--muted);}
.scholr-auth.prof .aside-p{color:rgba(255,255,255,.66);}
.scholr-auth .aside-chips{display:flex;flex-direction:column;align-items:flex-start;gap:10px;margin-top:28px;}
.scholr-auth .aside-qchip{display:inline-flex;align-items:center;gap:9px;padding:9px 15px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-size:13.5px;font-weight:500;color:var(--ink-2);box-shadow:var(--shadow-sm);}
.scholr-auth .aside-qchip svg{width:14px;height:14px;color:var(--muted-2);flex:none;}
.scholr-auth .aside-list{display:flex;flex-direction:column;gap:14px;margin-top:28px;}
.scholr-auth .aside-list li{display:flex;gap:11px;align-items:flex-start;font-size:15.5px;line-height:1.4;list-style:none;color:rgba(255,255,255,.84);}
.scholr-auth .aside-list .tick{flex:none;width:22px;height:22px;border-radius:999px;background:rgba(255,255,255,.13);color:#fff;display:grid;place-items:center;margin-top:1px;}
.scholr-auth .aside-list .tick svg{width:13px;height:13px;}
.scholr-auth .aside-foot{font-size:13px;}
.scholr-auth.stud .aside-foot{color:var(--muted-2);}
.scholr-auth.prof .aside-foot{color:rgba(255,255,255,.4);}
.scholr-auth .auth-main{display:flex;align-items:center;justify-content:center;padding:48px 32px;background:var(--surface);overflow-y:auto;}
.scholr-auth .auth-card{max-width:392px;border:none;box-shadow:none;padding:0;background:transparent;margin:auto;}
.scholr-auth .auth-mobile-brand{display:none;align-items:center;gap:10px;justify-content:center;font-weight:700;font-size:20px;letter-spacing:-.02em;margin:0 auto 26px;background:none;border:none;cursor:pointer;color:var(--ink);font-family:var(--font-body);}
.scholr-auth .auth-mobile-brand .mark{width:30px;height:30px;}
@media (max-width:900px){
.scholr-auth{grid-template-columns:1fr;}
.scholr-auth .auth-aside{display:none;}
.scholr-auth .auth-main{min-height:100dvh;padding:34px 22px;background:var(--bg);}
.scholr-auth .auth-mobile-brand{display:flex;}
.scholr-auth .auth-card{padding:0;}
}
/* ---- role chooser ---- */
.scholr-auth.choose{display:flex;grid-template-columns:none;align-items:center;justify-content:center;padding:32px 22px;background:var(--bg);}
.scholr-auth.choose .choose-wrap{width:100%;max-width:440px;text-align:center;}
.scholr-auth .choose-brand{justify-content:center;margin:0 auto 30px;}
.scholr-auth .choose-h{font-family:var(--font-display);font-weight:500;font-size:34px;letter-spacing:-.02em;line-height:1.04;margin-bottom:9px;}
.scholr-auth .choose-sub{font-size:15px;color:var(--muted);margin-bottom:30px;}
.scholr-auth .choose-cards{display:flex;flex-direction:column;gap:12px;text-align:left;}
.scholr-auth .choose-card{display:flex;align-items:center;gap:15px;padding:18px 20px;border-radius:16px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-sm);cursor:pointer;transition:border-color .15s,box-shadow .2s,transform .15s;font-family:var(--font-body);color:var(--ink);text-align:left;}
.scholr-auth .choose-card:hover{border-color:var(--ink);transform:translateY(-2px);box-shadow:0 14px 34px -18px rgba(21,22,27,.16);}
.scholr-auth .choose-ic{flex:none;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--accent-soft);color:var(--ink);}
.scholr-auth .choose-card.prof .choose-ic{background:var(--ink);color:#fff;}
.scholr-auth .choose-text{flex:1;display:flex;flex-direction:column;gap:3px;min-width:0;}
.scholr-auth .choose-text b{font-size:16px;font-weight:700;letter-spacing:-.01em;}
.scholr-auth .choose-text span{font-size:13px;color:var(--muted);line-height:1.4;}
.scholr-auth .choose-card svg:last-child{flex:none;color:var(--muted-2);transition:transform .2s,color .15s;}
.scholr-auth .choose-card:hover svg:last-child{color:var(--ink);transform:translateX(3px);}
.scholr-auth .choose-back{display:inline-flex;align-items:center;gap:6px;margin:24px auto 0;background:none;border:none;font-family:var(--font-body);font-size:13px;color:var(--muted-2);cursor:pointer;}
.scholr-auth .choose-back:hover{color:var(--ink);}
.scholr-auth .choose-eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:12px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);justify-content:center;margin-bottom:18px;}
.scholr-auth .choose-eyebrow .dash{width:22px;height:1.5px;border-radius:2px;background:currentColor;opacity:.55;}
.scholr-auth .theme-foot{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:30px;font-size:12.5px;color:var(--muted-2);}
.scholr-auth .theme-foot svg{width:12px;height:12px;}
.scholr-auth .theme-foot .sep{width:3px;height:3px;border-radius:999px;background:currentColor;opacity:.6;flex:none;}
/* ---- invite (join-code landing) ---- */
.scholr-auth.invite{display:flex;grid-template-columns:none;flex-direction:column;align-items:center;justify-content:center;padding:32px 22px;background:var(--bg);}
.scholr-auth .invite-wrap{width:100%;max-width:440px;display:flex;flex-direction:column;align-items:center;}
.scholr-auth .invite-brand{justify-content:center;margin-bottom:0;}
.scholr-auth .invite-card{position:relative;width:100%;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:40px 36px;box-shadow:var(--shadow-float);margin-top:28px;}
.scholr-auth .invite-ic{width:52px;height:52px;border-radius:14px;background:var(--ink);color:#fff;display:grid;place-items:center;margin-bottom:24px;}
.scholr-auth .invite-eyebrow{font-size:12px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--muted-2);margin-bottom:6px;}
.scholr-auth .invite-course{font-family:var(--font-display);font-weight:500;font-size:34px;letter-spacing:-.02em;line-height:1.04;color:var(--ink);margin-bottom:16px;}
.scholr-auth .invite-code{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:10px;background:var(--bg-2);border:1px solid var(--line);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:600;color:var(--ink-2);letter-spacing:.06em;margin-bottom:30px;}
.scholr-auth .invite-btn{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:13px;border:none;background:var(--ink);color:#fff;font-family:var(--font-body);font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 1px 2px rgba(21,22,27,.3);transition:background .2s,transform .15s,box-shadow .2s;}
.scholr-auth .invite-btn:hover:not(:disabled){background:#000;transform:translateY(-1px);box-shadow:0 8px 22px -10px rgba(21,22,27,.5);}
.scholr-auth .invite-btn:disabled{opacity:.5;cursor:default;}
.scholr-auth .invite-alt{display:block;width:100%;text-align:center;margin-top:14px;background:none;border:none;font-family:var(--font-body);font-size:13.5px;color:var(--muted);cursor:pointer;}
.scholr-auth .invite-alt b{font-weight:700;color:var(--ink);}
.scholr-auth .invite-alt:hover{color:var(--ink);}
.scholr-auth .invite-err{text-align:center;width:100%;}
.scholr-auth .invite-err h1{font-family:var(--font-display);font-weight:500;font-size:30px;letter-spacing:-.02em;color:var(--ink);margin-bottom:10px;}
.scholr-auth .invite-err p{font-size:15px;color:var(--muted);margin-bottom:20px;}
@media (max-width:480px){.scholr-auth .invite-card{padding:30px 24px;}.scholr-auth .invite-course{font-size:28px;}}
`;

// Full-page split shell shared by all four auth screens. Left = branded
// marketing panel (warm for students, dark/authoritative for instructors);
// right = the form. Collapses to a single column on mobile.
function AuthLayout({ variant, onBack, shake, children }) {
  const isProf = variant === 'prof';
  return (
    <div className={`scholr-auth ${variant}${shake ? ' shake' : ''}`}>
      <style>{AUTH_CSS}</style>
      <aside className="auth-aside">
        <button type="button" className="auth-brand" onClick={onBack} aria-label="Scholr home"><LandingLogo s={32} light={isProf} />Scholr</button>
        {isProf ? (
          <div className="aside-body">
            <span className="aside-eyebrow"><Lock size={13} /> For instructors</span>
            <h2 className="aside-h">See what your class is stuck on, <span className="ital">before</span> the next lecture.</h2>
            <p className="aside-p">Upload your course once. Scholr fields the repetitive questions and shows you exactly where students need help.</p>
            <ul className="aside-list">
              <li><span className="tick"><Ic name="check" s={13} /></span> Answers stay inside your materials</li>
              <li><span className="tick"><Ic name="check" s={13} /></span> Live analytics on what's confusing the class</li>
              <li><span className="tick"><Ic name="check" s={13} /></span> Set up in an afternoon — no IT required</li>
            </ul>
          </div>
        ) : (
          <div className="aside-body">
            <h2 className="aside-h">An AI tutor that actually <span className="ital">knows your class.</span></h2>
            <p className="aside-p">Cited answers from your professor's real materials — ready the night before the exam.</p>
            <div className="aside-chips">
              <span className="aside-qchip"><Ic name="message-square" s={14} /> Will this be on the final?</span>
              <span className="aside-qchip"><Ic name="message-square" s={14} /> Explain contribution margin</span>
              <span className="aside-qchip"><Ic name="message-square" s={14} /> What's the late policy?</span>
            </div>
          </div>
        )}
        <div className="aside-foot">{isProf ? 'FERPA-aligned · Powered by Vertex AI' : 'Grounded in your course materials'}</div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <button type="button" className="auth-mobile-brand" onClick={onBack} aria-label="Scholr home"><LandingLogo s={30} light={false} />Scholr</button>
          {children}
        </div>
      </main>
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
    <AuthLayout variant="prof" onBack={onBack} shake={shaking}>
        <span className="auth-eyebrow"><Lock size={13} /> Instructor portal</span>
        <h1>Instructor sign&#8209;in</h1>
        <p className="auth-sub">Manage your courses and see exactly what your class is asking.</p>
        <button type="button" className="gbtn" onClick={() => { window.location.href = `${API}/professor/auth/google`; }}>
          <GoogleIcon />Continue with Google
        </button>
        <div className="divider"><i /><span>or</span><i /></div>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="prof-email">Email</label>
            <input id="prof-email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu" />
          </div>
          <div className="auth-field">
            <label htmlFor="prof-password">Password</label>
            <input id="prof-password" name="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={!email || !password || loading}>
            {loading ? <><span className="spin" />Signing in…</> : 'Sign in'}
          </button>
        </form>
        <div className="auth-foot">
          <button type="button" className="back" onClick={onBack}><ArrowLeft size={13} />Back</button>
          <button type="button" className="alt" onClick={onGoSignup}>New to Scholr? Create your course <Ic name="arrow-right" s={14} /></button>
        </div>
    </AuthLayout>
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
    <AuthLayout variant="prof" onBack={onBack}>
      <span className="auth-eyebrow"><Lock size={13} /> Instructor portal</span>
      <h1>Create your workspace</h1>
      <p className="auth-sub">Set up your instructor account and bring Scholr to your course.</p>
      <button type="button" className="gbtn" onClick={() => { window.location.href = `${API}/professor/auth/google`; }}>
        <GoogleIcon />Continue with Google
      </button>
      <div className="divider"><i /><span>or</span><i /></div>
      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="prof-signup-name">Name</label>
          <input id="prof-signup-name" name="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Jane Smith" />
        </div>
        <div className="auth-field">
          <label htmlFor="prof-signup-email">Email</label>
          <input id="prof-signup-email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@university.edu" />
        </div>
        <div className="auth-field">
          <label htmlFor="prof-signup-password">Password</label>
          <input id="prof-signup-password" name="password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={!name || !email || !password || loading}>
          {loading ? <><span className="spin" />Creating account…</> : 'Create account'}
        </button>
      </form>
      <div className="auth-foot">
        <button type="button" className="back" onClick={onBack}><ArrowLeft size={13} />Back</button>
        <button type="button" className="alt" onClick={onGoLogin}>Have an account? Sign in <Ic name="arrow-right" s={14} /></button>
      </div>
    </AuthLayout>
  );
}

function StudentLogin({ onLogin, onGoSignup, onBack, pendingJoinCode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

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
    <AuthLayout variant="stud" onBack={onBack} shake={shaking}>
        <span className="auth-chip"><span className="live" /> AI Active</span>
        <h1>{pendingJoinCode ? 'Almost there.' : 'Welcome back.'}</h1>
        <p className="auth-sub">{pendingJoinCode ? 'Sign in to join your class — your AI tutor is ready and waiting.' : 'Sign in and pick up right where you left off.'}</p>
        <button type="button" className="gbtn" onClick={handleGoogle}>
          <GoogleIcon />Continue with Google
        </button>
        <div className="divider"><i /><span>or</span><i /></div>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="student-email">Email</label>
            <input id="student-email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" />
          </div>
          <div className="auth-field">
            <div className="auth-label"><label htmlFor="student-password">Password</label><button type="button" className="forgot" onClick={() => setShowForgot(s => !s)}>Forgot?</button></div>
            <input id="student-password" name="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {showForgot && <p className="auth-hint">Password resets aren't available yet — reach out to your instructor and they can re-share your class link so you can sign back in.</p>}
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={!email || !password || loading}>
            {loading ? <><span className="spin" />Signing in…</> : 'Sign in'}
          </button>
        </form>
        <div className="auth-foot">
          <button type="button" className="back" onClick={onBack}><ArrowLeft size={13} />Back</button>
          <button type="button" className="alt" onClick={onGoSignup}>Don't have an account? Join a class <Ic name="arrow-right" s={14} /></button>
        </div>
    </AuthLayout>
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
    <AuthLayout variant="stud" onBack={onBack}>
      <span className="auth-chip"><span className="live" /> AI Active</span>
      <h1>{pendingJoinCode ? "You're one step away." : 'Join your class.'}</h1>
      <p className="auth-sub">{pendingJoinCode ? 'Create your account and you’ll drop straight into your course.' : 'Create your student account — it takes about a minute.'}</p>
      <button type="button" className="gbtn" onClick={handleGoogle}>
        <GoogleIcon />Continue with Google
      </button>
      <div className="divider"><i /><span>or</span><i /></div>
      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="student-signup-name">Name</label>
          <input id="student-signup-name" name="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Alex Rivera" />
        </div>
        <div className="auth-field">
          <label htmlFor="student-signup-email">Email</label>
          <input id="student-signup-email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" />
        </div>
        <div className="auth-field">
          <label htmlFor="student-signup-password">Password</label>
          <input id="student-signup-password" name="password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
        </div>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={!name || !email || !password || loading}>
          {loading ? <><span className="spin" />Creating account…</> : 'Create account'}
        </button>
      </form>
      <div className="auth-foot">
        <button type="button" className="back" onClick={onBack}><ArrowLeft size={13} />Back</button>
        <button type="button" className="alt" onClick={onGoLogin}>Have an account? Sign in <Ic name="arrow-right" s={14} /></button>
      </div>
    </AuthLayout>
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
    <div className="min-h-[100dvh] bg-[#F6F6F4] page-enter" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
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
    <div className="min-h-[100dvh] bg-[#F6F6F4] page-enter" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
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
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#F6F6F4] fixed inset-0 page-enter">
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
      <aside style={isDesktop ? { width: sidebarW } : undefined} className={`fixed md:relative inset-y-0 left-0 z-40 w-72 bg-[#F6F6F4] border-r border-gray-200 flex flex-col flex-shrink-0 transform transition-transform md:transform-none ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} pt-[env(safe-area-inset-top)]`}>
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
    <div className="flex-1 flex flex-col bg-[#F6F6F4]">
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
      <div className="flex-1 flex flex-col bg-[#F6F6F4]">
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
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F6F6F4]">
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
  const [notesOpen, setNotesOpen] = useState(false);       // full "My Notes" page overlay
  const [uploadingNote, setUploadingNote] = useState(null); // filename being uploaded via the composer
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
    setUploadingNote(file.name);
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
          setUploadingNote(null);
        };
        reader.onerror = () => setUploadingNote(null);
        reader.readAsArrayBuffer(file);
      } else {
        setUploadingNote(null);
      }
    } catch { setUploadingNote(null); }
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
    <div className="bg-white border border-gray-200 rounded-[26px] px-4 pt-4 pb-2.5 focus-within:border-gray-300 shadow-sm transition-colors">
      <input
        ref={inputRef}
        id="chat-input"
        name="chat-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isTyping) onSend(); } }}
        className="w-full bg-transparent text-gray-800 text-base outline-none placeholder-gray-400 px-1"
        placeholder={isEmpty && questions.length ? questions[phIdx % questions.length] : (myNotes.length > 0 ? "Ask about your course + notes..." : "Ask about your course...")}
        autoComplete="off"
      />
      <div className="flex items-center justify-between mt-6">
        <button onClick={() => paperclipRef.current?.click()} className="flex-shrink-0 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><Plus size={20} /></button>
        {isTyping ? (
          <button onClick={onStop} className="w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center flex-shrink-0"><Square size={11} fill="currentColor" /></button>
        ) : input.trim() ? (
          <button onClick={() => onSend()} className="w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center flex-shrink-0 fade-up"><Send size={12} /></button>
        ) : null}
      </div>
    </div>
  );
  // Attached notes show as chips above the composer; they persist in "My Notes".
  const notesBar = (myNotes.length > 0 || uploadingNote) ? (
    <div className="flex flex-wrap gap-1.5 mb-2 px-1">
      {uploadingNote && (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-gray-200 text-[11px] text-gray-500 max-w-[200px]">
          <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span className="truncate">{cleanFileName(uploadingNote)}</span>
        </div>
      )}
      {myNotes.map((doc, i) => (
        <div key={i} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-white border border-gray-200 text-[11px] text-gray-600 max-w-[200px]">
          <FileText size={11} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{cleanFileName(doc.name)}</span>
          <button onClick={() => deleteNote(doc.name)} aria-label="Remove note" className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"><X size={11} /></button>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden fixed inset-0 bg-[#F6F6F4] page-enter">
      <style>{FONT}</style>

      {/* Backdrop on mobile when drawer is open */}
      {mobileChatsOpen && <div onClick={closeMobile} className="md:hidden fixed inset-0 bg-black/40 z-30" />}

      {/* ── Left sidebar / mobile drawer ── */}
      <aside style={isDesktop ? { width: sidebarW } : undefined} className={`fixed md:relative inset-y-0 left-0 z-40 w-72 bg-[#F6F6F4] border-r border-gray-200 flex flex-col flex-shrink-0 transform transition-transform md:transform-none ${mobileChatsOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} pt-[env(safe-area-inset-top)]`}>
        <ResizeHandle onMouseDown={startSidebarDrag} />
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex md:hidden items-center justify-end mb-1.5">
            <button onClick={closeMobile} aria-label="Close menu" className="p-1 text-gray-400"><X size={16} /></button>
          </div>
          <p className="text-gray-900 text-[15px] font-bold truncate leading-tight">{course.name}</p>
          <p className="text-gray-400 text-[11px] mt-1">{documents.length} doc{documents.length !== 1 ? 's' : ''} · {myNotes.length} note{myNotes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="px-3 pt-3 space-y-0.5">
          <button onClick={() => { createNewChat(); setNotesOpen(false); closeMobile(); }} className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-gray-700 text-[13px] font-medium hover:bg-gray-200/60 transition-colors"><Plus size={15} className="text-gray-500" />New chat</button>
          <button onClick={() => { setNotesOpen(true); setAllChatsOpen(false); closeMobile(); }} className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${notesOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-200/60'}`}><FolderOpen size={15} className="text-gray-500" />My Notes{myNotes.length > 0 && <span className="ml-auto text-[11px] text-gray-400 font-normal">{myNotes.length}</span>}</button>
          <input ref={paperclipRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => { handlePaperclipFile(e.target.files[0]); e.target.value = ''; }} />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="group/recents flex items-center justify-between px-2 mb-2">
            <button onClick={() => setRecentsOpen(o => !o)} className="flex items-center gap-1 text-[11px] text-gray-500 font-semibold hover:text-gray-700 transition-colors">
              <ChevronRight size={11} className={`transition-transform ${recentsOpen ? 'rotate-90' : ''}`} />Recents
            </button>
            {recentsOpen && (
              <button
                onClick={() => { setAllChatsOpen(true); setNotesOpen(false); closeMobile(); }}
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
                  <button onClick={() => { setChatId(c.id); setNotesOpen(false); closeMobile(); }} className={`flex items-center w-full text-left px-2.5 py-2 rounded-lg text-[13px] transition-colors pr-8 ${c.id === chatId && !notesOpen ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-200/60'}`}>
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
        <div className="p-4 border-t border-gray-200">
          <button onClick={onExit} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-xs"><LogOut size={11} />Back to courses</button>
        </div>
      </aside>

      {/* ── Main chat ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {allChatsOpen && (
          <div className="absolute inset-0 z-40 bg-[#F6F6F4] flex flex-col">
            <header className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-gray-200/70 flex-shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
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
        {notesOpen && (
          <div className="absolute inset-0 z-40 bg-[#F6F6F4] flex flex-col">
            <header className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-gray-200/70 flex-shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
              <div className="min-w-0">
                <h2 className="serif text-2xl text-gray-900">My Notes</h2>
                <p className="text-[12px] text-gray-400 mt-0.5 truncate">Uploaded here, read alongside your course materials.</p>
              </div>
              <button onClick={() => setNotesOpen(false)} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"><X size={16} /></button>
            </header>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-5">
                <button onClick={() => paperclipRef.current?.click()} className="w-full flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-300 bg-white/40 transition-colors cursor-pointer mb-5">
                  <UploadCloud size={22} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Drop notes or photos</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">PDF, JPG or PNG · added to this course's AI context</p>
                </button>
                {notesLoading ? (
                  <div className="flex items-center justify-center py-10"><div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" /></div>
                ) : myNotes.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-10">No notes yet — upload your own to ground answers in them.</p>
                ) : (
                  <div className="space-y-2">
                    {myNotes.map((doc, i) => (
                      <div key={i} className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-200">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><FileText size={14} className="text-gray-500" /></div>
                        <span className="text-sm text-gray-800 flex-1 truncate">{cleanFileName(doc.name)}</span>
                        <button onClick={() => deleteNote(doc.name)} aria-label="Delete note" className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <header className="bg-[#F6F6F4] border-b border-gray-200/70 flex items-center justify-between px-4 md:px-8 py-2 md:h-12 flex-shrink-0 gap-3">
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
            <button type="button" onClick={onExit} className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0" aria-label="Scholr home"><Logo size={20} /><span className="text-gray-900 font-semibold text-sm hidden sm:inline">Scholr</span></button>
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
                  <div className="w-full max-w-3xl flex flex-col items-center">
                    <h2 className="serif text-4xl md:text-5xl leading-tight text-gray-900 mb-4 text-center tracking-tight">{greeting}{firstName ? `, ${firstName}` : ''}</h2>
                    <p className="text-[15px] text-gray-500 text-center mb-10 max-w-md leading-relaxed">Ask anything about {course.name} — grounded in your professor's materials.</p>
                    <div className="w-full">{notesBar}{inputBox}</div>
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
            <div className="px-4 md:px-8 py-3 md:py-4 bg-[#F6F6F4] border-t border-gray-200/70 flex-shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <div className="max-w-3xl mx-auto">{notesBar}{inputBox}</div>
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

// ─── Landing page (ported from Claude Design "Scholr Landing") ───────────────
// Visual design recreated 1:1 in React. CSS is scoped under `.scholr-landing`
// so none of it leaks into the app. Buttons route into the EXISTING auth flow
// via the same three callbacks the rest of the app already passes.
const LANDING_ICONS = {
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'folder': '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><path d="M21 12H9"/>',
  'file-text': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"/><path d="m9 12 2 2 4-4"/>',
  'sparkles': '<path d="M9.94 14.06A2 2 0 0 0 8.5 12.6l-5.4-1.4a.5.5 0 0 1 0-.96l5.4-1.4A2 2 0 0 0 9.94 7.4l1.4-5.4a.5.5 0 0 1 .96 0l1.4 5.4a2 2 0 0 0 1.44 1.44l5.4 1.4a.5.5 0 0 1 0 .96l-5.4 1.4a2 2 0 0 0-1.44 1.44l-1.4 5.4a.5.5 0 0 1-.96 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
  'bar-chart': '<line x1="6" x2="6" y1="20" y2="14"/><line x1="12" x2="12" y1="20" y2="8"/><line x1="18" x2="18" y1="20" y2="4"/>',
  'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  'scan-text': '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8h8"/><path d="M7 12h10"/><path d="M7 16h6"/>',
  'x-logo': '<path d="M4 4l16 16M20 4 4 20" stroke-width="2.2"/>',
  'linkedin': '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
  'github': '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
};
function LandingLogo({ s = 36, light = false }) {
  const sq = light ? '#FBFBF9' : '#15161B';
  const ln = light ? '#15161B' : '#FBFBF9';
  return (
    <svg className="mark" width={s} height={s} viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect width="36" height="36" rx="10.5" fill={sq} />
      <rect x="9.5" y="11.7" width="14" height="2.9" rx="1.45" fill={ln} />
      <rect x="9.5" y="16.55" width="17" height="2.9" rx="1.45" fill={ln} />
      <rect x="9.5" y="21.4" width="9" height="2.9" rx="1.45" fill={ln} />
    </svg>
  );
}
function AnsLines({ s = 22 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="5.7" width="13" height="2.5" rx="1.25" />
      <rect x="3" y="10.75" width="16" height="2.5" rx="1.25" />
      <rect x="3" y="15.8" width="8.5" height="2.5" rx="1.25" />
    </svg>
  );
}
function LoadLines({ s = 22 }) {
  return (
    <svg className="load-lines" width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect className="ln ln1" x="3" y="5.7" width="13" height="2.5" rx="1.25" />
      <rect className="ln ln2" x="3" y="10.75" width="16" height="2.5" rx="1.25" />
      <rect className="ln ln3" x="3" y="15.8" width="8.5" height="2.5" rx="1.25" />
    </svg>
  );
}
function Ic({ name, s = 18, className }) {
  if (name === 'logo') return <LandingLogo s={s} />;
  if (name === 'answer-lines') return <AnsLines s={s} />;
  const p = LANDING_ICONS[name];
  if (!p) return null;
  return <svg className={className} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: p }} />;
}

const LANDING_CONVOS = [
  { chat: "Contribution margin vs gross margin", q: "What's the difference between contribution margin and gross margin?", time: "11:04 AM",
    answer: 'Both measure profitability, but they subtract different costs. <b>Gross margin</b> is revenue minus the cost of goods sold (COGS). <b>Contribution margin</b> is revenue minus <i>all</i> variable costs — so it’s the figure used for break-even and CVP analysis.',
    cites: ["Lecture 6 · Cost Behavior · slide 14", "Ch. 4 Reading · p. 132"] },
  { chat: "What's on the midterm?", q: "What topics will be on the midterm, and how is it weighted?", time: "9:21 PM",
    answer: 'The midterm covers <b>Chapters 1–4</b>, with emphasis on cost-volume-profit analysis and contribution margin. It’s worth <b>25%</b> of your final grade and is closed-book.',
    cites: ["A306 Syllabus · Spring 2026 · §2", "Lecture 5 · slide 3"] },
  { chat: "Late submission policy", q: "What happens if I turn in homework a day late?", time: "7:48 AM",
    answer: 'Late homework loses <b>10% per day</b> for up to three days, after which it’s no longer accepted. Your <b>lowest two</b> homework grades are dropped at the end of term.',
    cites: ["A306 Syllabus · Spring 2026 · §5", "Course Policies · p. 2"] },
];
const LANDING_RECENTS = [
  "Contribution margin vs gross margin",
  "What's on the midterm?",
  "Late submission policy",
  "Can I use a graphing calculator?",
  "How many homework grades are dropped?",
];
const LANDING_MQ_1 = ["Will this be on the final?", "What's the late-submission policy?", "Explain contribution margin like I'm new", "How many homework grades are dropped?", "Is the midterm closed-book?", "Which chapters are on the exam?"];
const LANDING_MQ_2 = ["Can I use a graphing calculator?", "When are office hours this week?", "What's the grading breakdown?", "Define cost-volume-profit analysis", "Is attendance required?", "How do I find break-even units?"];

const LANDING_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500;1,6..72,600&family=Hanken+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
html { scroll-behavior: smooth; }
.scholr-landing {
  --font-display:"Newsreader",Georgia,serif; --font-body:"Hanken Grotesk",system-ui,sans-serif;
  --bg:#FBFBF9; --bg-2:#F3F2EF; --bg-3:#EFEEEA; --surface:#FFFFFF;
  --ink:#15161B; --ink-2:#2A2C33; --muted:#6B6E76; --muted-2:#9A9CA3;
  --line:#E7E4DD; --line-2:#EEEBE4; --accent:#15161B; --accent-soft:rgba(21,22,27,.06);
  --radius:16px; --radius-sm:11px; --radius-lg:22px; --radius-pill:999px; --btn-radius:13px;
  --shadow-sm:0 1px 2px rgba(21,22,27,.04),0 1px 3px rgba(21,22,27,.05);
  --shadow-card:0 1px 2px rgba(21,22,27,.04),0 14px 34px -18px rgba(21,22,27,.16);
  --shadow-float:0 40px 90px -38px rgba(21,22,27,.34),0 8px 26px -16px rgba(21,22,27,.18);
  --maxw:1120px;
  font-family:var(--font-body); background:var(--bg); color:var(--ink); line-height:1.55; font-size:17px;
  overflow-x:hidden; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
}
.scholr-landing *{box-sizing:border-box;margin:0;padding:0;}
.scholr-landing img{max-width:100%;display:block;}
.scholr-landing a{color:inherit;text-decoration:none;}
.scholr-landing button{font:inherit;color:inherit;}
.scholr-landing svg{display:block;}
.scholr-landing ::selection{background:var(--ink);color:var(--bg);}
.scholr-landing [id]{scroll-margin-top:92px;}
.scholr-landing .wrap{max-width:var(--maxw);margin:0 auto;padding:0 28px;}
.scholr-landing .serif{font-family:var(--font-display);font-weight:500;letter-spacing:-.012em;}
.scholr-landing .ital{font-style:italic;}
.scholr-landing .btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;font-family:var(--font-body);font-weight:600;font-size:16px;padding:14px 22px;border-radius:var(--btn-radius);border:1px solid transparent;cursor:pointer;transition:transform .15s ease,background .2s ease,box-shadow .2s ease,border-color .2s ease,color .2s ease;white-space:nowrap;}
.scholr-landing .btn svg{width:17px;height:17px;}
.scholr-landing .btn-primary{background:var(--ink);color:#fff;box-shadow:0 1px 2px rgba(21,22,27,.3);}
.scholr-landing .btn-primary:hover{background:#000;transform:translateY(-1px);box-shadow:0 8px 22px -10px rgba(21,22,27,.5);}
.scholr-landing .btn-primary:active{transform:translateY(0) scale(.99);}
.scholr-landing .btn-primary .arr{transition:transform .2s ease;display:inline-flex;}
.scholr-landing .btn-primary:hover .arr{transform:translateX(3px);}
.scholr-landing .btn-ghost{background:var(--surface);color:var(--ink);border-color:var(--line);}
.scholr-landing .btn-ghost:hover{border-color:var(--ink);transform:translateY(-1px);}
.scholr-landing .btn-pill{border-radius:var(--radius-pill);}
.scholr-landing .btn-lg{padding:16px 28px;font-size:17px;}
.scholr-landing .eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);}
.scholr-landing .dot{width:22px;height:1.5px;border-radius:2px;background:currentColor;opacity:.55;flex:none;}
.scholr-landing .dot.live{width:8px;height:8px;border-radius:999px;opacity:.9;position:relative;}
.scholr-landing .dot.live::after{content:"";position:absolute;inset:-4px;border-radius:999px;border:1.5px solid currentColor;opacity:.35;animation:lp-ping 2.4s cubic-bezier(0,0,.2,1) infinite;}
@keyframes lp-ping{0%{transform:scale(.6);opacity:.6;}80%,100%{transform:scale(1.7);opacity:0;}}
.scholr-landing .chip{display:inline-flex;align-items:center;gap:9px;padding:8px 16px;border-radius:var(--radius-pill);background:var(--surface);border:1px solid var(--line);font-size:14.5px;font-weight:600;color:var(--ink-2);box-shadow:var(--shadow-sm);white-space:nowrap;}
.scholr-landing header.nav{position:sticky;top:0;z-index:60;background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:blur(16px) saturate(1.5);-webkit-backdrop-filter:blur(16px) saturate(1.5);border-bottom:1px solid transparent;transition:border-color .25s ease,background .25s ease;}
.scholr-landing header.nav.scrolled{border-bottom-color:var(--line);}
.scholr-landing .nav-inner{display:flex;align-items:center;justify-content:space-between;height:76px;}
.scholr-landing .brand{display:flex;align-items:center;gap:11px;font-weight:700;font-size:23px;letter-spacing:-.02em;color:var(--ink);background:none;border:none;cursor:pointer;font-family:var(--font-body);}
.scholr-landing .brand .mark{width:36px;height:36px;flex:none;}
.scholr-landing .nav-links{display:flex;align-items:center;gap:32px;}
.scholr-landing .nav-links a{font-size:15.5px;font-weight:500;color:var(--muted);transition:color .15s ease;cursor:pointer;}
.scholr-landing .nav-links a:hover{color:var(--ink);}
.scholr-landing .nav-right{display:flex;align-items:center;gap:14px;}
.scholr-landing .hero{text-align:center;padding:78px 0 86px;position:relative;}
.scholr-landing .hero .chip{margin-bottom:34px;}
.scholr-landing .hero h1{font-family:var(--font-display);font-weight:500;font-size:clamp(46px,7.4vw,96px);line-height:.98;letter-spacing:-.025em;color:var(--ink);}
.scholr-landing .hero h1 .l2{display:block;font-style:italic;font-weight:500;}
.scholr-landing .hero .lede{font-size:clamp(18px,2vw,22px);color:var(--muted);max-width:540px;margin:28px auto 0;line-height:1.5;}
.scholr-landing .hero-actions{margin-top:40px;display:flex;justify-content:center;}
.scholr-landing .hero-sub{margin-top:26px;font-size:16px;color:var(--muted-2);}
.scholr-landing .hero-sub a{color:var(--ink);font-weight:700;margin-left:6px;display:inline-flex;align-items:center;gap:5px;cursor:pointer;}
.scholr-landing .hero-sub a svg{width:15px;height:15px;transition:transform .2s ease;}
.scholr-landing .hero-sub a:hover svg{transform:translateX(3px);}
.scholr-landing .showband{background:var(--bg-2);border-top:1px solid var(--line);padding:80px 0 96px;}
.scholr-landing .showband .wrap{max-width:1080px;}
.scholr-landing .window{background:var(--surface);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-float);border:1px solid var(--line);font-family:"Inter",-apple-system,"Segoe UI",system-ui,sans-serif;--m-ink:#18181B;--m-muted:#6B7280;--m-faint:#9CA3AF;--m-line:#ECECEC;--m-hover:#F4F4F5;--m-active:#F1F1F0;}
.scholr-landing .win-bar{display:flex;align-items:center;gap:14px;padding:13px 18px;background:#F3F3F4;border-bottom:1px solid var(--m-line);}
.scholr-landing .win-lights{display:flex;gap:8px;flex:none;}
.scholr-landing .win-lights i{width:12px;height:12px;border-radius:999px;display:block;}
.scholr-landing .win-lights i:nth-child(1){background:#FF5F57;}
.scholr-landing .win-lights i:nth-child(2){background:#FEBC2E;}
.scholr-landing .win-lights i:nth-child(3){background:#28C840;}
.scholr-landing .win-url{flex:1;background:#fff;border:1px solid var(--m-line);border-radius:9px;padding:7px 14px;font-size:13.5px;color:var(--m-faint);text-align:left;}
.scholr-landing .app{display:grid;grid-template-columns:232px 1fr;min-height:460px;color:var(--m-ink);}
.scholr-landing .app-side{background:#fff;border-right:1px solid var(--m-line);padding:18px 14px;display:flex;flex-direction:column;gap:18px;}
.scholr-landing .side-label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--m-faint);padding:0 6px;}
.scholr-landing .chat-list{display:flex;flex-direction:column;gap:3px;}
.scholr-landing .chat-item{padding:9px 12px;border-radius:9px;font-size:14px;font-weight:500;color:var(--m-muted);cursor:pointer;transition:background .15s,color .15s;}
.scholr-landing .chat-item:hover{background:var(--m-hover);color:var(--m-ink);}
.scholr-landing .chat-item.active{background:var(--m-active);color:var(--m-ink);font-weight:600;}
.scholr-landing .app-side .side-foot{margin-top:auto;display:flex;align-items:center;gap:10px;color:var(--m-muted);font-size:14px;font-weight:500;}
.scholr-landing .app-main{display:flex;flex-direction:column;}
.scholr-landing .main-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--m-line);}
.scholr-landing .main-head .t{font-weight:600;font-size:16px;color:var(--m-ink);}
.scholr-landing .main-body{padding:24px 22px;display:flex;flex-direction:column;gap:16px;flex:1;}
.scholr-landing .from-row{display:flex;align-items:center;gap:9px;margin-top:4px;}
.scholr-landing .from-row .lbl{font-size:12.5px;color:var(--m-faint);}
.scholr-landing .src-chip{display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border-radius:8px;background:#fff;border:1px solid var(--m-line);font-size:13px;font-weight:600;color:var(--m-ink);cursor:pointer;transition:border-color .15s,transform .15s;}
.scholr-landing .src-chip:hover{border-color:var(--m-faint);transform:translateY(-1px);}
.scholr-landing .src-chip svg{width:14px;height:14px;color:var(--m-faint);}
.scholr-landing .main-input{margin:auto 22px 22px;display:flex;align-items:center;gap:10px;padding:11px 12px 11px 16px;border:1px solid var(--m-line);border-radius:var(--radius-pill);background:#fff;}
.scholr-landing .main-input span{color:var(--m-faint);}
.scholr-landing section.band{padding:104px 0;}
.scholr-landing .sec-head{max-width:700px;margin:0 auto 60px;text-align:center;}
.scholr-landing .sec-head .eyebrow{justify-content:center;margin-bottom:20px;}
.scholr-landing .sec-head h2{font-family:var(--font-display);font-weight:500;font-size:clamp(32px,4.2vw,50px);line-height:1.04;letter-spacing:-.022em;}
.scholr-landing .sec-head h2 .ital{font-style:italic;}
.scholr-landing .sec-head p{font-size:18.5px;color:var(--muted);margin-top:18px;line-height:1.55;}
.scholr-landing .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:var(--surface);}
.scholr-landing .step{padding:38px 32px;position:relative;border-right:1px solid var(--line);}
.scholr-landing .step:last-child{border-right:none;}
.scholr-landing .step .num{display:inline-flex;align-items:center;gap:9px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-2);margin-bottom:22px;}
.scholr-landing .step .num b{font-family:var(--font-display);font-style:italic;font-weight:500;font-size:17px;color:var(--ink);}
.scholr-landing .step .ic-box{width:44px;height:44px;display:grid;place-items:center;margin:0 0 20px -2px;color:var(--ink);border:1px solid var(--line);border-radius:12px;}
.scholr-landing .step .ic-box svg{width:22px;height:22px;stroke-width:1.75;}
.scholr-landing .step h3{font-weight:700;font-size:19px;letter-spacing:-.01em;margin-bottom:8px;}
.scholr-landing .step p{font-size:15px;color:var(--muted);line-height:1.55;}
.scholr-landing .principles{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;}
.scholr-landing .principle{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:36px 34px;box-shadow:var(--shadow-sm);transition:transform .2s ease,box-shadow .2s ease;}
.scholr-landing .principle:hover{transform:translateY(-3px);box-shadow:var(--shadow-card);}
.scholr-landing .principle .idx{display:flex;align-items:center;gap:13px;margin-bottom:20px;}
.scholr-landing .principle .idx b{font-family:var(--font-display);font-style:italic;font-weight:500;font-size:21px;color:var(--ink);}
.scholr-landing .principle .idx .ln{flex:1;height:1px;background:var(--line);}
.scholr-landing .principle h3{font-family:var(--font-display);font-weight:500;font-size:25px;letter-spacing:-.02em;margin-bottom:11px;}
.scholr-landing .principle p{font-size:16px;color:var(--muted);line-height:1.6;}
.scholr-landing .bento{display:grid;grid-template-columns:repeat(6,1fr);gap:18px;}
.scholr-landing .feat{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:30px;display:flex;flex-direction:column;box-shadow:var(--shadow-sm);transition:transform .18s ease,box-shadow .18s ease,border-color .18s;}
.scholr-landing .feat:hover{transform:translateY(-3px);box-shadow:var(--shadow-card);}
.scholr-landing .feat .ic-box{width:44px;height:44px;border-radius:12px;border:1px solid var(--line);color:var(--ink);display:grid;place-items:center;margin-bottom:22px;}
.scholr-landing .feat .ic-box svg{width:22px;height:22px;stroke-width:1.75;}
.scholr-landing .feat h3{font-weight:700;font-size:20px;letter-spacing:-.01em;margin-bottom:9px;}
.scholr-landing .feat p{font-size:15px;color:var(--muted);line-height:1.55;}
.scholr-landing .feat.span-3{grid-column:span 3;}
.scholr-landing .feat.span-2{grid-column:span 2;}
.scholr-landing .feat.dark{background:var(--ink);color:#fff;border-color:transparent;}
.scholr-landing .feat.dark .ic-box{background:transparent;border-color:rgba(255,255,255,.18);color:#fff;}
.scholr-landing .feat.dark p{color:rgba(255,255,255,.62);}
.scholr-landing .feat.dark .mini-cites{display:flex;gap:7px;margin-top:18px;flex-wrap:wrap;}
.scholr-landing .feat.dark .mini-cites>span{font-size:12px;font-weight:600;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);display:inline-flex;align-items:center;gap:6px;}
.scholr-landing .feat.dark .mini-cites>span .d{width:6px;height:6px;border-radius:999px;background:currentColor;opacity:.65;}
.scholr-landing .split{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.scholr-landing .aud{border-radius:var(--radius);padding:42px;border:1px solid var(--line);box-shadow:var(--shadow-sm);}
.scholr-landing .aud.prof{background:var(--ink);color:#fff;border-color:transparent;}
.scholr-landing .aud.stud{background:var(--surface);}
.scholr-landing .aud .kicker{display:inline-flex;align-items:center;gap:9px;font-size:12.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:22px;}
.scholr-landing .aud.prof .kicker{color:rgba(255,255,255,.7);}
.scholr-landing .aud.stud .kicker{color:var(--muted-2);}
.scholr-landing .aud .kicker .d{width:22px;height:1.5px;border-radius:2px;background:currentColor;opacity:.55;}
.scholr-landing .aud h3{font-family:var(--font-display);font-weight:500;font-size:29px;letter-spacing:-.022em;margin-bottom:14px;line-height:1.08;}
.scholr-landing .aud h3 .ital{font-style:italic;}
.scholr-landing .aud>p{font-size:16.5px;line-height:1.6;margin-bottom:28px;}
.scholr-landing .aud.prof>p{color:rgba(255,255,255,.66);}
.scholr-landing .aud.stud>p{color:var(--muted);}
.scholr-landing .aud ul{display:flex;flex-direction:column;gap:15px;list-style:none;}
.scholr-landing .aud li{display:flex;gap:12px;align-items:flex-start;font-size:15.5px;list-style:none;line-height:1.45;}
.scholr-landing .aud li .tick{flex:none;width:22px;height:22px;border-radius:999px;display:grid;place-items:center;margin-top:1px;}
.scholr-landing .aud li .tick svg{width:13px;height:13px;}
.scholr-landing .aud.prof li .tick{background:rgba(255,255,255,.12);color:#fff;}
.scholr-landing .aud.stud li .tick{background:var(--accent-soft);color:var(--accent);}
.scholr-landing .aud .aud-cta{margin-top:32px;}
.scholr-landing .aud.prof .btn-ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.25);}
.scholr-landing .aud.prof .btn-ghost:hover{border-color:#fff;}
.scholr-landing .analytics-grid{display:grid;grid-template-columns:.95fr 1.05fr;gap:60px;align-items:center;}
.scholr-landing .dash{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow-card);overflow:hidden;}
.scholr-landing .dash-top{padding:18px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;}
.scholr-landing .dash-top .t{font-weight:700;font-size:15.5px;}
.scholr-landing .dash-top .wk{font-size:12.5px;color:var(--muted);border:1px solid var(--line);border-radius:var(--radius-pill);padding:4px 12px;}
.scholr-landing .dash-body{padding:22px 20px;}
.scholr-landing .dash-body>.lead{font-size:12.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted-2);margin-bottom:16px;}
.scholr-landing .confuse{display:flex;flex-direction:column;gap:15px;}
.scholr-landing .confuse .top{display:flex;justify-content:space-between;font-size:14px;margin-bottom:7px;}
.scholr-landing .confuse .top b{font-weight:600;}
.scholr-landing .confuse .top span{color:var(--muted);font-variant-numeric:tabular-nums;}
.scholr-landing .confuse .bar{height:9px;border-radius:999px;background:var(--bg-2);overflow:hidden;}
.scholr-landing .confuse .bar i{display:block;height:100%;border-radius:999px;background:var(--ink);width:0;transition:width 1s cubic-bezier(.2,.7,.2,1);}
.scholr-landing .dash-foot{padding:14px 20px;border-top:1px solid var(--line);display:flex;align-items:center;gap:9px;font-size:13.5px;color:var(--muted);background:var(--bg);}
.scholr-landing .dash-foot svg{width:16px;height:16px;color:var(--ink);flex:none;}
.scholr-landing .stat-row{display:flex;gap:36px;margin-top:34px;}
.scholr-landing .stat .n{font-family:var(--font-display);font-weight:500;font-size:40px;letter-spacing:-.02em;line-height:1;}
.scholr-landing .stat .n .ital{font-style:italic;}
.scholr-landing .stat .l{font-size:14px;color:var(--muted);margin-top:8px;}
.scholr-landing .cta-band{padding:40px 0 110px;}
.scholr-landing .cta-box{background:var(--ink);color:#fff;border-radius:var(--radius-lg);padding:76px 56px;text-align:center;position:relative;overflow:hidden;}
.scholr-landing .cta-box::after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.05) 1.4px,transparent 1.4px);background-size:26px 26px;-webkit-mask-image:radial-gradient(75% 75% at 50% 0%,#000,transparent 72%);mask-image:radial-gradient(75% 75% at 50% 0%,#000,transparent 72%);}
.scholr-landing .cta-box>*{position:relative;}
.scholr-landing .cta-box .chip{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16);color:#fff;margin-bottom:26px;}
.scholr-landing .cta-box h2{font-family:var(--font-display);font-weight:500;font-size:clamp(34px,4.6vw,58px);letter-spacing:-.026em;line-height:1.02;margin-bottom:18px;}
.scholr-landing .cta-box h2 .ital{font-style:italic;}
.scholr-landing .cta-box p{font-size:18.5px;color:rgba(255,255,255,.66);max-width:500px;margin:0 auto 34px;}
.scholr-landing .cta-actions{display:flex;gap:13px;justify-content:center;flex-wrap:wrap;}
.scholr-landing .cta-box .btn-primary{background:#fff;color:var(--ink);}
.scholr-landing .cta-box .btn-primary:hover{background:#f0f0ee;}
.scholr-landing .cta-box .btn-ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.25);}
.scholr-landing .cta-box .btn-ghost:hover{border-color:#fff;}
.scholr-landing .cta-note{margin-top:22px;font-size:13.5px;color:rgba(255,255,255,.5);}
.scholr-landing footer.foot{border-top:1px solid var(--line);padding:64px 0 40px;background:var(--bg);}
.scholr-landing .foot-grid{display:grid;grid-template-columns:2.2fr 1fr 1fr;gap:40px;}
.scholr-landing .foot .brand{margin-bottom:18px;}
.scholr-landing .foot .tag{font-size:15px;color:var(--muted);max-width:290px;line-height:1.6;}
.scholr-landing .foot-col h4{font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-2);margin-bottom:16px;}
.scholr-landing .foot-col a{display:block;font-size:15px;color:var(--ink-2);margin-bottom:12px;transition:color .15s;cursor:pointer;}
.scholr-landing .foot-col a:hover{color:var(--accent);}
.scholr-landing .foot-bottom{display:flex;align-items:center;justify-content:space-between;margin-top:52px;padding-top:26px;border-top:1px solid var(--line);font-size:13.5px;color:var(--muted);flex-wrap:wrap;gap:14px;}
.scholr-landing .foot-bottom .social{display:flex;gap:18px;}
.scholr-landing .foot-bottom .social a{color:var(--muted);transition:color .15s;cursor:pointer;}
.scholr-landing .foot-bottom .social a:hover{color:var(--ink);}
.scholr-landing .foot-bottom .social svg{width:19px;height:19px;}
.scholr-landing #demoChat{display:flex;flex-direction:column;gap:16px;flex:1;padding:4px 2px 2px;}
.scholr-landing .d-user{text-align:right;animation:lp-dIn .5s cubic-bezier(.2,.7,.2,1) both;}
.scholr-landing .d-user .d-q{display:inline-block;max-width:78%;font-size:15px;font-weight:600;color:var(--m-ink);line-height:1.4;}
.scholr-landing .d-user .d-time{font-size:12px;color:var(--m-faint);margin-top:4px;}
.scholr-landing .d-ans{display:flex;gap:13px;align-items:flex-start;animation:lp-dIn .5s cubic-bezier(.2,.7,.2,1) both;}
.scholr-landing .d-ans .d-ic{color:var(--m-faint);margin-top:2px;flex:none;}
.scholr-landing .d-bubble p{font-size:15.5px;line-height:1.6;color:var(--m-ink);}
.scholr-landing .d-bubble p b{color:var(--m-ink);font-weight:700;}
.scholr-landing .d-bubble p i{font-style:italic;}
.scholr-landing .d-bubble .from-row{margin-top:14px;flex-wrap:wrap;}
.scholr-landing .d-cite{opacity:0;animation:lp-dCite .45s ease forwards;animation-delay:calc(var(--ci) * .14s + .12s);}
.scholr-landing .d-loading{align-items:center;}
.scholr-landing .d-loadtext{font-size:15.5px;color:var(--m-muted);}
.scholr-landing .load-lines .ln{transform-box:fill-box;transform-origin:left center;animation:lp-lnscan 1.15s ease-in-out infinite;}
.scholr-landing .load-lines .ln2{animation-delay:.16s;}
.scholr-landing .load-lines .ln3{animation-delay:.32s;}
@keyframes lp-lnscan{0%,100%{transform:scaleX(.42);}50%{transform:scaleX(1);}}
@keyframes lp-dIn{from{opacity:0;transform:translateY(9px);}to{opacity:1;transform:none;}}
@keyframes lp-dCite{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:none;}}
.scholr-landing .mq-band{padding:56px 0 8px;}
.scholr-landing .mq-band .lead{text-align:center;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-2);margin-bottom:28px;}
.scholr-landing .marquee{display:flex;flex-direction:column;gap:14px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent);mask-image:linear-gradient(90deg,transparent,#000 7%,#000 93%,transparent);}
.scholr-landing .mq-track{display:flex;gap:14px;width:max-content;animation:lp-mq 42s linear infinite;}
.scholr-landing .mq-track.rev{animation-duration:52s;animation-direction:reverse;}
.scholr-landing .mq-band:hover .mq-track{animation-play-state:paused;}
@keyframes lp-mq{from{transform:translateX(0);}to{transform:translateX(-50%);}}
.scholr-landing .q-chip{display:inline-flex;align-items:center;gap:10px;padding:11px 19px;border:1px solid var(--line);border-radius:var(--radius-pill);background:var(--surface);font-size:15px;font-weight:500;color:var(--ink-2);white-space:nowrap;box-shadow:var(--shadow-sm);}
.scholr-landing .q-chip .qm{color:var(--muted-2);display:inline-flex;flex:none;}
.scholr-landing .q-chip .qm svg{width:15px;height:15px;}
.scholr-landing .manifesto{background:var(--ink);color:#fff;text-align:center;padding:124px 0;position:relative;overflow:hidden;}
.scholr-landing .manifesto::after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.045) 1.4px,transparent 1.4px);background-size:26px 26px;-webkit-mask-image:radial-gradient(70% 80% at 50% 40%,#000,transparent 72%);mask-image:radial-gradient(70% 80% at 50% 40%,#000,transparent 72%);}
.scholr-landing .manifesto>.wrap{position:relative;}
.scholr-landing .manifesto .eyebrow{color:rgba(255,255,255,.55);justify-content:center;margin-bottom:22px;}
.scholr-landing .manifesto h2{font-family:var(--font-display);font-weight:500;font-size:clamp(34px,5.2vw,66px);line-height:1.04;letter-spacing:-.028em;max-width:940px;margin:0 auto;}
.scholr-landing .manifesto h2 .ital{font-style:italic;}
.scholr-landing .manifesto h2 .hl{position:relative;white-space:nowrap;}
.scholr-landing .manifesto h2 .hl::after{content:"";position:absolute;left:0;right:0;bottom:-.04em;height:2.5px;background:rgba(255,255,255,.55);border-radius:2px;transform:scaleX(0);transform-origin:left;transition:transform .9s cubic-bezier(.2,.7,.2,1) .3s;}
.scholr-landing .manifesto.in h2 .hl::after{transform:scaleX(1);}
.scholr-landing .manifesto p{color:rgba(255,255,255,.6);font-size:18.5px;max-width:580px;margin:26px auto 0;line-height:1.55;}
.scholr-landing .src-row{display:flex;gap:11px;justify-content:center;flex-wrap:wrap;margin-top:38px;}
.scholr-landing .src-dark{display:inline-flex;align-items:center;gap:9px;padding:9px 16px;border-radius:var(--radius-pill);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);font-size:14px;font-weight:600;color:#fff;}
.scholr-landing .src-dark .d{width:7px;height:7px;border-radius:999px;background:currentColor;opacity:.7;flex:none;}
.scholr-landing .reveal{opacity:0;transform:translateY(24px);transition:opacity .75s cubic-bezier(.2,.7,.2,1),transform .75s cubic-bezier(.2,.7,.2,1);}
.scholr-landing .reveal.in{opacity:1;transform:none;}
.scholr-landing .stagger>*{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1);}
.scholr-landing .stagger.in>*{opacity:1;transform:none;}
.scholr-landing .win-rise{opacity:0;transform:translateY(40px) scale(.975);transition:opacity .9s cubic-bezier(.2,.7,.2,1),transform 1.05s cubic-bezier(.2,.7,.2,1);will-change:transform;}
.scholr-landing .win-rise.in{opacity:1;transform:none;}
@media (prefers-reduced-motion:reduce){.scholr-landing .reveal,.scholr-landing .stagger>*,.scholr-landing .win-rise{transition:none !important;opacity:1 !important;transform:none !important;}}
@media (max-width:940px){
.scholr-landing .nav-links{display:none;}
.scholr-landing .analytics-grid{grid-template-columns:1fr;gap:40px;}
.scholr-landing .bento{grid-template-columns:repeat(2,1fr);}
.scholr-landing .feat.span-3,.scholr-landing .feat.span-2{grid-column:span 1;}
.scholr-landing .app{grid-template-columns:1fr;}
.scholr-landing .app-side{flex-direction:row;align-items:center;flex-wrap:wrap;gap:12px;}
.scholr-landing .app-side .chat-list,.scholr-landing .app-side .side-label,.scholr-landing .app-side .side-foot{display:none;}
}
@media (max-width:680px){
.scholr-landing{font-size:16px;}
.scholr-landing section.band{padding:76px 0;}
.scholr-landing .steps{grid-template-columns:1fr;}
.scholr-landing .step{border-right:none;border-bottom:1px solid var(--line);}
.scholr-landing .step:last-child{border-bottom:none;}
.scholr-landing .bento{grid-template-columns:1fr;}
.scholr-landing .split{grid-template-columns:1fr;}
.scholr-landing .foot-grid{grid-template-columns:1fr 1fr;gap:30px;}
.scholr-landing .cta-box{padding:52px 26px;}
.scholr-landing .stat-row{gap:24px;flex-wrap:wrap;}
}
.scholr-landing .cta-box::after,.scholr-landing .manifesto::after{pointer-events:none;}
.scholr-landing .hero-sub button{background:none;border:none;cursor:pointer;color:var(--ink);font-weight:700;font-family:var(--font-body);font-size:16px;margin-left:6px;padding:0;display:inline-flex;align-items:center;gap:5px;vertical-align:baseline;}
.scholr-landing .hero-sub button svg{width:15px;height:15px;transition:transform .2s ease;}
.scholr-landing .hero-sub button:hover svg{transform:translateX(3px);}
.scholr-landing .lp-modal{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(21,22,27,.5);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);animation:lp-fade .2s ease;}
@keyframes lp-fade{from{opacity:0;}to{opacity:1;}}
.scholr-landing .lp-modal-card{position:relative;width:100%;max-width:440px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:34px 32px;box-shadow:var(--shadow-float);max-height:90vh;overflow-y:auto;}
.scholr-landing .lp-modal-x{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:999px;border:none;background:var(--bg-2);color:var(--muted);display:grid;place-items:center;cursor:pointer;transition:background .15s,color .15s;}
.scholr-landing .lp-modal-x:hover{background:var(--bg-3);color:var(--ink);}
.scholr-landing .lp-modal-card .kicker{display:inline-flex;align-items:center;gap:9px;font-size:12.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-2);margin-bottom:14px;}
.scholr-landing .lp-modal-card .kicker .d{width:22px;height:1.5px;border-radius:2px;background:currentColor;opacity:.55;}
.scholr-landing .lp-modal-card h3{font-family:var(--font-display);font-weight:500;font-size:26px;letter-spacing:-.02em;margin-bottom:8px;}
.scholr-landing .lp-modal-card form p,.scholr-landing .lp-modal-done p{font-size:15px;color:var(--muted);line-height:1.55;margin-bottom:22px;}
.scholr-landing .lp-field{margin-bottom:14px;display:flex;flex-direction:column;gap:6px;}
.scholr-landing .lp-field label{font-size:13px;font-weight:600;color:var(--ink-2);}
.scholr-landing .lp-field input,.scholr-landing .lp-field textarea{font-family:var(--font-body);font-size:15px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:11px 13px;outline:none;transition:border-color .15s;width:100%;resize:vertical;}
.scholr-landing .lp-field input:focus,.scholr-landing .lp-field textarea:focus{border-color:var(--ink);}
.scholr-landing .lp-field input::placeholder,.scholr-landing .lp-field textarea::placeholder{color:var(--muted-2);}
.scholr-landing .lp-modal-card form>.btn{margin-top:6px;}
.scholr-landing .lp-modal-done{text-align:center;padding:8px 0;}
.scholr-landing .lp-done-ic{width:56px;height:56px;border-radius:999px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;margin:0 auto 18px;}
.scholr-landing .lp-modal-done .btn{margin-top:8px;}
.scholr-landing .lp-code{width:100%;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:20px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;text-align:center;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:13px;padding:15px 14px;outline:none;margin-bottom:12px;transition:border-color .15s;}
.scholr-landing .lp-code:focus{border-color:var(--ink);}
.scholr-landing .lp-code::placeholder{color:var(--muted-2);letter-spacing:.12em;}
.scholr-landing .lp-join-alt{display:block;width:100%;text-align:center;margin-top:16px;background:none;border:none;font-family:var(--font-body);font-size:14px;color:var(--muted);cursor:pointer;}
.scholr-landing .lp-join-alt:hover{color:var(--ink);}
`;

function LandingPage({ onStudent, onInstructor, onSignIn, onJoinCode }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const [demo, setDemo] = useState({ idx: 0, phase: 'user' });
  const [talkOpen, setTalkOpen] = useState(false);
  const [talkSent, setTalkSent] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const closeTalk = () => { setTalkOpen(false); setTalkSent(false); };
  const submitJoin = (e) => { e.preventDefault(); const c = joinCode.trim(); if (!c) return; if (onJoinCode) onJoinCode(c); else onStudent(); };

  // Scroll-reveal, nav shadow, and the dashboard bar fills — scoped to this page.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (e.target.classList.contains('stagger')) {
          Array.prototype.forEach.call(e.target.children, (ch, i) => { ch.style.transitionDelay = (i * 75) + 'ms'; });
        }
        e.target.classList.add('in');
        e.target.querySelectorAll('.confuse .bar i').forEach((bar) => {
          const w = bar.dataset.w;
          if (w) requestAnimationFrame(() => { bar.style.width = w; });
        });
        io.unobserve(e.target);
      });
    }, { threshold: 0.14 });
    root.querySelectorAll('.reveal, .stagger, .win-rise').forEach((el) => io.observe(el));
    const onScroll = () => setNavScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, []);

  // Animated product demo: user → thinking → cited answer, then cycle.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDemo({ idx: 0, phase: 'answer' });
      return;
    }
    const t = [];
    t.push(setTimeout(() => setDemo((d) => ({ ...d, phase: 'thinking' })), 850));
    t.push(setTimeout(() => setDemo((d) => ({ ...d, phase: 'answer' })), 2100));
    t.push(setTimeout(() => setDemo((d) => ({ idx: (d.idx + 1) % LANDING_CONVOS.length, phase: 'user' })), 6700));
    return () => t.forEach(clearTimeout);
  }, [demo.idx]);

  const cur = LANDING_CONVOS[demo.idx];
  const goHome = (e) => { if (e) e.preventDefault(); navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="scholr-landing" ref={rootRef}>
      <style>{LANDING_CSS}</style>

      <header className={`nav${navScrolled ? ' scrolled' : ''}`}>
        <div className="wrap nav-inner">
          <a className="brand" href="#top" onClick={goHome}><LandingLogo s={36} />Scholr</a>
          <nav className="nav-links">
            <a href="#how">How it works</a>
            <a href="#professors">For professors</a>
            <a href="#students">For students</a>
            <a href="#features">Features</a>
          </nav>
          <div className="nav-right">
            <button type="button" className="btn btn-ghost btn-pill" onClick={onSignIn}>Sign in</button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <div className="wrap stagger">
            <span className="chip"><span className="dot live" /> Course-grounded AI tutoring</span>
            <h1>Every answer from<span className="l2">your course materials.</span></h1>
            <p className="lede">AI tutoring grounded in what your professor uploaded. Cited, accurate, and trustworthy.</p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={onInstructor}>Start a course free <span className="arr"><Ic name="arrow-right" s={17} /></span></button>
            </div>
            <p className="hero-sub">Joining a class? <button type="button" onClick={() => setJoinOpen(true)}>Enter your join code <Ic name="arrow-right" s={15} /></button></p>
          </div>
        </section>

        {/* PRODUCT MOCK */}
        <section className="showband">
          <div className="wrap">
            <div className="window win-rise">
              <div className="win-bar">
                <div className="win-lights"><i /><i /><i /></div>
                <div className="win-url">scholr.study/student</div>
              </div>
              <div className="app">
                <aside className="app-side">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '17px', letterSpacing: '-.01em' }}>Accounting</div>
                    <div style={{ fontSize: '12.5px', color: 'var(--m-faint)', marginTop: '2px' }}>6 docs · 41 notes</div>
                  </div>
                  <div className="chat-list" style={{ gap: '2px' }}>
                    <div className="chat-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--m-ink)' }}><Ic name="plus" s={16} /> New chat</div>
                    <div className="chat-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--m-ink)' }}><Ic name="folder" s={16} /> My Notes</div>
                  </div>
                  <div>
                    <div className="side-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}><Ic name="chevron-down" s={13} /> Recents</div>
                    <div className="chat-list">
                      {LANDING_RECENTS.map((label) => (
                        <div key={label} className={`chat-item${label === cur.chat ? ' active' : ''}`}>{label}</div>
                      ))}
                    </div>
                  </div>
                  <div className="side-foot"><Ic name="log-out" s={16} /> Back to courses</div>
                </aside>
                <section className="app-main">
                  <div className="main-head">
                    <div>
                      <div className="t">{cur.chat}</div>
                      <div style={{ fontSize: '13px', color: 'var(--m-faint)', marginTop: '1px' }}>Accounting · BUS-A 306</div>
                    </div>
                    <span className="brand" style={{ fontSize: '17px', gap: '8px' }}><LandingLogo s={26} />Scholr</span>
                  </div>
                  <div className="main-body">
                    <div id="demoChat" key={demo.idx}>
                      <div className="d-user"><div className="d-q">{cur.q}</div><div className="d-time">{cur.time}</div></div>
                      {demo.phase === 'thinking' && (
                        <div className="d-ans d-loading"><span className="d-ic"><LoadLines s={22} /></span><div className="d-loadtext">Checking your course materials…</div></div>
                      )}
                      {demo.phase === 'answer' && (
                        <div className="d-ans">
                          <span className="d-ic"><AnsLines s={22} /></span>
                          <div className="d-bubble">
                            <p dangerouslySetInnerHTML={{ __html: cur.answer }} />
                            <div className="from-row">
                              <span className="lbl">FROM</span>
                              {cur.cites.map((c, i) => (
                                <span key={i} className="src-chip d-cite" style={{ '--ci': i }}><Ic name="file-text" s={14} /> {c}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="main-input" style={{ borderRadius: '16px', padding: '14px 14px 14px 18px', flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                    <span style={{ fontSize: '15px' }}>Ask about your course…</span>
                    <span style={{ width: '30px', height: '30px', borderRadius: '999px', background: 'var(--m-hover)', color: 'var(--m-muted)', display: 'grid', placeItems: 'center' }}><Ic name="plus" s={17} /></span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '12.5px', color: 'var(--m-faint)', padding: '0 0 16px' }}>Grounded in your course materials · Vertex AI</div>
                </section>
              </div>
            </div>
          </div>
        </section>

        {/* QUESTION MARQUEE */}
        <section className="mq-band reveal">
          <p className="lead">Real questions students ask Scholr</p>
          <div className="marquee">
            <div className="mq-track">
              {[...LANDING_MQ_1, ...LANDING_MQ_1].map((q, i) => (
                <span key={i} className="q-chip"><span className="qm"><Ic name="message-square" s={15} /></span> {q}</span>
              ))}
            </div>
            <div className="mq-track rev">
              {[...LANDING_MQ_2, ...LANDING_MQ_2].map((q, i) => (
                <span key={i} className="q-chip"><span className="qm"><Ic name="message-square" s={15} /></span> {q}</span>
              ))}
            </div>
          </div>
        </section>

        {/* WHY SCHOLR */}
        <section className="band" id="why">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow"><span className="dot" /> Why Scholr</span>
              <h2>Answers you can <span className="ital">actually trust.</span></h2>
              <p>Scholr is built on a single rule: never say anything it can't trace back to your course. That's what makes it safe to lean on the night before an exam.</p>
            </div>
            <div className="principles stagger">
              {[
                { n: '01', t: 'Grounded in your course', d: 'Every response is drawn only from the materials your professor uploaded — the syllabus, slides, readings, and notes. Nothing from the open web.' },
                { n: '02', t: 'Cited to the page', d: 'Each answer points to the exact slide, page, or reading it came from — so a student can verify it in one click, and a professor can stand behind it.' },
                { n: '03', t: 'Honest about limits', d: "If something isn't covered in the course, Scholr says so plainly instead of inventing an answer. No confident guesses, no hallucinations." },
                { n: '04', t: 'Fluent in your class', d: 'It knows the deadlines, the grading rules, and the way your professor frames each topic — so the help actually fits the course you’re in.' },
              ].map((p) => (
                <div className="principle" key={p.n}>
                  <div className="idx"><b>{p.n}</b><span className="ln" /></div>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="band" id="how" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow"><span className="dot" /> How it works</span>
              <h2>Set up once. <span className="ital">Tutoring all term.</span></h2>
              <p>A professor uploads their course once. Every student gets a tutor that knows it inside out.</p>
            </div>
            <div className="steps stagger">
              {[
                { n: '01', ic: 'upload', t: 'Upload the course', d: 'Drop in the syllabus, slides, readings, and notes. Scholr indexes every page in minutes.' },
                { n: '02', ic: 'message-square', t: 'Students ask anything', d: 'From "what’s on the midterm?" to deep concept questions — at 11pm, the night before.' },
                { n: '03', ic: 'scan-text', t: 'Every answer is cited', d: 'Responses point straight to the source page or slide. No guessing, no hallucinations.' },
              ].map((s) => (
                <div className="step" key={s.n}>
                  <div className="num"><b>{s.n}</b></div>
                  <div className="ic-box"><Ic name={s.ic} s={23} /></div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES (bento) */}
        <section className="band" id="features">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow"><span className="dot" /> Features</span>
              <h2>A senior TA, <span className="ital">on every page.</span></h2>
              <p>Everything a student wishes they could ask — and everything a professor wishes they could see.</p>
            </div>
            <div className="bento stagger">
              <div className="feat span-3 dark">
                <div className="ic-box"><Ic name="scan-text" s={23} /></div>
                <h3>Cited answers, every time</h3>
                <p>Each response links back to the exact page, slide, or reading it came from — so students learn to trust it, and check it.</p>
                <div className="mini-cites">
                  <span><span className="d" /> Lecture 7 · slide 12</span>
                  <span><span className="d" /> Reading 4.2 · p. 88</span>
                  <span><span className="d" /> Syllabus · §3</span>
                </div>
              </div>
              <div className="feat span-3">
                <div className="ic-box"><Ic name="shield-check" s={23} /></div>
                <h3>Zero hallucinations</h3>
                <p>If it isn't in the course materials, Scholr says so — instead of inventing an answer. Trust is the whole point.</p>
              </div>
              <div className="feat span-2">
                <div className="ic-box"><Ic name="sparkles" s={23} /></div>
                <h3>Quizzes from real material</h3>
                <p>Practice questions generated from your professor's actual slides — not random sets.</p>
              </div>
              <div className="feat span-2">
                <div className="ic-box"><Ic name="bar-chart" s={23} /></div>
                <h3>Confusion analytics</h3>
                <p>Professors see what students keep asking — before the next lecture.</p>
              </div>
              <div className="feat span-2">
                <div className="ic-box"><Ic name="clock" s={23} /></div>
                <h3>Available at midnight</h3>
                <p>The 24/7 office hours every class wishes it had. No question too small.</p>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST MANIFESTO */}
        <section className="manifesto reveal">
          <div className="wrap">
            <span className="eyebrow"><span className="dot" /> Trust, by design</span>
            <h2>If it isn't in your course, Scholr <span className="ital">won't say it</span> — every claim <span className="hl">traces to a page</span>.</h2>
            <p>No open-web guessing. No invented citations. Each answer links straight back to the material your professor uploaded.</p>
            <div className="src-row stagger">
              <span className="src-dark"><span className="d" /> Lecture 6 · slide 14</span>
              <span className="src-dark"><span className="d" /> Syllabus · §2</span>
              <span className="src-dark"><span className="d" /> Reading · p. 132</span>
            </div>
          </div>
        </section>

        {/* AUDIENCE SPLIT */}
        <section className="band" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          <div className="wrap">
            <div className="split">
              <div className="aud prof reveal" id="professors">
                <div className="kicker"><span className="d" /> For professors</div>
                <h3>Stop answering the same<br /><span className="ital">question fifty times.</span></h3>
                <p>Upload your course once. Scholr handles the repetitive questions and shows you exactly where your students are stuck.</p>
                <ul>
                  <li><span className="tick"><Ic name="check" s={13} /></span> Answers stay inside your materials — your voice, your rules</li>
                  <li><span className="tick"><Ic name="check" s={13} /></span> Live analytics on what's confusing the class</li>
                  <li><span className="tick"><Ic name="check" s={13} /></span> Set up in an afternoon, no IT required</li>
                </ul>
                <div className="aud-cta"><button type="button" className="btn btn-ghost btn-pill" onClick={onInstructor}>Bring Scholr to your course <Ic name="arrow-right" s={16} /></button></div>
              </div>
              <div className="aud stud reveal" id="students">
                <div className="kicker"><span className="d" /> For students</div>
                <h3>The tutor who actually<br /><span className="ital">read the syllabus.</span></h3>
                <p>Ask anything about your class and get a straight, cited answer — without feeling dumb for asking, and without waiting for office hours.</p>
                <ul>
                  <li><span className="tick"><Ic name="check" s={13} /></span> Answers grounded in your real course, not the internet</li>
                  <li><span className="tick"><Ic name="check" s={13} /></span> Practice quizzes from your actual material</li>
                  <li><span className="tick"><Ic name="check" s={13} /></span> Available the night before the exam</li>
                </ul>
                <div className="aud-cta"><button type="button" className="btn btn-primary btn-pill" onClick={() => setJoinOpen(true)}>Enter your join code <Ic name="arrow-right" s={16} /></button></div>
              </div>
            </div>
          </div>
        </section>

        {/* ANALYTICS */}
        <section className="band">
          <div className="wrap">
            <div className="analytics-grid">
              <div className="reveal">
                <span className="eyebrow"><span className="dot" /> Professor analytics</span>
                <h2 className="serif" style={{ fontSize: 'clamp(30px,3.6vw,44px)', lineHeight: 1.06, margin: '18px 0 16px' }}>Know what's confusing <span className="ital">before</span> the next lecture.</h2>
                <p style={{ fontSize: '18px', color: 'var(--muted)', lineHeight: 1.55 }}>Scholr turns thousands of student questions into a clear signal: the concepts your class keeps getting stuck on, ranked. Walk into lecture already knowing what to reteach.</p>
                <div className="stat-row">
                  <div className="stat"><div className="n">100<span style={{ fontSize: '24px' }}>%</span></div><div className="l">of answers cited<br />to a source</div></div>
                  <div className="stat"><div className="n">0</div><div className="l">answers from<br />the open web</div></div>
                  <div className="stat"><div className="n">24<span className="ital">/</span>7</div><div className="l">across the<br />whole term</div></div>
                </div>
              </div>
              <div className="dash reveal">
                <div className="dash-top">
                  <div className="t">Most-asked · BUS-A 306</div>
                  <div className="wk">This week</div>
                </div>
                <div className="dash-body">
                  <div className="lead">Top points of confusion</div>
                  <div className="confuse">
                    {[
                      { t: 'Contribution margin', n: '38 asks', w: '100%' },
                      { t: 'Cost-volume-profit analysis', n: '29 asks', w: '76%' },
                      { t: 'Overhead allocation', n: '21 asks', w: '55%' },
                      { t: 'Break-even point', n: '14 asks', w: '37%' },
                    ].map((r) => (
                      <div className="row" key={r.t}>
                        <div className="top"><b>{r.t}</b><span>{r.n}</span></div>
                        <div className="bar"><i data-w={r.w} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="dash-foot"><Ic name="sparkles" s={16} /> Suggested: revisit contribution margin in Lecture 8.</div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="cta-band">
          <div className="wrap reveal">
            <div className="cta-box">
              <span className="chip"><span className="dot live" /> Course-grounded AI tutoring</span>
              <h2>Give your class an AI tutor<br /><span className="ital">that actually knows it.</span></h2>
              <p>Set up your course in an afternoon. Every answer cited, straight from your materials.</p>
              <div className="cta-actions">
                <button type="button" className="btn btn-primary btn-lg" onClick={onInstructor}>Start a course free <span className="arr"><Ic name="arrow-right" s={17} /></span></button>
                <button type="button" className="btn btn-ghost btn-lg" onClick={() => setTalkOpen(true)}>Talk to our team</button>
              </div>
              <p className="cta-note">Free to start · No credit card · Set up in minutes</p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="foot">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <a className="brand" href="#top" onClick={goHome}><LandingLogo s={34} />Scholr</a>
              <p className="tag">An AI tutor built from your professor's exact course materials. Cited, accurate, and grounded in your class.</p>
            </div>
            <div className="foot-col">
              <h4>Explore</h4>
              <a href="#how">How it works</a>
              <a href="#features">Features</a>
              <a href="#professors">For professors</a>
              <a href="#students">For students</a>
            </div>
            <div className="foot-col">
              <h4>Legal</h4>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>Privacy</a>
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/terms'); }}>Terms</a>
            </div>
          </div>
          <div className="foot-bottom">
            <div>© 2026 Scholr, Inc. · Grounded in your course materials.</div>
            <div className="social">
              <a href="#" aria-label="X" onClick={(e) => e.preventDefault()}><Ic name="x-logo" s={19} /></a>
              <a href="#" aria-label="LinkedIn" onClick={(e) => e.preventDefault()}><Ic name="linkedin" s={19} /></a>
              <a href="#" aria-label="GitHub" onClick={(e) => e.preventDefault()}><Ic name="github" s={19} /></a>
            </div>
          </div>
        </div>
      </footer>

      {/* Talk-to-our-team contact form (demo only — does not submit anywhere) */}
      {talkOpen && (
        <div className="lp-modal" onClick={closeTalk}>
          <div className="lp-modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lp-modal-x" aria-label="Close" onClick={closeTalk}><Ic name="x-logo" s={15} /></button>
            {talkSent ? (
              <div className="lp-modal-done">
                <div className="lp-done-ic"><Ic name="check" s={26} /></div>
                <h3>Thanks — we'll be in touch.</h3>
                <p>A member of the Scholr team will reach out shortly.</p>
                <button type="button" className="btn btn-primary btn-pill" onClick={closeTalk}>Done</button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setTalkSent(true); }}>
                <div className="kicker"><span className="d" /> Talk to our team</div>
                <h3>Bring Scholr to your course</h3>
                <p>Tell us about your class and we'll show you how Scholr fits.</p>
                <div className="lp-field"><label>Name</label><input type="text" required placeholder="Dr. Jane Smith" /></div>
                <div className="lp-field"><label>Work email</label><input type="email" required placeholder="jsmith@university.edu" /></div>
                <div className="lp-field"><label>Institution</label><input type="text" placeholder="State University" /></div>
                <div className="lp-field"><label>What would you like to know?</label><textarea rows={3} placeholder="I teach intro accounting to ~200 students…" /></div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>Send message</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Join-code capture — collects the code BEFORE sending to student login */}
      {joinOpen && (
        <div className="lp-modal" onClick={() => setJoinOpen(false)}>
          <div className="lp-modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lp-modal-x" aria-label="Close" onClick={() => setJoinOpen(false)}><Ic name="x-logo" s={15} /></button>
            <div className="kicker"><span className="d" /> Join a class</div>
            <h3>Enter your join code</h3>
            <p>Your professor shared a code like <b>A306-UCB2</b>. Enter it and we'll take you straight into your class after you sign in.</p>
            <form onSubmit={submitJoin}>
              <input className="lp-code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="A306-UCB2" autoFocus maxLength={24} aria-label="Join code" />
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={!joinCode.trim()}>Continue <Ic name="arrow-right" s={16} /></button>
            </form>
            <button type="button" className="lp-join-alt" onClick={() => { setJoinOpen(false); onStudent(); }}>I already have an account — just sign in</button>
          </div>
        </div>
      )}
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
    <div className="scholr-auth invite">
      <style>{AUTH_CSS}</style>
      <div className="invite-wrap">
        <button type="button" className="auth-brand invite-brand" onClick={() => navigate('/')} aria-label="Scholr home"><LandingLogo s={32} />Scholr</button>
        {error ? (
          <div className="invite-card invite-err">
            <h1>Course not found</h1>
            <p>This course may no longer be available. Contact your professor for a new link.</p>
            <button type="button" className="invite-btn" onClick={() => navigate('/')}>Back to Scholr</button>
          </div>
        ) : (
          <>
            <div className="invite-card">
              <div className="invite-ic"><BookOpen size={20} /></div>
              <p className="invite-eyebrow">You've been invited to join</p>
              <h1 className="invite-course">{course?.name}</h1>
              <div className="invite-code">{code}</div>
              <button type="button" className="invite-btn" onClick={handleJoinNow} disabled={joining}>
                {joining ? 'Joining…' : studentToken ? <>Join class now <Ic name="arrow-right" s={16} /></> : <>Sign up to join class <Ic name="arrow-right" s={16} /></>}
              </button>
              {!studentToken && (
                <button type="button" className="invite-alt" onClick={() => { sessionStorage.setItem('scholr_pending_join', code); navigate('/student/login'); }}>
                  Already have an account? <b>Sign in</b>
                </button>
              )}
            </div>
            <div className="theme-foot"><Lock size={12} /> FERPA aligned <span className="sep" /> Powered by Google Vertex AI</div>
          </>
        )}
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
  // Landing "Enter your join code": capture the code BEFORE login so the student
  // is auto-enrolled right after signing in (StudentDashboard reads this on mount).
  const handleJoinCodeEntry = (code) => { const c = (code || '').trim().toUpperCase(); if (!c) return; sessionStorage.setItem('scholr_pending_join', c); setPendingJoinCode(c); setScreen('student-login'); navigate('/student/login'); };
  const handleStudentLogout = () => { localStorage.removeItem('scholr_student_token'); localStorage.removeItem('scholr_student_user'); setStudentToken(null); setStudentUser(null); setScreen('landing'); };
  const handleEnterCourse = (course, docs, questions) => { setStudentCourse(course); setStudentDocs(docs); setStudentQuestions(questions); setScreen('student-chat'); };

  const renderScreen = () => {
    switch (screen) {
      case 'landing': return <LandingPage onStudent={() => setScreen('student-login')} onInstructor={() => setScreen('prof-signup')} onSignIn={() => setScreen('smart-signin')} onJoinCode={handleJoinCodeEntry} />;
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
            : <LandingPage onStudent={() => navigate('/student/login')} onInstructor={() => setScreen('prof-signup')} onSignIn={() => setScreen('smart-signin')} onJoinCode={handleJoinCodeEntry} />
        } />
        <Route path="/*" element={renderScreen()} />
      </Routes>
      <ToastBanner message={globalToast?.message} type={globalToast?.type} onClose={() => setGlobalToast(null)} />
    </>
  );
}
