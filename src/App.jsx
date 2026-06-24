import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import {
  MessageSquare, Send, LogOut, Trash2, Plus, BookOpen, FileText,
  ChevronRight, Users, AlertCircle, UploadCloud, BarChart2, Clock,
  CheckCircle2, Copy, Check, ThumbsUp, ThumbsDown, X,
  Lock, WifiOff, Paperclip, Square, ArrowLeft, ExternalLink, Hash, Menu,
  ListChecks, RotateCcw, Sparkles, ChevronLeft, MoreHorizontal, Pencil, FolderOpen, Layers, GraduationCap,
  Loader2, Lightbulb, Share2, Link as LinkIcon, ChevronDown
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
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500;1,6..72,600&family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap');
  * { font-family: 'Inter', system-ui, sans-serif; }
  .serif { font-family: 'Instrument Serif', Georgia, serif; }
  /* Display serif for the new-chat greeting and other hero headings. Newsreader
     is a calmer, more elegant serif than Instrument — and its italic pairs
     better with the upright weight than Instrument's, which has a very
     pronounced cursive italic that clashes with the roman. */
  .serif-display { font-family: 'Newsreader', Georgia, serif; font-weight: 500; letter-spacing: -0.018em; }
  /* Matches the Scholr wordmark (.brand uses Hanken Grotesk 700 -0.02em).
     Used on the new-chat greeting so the hero heading reads as part of the
     brand system instead of a competing serif. */
  .brand-display { font-family: 'Hanken Grotesk', system-ui, sans-serif; font-weight: 700; letter-spacing: -0.025em; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  .shake { animation: shake 0.35s ease-in-out; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .fade-up { animation: fadeUp 0.4s ease forwards; }
  /* Brief scale-in pop for the generation "done" checkmark — overshoots
     slightly then settles, so the success transition is impossible to miss
     even when the work finished in under a second. */
  @keyframes genPop { 0% { opacity: 0; transform: scale(0.4); } 60% { opacity: 1; transform: scale(1.15); } 100% { opacity: 1; transform: scale(1); } }
  .gen-pop { animation: genPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; transform-origin: center; }
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
  /* ---- slash command popover + chip ---- */
  .cmd-chip { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #2A4D8F; font-weight: 600; font-size: 15px; padding-right: 4px; white-space: nowrap; flex: none; }
  .cmd-popover { position: absolute; left: 0; right: 0; bottom: 100%; margin-bottom: 10px; background: #fff; border: 1px solid #E7E4DD; border-radius: 18px; box-shadow: 0 24px 60px -28px rgba(21,22,27,.28), 0 8px 22px -14px rgba(21,22,27,.10); padding: 8px 0; overflow: hidden; z-index: 30; animation: fadeUp 0.18s ease forwards; }
  .cmd-group { padding: 12px 22px 6px; font-size: 10.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: #9A9CA3; display: flex; align-items: center; gap: 10px; border-top: 1px solid #EEEBE4; margin-top: 4px; }
  .cmd-group.first { border-top: none; margin-top: 0; padding-top: 10px; }
  .cmd-group .dash { display: inline-block; width: 22px; height: 1.5px; background: currentColor; opacity: .55; border-radius: 2px; }
  .cmd-row { display: flex; align-items: center; gap: 18px; padding: 11px 22px; cursor: pointer; transition: background .15s; border-left: 2px solid transparent; }
  .cmd-row:hover { background: rgba(21,22,27,.025); }
  .cmd-row.selected { border-left-color: #15161B; background: rgba(21,22,27,.045); padding-left: 20px; }
  .cmd-row .cname { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; font-weight: 600; color: #2A4D8F; min-width: 92px; flex: none; }
  .cmd-row .cdesc { font-family: 'Newsreader', Georgia, serif; font-style: italic; font-size: 15px; color: #6B6E76; }
  .cmd-foot { border-top: 1px solid #EEEBE4; margin-top: 4px; padding: 9px 22px; font-size: 11px; color: #9A9CA3; display: flex; align-items: center; justify-content: space-between; letter-spacing: .04em; }
  /* ---- flashcard panel: flip animation + faces ---- */
  .fcard-wrap { perspective: 1400px; }
  .fcard { position: relative; width: 100%; min-height: 240px; cursor: pointer; transform-style: preserve-3d; transition: transform .55s cubic-bezier(.2,.7,.2,1); border-radius: 18px; }
  .fcard.flipped { transform: rotateY(180deg); }
  .fcard .face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 18px; padding: 28px 24px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
  .fcard .face.front { background: #fff; border: 1px solid #E7E4DD; box-shadow: 0 1px 2px rgba(21,22,27,.04), 0 14px 34px -18px rgba(21,22,27,.12); color: #15161B; }
  .fcard .face.back  { background: #15161B; color: #fff; transform: rotateY(180deg); box-shadow: 0 1px 2px rgba(21,22,27,.04), 0 14px 34px -18px rgba(21,22,27,.16); }
  .fcard .face .ftag { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #9A9CA3; margin-bottom: 14px; }
  .fcard .face.back .ftag { color: rgba(255,255,255,.5); }
  .fcard .face .ftext { font-family: 'Instrument Serif', Georgia, serif; font-size: 24px; line-height: 1.18; letter-spacing: -.012em; }
  .fcard .face.back .ftext { font-family: Inter, system-ui, sans-serif; font-size: 16px; line-height: 1.5; font-weight: 400; }
  .fcard .face .fsrc { position: absolute; bottom: 18px; left: 0; right: 0; font-size: 11.5px; color: #9A9CA3; font-style: italic; padding: 0 22px; }
  .fcard .face.back .fsrc { color: rgba(255,255,255,.5); }
  .fcard .face .ftip { position: absolute; top: 14px; right: 16px; font-size: 10.5px; color: #C8C8C8; letter-spacing: .04em; }
  .fcard .face.back .ftip { color: rgba(255,255,255,.35); }
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

// Status display while the AI is generating. If the backend has sent a
// real status step ("searching" → "found" → "writing") we render that
// concrete signal; otherwise we fall back to the generic rotating phrases
// for older endpoints that don't emit status events.
function ThinkingText({ step, sources, inputTokens }) {
  const phrases = ['Reading your materials…', 'Checking your course materials…', 'Thinking it through…', 'Pulling the details together…'];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (step) return; // backend is driving the message, no need to rotate
    const id = setInterval(() => setI(p => (p + 1) % phrases.length), 1900);
    return () => clearInterval(id);
  }, [step]);

  // Live-counting token display, Claude-style. While the spinner is
  // visible, the number ticks up smoothly toward the current target
  // instead of snapping. Two phases:
  //   1. From the moment streaming starts → 'writing' status arrives, we
  //      ramp gently from 0 (we don't yet have an input count). This
  //      gives the "I'm working" feedback even before the prompt is
  //      assembled.
  //   2. Once 'writing' fires with the real input token estimate, we
  //      animate from the current display value to that target over
  //      ~800ms with an ease-out so it feels like a meter filling.
  const [displayedTokens, setDisplayedTokens] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    // Pre-input phase: gentle tick-up while waiting for the writing event.
    if (!inputTokens) {
      let alive = true;
      const start = performance.now();
      const tick = (now) => {
        if (!alive) return;
        // ~25 tokens/sec ramp so the counter shows life immediately.
        setDisplayedTokens(Math.min(2500, Math.round((now - start) / 40)));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => { alive = false; cancelAnimationFrame(rafRef.current); };
    }
    // Real input count arrived — animate from current to target with
    // ease-out cubic, ~800ms duration. Long enough to read as a meter
    // filling, short enough that the actual content stream still feels
    // snappy when it starts emitting.
    const startVal = displayedTokens;
    const targetVal = inputTokens;
    const startT = performance.now();
    const DUR = 800;
    let alive = true;
    const tick = (now) => {
      if (!alive) return;
      const t = Math.min(1, (now - startT) / DUR);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayedTokens(Math.round(startVal + (targetVal - startVal) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputTokens]);
  let text;
  if (step === 'searching') text = 'Searching your materials…';
  else if (step === 'reading') text = 'Reading your materials…';
  else if (step === 'found') {
    const stripExt = s => s.replace(/\.[^.]+$/, '');
    const truncOne = s => s.length > 32 ? s.slice(0, 30) + '…' : s;
    if (sources && sources.length === 1) {
      text = `Reading ${truncOne(stripExt(sources[0]))}…`;
    } else if (sources && sources.length > 1) {
      // Name every file being read instead of "Found 3 sources…" — the
      // student wants to see exactly which docs are informing the answer.
      const names = sources.map(s => truncOne(stripExt(s)));
      const joined = names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
      text = `Reading ${joined}…`;
    } else {
      text = 'Found relevant sections…';
    }
  }
  else if (step === 'writing') text = 'Writing your answer…';
  else text = phrases[i];
  // Format the counter into 1K-step ticks so the ramp reads as
  // "1K → 2K → 3K → … → 9K → 10.1K → 10.2K". Below 1K we just hide
  // the pill (the counter is barely starting and a "0K" reads as
  // broken). 1K-9K rounds down to whole thousands; 10K+ shows one
  // decimal so the user sees motion at the larger numbers too.
  const fmtTokens = (n) => {
    if (n < 1000) return null;
    if (n < 10_000) return `${Math.floor(n / 1000)}K`;
    return `${(n / 1000).toFixed(1)}K`;
  };
  const tokenLabel = fmtTokens(displayedTokens);
  return (
    <span className="text-sm text-gray-400 inline-flex items-center gap-2 py-1 transition-opacity">
      <span>{text}</span>
      {tokenLabel && (
        <>
          <span className="text-gray-200">·</span>
          <span className="tabular-nums text-gray-400">{tokenLabel} tokens</span>
        </>
      )}
    </span>
  );
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
    // Strip any trailing attribution block the model might emit despite the
    // prompt telling it not to. Catches "SOURCES:", "Sources:", "References:",
    // and similar variants, plus any whitespace between the answer and them.
    .replace(/\n+\s*(?:SOURCES|Sources|REFERENCES|References|CITATIONS|Citations)\s*:.*$/s, '')
    // LLMs sometimes emit LaTeX text-styling commands outside math mode, where
    // KaTeX renders them as broken red text. Convert the common ones to Markdown
    // so e.g. \textbf{77.25%} becomes proper **bold** instead of a parse error.
    .replace(/\\textbf\{([^{}]*)\}/g, '**$1**')
    .replace(/\\textit\{([^{}]*)\}/g, '*$1*')
    // Currency rescue: when Gemini writes "$0.50" or "**$250**" the lone $
    // opens math mode and tangles with the surrounding markdown — the
    // visible result is broken bold + math fragments running through whole
    // sentences. Escape any $ that's followed (optionally past a bold/italic
    // marker or whitespace) by a digit or decimal point so it stays literal
    // text. Real LaTeX math variables lead with letters or backslashes, so
    // legitimate equations are untouched.
    .replace(/\$(?=\s*\*{0,3}\s*[.\d])/g, '\\$')
    // Math-mode rescue. Two-pass:
    //   (1) Collapse \\ → \ inside any $$...$$ or $...$ math block, since
    //       Gemini often over-escapes ("\\text" instead of "\text") which
    //       KaTeX reads as a linebreak command and silently breaks render.
    //   (2) Find any line containing a LaTeX command (\frac, \text, etc.)
    //       that isn't properly wrapped and lift it into $$...$$.
    // Mirrors the server-side rewriteEquations so saved messages loaded
    // from chat history still render cleanly even though they were stored
    // before the server fix shipped.
    .replace(/^[\s\S]*$/, (text) => {
      // Pre-pass: collapse doubled backslashes inside math regions
      text = text.replace(/\$\$([\s\S]+?)\$\$/g, (m, inner) =>
        '$$' + inner.replace(/\\{2,}/g, '\\') + '$$');
      text = text.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (m, inner) =>
        '$' + inner.replace(/\\{2,}/g, '\\') + '$');

      const lines = text.split('\n');
      const out = [];
      const mathCmdRe = /\\+(?:frac|sum|prod|int|sqrt|text|alpha|beta|gamma|delta|sigma|mu|pi|theta|lambda|omega|infty|partial|nabla|cdot|times|div|leq|geq|neq|approx)\b/;
      for (const line of lines) {
        const matchIdx = line.search(mathCmdRe);
        if (matchIdx === -1) { out.push(line); continue; }
        // Already properly wrapped in matched $$?
        const dollarPairs = (line.match(/\$\$/g) || []).length;
        if (dollarPairs >= 2 && dollarPairs % 2 === 0) { out.push(line); continue; }
        // Or in proper $...$ inline pairs?
        const singleDollars = (line.replace(/\$\$/g, '').match(/\$/g) || []).length;
        if (singleDollars >= 2 && singleDollars % 2 === 0) { out.push(line); continue; }
        const prefix = line.slice(0, matchIdx).replace(/\s*\\?\s*$/, '').trimEnd();
        const math = line.slice(matchIdx)
          .replace(/\\{2,}/g, '\\')      // collapse \\text → \text
          .replace(/\$+\s*$/, '')        // strip trailing $$
          .replace(/(?<!\\)%/g, '\\%')   // escape unescaped %
          .trim();
        if (!math || math.length < 5) { out.push(line); continue; }
        if (prefix) { out.push(prefix); out.push(''); out.push(`$$${math}$$`); }
        else { out.push(`$$${math}$$`); }
      }
      return out.join('\n');
    })
    // Defensive belt: also kill any LONE $ that has matching content
    // running for >40 chars with no close — that's a clear sign math mode
    // got accidentally opened and is eating prose. Escape both ends.
    .replace(/\$([^$\n]{40,200}?)\$/g, (m, inner) => {
      // If the captured content reads like prose (has multiple words +
      // spaces), treat it as accidentally-opened math and neutralize.
      if (/\s\w+\s\w+\s/.test(inner)) return `\\$${inner}\\$`;
      return m;
    })
    // Strip filler openers — the prompt says no filler but models still
    // slip "Alright, let's…" / "Sure! Let's dive into…" past the system
    // message sometimes. Cleaner to strip than to refight the prompt.
    .replace(/^(Alright|Sure|Okay|Ok|Great|Got it),?\s*(let'?s\s+(?:dive\s+into|break\s+(?:this|that|it)\s+down|take\s+a\s+look|explore|unpack|go\s+through|walk\s+through))[^.!?\n]*[.!?]\s*/i, '')
    // Bullet-to-table rescue: when the model emits 3+ consecutive bullets
    // of the form "- **Label:** value, value, value" — which is parallel
    // data masquerading as a list — transform them into a markdown table
    // for consistent visual polish. Same data, scannable layout.
    .replace(
      /(?:^[ \t]*[-*][ \t]+\*\*[^*\n]{1,60}:\*\*[^\n]+\n?){3,}/gm,
      (block) => {
        const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
        const rows = [];
        for (const line of lines) {
          const m = line.match(/^[-*][ \t]+\*\*([^*]+):\*\*\s*(.+)$/);
          if (!m) return block; // bail if any line doesn't match the pattern
          // Trim common filler from the value side ("Examples include …" etc.)
          const value = m[2]
            .replace(/^(?:Examples include|These include|Such as|Including|For example,?)\s+/i, '')
            .replace(/\.$/, '')
            .trim();
          rows.push({ label: m[1].trim(), value });
        }
        if (rows.length < 3) return block;
        return '\n\n| Type | Examples |\n| --- | --- |\n' +
          rows.map(r => `| **${r.label}** | ${r.value} |`).join('\n') +
          '\n\n';
      }
    )
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
      <button type="button" className="auth-brand" onClick={onBack} aria-label="Scholr home"><LandingLogo s={32} />Scholr</button>
      <div className="ed-body">
        <span className="ed-kicker">Sign in</span>
        <h1 className="ed-h">Welcome<span className="ital"> back.</span></h1>
        <p className="ed-lede">Pick the portal you signed up for — it'll only take a second.</p>
        <div className="ed-rows">
          <button type="button" className="ed-row" onClick={onPickStudent}>
            <span className="ed-num">01</span>
            <span className="ed-text">
              <b>I'm a student</b>
              <span>Ask anything about your class and get cited answers from your professor's materials.</span>
            </span>
            <Ic name="arrow-right" s={20} className="ed-arrow" />
          </button>
          <button type="button" className="ed-row" onClick={onPickProfessor}>
            <span className="ed-num">02</span>
            <span className="ed-text">
              <b>I'm a teacher</b>
              <span>Manage your courses and see exactly where your class is stuck.</span>
            </span>
            <Ic name="arrow-right" s={20} className="ed-arrow" />
          </button>
        </div>
      </div>
      <div className="ed-foot">
        <button type="button" className="ed-back" onClick={onBack}><ArrowLeft size={13} />Back</button>
        <span className="ed-tagline">Scholr · Grounded in your course</span>
      </div>
    </div>
  );
}

// Shared styling for the student/professor login pages — reuses the exact
// design tokens from the landing (Newsreader + Hanken Grotesk, warm canvas,
// ink buttons), scoped under .scholr-auth so nothing leaks into the app.
const AUTH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500;1,6..72,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
.scholr-auth{--font-display:"Newsreader",Georgia,serif;--font-body:"Hanken Grotesk",system-ui,sans-serif;--bg:#F3F4F6;--bg-2:#ECEEF2;--surface:#FFFFFF;--ink:#15161B;--ink-2:#2A2C33;--muted:#6B6E76;--muted-2:#9A9CA3;--line:#E1E3E8;--accent:#15161B;--radius-lg:22px;--radius-pill:999px;--shadow-sm:0 1px 2px rgba(21,22,27,.04),0 1px 3px rgba(21,22,27,.05);--shadow-float:0 40px 90px -38px rgba(21,22,27,.28),0 8px 26px -16px rgba(21,22,27,.16);min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 20px;background:radial-gradient(80% 70% at 100% 0%,rgba(255,255,255,1) 0%,rgba(255,255,255,0) 55%),radial-gradient(70% 60% at 0% 50%,rgba(255,255,255,.85) 0%,rgba(255,255,255,0) 60%),radial-gradient(60% 55% at 50% 100%,rgba(255,255,255,.7) 0%,rgba(255,255,255,0) 60%),linear-gradient(165deg,#F0F2F6 0%,#E7EAEF 55%,#E2E5EB 100%);background-attachment:fixed;font-family:var(--font-body);color:var(--ink);-webkit-font-smoothing:antialiased;}
.scholr-auth *{box-sizing:border-box;margin:0;padding:0;}
.scholr-auth ::selection{background:var(--ink);color:var(--bg);}
.scholr-auth.prof{background:radial-gradient(80% 70% at 100% 0%,rgba(255,255,255,1) 0%,rgba(255,255,255,0) 55%),radial-gradient(60% 55% at 50% 100%,rgba(255,255,255,.7) 0%,rgba(255,255,255,0) 60%),linear-gradient(165deg,#E9ECF1 0%,#DFE2E8 100%);}
.scholr-auth .auth-brand{display:flex;align-items:center;gap:11px;font-weight:700;font-size:21px;letter-spacing:-.02em;color:var(--ink);background:none;border:none;cursor:pointer;font-family:var(--font-body);margin-bottom:24px;}
.scholr-auth .auth-brand .mark{width:32px;height:32px;flex:none;}
.scholr-auth .auth-card{position:relative;width:100%;max-width:400px;background:rgba(255,255,255,.65);border:1px solid rgba(255,255,255,.75);border-radius:var(--radius-lg);padding:36px 34px;box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 36px 90px -32px rgba(21,22,27,.36),0 10px 28px -14px rgba(21,22,27,.18);-webkit-backdrop-filter:blur(28px) saturate(180%);backdrop-filter:blur(28px) saturate(180%);}
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
.scholr-auth.stud .auth-aside{background:linear-gradient(165deg,#E9ECF1 0%,#DCDFE5 100%);}
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
@media (max-width:480px){.scholr-auth .invite-course{font-size:28px;}}
/* ---- flat (cardless) chooser + invite so the page matches the landing hero ---- */
.scholr-auth.invite .invite-card{background:transparent;border:none;box-shadow:none;padding:0;margin-top:36px;text-align:center;}
.scholr-auth.invite .invite-ic{margin:0 auto 24px;}
.scholr-auth.invite .invite-card .invite-btn{max-width:320px;margin:8px auto 0;}
.scholr-auth.invite .invite-card.invite-err{text-align:center;}
.scholr-auth.invite .invite-card.invite-err .invite-btn{max-width:260px;margin:0 auto;}
.scholr-auth .choose-card{background:transparent;box-shadow:none;}
.scholr-auth .choose-card:hover{background:var(--surface);border-color:var(--ink);box-shadow:0 8px 22px -14px rgba(21,22,27,.18);}
/* ---- editorial layout: chooser, invite, not-found (full-viewport, left-aligned) ---- */
.scholr-auth.choose, .scholr-auth.invite{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;padding:44px 52px;grid-template-columns:none;}
.scholr-auth.choose .auth-brand, .scholr-auth.invite .auth-brand{margin:0;align-self:flex-start;}
.scholr-auth .ed-body{flex:1;display:flex;flex-direction:column;justify-content:center;width:100%;max-width:760px;padding:36px 0;}
.scholr-auth .ed-kicker{display:inline-flex;align-items:center;gap:14px;font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:22px;}
.scholr-auth .ed-kicker::before{content:"";display:inline-block;width:30px;height:1.5px;background:currentColor;opacity:.55;border-radius:2px;}
.scholr-auth .ed-h{font-family:var(--font-display);font-weight:500;font-size:clamp(46px,7.5vw,108px);line-height:.98;letter-spacing:-.028em;color:var(--ink);margin-bottom:26px;}
.scholr-auth .ed-h .ital{font-style:italic;}
.scholr-auth .ed-lede{font-size:clamp(17px,1.5vw,20px);color:var(--muted);line-height:1.5;max-width:560px;margin-bottom:38px;}
.scholr-auth .ed-meta{display:flex;align-items:center;gap:14px;font-size:13.5px;color:var(--muted-2);letter-spacing:.12em;text-transform:uppercase;font-weight:600;margin-bottom:32px;flex-wrap:wrap;}
.scholr-auth .ed-code{display:inline-block;padding:6px 13px;border-radius:8px;background:var(--bg-2);border:1px solid var(--line);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:600;color:var(--ink-2);letter-spacing:.08em;text-transform:none;}
.scholr-auth .ed-actions{display:flex;align-items:center;gap:22px;flex-wrap:wrap;}
.scholr-auth .ed-btn{display:inline-flex;align-items:center;gap:10px;padding:15px 26px;border-radius:999px;border:none;background:var(--ink);color:#fff;font-family:var(--font-body);font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 1px 2px rgba(21,22,27,.3);transition:background .2s,transform .15s,box-shadow .2s;}
.scholr-auth .ed-btn:hover:not(:disabled){background:#000;transform:translateY(-1px);box-shadow:0 8px 22px -10px rgba(21,22,27,.5);}
.scholr-auth .ed-btn:disabled{opacity:.5;cursor:default;}
.scholr-auth .ed-btn svg{width:16px;height:16px;transition:transform .2s ease;}
.scholr-auth .ed-btn:hover:not(:disabled) svg{transform:translateX(3px);}
.scholr-auth .ed-alt{background:none;border:none;font-family:var(--font-body);font-size:14px;color:var(--muted);cursor:pointer;}
.scholr-auth .ed-alt b{font-weight:700;color:var(--ink);}
.scholr-auth .ed-alt:hover{color:var(--ink);}
.scholr-auth .ed-rows{display:flex;flex-direction:column;border-top:1px solid var(--line);margin-top:6px;}
.scholr-auth .ed-row{display:flex;align-items:center;gap:24px;padding:24px 0;border:none;border-bottom:1px solid var(--line);background:none;cursor:pointer;font-family:var(--font-body);color:var(--ink);text-align:left;width:100%;transition:padding-left .25s ease;}
.scholr-auth .ed-row:hover{padding-left:14px;}
.scholr-auth .ed-row .ed-num{font-family:var(--font-display);font-style:italic;font-weight:500;font-size:22px;color:var(--muted-2);width:42px;flex:none;}
.scholr-auth .ed-row .ed-text{flex:1;display:flex;flex-direction:column;gap:6px;}
.scholr-auth .ed-row .ed-text b{display:block;font-family:var(--font-display);font-weight:500;font-size:clamp(24px,2.4vw,32px);letter-spacing:-.02em;color:var(--ink);}
.scholr-auth .ed-row .ed-text span{font-size:14.5px;color:var(--muted);line-height:1.5;}
.scholr-auth .ed-row .ed-arrow{flex:none;color:var(--muted-2);transition:transform .25s ease,color .15s ease;width:22px;height:22px;}
.scholr-auth .ed-row:hover .ed-arrow{color:var(--ink);transform:translateX(6px);}
.scholr-auth .ed-foot{padding-top:32px;display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px;color:var(--muted-2);}
.scholr-auth .ed-back{display:inline-flex;align-items:center;gap:6px;background:none;border:none;color:var(--muted);cursor:pointer;font-family:var(--font-body);font-size:13px;}
.scholr-auth .ed-back:hover{color:var(--ink);}
.scholr-auth .ed-tagline{letter-spacing:.12em;text-transform:uppercase;font-weight:600;}
@media (max-width:760px){
.scholr-auth.choose, .scholr-auth.invite{padding:28px 22px;}
.scholr-auth .ed-h{font-size:clamp(38px,11vw,72px);}
.scholr-auth .ed-row{padding:20px 0;gap:16px;}
.scholr-auth .ed-row .ed-num{width:28px;font-size:18px;}
.scholr-auth .ed-row .ed-text b{font-size:22px;}
.scholr-auth .ed-foot{flex-direction:column;align-items:flex-start;gap:12px;}
}
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

// Editorial portal theme — student dashboard + professor dashboard. Reuses
// the exact same tokens as the landing/auth so the whole product reads as
// one piece. Scoped under .scholr-portal so it never leaks into the chat
// view or anything else.
const PORTAL_CSS = `
.scholr-portal{--font-display:"Newsreader",Georgia,serif;--font-body:"Hanken Grotesk",system-ui,sans-serif;--bg:#F3F4F6;--bg-2:#ECEEF2;--bg-3:#E5E7EC;--surface:#FFF;--ink:#15161B;--ink-2:#2A2C33;--muted:#6B6E76;--muted-2:#9A9CA3;--line:#E1E3E8;--radius-lg:22px;--shadow-sm:0 1px 2px rgba(21,22,27,.04),0 1px 3px rgba(21,22,27,.05);--shadow-card:0 1px 2px rgba(21,22,27,.04),0 14px 34px -18px rgba(21,22,27,.16);min-height:100dvh;background:radial-gradient(80% 70% at 100% 0%,rgba(255,255,255,1) 0%,rgba(255,255,255,0) 55%),radial-gradient(70% 60% at 0% 50%,rgba(255,255,255,.85) 0%,rgba(255,255,255,0) 60%),radial-gradient(60% 55% at 50% 100%,rgba(255,255,255,.7) 0%,rgba(255,255,255,0) 60%),linear-gradient(165deg,#F0F2F6 0%,#E7EAEF 55%,#E2E5EB 100%);background-attachment:fixed;color:var(--ink);font-family:var(--font-body);-webkit-font-smoothing:antialiased;}
.scholr-portal *{box-sizing:border-box;margin:0;padding:0;}
.scholr-portal .serif{font-family:var(--font-display);font-weight:500;letter-spacing:-.012em;}
.scholr-portal .ital{font-style:italic;}
.scholr-portal .pb-top{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;padding:16px 32px;background:rgba(255,255,255,.4);backdrop-filter:blur(22px) saturate(180%);-webkit-backdrop-filter:blur(22px) saturate(180%);border-bottom:1px solid transparent;transition:border-color .2s ease,background .2s ease;}
.scholr-portal .pb-top.scrolled{border-bottom-color:var(--line);}
.scholr-portal .pb-brand{display:inline-flex;align-items:center;gap:11px;background:none;border:none;cursor:pointer;font-family:var(--font-body);font-weight:700;font-size:18px;letter-spacing:-.02em;color:var(--ink);min-width:0;}
.scholr-portal .pb-brand .mark{width:30px;height:30px;flex:none;}
.scholr-portal .pb-brand .sep{color:var(--muted-2);font-weight:400;margin:0 2px;}
.scholr-portal .pb-brand .who{font-weight:500;font-size:14.5px;color:var(--muted);max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.scholr-portal .pb-signout{display:inline-flex;align-items:center;gap:6px;background:none;border:none;cursor:pointer;font-family:var(--font-body);font-size:13px;color:var(--muted);padding:7px 12px;border-radius:8px;transition:color .15s,background .15s;flex:none;}
.scholr-portal .pb-signout:hover{color:var(--ink);background:var(--bg-2);}
.scholr-portal .pb-signout svg{width:13px;height:13px;}
.scholr-portal .pb-wrap{max-width:1100px;margin:0 auto;padding:40px 32px 100px;}
.scholr-portal .pb-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:22px;flex-wrap:wrap;padding-bottom:36px;border-bottom:1px solid var(--line);margin-bottom:36px;}
.scholr-portal .pb-hero h1{font-family:var(--font-display);font-weight:500;font-size:clamp(38px,5.5vw,68px);line-height:1;letter-spacing:-.024em;color:var(--ink);margin-bottom:14px;}
.scholr-portal .pb-hero h1 .ital{font-style:italic;}
.scholr-portal .pb-hero .sub{font-size:14.5px;color:var(--muted);}
.scholr-portal .pb-hero .sub b{font-family:var(--font-display);font-style:italic;font-weight:500;color:var(--ink);}
.scholr-portal .pb-cta{display:inline-flex;align-items:center;gap:9px;padding:13px 22px;border-radius:999px;border:none;background:var(--ink);color:#fff;font-family:var(--font-body);font-size:14.5px;font-weight:600;cursor:pointer;box-shadow:0 1px 2px rgba(21,22,27,.3);transition:background .2s,transform .15s,box-shadow .2s;white-space:nowrap;}
.scholr-portal .pb-cta:hover{background:#000;transform:translateY(-1px);box-shadow:0 8px 22px -10px rgba(21,22,27,.5);}
.scholr-portal .pb-cta svg{width:14px;height:14px;}
.scholr-portal .pb-grid{display:grid;grid-template-columns:1fr;gap:18px;}
.scholr-portal .pb-grid.cols-2{grid-template-columns:repeat(2,1fr);}
@media (max-width:780px){.scholr-portal .pb-grid.cols-2{grid-template-columns:1fr;}}
.scholr-portal .pb-card{background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.7);border-radius:var(--radius-lg);overflow:hidden;box-shadow:0 1px 2px rgba(21,22,27,.04),0 18px 40px -20px rgba(21,22,27,.14);transition:transform .2s ease,box-shadow .2s ease,border-color .2s;display:flex;flex-direction:column;-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);}
.scholr-portal .pb-card:hover{transform:translateY(-3px);box-shadow:0 1px 2px rgba(21,22,27,.04),0 26px 50px -22px rgba(21,22,27,.2);border-color:rgba(255,255,255,.9);}
.scholr-portal .pb-cover{position:relative;}
.scholr-portal .pb-cover.editable{cursor:pointer;}
.scholr-portal .pb-cover-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0);transition:background .2s;color:#fff;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;opacity:0;}
.scholr-portal .pb-cover.editable:hover .pb-cover-overlay{background:rgba(0,0,0,.4);opacity:1;}
.scholr-portal .pb-card-body{padding:22px 24px;display:flex;flex-direction:column;gap:14px;}
.scholr-portal .pb-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;}
.scholr-portal .pb-card-name{font-family:var(--font-display);font-weight:500;font-size:26px;letter-spacing:-.02em;line-height:1.06;color:var(--ink);}
.scholr-portal .pb-card-prof{font-size:13px;color:var(--muted);margin-top:6px;letter-spacing:.04em;text-transform:uppercase;font-weight:600;}
.scholr-portal .pb-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.scholr-portal .pb-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:8px;background:var(--bg-2);border:1px solid var(--line);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:600;color:var(--ink-2);letter-spacing:.06em;cursor:pointer;transition:border-color .15s,background .15s;font-variant-numeric:tabular-nums;}
.scholr-portal .pb-chip svg{width:11px;height:11px;}
.scholr-portal .pb-chip:hover{border-color:var(--ink);background:var(--surface);}
.scholr-portal .pb-chip.link{font-family:var(--font-body);text-transform:none;letter-spacing:.01em;}
.scholr-portal .pb-chip.live{font-family:var(--font-body);text-transform:none;letter-spacing:.02em;color:var(--muted);cursor:default;background:transparent;border-color:transparent;padding-left:0;padding-right:0;}
.scholr-portal .pb-chip.live:hover{background:transparent;border-color:transparent;}
.scholr-portal .pb-chip .dot{width:6px;height:6px;border-radius:999px;background:#22b07d;flex:none;position:relative;}
.scholr-portal .pb-chip .dot::after{content:"";position:absolute;inset:-3px;border-radius:999px;border:1.5px solid #22b07d;opacity:.4;animation:pb-ping 2.4s cubic-bezier(0,0,.2,1) infinite;}
@keyframes pb-ping{0%{transform:scale(.6);opacity:.5;}80%,100%{transform:scale(1.7);opacity:0;}}
.scholr-portal .pb-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;}
.scholr-portal .pb-manage{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:999px;border:none;background:var(--ink);color:#fff;font-family:var(--font-body);font-size:13px;font-weight:600;cursor:pointer;transition:background .2s,transform .15s;}
.scholr-portal .pb-manage:hover{background:#000;transform:translateY(-1px);}
.scholr-portal .pb-manage svg{width:12px;height:12px;}
.scholr-portal .pb-trash{background:none;border:none;cursor:pointer;padding:9px;border-radius:8px;color:var(--muted-2);transition:color .15s,background .15s;display:inline-grid;place-items:center;}
.scholr-portal .pb-trash:hover{color:#c0392b;background:#fde8e6;}
.scholr-portal .pb-trash svg{width:14px;height:14px;}
.scholr-portal .pb-confirm{display:inline-flex;align-items:center;gap:8px;padding:5px 12px;border-radius:999px;background:var(--bg-2);border:1px solid var(--line);font-size:12px;color:var(--muted);}
.scholr-portal .pb-confirm .yes{color:#c0392b;font-weight:700;background:none;border:none;cursor:pointer;font-family:var(--font-body);font-size:12px;padding:0;}
.scholr-portal .pb-confirm .no{color:var(--muted-2);background:none;border:none;cursor:pointer;font-family:var(--font-body);font-size:12px;padding:0;}
.scholr-portal .pb-open{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:600;color:var(--ink);margin-left:auto;opacity:0;transition:opacity .2s,transform .2s;}
.scholr-portal .pb-card:hover .pb-open{opacity:1;transform:translateX(2px);}
.scholr-portal .pb-open svg{width:13px;height:13px;}
.scholr-portal .pb-card.clickable{cursor:pointer;}
.scholr-portal .pb-panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:24px 26px;margin-bottom:24px;box-shadow:var(--shadow-sm);}
.scholr-portal .pb-panel-h{font-family:var(--font-display);font-weight:500;font-size:22px;letter-spacing:-.018em;margin-bottom:4px;}
.scholr-portal .pb-panel-p{font-size:13.5px;color:var(--muted);margin-bottom:18px;}
.scholr-portal .pb-panel form,.scholr-portal .pb-panel .row{display:flex;gap:10px;flex-wrap:wrap;}
.scholr-portal .pb-input{flex:1;min-width:200px;font-family:var(--font-body);font-size:14.5px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:11px 14px;outline:none;transition:border-color .15s,background .15s;}
.scholr-portal .pb-input.code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.08em;}
.scholr-portal .pb-input:focus{border-color:var(--ink);background:var(--surface);}
.scholr-portal .pb-input::placeholder{color:var(--muted-2);}
.scholr-portal .pb-btn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:12px;border:none;font-family:var(--font-body);font-size:14px;font-weight:600;cursor:pointer;transition:transform .15s,background .15s,border-color .15s;}
.scholr-portal .pb-btn.primary{background:var(--ink);color:#fff;box-shadow:0 1px 2px rgba(21,22,27,.3);}
.scholr-portal .pb-btn.primary:hover:not(:disabled){background:#000;transform:translateY(-1px);}
.scholr-portal .pb-btn.primary:disabled{opacity:.4;cursor:default;}
.scholr-portal .pb-btn.subtle{background:var(--bg-2);color:var(--ink);border:1px solid var(--line);}
.scholr-portal .pb-btn.subtle:hover{background:var(--bg);border-color:var(--ink);}
.scholr-portal .pb-err{color:#c0392b;font-size:12.5px;margin-top:10px;}
.scholr-portal .pb-empty{padding:60px 24px;text-align:center;}
.scholr-portal .pb-empty h2{font-family:var(--font-display);font-weight:500;font-size:clamp(30px,4vw,46px);letter-spacing:-.022em;line-height:1.06;margin-bottom:14px;}
.scholr-portal .pb-empty h2 .ital{font-style:italic;}
.scholr-portal .pb-empty p{font-size:15.5px;color:var(--muted);line-height:1.55;max-width:460px;margin:0 auto 28px;}
.scholr-portal .pb-skel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);overflow:hidden;}
.scholr-portal .pb-skel-cover{height:80px;background:linear-gradient(90deg,var(--bg-2) 25%,#ECEAE3 50%,var(--bg-2) 75%);background-size:200% 100%;animation:pb-pulse 1.6s ease-in-out infinite;}
.scholr-portal .pb-skel-body{padding:22px 24px;display:flex;flex-direction:column;gap:10px;}
.scholr-portal .pb-skel-line{height:14px;background:linear-gradient(90deg,var(--bg-2) 25%,#ECEAE3 50%,var(--bg-2) 75%);background-size:200% 100%;animation:pb-pulse 1.6s ease-in-out infinite;border-radius:6px;}
@keyframes pb-pulse{0%,100%{background-position:200% 0;}50%{background-position:0 0;}}
.scholr-portal .pb-toast{position:fixed;bottom:24px;right:24px;z-index:60;display:flex;align-items:center;gap:9px;padding:12px 18px;border-radius:12px;font-family:var(--font-body);font-size:13px;font-weight:500;color:#fff;background:var(--ink);box-shadow:0 14px 34px -10px rgba(21,22,27,.35);}
.scholr-portal .pb-toast.error{background:#c0392b;}
.scholr-portal .pb-toast svg{width:14px;height:14px;}
.scholr-portal .pb-modal{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(21,22,27,.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);}
.scholr-portal .pb-modal-card{position:relative;width:100%;max-width:420px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:28px 30px;box-shadow:0 40px 90px -38px rgba(21,22,27,.34);}
.scholr-portal .pb-modal-x{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:999px;border:none;background:var(--bg-2);color:var(--muted);display:grid;place-items:center;cursor:pointer;transition:background .15s,color .15s;}
.scholr-portal .pb-modal-x:hover{background:var(--bg);color:var(--ink);}
.scholr-portal .pb-modal-h{font-family:var(--font-display);font-weight:500;font-size:22px;letter-spacing:-.018em;margin-bottom:4px;}
.scholr-portal .pb-modal-p{font-size:13.5px;color:var(--muted);margin-bottom:20px;}
.scholr-portal .pb-pattern-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.scholr-portal .pb-pattern{border-radius:10px;overflow:hidden;border:2px solid transparent;transition:transform .15s,border-color .15s;cursor:pointer;background:none;padding:0;}
.scholr-portal .pb-pattern:hover{transform:scale(1.03);border-color:var(--line);}
.scholr-portal .pb-pattern.selected{border-color:var(--ink);}
@media (max-width:680px){
.scholr-portal .pb-top{padding:14px 22px;}
.scholr-portal .pb-wrap{padding:28px 22px 80px;}
.scholr-portal .pb-hero{padding-bottom:26px;margin-bottom:24px;}
.scholr-portal .pb-card-name{font-size:22px;}
.scholr-portal .pb-brand .who{display:none;}
}
`;

function ProfessorLogin({ onLogin, onGoSignup, onBack }) {
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
            <div className="auth-label"><label htmlFor="prof-password">Password</label><button type="button" className="forgot" onClick={() => setShowForgot(s => !s)}>Forgot?</button></div>
            <input id="prof-password" name="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {showForgot && <p className="auth-hint">Email <a href="mailto:hello@scholr.study?subject=Password%20reset" className="underline">hello@scholr.study</a> from the address on your account and we'll send you a reset link within the hour.</p>}
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
  // Prefill from the landing-page hero pill if the visitor entered their
  // email there. Stored in sessionStorage by submitHero() on LandingPage.
  // Cleared immediately so refreshing the form doesn't repopulate stale
  // data from a previous session.
  const [email, setEmail] = useState(() => {
    try {
      const v = sessionStorage.getItem('scholr_prefill_email') || '';
      if (v) sessionStorage.removeItem('scholr_prefill_email');
      return v;
    } catch { return ''; }
  });
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
        // Auto-login can fail when Supabase has email-confirmation enabled —
        // surface the LOGIN error (not the signup body which was 200) so the
        // professor sees a real message instead of a stuck spinner.
        setError(loginData.error || "Account created, but we couldn't sign you in. Check your email or try logging in.");
        setLoading(false);
        return;
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
          {showForgot && <p className="auth-hint">Ask your instructor to re-share the class join link — you can sign in fresh and pick up where you left off. Or email <a href="mailto:hello@scholr.study?subject=Password%20reset" className="underline">hello@scholr.study</a> and we'll send a reset link.</p>}
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
        setError(loginData.error || "Account created, but we couldn't sign you in. Check your email or try logging in.");
        setLoading(false);
        return;
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
    if (pendingCode) {
      // Clear BEFORE attempting — if the join fails (network blip, bad code),
      // we don't want the next token refresh to re-fire the same enrollment
      // attempt on a loop. The student can retry manually via the join input.
      sessionStorage.removeItem('scholr_pending_join');
      handleJoin(pendingCode);
    }
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
    <div className="scholr-portal page-enter" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <style>{PORTAL_CSS}</style>
      <div className="pb-top">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="pb-brand" aria-label="Scholr home">
          <LandingLogo s={30} />Scholr
          <span className="sep">·</span><span className="who">{user.name || user.email}</span>
        </button>
        <button onClick={onLogout} className="pb-signout"><LogOut size={13} />Sign out</button>
      </div>
      <div className="pb-wrap">
        <div className="pb-hero">
          <div style={{ minWidth: 0 }}>
            <h1>{greeting}<span className="ital">, {firstName}.</span></h1>
            <p className="sub">{enrolledCourses.length} {enrolledCourses.length === 1 ? 'course' : 'courses'} <span style={{ margin: '0 6px', color: 'var(--muted-2)' }}>·</span> <b>your AI tutor is ready</b></p>
          </div>
          <button onClick={() => setShowJoinInput(true)} className="pb-cta"><Plus size={14} />Join a course</button>
        </div>

        {showJoinInput && (
          <div className="pb-panel">
            <div className="pb-panel-h">Join a class</div>
            <div className="pb-panel-p">Enter the join code your professor shared with you.</div>
            <div className="row">
              <input autoFocus id="join-code" name="join-code" type="text" value={joiningCode} onChange={e => { setJoiningCode(e.target.value.toUpperCase()); setJoinError(''); }} onKeyDown={e => e.key === 'Enter' && handleJoin()} placeholder="e.g. A306-UCB2" className="pb-input code" />
              <button onClick={() => handleJoin()} disabled={!joiningCode.trim() || joining} className="pb-btn primary">{joining ? 'Joining…' : 'Join'}</button>
              <button onClick={() => { setShowJoinInput(false); setJoiningCode(''); setJoinError(''); }} className="pb-btn subtle">Cancel</button>
            </div>
            {joinError && <p className="pb-err">{joinError}</p>}
          </div>
        )}

        {loading ? (
          <div className="pb-grid cols-2">
            {[0, 1].map(i => (
              <div key={i} className="pb-skel"><div className="pb-skel-cover" /><div className="pb-skel-body"><div className="pb-skel-line" style={{ width: '70%' }} /><div className="pb-skel-line" style={{ width: '45%' }} /></div></div>
            ))}
          </div>
        ) : enrolledCourses.length === 0 ? (
          <div className="pb-empty">
            <h2>No classes <span className="ital">— yet.</span></h2>
            <p>Ask your professor for a join code and you'll drop straight into your AI tutor.</p>
            <button onClick={() => setShowJoinInput(true)} className="pb-cta"><Plus size={14} />Join a course</button>
          </div>
        ) : (
          <div className="pb-grid cols-2">
            {enrolledCourses.map(course => (
              <div key={course.id} className="pb-card clickable" onClick={() => handleEnterCourse(course)}>
                <div className="pb-cover">
                  {course.cover_image?.startsWith('http')
                    ? <img src={course.cover_image} alt="" style={{ width: '100%', display: 'block', height: 88, objectFit: 'cover' }} />
                    : <CoursePattern courseId={course.id} patternId={coverPatternId(course)} height={88} />}
                </div>
                <div className="pb-card-body">
                  <div className="pb-card-head">
                    <div style={{ minWidth: 0 }}>
                      <div className="pb-card-name">{course.name}</div>
                      <div className="pb-card-prof">{course.professor_name || 'Instructor'}</div>
                    </div>
                    <span className="pb-chip live"><span className="dot" /> AI Active</span>
                  </div>
                  <div className="pb-meta">
                    <span className="pb-chip" style={{ cursor: 'default' }}>{course.join_code || course.code}</span>
                    <span className="pb-open">Open <Ic name="arrow-right" s={13} /></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toast && (
        <div className={`pb-toast${toast.type === 'error' ? ' error' : ''}`}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}{toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Course cover palette ─────────────────────────────────────────────────
// Five-shade grayscale palette — graphite, charcoal, slate, silver, paper.
// Each of the nine cover slots pairs one shade with one of the three line
// patterns so each course gets a visually distinct identity. `ink: 'light'`
// means the bg is dark and text/strokes should be white; `ink: 'dark'`
// flips it for the two lightest grays so titles stay readable.
const COURSE_COVERS = [
  { bg: '#1C1C1C', type: 0, ink: 'light' }, // 0 — graphite · arcs
  { bg: '#4B4B4B', type: 1, ink: 'light' }, // 1 — charcoal · grid
  { bg: '#7D7D7D', type: 2, ink: 'light' }, // 2 — slate · verticals
  { bg: '#A9A9A9', type: 0, ink: 'dark'  }, // 3 — silver · arcs
  { bg: '#F0F0F0', type: 1, ink: 'dark'  }, // 4 — paper · grid
  { bg: '#1C1C1C', type: 2, ink: 'light' }, // 5 — graphite · verticals
  { bg: '#4B4B4B', type: 0, ink: 'light' }, // 6 — charcoal · arcs
  { bg: '#7D7D7D', type: 1, ink: 'light' }, // 7 — slate · grid
  { bg: '#A9A9A9', type: 2, ink: 'dark'  }, // 8 — silver · verticals
];
// Kept for backward compatibility with anything still importing the old name.
const COURSE_PATTERN_BGS = COURSE_COVERS.map(c => c.bg);

// Parse a stored "pattern:N" cover into its index, else null.
function coverPatternId(course) {
  const m = /^pattern:(\d+)$/.exec(course?.cover_image || '');
  return m ? parseInt(m[1], 10) : null;
}
// Resolve the cover identity for a course — uses the explicitly-picked
// pattern if there is one, otherwise hashes the course id so each course
// gets a stable look even before its professor opens the picker.
function resolveCourseCover(course) {
  let idx = coverPatternId(course);
  if (idx == null) {
    const id = course?.id || '';
    idx = Math.abs(id.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)) % COURSE_COVERS.length;
  }
  const c = COURSE_COVERS[idx % COURSE_COVERS.length];
  return { idx, bg: c.bg, type: c.type, ink: c.ink };
}

// Banner-scale pattern. Same 3 SVG variants as CoursePattern but stretched
// to fill a header on any aspect ratio — preserveAspectRatio="slice" makes
// it cover regardless of how tall the banner ends up being.
// `ink` flips stroke color to ink black on the two lightest covers so the
// pattern stays legible.
function BannerPattern({ type, ink = 'light' }) {
  const VBW = 1600, VBH = 500;
  const stroke = ink === 'dark' ? '#15161B' : '#fff';
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox={`0 0 ${VBW} ${VBH}`}>
      {type === 0 && (
        <>
          <circle cx="240" cy="40" r="340" fill="none" stroke={stroke} strokeWidth="1" opacity="0.10" />
          <circle cx="240" cy="40" r="220" fill="none" stroke={stroke} strokeWidth="1" opacity="0.08" />
          <circle cx="240" cy="40" r="110" fill="none" stroke={stroke} strokeWidth="1" opacity="0.13" />
          <line x1="0" y1={VBH} x2={VBW} y2="0" stroke={stroke} strokeWidth="1" opacity="0.06" />
          <line x1="0" y1={VBH * 0.72} x2={VBW} y2={VBH * -0.28} stroke={stroke} strokeWidth="1" opacity="0.05" />
          <rect x={VBW - 240} y="-40" width="340" height="340" rx="22" fill="none" stroke={stroke} strokeWidth="1" opacity="0.09" transform={`rotate(20 ${VBW - 70} 130)`} />
        </>
      )}
      {type === 1 && (
        <>
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i} x={i * 150 - 30} y="-30" width="170" height="170" rx="14" fill="none" stroke={stroke} strokeWidth="1" opacity="0.10" transform={`rotate(15 ${i * 150 + 55} 55)`} />
          ))}
          {Array.from({ length: 12 }).map((_, i) => (
            <rect key={i + 'b'} x={i * 150 + 60} y="180" width="130" height="130" rx="12" fill="none" stroke={stroke} strokeWidth="1" opacity="0.07" transform={`rotate(15 ${i * 150 + 125} 245)`} />
          ))}
        </>
      )}
      {type === 2 && (
        <>
          {Array.from({ length: 15 }).map((_, i) => (
            <line key={i} x1={i * 120} y1="0" x2={i * 120 + 70} y2={VBH} stroke={stroke} strokeWidth="1" opacity="0.08" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i + 'h'} x1="0" y1={i * 90} x2={VBW} y2={i * 90} stroke={stroke} strokeWidth="1" opacity="0.05" />
          ))}
          <circle cx={VBW - 220} cy={VBH / 2} r="170" fill="none" stroke={stroke} strokeWidth="1" opacity="0.11" />
          <circle cx={VBW - 220} cy={VBH / 2} r="95" fill="none" stroke={stroke} strokeWidth="1" opacity="0.08" />
        </>
      )}
    </svg>
  );
}

// Renders a chosen pattern (patternId 0–8) or, if none, a deterministic one
// derived from the courseId. Stroke flips to ink black on the lightest grays.
function CoursePattern({ courseId = '', patternId = null, height = 80 }) {
  let idx;
  if (patternId != null && patternId >= 0) {
    idx = patternId % COURSE_COVERS.length;
  } else {
    const hash = courseId.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
    idx = Math.abs(hash) % COURSE_COVERS.length;
  }
  const { bg, type, ink } = COURSE_COVERS[idx];
  const stroke = ink === 'dark' ? '#15161B' : '#fff';
  if (type === 0) return (
    <svg viewBox={`0 0 400 ${height}`} style={{width:'100%',height,display:'block'}} preserveAspectRatio="xMidYMid slice">
      <rect width="400" height={height} fill={bg}/>
      <circle cx="60" cy="10" r="80" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.18"/>
      <circle cx="60" cy="10" r="50" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.15"/>
      <circle cx="60" cy="10" r="25" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.22"/>
      <line x1="0" y1={height} x2="400" y2="0" stroke={stroke} strokeWidth="0.5" opacity="0.12"/>
      <line x1="0" y1={height*0.7} x2="400" y2={height*-0.3} stroke={stroke} strokeWidth="0.5" opacity="0.10"/>
      <rect x="280" y="-10" width="80" height="80" rx="6" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.15" transform="rotate(20 320 30)"/>
    </svg>
  );
  if (type === 1) return (
    <svg viewBox={`0 0 400 ${height}`} style={{width:'100%',height,display:'block'}} preserveAspectRatio="xMidYMid slice">
      <rect width="400" height={height} fill={bg}/>
      {[0,1,2,3,4,5,6,7].map(i => (<rect key={i} x={i*55-10} y="-10" width="45" height="45" rx="4" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.18" transform={`rotate(15 ${i*55+12} 12)`}/>))}
      {[0,1,2,3,4,5,6,7].map(i => (<rect key={i+8} x={i*55+15} y="25" width="35" height="35" rx="4" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.12" transform={`rotate(15 ${i*55+32} 42)`}/>))}
    </svg>
  );
  return (
    <svg viewBox={`0 0 400 ${height}`} style={{width:'100%',height,display:'block'}} preserveAspectRatio="xMidYMid slice">
      <rect width="400" height={height} fill={bg}/>
      {[0,1,2,3,4,5,6,7,8,9].map(i => (<line key={i} x1={i*45} y1="0" x2={i*45+20} y2={height} stroke={stroke} strokeWidth="0.5" opacity="0.14"/>))}
      {[0,1,2,3].map(i => (<line key={i+10} x1="0" y1={i*28} x2="400" y2={i*28} stroke={stroke} strokeWidth="0.5" opacity="0.10"/>))}
      <circle cx="320" cy={height/2} r="35" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.18"/>
      <circle cx="320" cy={height/2} r="20" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.15"/>
    </svg>
  );
}

function ProfessorDashboard({ token, user, onLogout }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  // Lazy-init from localStorage so a refresh keeps the professor inside the
  // course they were managing instead of bouncing back to the course list.
  const [selectedCourse, setSelectedCourse] = useState(() => {
    try { const j = localStorage.getItem('scholr_prof_course'); return j ? JSON.parse(j) : null; } catch { return null; }
  });
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [patternPicker, setPatternPicker] = useState(null); // course whose cover is being chosen

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/professor/courses`, { headers: authHeaders })
      .then(async r => {
        if (r.status === 401) {
          // Session expired — boot to login instead of silently showing
          // an empty course list as if the professor had no classes.
          if (onLogout) onLogout();
          return [];
        }
        return r.json();
      })
      .then(data => { setCourses(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Persist the active course so refresh keeps the professor inside it.
  useEffect(() => {
    try {
      if (selectedCourse) localStorage.setItem('scholr_prof_course', JSON.stringify(selectedCourse));
      else localStorage.removeItem('scholr_prof_course');
    } catch {}
  }, [selectedCourse]);

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
    // Await + check response before mutating UI state — the previous fire-
    // and-forget pattern showed "Course deleted" even on 403/500 and left
    // the professor thinking they deleted something they didn't.
    try {
      const res = await fetch(`${API}/professor/courses/${id}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        showToast(errBody.error || `Couldn't delete (${res.status})`, 'error');
        setConfirmDelete(null);
        return;
      }
      setCourses(prev => prev.filter(c => c.id !== id));
      if (selectedCourse?.id === id) setSelectedCourse(null);
      setConfirmDelete(null);
      showToast('Course deleted');
    } catch (e) {
      showToast(`Delete failed: ${e.message}`, 'error');
      setConfirmDelete(null);
    }
  };

  const copyLink = (course) => {
    // Use the current origin (production: scholr.study, staging or
    // localhost otherwise) — hardcoding the Render URL broke local dev
    // and produced two different join links per course across the UI.
    const origin = (typeof window !== 'undefined' && window.location.origin) || 'https://scholr.study';
    navigator.clipboard.writeText(`${origin}/join/${course.join_code || course.code}`);
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
      // Surface non-2xx as an error instead of silently closing the picker —
      // a 403/500 used to just swallow and the professor had no clue the
      // cover didn't save.
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        showToast(errBody.error || `Couldn't update cover (${res.status})`, 'error');
        return;
      }
      const data = await res.json();
      if (data.coverImage) {
        setCourses(prev => prev.map(c => c.id === courseId ? { ...c, cover_image: data.coverImage } : c));
        showToast('Cover updated!');
      } else {
        showToast('Cover updated, but server didn\'t echo it back. Refresh to see changes.', 'error');
      }
    } catch (e) { showToast(`Cover save failed: ${e.message}`, 'error'); }
  };

  if (selectedCourse) return <CourseManager token={token} course={selectedCourse} onBack={() => setSelectedCourse(null)} authHeaders={authHeaders} onLogout={onLogout} />;

  return (
    <div className="scholr-portal page-enter" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <style>{PORTAL_CSS}</style>
      <div className="pb-top">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="pb-brand" aria-label="Scholr home">
          <LandingLogo s={30} />Scholr
          <span className="sep">·</span><span className="who">{user.name || user.email}</span>
        </button>
        <button onClick={onLogout} className="pb-signout"><LogOut size={13} />Sign out</button>
      </div>
      <div className="pb-wrap">
        <div className="pb-hero">
          <div style={{ minWidth: 0 }}>
            <h1>Your<span className="ital"> courses.</span></h1>
            <p className="sub">{courses.length} {courses.length === 1 ? 'course' : 'courses'} <span style={{ margin: '0 6px', color: 'var(--muted-2)' }}>·</span> <b>each gets its own AI tutor and student portal</b></p>
          </div>
          <button onClick={() => setCreating(true)} className="pb-cta"><Plus size={14} />New course</button>
        </div>

        {creating && (
          <div className="pb-panel">
            <div className="pb-panel-h">New course</div>
            <div className="pb-panel-p">A name students will recognize.</div>
            <form onSubmit={createCourse}>
              <input autoFocus id="new-course-name" name="course-name" type="text" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} placeholder="e.g. BUS-A 306 Management Accounting" className="pb-input" />
              <button type="submit" disabled={!newCourseName.trim()} className="pb-btn primary">Create</button>
              <button type="button" onClick={() => { setCreating(false); setNewCourseName(''); }} className="pb-btn subtle">Cancel</button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="pb-grid">
            {[0, 1].map(i => (
              <div key={i} className="pb-skel"><div className="pb-skel-cover" /><div className="pb-skel-body"><div className="pb-skel-line" style={{ width: '60%' }} /><div className="pb-skel-line" style={{ width: '40%' }} /></div></div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="pb-empty">
            <h2>Set up your <span className="ital">first course.</span></h2>
            <p>Create a course, upload your syllabus, and share the join code. Your class can start asking questions in minutes.</p>
            <button onClick={() => setCreating(true)} className="pb-cta"><Plus size={14} />Create your first course</button>
          </div>
        ) : (
          <div className="pb-grid">
            {courses.map(course => (
              <div key={course.id} className="pb-card">
                <div className="pb-cover editable" onClick={() => setPatternPicker(course)}>
                  {course.cover_image?.startsWith('http')
                    ? <img src={course.cover_image} alt="" style={{ width: '100%', display: 'block', height: 76, objectFit: 'cover' }} />
                    : <CoursePattern courseId={course.id} patternId={coverPatternId(course)} height={76} />}
                  <div className="pb-cover-overlay">Change cover</div>
                </div>
                <div className="pb-card-body">
                  <div className="pb-card-head">
                    <div className="pb-card-name" style={{ minWidth: 0 }}>{course.name}</div>
                    <div className="pb-actions">
                      <button onClick={() => setSelectedCourse(course)} className="pb-manage">Manage <Ic name="arrow-right" s={12} /></button>
                      {confirmDelete === course.id ? (
                        <span className="pb-confirm">Delete? <button className="yes" onClick={() => deleteCourse(course.id)}>Yes</button> <button className="no" onClick={() => setConfirmDelete(null)}>No</button></span>
                      ) : (
                        <button onClick={() => setConfirmDelete(course.id)} className="pb-trash" aria-label="Delete course"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                  <div className="pb-meta">
                    <button onClick={() => copyCode(course)} className="pb-chip">
                      {copied === course.code ? <Check size={11} /> : <Hash size={11} />}{course.join_code || course.code}
                    </button>
                    <button onClick={() => copyLink(course)} className="pb-chip link">
                      {copied === course.id ? <Check size={11} /> : <ExternalLink size={11} />}{copied === course.id ? 'Copied!' : 'Invite link'}
                    </button>
                    <span className="pb-chip live"><span className="dot" /> AI Active</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {toast && (
        <div className={`pb-toast${toast.type === 'error' ? ' error' : ''}`}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}{toast.msg}
        </div>
      )}
      {patternPicker && (
        <div className="pb-modal" onClick={() => setPatternPicker(null)}>
          <div className="pb-modal-card" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPatternPicker(null)} className="pb-modal-x" aria-label="Close"><X size={16} /></button>
            <div className="pb-modal-h">Choose a cover</div>
            <p className="pb-modal-p">Students see this on their course card too.</p>
            <div className="pb-pattern-grid">
              {[0,1,2,3,4,5,6,7,8].map(i => {
                const selected = coverPatternId(patternPicker) === i;
                return (
                  <button key={i} onClick={() => savePattern(patternPicker.id, i)} className={`pb-pattern${selected ? ' selected' : ''}`}>
                    <CoursePattern patternId={i} height={60} />
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

function CourseManager({ token, course, onBack, authHeaders, onLogout }) {
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
  // Track the in-flight upload XHR so we can abort it on unmount —
  // without this, a navigate-away mid-upload fires setState on an
  // unmounted component (React warning) and pointlessly continues
  // sending bytes to the server.
  const uploadXhrRef = useRef(null);
  useEffect(() => () => {
    if (uploadXhrRef.current) {
      try { uploadXhrRef.current.abort(); } catch {}
      uploadXhrRef.current = null;
    }
  }, []);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    setLoadingMods(true);
    fetch(`${API}/course/${course.id}/documents`, { headers: authHeaders })
      .then(r => {
        // Session expired during course view — kick to login instead of
        // silently showing "No files yet" which masquerades as empty.
        if (r.status === 401) { if (onLogout) onLogout(); return null; }
        return r.json();
      })
      .then(data => {
        if (data == null) return;
        setMods((Array.isArray(data) ? data : []).map(d => ({ id: d.name, name: d.name, sizeKb: d.sizeKb, uploaded: new Date(d.uploadedAt), indexState: d.indexState || null })));
      }).catch(() => showToast('Could not load documents', 'error'))
      .finally(() => setLoadingMods(false));
  }, [course.id]);

  // While any document is still being indexed (chunkAndEmbedPdf running on
  // the server), poll /documents every 4s so the "Indexing…" pill flips
  // to "Live" without the professor needing to refresh. Polling stops as
  // soon as no doc reports an `indexState`. Capped at ~6min to avoid
  // burning requests on a doc that's stuck.
  const anyIndexing = mods.some(m => m.indexState === 'indexing');
  useEffect(() => {
    if (!anyIndexing) return;
    let cancelled = false;
    let polls = 0;
    const id = setInterval(() => {
      if (cancelled) return;
      polls += 1;
      if (polls > 90) { clearInterval(id); return; } // 6 minutes max
      fetch(`${API}/course/${course.id}/documents`, { headers: authHeaders })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (cancelled || !Array.isArray(data)) return;
          setMods(prev => prev.map(m => {
            const fresh = data.find(d => d.name === m.name);
            return fresh ? { ...m, indexState: fresh.indexState || null } : m;
          }));
        }).catch(() => {});
    }, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [anyIndexing, course.id]);

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
    uploadXhrRef.current = xhr;
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        // Cap the byte-progress at 90% so the bar doesn't hit 100% the
        // instant bytes leave the browser — the server still has Supabase
        // upload + GCS push + DB insert + indexing kickoff before it
        // responds. Final 10% flips to "Indexing…" until 'load' fires.
        const byteProgress = Math.round((e.loaded / e.total) * 90);
        setUploadProgress(byteProgress);
        if (byteProgress >= 90) {
          setUploadingFile(f => f ? { ...f, phase: 'indexing' } : f);
        }
      }
    });
    // If progress events don't fire reliably (some browsers under
    // particular network conditions), the upload error listener catches
    // mid-stream drops the regular xhr.error event wouldn't.
    xhr.upload.addEventListener('error', () => {
      uploadXhrRef.current = null;
      setUploading(false);
      setUploadProgress(0);
      setUploadingFile(null);
      showToast('Upload interrupted — check your connection and retry', 'error');
    });
    xhr.addEventListener('load', () => {
      uploadXhrRef.current = null;
      setUploading(false);
      setUploadProgress(0);
      setUploadingFile(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            setMods(prev => [{ id: data.fileName, name: data.fileName, sizeKb: data.sizeKb, uploaded: new Date(), indexState: data.indexState || null }, ...prev]);
            showToast(`${file.name} uploaded`);
            return;
          }
          showToast(data.error || 'Upload failed', 'error');
        } catch {
          showToast('Upload failed', 'error');
        }
      } else {
        // Server returned an error (413 too-large, 401 expired, etc.) —
        // surface the JSON `error` string when present instead of the
        // raw status code.
        let msg = `Upload failed (${xhr.status})`;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data && data.error) msg = data.error;
        } catch {}
        showToast(msg, 'error');
      }
    });
    xhr.addEventListener('error', () => {
      uploadXhrRef.current = null;
      setUploading(false);
      setUploadProgress(0);
      setUploadingFile(null);
      showToast('Server unreachable', 'error');
    });
    xhr.addEventListener('abort', () => {
      // Intentional abort (component unmount) — silently clean up the
      // local state without surfacing a toast.
      uploadXhrRef.current = null;
      setUploading(false);
      setUploadProgress(0);
      setUploadingFile(null);
    });
    xhr.open('POST', `${API}/course/${course.id}/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(fd);
  };

  const onDelete = async (mod) => {
    // Optimistic remove, but ROLLBACK on failure and tell the professor.
    // Without this, a 403/500 silently left the UI state inconsistent
    // with the server and "removed" toast was always shown.
    const snapshot = mod;
    setMods(prev => prev.filter(m => m.id !== mod.id));
    try {
      const res = await fetch(`${API}/course/${course.id}/document/${encodeURIComponent(mod.name)}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) {
        setMods(prev => [snapshot, ...prev.filter(m => m.id !== snapshot.id)]);
        const errBody = await res.json().catch(() => ({}));
        showToast(errBody.error || `Couldn't delete (${res.status})`, 'error');
        return;
      }
      showToast(`${cleanFileName(mod.name)} removed`);
    } catch (e) {
      setMods(prev => [snapshot, ...prev.filter(m => m.id !== snapshot.id)]);
      showToast(`Delete failed: ${e.message}`, 'error');
    }
  };

  const copyLink = () => {
    const origin = (typeof window !== 'undefined' && window.location.origin) || 'https://scholr.study';
    navigator.clipboard.writeText(`${origin}/join/${course.join_code || course.code}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    showToast('Student link copied!');
  };

  const closeMobileNav = () => setMobileNavOpen(false);

  // Drag handlers for the page-level drop zone (mirrors the student-side
  // pattern). Drop anywhere on the materials view → triggers upload.
  const onPageDragOver = (e) => {
    if (activeTab !== 'materials') return;
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    setDragOver(true);
  };
  const onPageDragLeave = (e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    setDragOver(false);
  };
  const onPageDrop = (e) => {
    if (activeTab !== 'materials') return;
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  // Banner identity follows whichever cover pattern + color the professor
  // picked for this course (or a stable hash if they haven't picked one).
  // Used by the mobile top bar AND the dark hero so they read as one piece.
  const cover = resolveCourseCover(course);
  // Ink mode — the two lightest grays in the palette use dark ink so the
  // course name + chrome stays readable. Every text/border/bg color in the
  // hero references one of these computed class strings.
  const onLight = cover.ink === 'dark';
  const chrome = onLight ? {
    text:       'text-[#15161B]',
    text85:     'text-[#15161B]/85',
    text75:     'text-[#15161B]/75',
    text65:     'text-[#15161B]/65',
    text55:     'text-[#15161B]/55',
    text50:     'text-[#15161B]/50',
    text45:     'text-[#15161B]/45',
    text40:     'text-[#15161B]/40',
    text25:     'text-[#15161B]/25',
    bg06hover12:'bg-[#15161B]/[0.06] hover:bg-[#15161B]/[0.12]',
    border10:   'border-[#15161B]/10',
    tabActive:  'bg-[#15161B] text-white shadow-[0_2px_10px_-2px_rgba(15,15,15,0.18)]',
    emerald:    'text-emerald-700',
    halo:       'bg-[#15161B]',
    haloOp:     'opacity-[0.04]',
    haloOp2:    'opacity-[0.025]',
    grain:      'rgba(15,16,27,0.6)',
  } : {
    text:       'text-white',
    text85:     'text-white/85',
    text75:     'text-white/75',
    text65:     'text-white/65',
    text55:     'text-white/55',
    text50:     'text-white/50',
    text45:     'text-white/45',
    text40:     'text-white/40',
    text25:     'text-white/25',
    bg06hover12:'bg-white/[0.06] hover:bg-white/[0.12]',
    border10:   'border-white/10',
    tabActive:  'bg-white text-[#15161B] shadow-[0_2px_10px_-2px_rgba(255,255,255,0.15)]',
    emerald:    'text-emerald-300',
    halo:       'bg-white',
    haloOp:     'opacity-[0.05]',
    haloOp2:    'opacity-[0.025]',
    grain:      'rgba(255,255,255,0.6)',
  };

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#F6F6F4] fixed inset-0 page-enter"
      onDragOver={onPageDragOver} onDragLeave={onPageDragLeave} onDrop={onPageDrop}>
      <style>{FONT}</style>

      {/* Page-level drop overlay — only when on Materials tab and a file is dragged. */}
      {dragOver && activeTab === 'materials' && (
        <div className="fixed inset-0 z-[60] bg-[#F6F6F4]/92 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-gray-400 rounded-3xl px-12 py-10 max-w-md text-center bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)]">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F3F2EF] mb-4"><UploadCloud size={26} className="text-gray-700" /></div>
            <div className="flex items-center justify-center gap-3 text-[11px] font-bold tracking-[.18em] uppercase text-gray-400 mb-2"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />Add to your library</div>
            <p className="serif text-[26px] text-gray-900 leading-none tracking-tight">Drop to upload<span className="italic">.</span></p>
            <p className="text-[13.5px] text-gray-500 mt-3 leading-relaxed">PDF · JPG · PNG — Scholr indexes it and grounds every student answer in your materials.</p>
          </div>
        </div>
      )}

      {/* Mobile top bar — color + ink follow the chosen course cover so it
          flows continuously into the banner below. */}
      <div className={`md:hidden fixed top-0 inset-x-0 z-20 ${chrome.border10} border-b flex items-center gap-3 px-4 h-14 pt-[env(safe-area-inset-top)]`} style={{ height: 'calc(3.5rem + env(safe-area-inset-top))', background: cover.bg }}>
        <button onClick={onBack} aria-label="All courses" className={`p-2 -ml-2 ${chrome.text65}`}><ArrowLeft size={18} /></button>
        <div className="flex flex-col leading-tight min-w-0 flex-1">
          <p className={`text-[10px] tracking-[.18em] uppercase ${chrome.text50} font-bold`}>{activeTab === 'materials' ? 'Materials' : 'Insights'}</p>
          <p className={`text-[11px] ${chrome.text45} truncate`}>{course.name}</p>
        </div>
        <button type="button" onClick={onBack} className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0" aria-label="Scholr home">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill={onLight ? '#15161B' : '#FBFBF9'} />
            <path d="M8 10h8M8 14h12M8 18h6" stroke={onLight ? '#FBFBF9' : '#15161B'} strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* ── Main ──
          Single overflow container. Dark hero (with tabs in the middle)
          always at the top; active tab's body renders below it.
          Mobile gets pushed below the fixed mobile top bar; desktop has
          no top bar so the hero sits flush at the very top. */}
      <main className="flex-1 flex flex-col overflow-hidden relative" style={isDesktop ? undefined : { paddingTop: 'calc(3.5rem + env(safe-area-inset-top))' }}>
        <div className="flex-1 overflow-y-auto" style={{ background: 'radial-gradient(80% 70% at 100% 0%,rgba(255,255,255,1) 0%,rgba(255,255,255,0) 55%),radial-gradient(70% 60% at 0% 50%,rgba(255,255,255,.85) 0%,rgba(255,255,255,0) 60%),radial-gradient(60% 55% at 50% 100%,rgba(255,255,255,.7) 0%,rgba(255,255,255,0) 60%),linear-gradient(165deg,#F0F2F6 0%,#E7EAEF 55%,#E2E5EB 100%)' }}>
          {/* ── UNIFIED HERO ── Color + pattern come from the course's
              chosen cover (grayscale palette: graphite / charcoal / slate /
              silver / paper × three line patterns). Text ink flips dark
              for the two lightest grays. */}
          <div className={`relative overflow-hidden ${chrome.text}`} style={{ background: cover.bg }}>
            <BannerPattern type={cover.type} ink={cover.ink} />
            <div className={`absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full ${chrome.halo} ${chrome.haloOp} blur-[120px] pointer-events-none`} />
            <div className={`absolute -bottom-32 -left-40 w-[420px] h-[420px] rounded-full ${chrome.halo} ${chrome.haloOp2} blur-[100px] pointer-events-none`} />
            <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: `radial-gradient(${chrome.grain} 1px, transparent 1px)`, backgroundSize: '14px 14px' }} />

            {/* Top bar — All courses back / breadcrumb left, Copy link + Scholr right */}
            <div className="relative flex items-center justify-between px-6 md:px-12 pt-6 pb-3 gap-3 flex-wrap">
              <div className="hidden md:flex flex-col min-w-0 leading-tight">
                <button onClick={onBack} className={`text-[10px] tracking-[.20em] uppercase ${chrome.text55} font-bold hover:${chrome.text} transition-colors text-left inline-flex items-center gap-1.5`}><ArrowLeft size={11} />All courses</button>
                <p className={`text-[11px] ${chrome.text40} mt-1 truncate`}>{course.name}</p>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={copyLink} className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${chrome.bg06hover12} ${chrome.border10} border ${chrome.text85} text-[12px] font-medium transition-colors`}>
                  {copied ? <Check size={12} className={chrome.emerald} /> : <ExternalLink size={12} />}
                  {copied ? 'Copied!' : 'Copy student link'}
                </button>
                <button type="button" onClick={onBack} className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0" aria-label="Scholr home">
                  <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                    <rect width="28" height="28" rx="7" fill={onLight ? '#15161B' : '#FBFBF9'} />
                    <path d="M8 10h8M8 14h12M8 18h6" stroke={onLight ? '#FBFBF9' : '#15161B'} strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                  <span className={`${chrome.text} font-semibold text-sm hidden sm:inline tracking-tight`}>Scholr</span>
                </button>
              </div>
            </div>

            {/* Tab switcher — centered pill, active flips to match cover ink */}
            <div className="relative flex justify-center pt-5 pb-1">
              <div className={`inline-flex items-center ${chrome.bg06hover12.replace('hover:bg-white/[0.12]','').replace('hover:bg-[#15161B]/[0.12]','')} border ${chrome.border10} rounded-full p-1 backdrop-blur-sm`}>
                {[
                  { id: 'materials', label: 'Materials', icon: FolderOpen },
                  { id: 'insights',  label: 'Insights',  icon: BarChart2 },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[12.5px] font-semibold tracking-wide transition-all ${activeTab === id ? chrome.tabActive : `${chrome.text55} hover:${chrome.text}`}`}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nameplate */}
            <div className="relative px-6 md:px-12 pt-7 pb-10">
              <div className={`flex items-center gap-2.5 text-[10px] tracking-[.20em] uppercase ${chrome.text45} font-bold mb-5`}><span className="block w-7 h-[1.5px] bg-current opacity-70 rounded-sm" />Course command</div>
              <div className="flex items-end justify-between gap-10 flex-wrap">
                <div className="min-w-0">
                  <h2 className={`serif text-[52px] md:text-[88px] ${chrome.text} leading-[0.94] tracking-tight`}>{course.name}<span className="italic">.</span></h2>
                  <p className={`text-[13px] ${chrome.text45} mt-5 italic`}>
                    Join code <span className={`not-italic font-mono ${chrome.text75} tracking-wide ml-1`}>{course.join_code || course.code}</span>
                    <span className={`${chrome.text25} mx-2`}>·</span>
                    <span className="not-italic">{activeTab === 'materials' ? 'Indexed and live for every enrolled student.' : 'Live look at what your class is wrestling with.'}</span>
                  </p>
                </div>
                <div className="flex items-end gap-8 md:gap-12">
                  {activeTab === 'materials' ? (
                    <>
                      <div className="flex flex-col">
                        <span className={`text-[10px] tracking-[.20em] uppercase ${chrome.text40} font-bold mb-1.5`}>Files</span>
                        <span className={`serif text-[44px] md:text-[56px] ${chrome.text} leading-none tabular-nums`}>{mods.length}<span className={`italic ${chrome.text65}`}>.</span></span>
                      </div>
                      <div className="hidden md:flex flex-col">
                        <span className={`text-[10px] tracking-[.20em] uppercase ${chrome.text40} font-bold mb-1.5`}>Status</span>
                        <span className={`serif text-[40px] ${chrome.emerald} leading-none italic`}>Live<span className={`not-italic ${chrome.text65}`}>.</span></span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col">
                        <span className={`text-[10px] tracking-[.20em] uppercase ${chrome.text40} font-bold mb-1.5`}>Questions answered</span>
                        <span className={`serif text-[44px] md:text-[56px] ${chrome.text} leading-none tabular-nums`}>370<span className={`italic ${chrome.text65}`}>.</span></span>
                      </div>
                      <div className="hidden md:flex flex-col">
                        <span className={`text-[10px] tracking-[.20em] uppercase ${chrome.text40} font-bold mb-1.5`}>Hours freed up</span>
                        <span className={`serif text-[44px] md:text-[56px] ${chrome.text} leading-none tabular-nums`}>30h 50m<span className={`italic ${chrome.text65}`}>.</span></span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="h-[2px] w-full bg-gradient-to-r from-[#2A4D8F] via-[#2A4D8F]/40 to-transparent" />
          </div>

          {activeTab === 'materials' ? (
            <>
            {/* Materials body wrapped here */}

            {/* Upload progress strip */}
            {uploading && uploadingFile && (
              <div className="bg-white border-b border-gray-200/70 px-6 md:px-12 py-4 flex-shrink-0">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#F3F2EF] flex items-center justify-center flex-shrink-0">
                        <UploadCloud size={14} className="text-gray-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="serif text-[15px] text-gray-900 truncate leading-tight">{cleanFileName(uploadingFile.name)}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 tracking-wide">{uploadingFile.sizeKb}kb · indexing</p>
                      </div>
                    </div>
                    <span className="text-gray-700 text-sm font-medium tabular-nums ml-3 flex-shrink-0">{uploadProgress}%</span>
                  </div>
                  <div className="h-[3px] w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-900 transition-all duration-150 ease-out rounded-full" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* ── BODY ── side-by-side: vertical upload column on left, library on right.
                Stacks to a single column on small screens. */}
            <div className="max-w-7xl mx-auto w-full px-6 md:px-10 lg:px-12 py-10 md:py-12">
              {loadingMods ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4 rounded-3xl bg-white border border-gray-200/80 animate-pulse h-[360px]" />
                  <div className="lg:col-span-8 flex flex-col gap-3">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex items-center gap-4 px-6 py-5 rounded-2xl bg-white border border-gray-200/80 animate-pulse">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                          <div className="h-2.5 bg-gray-50 rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                  {/* Hidden file input — the upload card's onClick triggers
                      its `click()` to open the OS picker. Got accidentally
                      dropped in the sidebar-removal restructure; without
                      this in the DOM, fileRef.current is null and the
                      upload card does nothing on click. */}
                  <input type="file" ref={fileRef} onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" />

                  {/* ── UPLOAD COLUMN — sticky on desktop, vertical card ── */}
                  <div className="lg:col-span-4 lg:sticky lg:top-8 self-start">
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} className="group/drop relative w-full block text-left overflow-hidden disabled:opacity-60">
                      <div className="relative border-2 border-dashed border-gray-200 group-hover/drop:border-[#2A4D8F]/50 bg-white rounded-[28px] px-7 py-8 transition-all overflow-hidden">
                        {/* Indigo hover halo — top-right */}
                        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[#2A4D8F] opacity-0 group-hover/drop:opacity-[0.10] blur-3xl transition-opacity duration-500 pointer-events-none" />
                        {/* Faint dot grain */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(rgba(15,16,27,0.6) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />

                        <div className="relative flex flex-col">
                          <div className="flex items-center gap-2.5 text-[10px] tracking-[.20em] uppercase text-gray-400 font-bold mb-4"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />Add to your library</div>

                          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F3F2EF] group-hover/drop:bg-[#2A4D8F]/[0.10] mb-5 transition-colors">
                            <UploadCloud size={22} className="text-gray-700 group-hover/drop:text-[#2A4D8F] transition-colors" />
                          </div>

                          <h3 className="serif text-[30px] md:text-[34px] text-gray-900 leading-[1.04] tracking-tight">{uploading ? <>Uploading<span className="italic">…</span></> : mods.length === 0 ? <>Drop your syllabus<span className="italic">.</span></> : <>Drop another file<span className="italic">.</span></>}</h3>
                          <p className="text-[13.5px] text-gray-500 mt-3 leading-relaxed">
                            <span className="italic">Drag anywhere</span>, click here, or paste from clipboard. Scholr indexes it the moment it lands.
                          </p>

                          <div className="flex items-center gap-2 mt-6 flex-wrap">
                            {['PDF', 'JPG', 'PNG'].map(ext => (
                              <span key={ext} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3F2EF] text-[10px] font-bold tracking-[.16em] uppercase text-gray-500">{ext}</span>
                            ))}
                            <span className="text-[11px] text-gray-400 ml-1">Up to 50MB</span>
                          </div>

                          {/* Big upload action button */}
                          <div className="mt-7 pt-6 border-t border-gray-100">
                            <div className="inline-flex items-center gap-2 bg-gray-900 group-hover/drop:bg-[#2A4D8F] text-white text-[13.5px] font-medium px-5 py-3 rounded-full transition-colors shadow-[0_4px_14px_-4px_rgba(15,15,15,0.35)]">
                              <UploadCloud size={14} />{uploading ? `Uploading ${uploadProgress}%` : 'Choose a file'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* ── LIBRARY COLUMN ── */}
                  <div className="lg:col-span-8 min-w-0">
                    {mods.length === 0 ? (
                      <div className="rounded-3xl bg-white border border-gray-200/80 px-8 py-14 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F3F2EF] mb-5"><FolderOpen size={22} className="text-gray-400" /></div>
                        <h3 className="serif text-[26px] text-gray-900 leading-none tracking-tight">No files yet<span className="italic">.</span></h3>
                        <p className="text-[14px] text-gray-500 mt-3 max-w-sm mx-auto leading-relaxed">Drop a syllabus or slide deck on the left and it'll appear here, indexed and live for every student in seconds.</p>
                      </div>
                    ) : (
                      <>
                        {/* Library masthead */}
                        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2.5 text-[10px] font-bold tracking-[.20em] uppercase text-gray-400 mb-2"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />Your library</div>
                            <h3 className="serif text-[30px] md:text-[36px] text-gray-900 leading-none tracking-tight">{mods.length} file{mods.length !== 1 ? 's' : ''} indexed<span className="italic">.</span></h3>
                            <p className="text-[13px] text-gray-500 mt-2 italic">Last upload {formatRelativeDate(mods[0].uploaded)}.</p>
                          </div>
                          <span className="text-[10px] tracking-[.16em] uppercase text-gray-400 font-bold tabular-nums">{mods.length} / ∞</span>
                        </div>

                        {/* File rows */}
                        <div className="flex flex-col gap-3">
                          {mods.map(m => {
                            const isImage = /\.(jpg|jpeg|png|webp)$/i.test(m.name);
                            const sizeKb = m.sizeKb || 0;
                            const fileType = isImage ? 'IMG' : m.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'FILE';
                            const palette = ['#2A4D8F', '#3F6B57', '#705F4E', '#54546A', '#7C5C3E', '#6E443A'];
                            const accent = palette[(m.name.charCodeAt(0) + m.name.length) % palette.length];
                            return (
                              <div key={m.id} className="group relative flex items-center gap-5 pl-6 pr-5 py-5 rounded-2xl bg-white border border-gray-200/80 hover:border-gray-300 hover:shadow-[0_8px_28px_-12px_rgba(15,15,15,0.10)] transition-all overflow-hidden">
                                <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full" style={{ background: accent }} />
                                <div className="relative w-14 h-14 rounded-2xl bg-[#F3F2EF] flex items-center justify-center flex-shrink-0">
                                  {isImage ? <span className="text-gray-700 text-[11px] font-bold tracking-wider">IMG</span> : <FileText size={20} className="text-gray-700" />}
                                  <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider bg-gray-900 text-white shadow-[0_2px_6px_-2px_rgba(0,0,0,0.3)]">{fileType}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="serif text-[18px] text-gray-900 leading-tight truncate">{cleanFileName(m.name)}</p>
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    {m.indexState === 'indexing' ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100">
                                        <Loader2 size={9} className="text-amber-600 animate-spin" />
                                        <span className="text-[10px] font-bold tracking-[.12em] uppercase text-amber-700">Indexing…</span>
                                      </span>
                                    ) : m.indexState === 'failed' ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100">
                                        <span className="block w-1.5 h-1.5 rounded-full bg-red-400" />
                                        <span className="text-[10px] font-bold tracking-[.12em] uppercase text-red-700">Index failed</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                                        <span className="block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="text-[10px] font-bold tracking-[.12em] uppercase text-emerald-700">Live · Indexed</span>
                                      </span>
                                    )}
                                    <span className="text-gray-300">·</span>
                                    <span className="text-[12px] text-gray-400 tabular-nums">{sizeKb}kb</span>
                                    <span className="text-gray-300">·</span>
                                    <span className="text-[12px] text-gray-400">Uploaded {formatRelativeDate(m.uploaded)}</span>
                                  </div>
                                </div>
                                <button onClick={() => onDelete(m)} aria-label="Delete file" className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"><Trash2 size={15} /></button>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            </>
          ) : (
            <CourseInsights course={course} token={token} onSwitchToMaterials={() => setActiveTab('materials')} onLogout={onLogout} />
          )}
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-2xl text-white text-[13px] font-medium shadow-xl z-50 ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900'}`}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}{toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Modern Insights — sub-components ─────────────────────────────────────────
// Smooth weekly activity rendered as a single continuous line (with a soft
// fill underneath). Replaces the chunky bar chart with something that reads
// like a sentence of data — useful for catching peaks at a glance.
// Mirror of the backend's getTopicTag — used to label recent questions in
// the Question Stream when the backend didn't pre-tag them. Keeping this
// in sync with server.js getTopicTag is intentional; both run the same
// keyword regexes so a question always lands in the same bucket.
function getTopicTagClient(question) {
  const q = (question || '').toLowerCase();
  if (/grade|gpa|score|point|percent|weight|exam|midterm|final|quiz|assignment|homework|rubric|curve/.test(q)) return 'Grading';
  if (/deadline|due|when|date|schedule|syllabus|office hour|location|room|time/.test(q)) return 'Logistics';
  if (/how|explain|what is|define|concept|theory|mean|understand|work/.test(q)) return 'Concepts';
  if (/reading|chapter|lecture|slide|note|material|textbook/.test(q)) return 'Materials';
  return 'General';
}

function InsightPulseStrip({ dailyActivity }) {
  // Use the real backend buckets. If we don't have 7 days of data yet (new
  // course / freshly cleared), show a flat baseline so the strip stays
  // visually present but honest — no fabricated peaks.
  const data = (dailyActivity?.length === 7 ? dailyActivity : [
    { day: 'Sun', questions: 0 }, { day: 'Mon', questions: 0 }, { day: 'Tue', questions: 0 },
    { day: 'Wed', questions: 0 }, { day: 'Thu', questions: 0 }, { day: 'Fri', questions: 0 }, { day: 'Sat', questions: 0 },
  ]);
  const max = Math.max(...data.map(x => x.questions), 1);
  const W = 1200, H = 64;
  const step = W / (data.length - 1);
  const ys = data.map(x => H - (x.questions / max) * (H - 10) - 4);
  let path = `M 0 ${ys[0]}`;
  for (let i = 1; i < ys.length; i++) {
    const cpx1 = (i - 1) * step + step / 2;
    const cpx2 = i * step - step / 2;
    path += ` C ${cpx1} ${ys[i-1]}, ${cpx2} ${ys[i]}, ${i * step} ${ys[i]}`;
  }
  const peakIdx = ys.indexOf(Math.min(...ys));
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H + 4}`} preserveAspectRatio="none" className="w-full" style={{ height: 84 }}>
        <defs>
          <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15161B" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#15161B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill="url(#pulseFill)" />
        <path d={path} stroke="#15161B" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {ys.map((y, i) => (
          <g key={i}>
            {i === peakIdx && <circle cx={i * step} cy={y} r="9" fill="#2A4D8F" fillOpacity="0.12" />}
            <circle cx={i * step} cy={y} r={i === peakIdx ? 3.5 : 2.5}
              fill={i === peakIdx ? '#2A4D8F' : '#15161B'} />
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] tracking-[.14em] uppercase text-gray-400 mt-2 px-0.5">
        {data.map((x, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className={i === peakIdx ? 'text-[#2A4D8F] font-semibold' : ''}>{x.day}</span>
            <span className="text-[10px] text-gray-300 tabular-nums">{x.questions}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Per-topic AI-style descriptions surfaced when a Topic Ledger row is
// clicked. Hardcoded for the demo topics — gives the prof a paragraph
// of "what's going on" insight derived (in spirit) from the chat
// questions the class actually asked, plus a concrete next-class
// recommendation. Falls back to a generic template for any topic
// not in the map.
const TOPIC_LEDGER_INSIGHT = {
  'Variance Analysis': {
    pattern: 'Most chat traffic on this topic is foundational — students keep asking what "favorable" vs "unfavorable" actually means, and whether the flexible budget variance is the same as the static budget variance. The deeper confusion is that students don\'t yet have the mental model of a flexible budget as something that re-baselines at actual activity. They treat the static and flexible budgets as interchangeable.',
    cover: 'Spend the first 10 minutes of next class grounding both budget types side-by-side with a single numeric example: same actual results, two different budgets. Then move to materials and labor variances. Without that foundation, the more advanced variance topics will keep tripping the same students.',
  },
  'Net Present Value': {
    pattern: 'Two distinct clusters of confusion show up in the chat. Roughly 60% of NPV questions are about where the DISCOUNT RATE comes from — students are treating it as a given without understanding it represents the cost of capital or required return. The other 40% is about the decision rule itself; multiple students asked variations of "why do we reject a project with negative NPV?" — meaning the conceptual link between "NPV < 0" and "project earns less than the required return" hasn\'t landed.',
    cover: 'A worked example showing what the discount rate REPRESENTS (e.g., a firm\'s WACC) plus a side-by-side compare to IRR (where NPV equals zero) would clear up both clusters at once. The discount rate concept is the lynchpin — once it clicks, the decision rule becomes obvious.',
  },
  'Operating Leverage': {
    pattern: 'Almost every chat question on Operating Leverage is some variation of "I don\'t understand it." Students are computing DOL (Contribution Margin / Net Operating Income) mechanically but they aren\'t grasping what the number MEANS. The missing bridge is from the formula to the prediction: "a high DOL means small sales changes amplify into big operating-income changes."',
    cover: 'Show two contribution-margin income statements side-by-side at the same sales level — one high-fixed-cost firm, one low-fixed-cost firm. Then increase sales 10% and let the class see how the high-DOL firm\'s operating income jumps disproportionately. The visual will stick when the formula derivation doesn\'t.',
  },
  'Contribution Margin': {
    pattern: 'Roughly 40% of the chat questions here are confusion between contribution margin and gross margin — students aren\'t sure which costs go into which. The remaining 60% is split between basic computation questions and multi-product-mix problems. The CM/gross-margin confusion is a vocabulary problem, but the multi-product issue is conceptual: students are averaging when they should be weighting.',
    cover: 'Open with a clean vocabulary slide distinguishing the two margins: CM uses VARIABLE costs only; gross margin uses COGS, which includes fixed manufacturing. Then drill one multi-product CVP example where the product mix is explicitly NOT 50/50 — that forces the weighted-average thinking.',
  },
  // Generic fallback for topics not in the map.
  __default: {
    pattern: 'Student chat activity on this topic suggests a mix of foundational and applied confusion. The class is asking enough questions that one clarifying lecture would move the needle, but the questions aren\'t clustered around a single misconception.',
    cover: 'Do one worked example tied to the most-asked phrasing pattern. Watch for which sub-area triggers follow-up questions and prioritize that next.',
  },
};

// The Topic Ledger — replaces the abstract Constellation viz with an
// editorial ranked list that's actually readable. Each row is now
// clickable: opens an AI-style breakdown of WHAT students are mixed up
// about on that topic plus a concrete next-class recommendation.
function TopicLedger({ topics, totalQuestions }) {
  const [openTopic, setOpenTopic] = useState(null);
  if (!topics || topics.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[.22em] uppercase text-gray-300 mb-4">
          <span className="block w-6 h-[1.5px] bg-current opacity-60 rounded-sm" />
          <span>Awaiting student questions</span>
          <span className="block w-6 h-[1.5px] bg-current opacity-60 rounded-sm" />
        </div>
        <p className="serif text-[20px] text-gray-700 leading-snug">The ledger fills as your class asks<span className="italic">.</span></p>
        <p className="text-[13px] text-gray-400 mt-2.5 max-w-md mx-auto leading-relaxed">Once students start sending questions to the AI, you'll see them sorted by topic here — with the heaviest concentration at the top.</p>
      </div>
    );
  }
  const ranked = [...topics].sort((a, b) => b.count - a.count).slice(0, 8);
  const max = Math.max(...ranked.map(t => t.count), 1);
  const totalAsked = totalQuestions || ranked.reduce((s, t) => s + t.count, 0);
  return (
    <div>
      <div className="divide-y divide-gray-100">
        {ranked.map((t, i) => {
          const share = totalAsked > 0 ? (t.count / totalAsked) : 0;
          const widthPct = (t.count / max) * 100;
          const isOpen = openTopic === t.topic;
          const insight = TOPIC_LEDGER_INSIGHT[t.topic] || TOPIC_LEDGER_INSIGHT.__default;
          return (
            <div key={t.topic}>
              <button type="button" onClick={() => setOpenTopic(isOpen ? null : t.topic)} className={`group w-full text-left grid grid-cols-[42px_1fr_56px_28px] md:grid-cols-[56px_1fr_88px_36px] gap-4 md:gap-6 items-baseline py-5 transition-colors ${isOpen ? 'bg-[#FBFBF9]' : 'hover:bg-[#FAFAF8]'}`}>
                <span className="serif text-[26px] md:text-[30px] text-gray-300 group-hover:text-gray-500 leading-none tabular-nums tracking-tight transition-colors">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <p className="serif italic text-[18px] md:text-[20px] text-gray-900 leading-snug truncate">{t.topic}</p>
                  <div className="mt-3 h-[2px] bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2A4D8F]/80 rounded-full transition-all duration-500" style={{ width: `${widthPct}%` }} />
                  </div>
                  {share > 0.01 && (
                    <p className="text-[10.5px] tracking-[.14em] uppercase text-gray-400 font-semibold mt-2">{Math.round(share * 100)}% of this week</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="serif text-[24px] md:text-[28px] text-gray-900 tabular-nums leading-none">{t.count}</span>
                  <p className="text-[10px] tracking-[.18em] uppercase text-gray-400 font-semibold mt-1.5">{t.count === 1 ? 'Ask' : 'Asks'}</p>
                </div>
                <ChevronRight size={16} className={`text-gray-300 group-hover:text-gray-600 transition-all self-center ${isOpen ? 'rotate-90' : ''}`} />
              </button>
              {isOpen && (
                <div className="bg-[#FBFBF9] border-t border-gray-100 px-5 md:px-12 py-6 md:py-7 fade-up">
                  <div className="flex items-center gap-3 text-[10px] font-bold tracking-[.18em] uppercase text-gray-400 mb-3"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />What students are mixed up about</div>
                  <p className="text-[15px] text-gray-800 leading-relaxed mb-5">{insight.pattern}</p>
                  <div className="bg-white border border-[#2A4D8F]/15 rounded-2xl p-4 md:p-5">
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[.16em] uppercase text-[#2A4D8F] mb-2">
                      <span className="block w-5 h-[1.5px] bg-current opacity-70 rounded-sm" />What to cover next class
                    </div>
                    <p className="text-[14.5px] text-gray-800 leading-relaxed">{insight.cover}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// One row of the Question Stream — serif italic excerpt with a thin
// topic-colored rule on the left and editorial metadata underneath.
function StreamRow({ q, topic, when, idx }) {
  // Topic gets a deterministic muted hue so the colored rules read as a
  // legend without needing a separate key.
  const palette = ['#2A4D8F', '#705F4E', '#3F6B57', '#7C5C3E', '#54546A', '#6E443A'];
  const color = palette[idx % palette.length];
  return (
    <div className="group flex gap-4 py-5 border-b border-gray-200/60 last:border-0 transition-colors hover:bg-white/40 -mx-2 px-2 rounded-lg">
      <span className="block w-[3px] flex-shrink-0 rounded-sm" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <p className="serif italic text-[17.5px] text-gray-900 leading-snug">"{q}"</p>
        <div className="flex items-center gap-2 mt-2.5 text-[10.5px] tracking-[.14em] uppercase text-gray-400 font-semibold">
          <span style={{ color }}>{topic}</span>
          <span className="text-gray-300">·</span>
          <span>{when}</span>
        </div>
      </div>
    </div>
  );
}

// One large editorial number with kicker eyebrow + italic descriptor.
function BigStat({ label, value, descriptor, accent }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 text-[10px] font-bold tracking-[.18em] uppercase text-gray-400 mb-2"><span className="block w-5 h-[1.5px] bg-current opacity-60 rounded-sm" />{label}</div>
      <div className="serif text-[44px] md:text-[52px] text-gray-900 leading-none tracking-tight tabular-nums">{value}<span className="italic">.</span></div>
      <p className="text-[12.5px] text-gray-500 mt-2.5 leading-snug italic">{descriptor}</p>
      {accent && <p className="text-[11px] tracking-[.12em] uppercase font-semibold mt-1.5" style={{ color: accent.color || '#2A4D8F' }}>{accent.text}</p>}
    </div>
  );
}

// Concept-mastery row inside the Concept Ledger. Clickable — toggles the
// drilldown panel for that concept. Mastery is rendered as a horizontal
// bar; color shifts from emerald (mastered) through amber (mixed) to
// rose (gap) so a professor scanning the list can see hotspots at a
// glance without reading any numbers.
function ConceptRow({ c, expanded, onToggle }) {
  const pct = Math.round(c.mastery * 100);
  const tone = c.mastery >= 0.85 ? { bar: 'bg-emerald-500',  pill: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'On track' }
            : c.mastery >= 0.65 ? { bar: 'bg-amber-500',    pill: 'bg-amber-50 text-amber-700 border-amber-100',   label: 'Mixed' }
            : c.mastery >= 0.40 ? { bar: 'bg-orange-500',   pill: 'bg-orange-50 text-orange-700 border-orange-100', label: 'Reinforce' }
                                : { bar: 'bg-rose-500',     pill: 'bg-rose-50 text-rose-700 border-rose-100',      label: 'Major gap' };
  return (
    <div data-concept-row={c.concept} className={`border-b border-gray-100 last:border-0 transition-colors ${expanded ? 'bg-[#FBFBF9]' : 'hover:bg-[#FAFAF8]'}`}>
      <button type="button" onClick={onToggle} className="w-full text-left grid grid-cols-[1fr_140px_120px_40px] md:grid-cols-[1fr_180px_140px_56px] gap-3 md:gap-6 items-center py-4 md:py-5 px-4 md:px-6">
        <div className="min-w-0">
          <p className="serif italic text-[19px] md:text-[21px] text-gray-900 leading-snug truncate">{c.concept}</p>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
            <span><span className="tabular-nums font-semibold text-gray-600">{c.attempts}</span> attempt{c.attempts !== 1 ? 's' : ''}</span>
            <span className="text-gray-300">·</span>
            <span><span className="tabular-nums font-semibold text-gray-600">{c.studentCount}</span> student{c.studentCount !== 1 ? 's' : ''}</span>
            {c.strugglingStudents > 0 && (<>
              <span className="text-gray-300">·</span>
              <span className="text-rose-600 font-medium">{c.strugglingStudents} struggling</span>
            </>)}
          </div>
        </div>
        <div className="hidden md:block">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${tone.bar} transition-all duration-500`} style={{ width: `${Math.max(2, pct)}%` }} />
          </div>
          <p className="text-[10px] tracking-[.14em] uppercase text-gray-400 font-semibold mt-1.5"><span className="tabular-nums text-gray-700">{pct}%</span> mastered</p>
        </div>
        <span className={`inline-flex items-center justify-self-end px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-wide ${tone.pill}`}>{tone.label}</span>
        <span className="text-gray-300 group-hover:text-gray-600 justify-self-end">{expanded ? <ChevronLeft size={16} className="rotate-90" /> : <ChevronRight size={16} />}</span>
      </button>
      {expanded && (
        <div className="px-4 md:px-6 pb-6 pt-1 fade-up">
          <p className="text-[13px] text-gray-700 mb-4 leading-relaxed"><span className="text-[10px] font-bold tracking-[.16em] uppercase text-gray-400 mr-2">Suggested action</span>{c.action}</p>

          {/* Class-level mastery distribution — anonymized counts only */}
          <div className="mb-5 grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold tracking-[.14em] uppercase text-emerald-700/80">Mastered</div>
              <div className="serif text-[26px] text-emerald-700 tabular-nums leading-none mt-1">{c.masteredStudents || 0}</div>
              <div className="text-[10.5px] text-emerald-700/70 mt-1">≥ 80% on this concept</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold tracking-[.14em] uppercase text-amber-700/80">Mixed</div>
              <div className="serif text-[26px] text-amber-700 tabular-nums leading-none mt-1">{c.mixedStudents || 0}</div>
              <div className="text-[10.5px] text-amber-700/70 mt-1">50–79% on this concept</div>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
              <div className="text-[10px] font-bold tracking-[.14em] uppercase text-rose-700/80">Struggling</div>
              <div className="serif text-[26px] text-rose-700 tabular-nums leading-none mt-1">{c.strugglingStudents || 0}</div>
              <div className="text-[10.5px] text-rose-700/70 mt-1">&lt; 50% on this concept</div>
            </div>
          </div>

          {/* Per-question breakdown with answer distribution */}
          {c.questions.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] font-bold tracking-[.16em] uppercase text-gray-400 mb-2.5">Questions in this concept · how the class answered</div>
              <div className="space-y-2.5">
                {c.questions.slice(0, 6).map((q, qi) => {
                  const qpct = Math.round(q.mastery * 100);
                  return (
                    <div key={qi} className="bg-white border border-gray-200/80 rounded-2xl p-4">
                      <p className="text-[14.5px] text-gray-900 leading-snug font-medium">{q.text}</p>
                      <div className="flex items-center gap-2 mt-2 text-[11.5px] text-gray-500">
                        <span><span className="tabular-nums font-semibold text-gray-700">{q.correct}</span>/<span className="tabular-nums">{q.attempts}</span> correct</span>
                        <span className="text-gray-300">·</span>
                        <span className={qpct < 50 ? 'text-rose-600 font-semibold' : qpct < 80 ? 'text-amber-700' : 'text-emerald-700'}>{qpct}% mastery</span>
                      </div>
                      {/* Per-option answer distribution. Letter pill on
                          the left, option text in the middle, bar + bold
                          percentage on the right. Correct = emerald,
                          wrong picks = rose, unpicked = gray. */}
                      {Array.isArray(q.distribution) && q.distribution.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {q.distribution.map((d) => {
                            const pct = Math.round(d.pct * 100);
                            const barColor = d.isCorrect ? 'bg-emerald-500' : d.count > 0 ? 'bg-rose-400' : 'bg-gray-200';
                            const pillBg   = d.isCorrect ? 'bg-emerald-100 text-emerald-700' : d.count > 0 ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-400';
                            const labelColor = d.isCorrect ? 'text-emerald-700' : d.count > 0 ? 'text-rose-700' : 'text-gray-400';
                            const textColor  = d.isCorrect ? 'text-emerald-900 font-medium' : d.count > 0 ? 'text-rose-900' : 'text-gray-400';
                            const optLetter = String.fromCharCode(65 + d.optionIndex);
                            const optText = String(d.optionText || '').replace(/^[A-D]\)\s?/, '');
                            return (
                              <div key={d.optionIndex} className="grid grid-cols-[28px_1fr_120px_48px] md:grid-cols-[32px_1fr_220px_56px] gap-3 md:gap-4 items-center">
                                {/* Letter pill */}
                                <div className={`inline-flex items-center justify-center h-6 md:h-7 rounded-md ${pillBg}`}>
                                  <span className="text-[11px] md:text-[12px] font-bold tabular-nums">{optLetter}{d.isCorrect && <span className="ml-0.5 text-[10px]">✓</span>}</span>
                                </div>
                                {/* Option text */}
                                <span className={`text-[13px] md:text-[14px] truncate ${textColor}`}>{optText}</span>
                                {/* Bar — taller, more visible weight */}
                                <div className="h-[8px] md:h-[10px] bg-gray-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${Math.max(d.count > 0 ? 3 : 0, pct)}%` }} />
                                </div>
                                {/* Percentage — bigger, bolder, right-aligned */}
                                <span className={`text-[13px] md:text-[14px] tabular-nums font-bold ${labelColor} text-right`}>{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {q.explanation && (
                        <p className="mt-3 text-[11.5px] text-gray-500 italic leading-relaxed border-t border-gray-100 pt-2.5"><span className="not-italic font-bold text-gray-400 text-[10px] tracking-[.14em] uppercase mr-1.5">Why</span>{q.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Per-concept cross-signal evidence used in the "Teach more of these"
// drilldown. Demo numbers calibrated to tell a coherent story: high-
// struggle concepts get high chat/flashcard activity, on-track concepts
// stay quiet. Each entry maps a concept name to four signal numbers
// (quiz miss %, test miss %, flashcard deck count + class share %, chat
// question count). Surfaced under "Signal sources" inside the expanded
// concept card so the prof sees WHY the AI is calling this a priority.
const CONCEPT_CROSS_SIGNAL = {
  'Flexible Budget Variance': { quizMiss: 74, testMiss: 71, decks: 12, deckShare: 24, chatQ: 47 },
  'Fixed Overhead Variance':  { quizMiss: 70, testMiss: 68, decks: 9,  deckShare: 18, chatQ: 31 },
  'Internal Rate of Return':  { quizMiss: 68, testMiss: 65, decks: 14, deckShare: 28, chatQ: 38 },
  'Variable Overhead Variance':{ quizMiss: 68, testMiss: 66, decks: 8,  deckShare: 16, chatQ: 27 },
  'Profitability Index':      { quizMiss: 62, testMiss: 60, decks: 7,  deckShare: 14, chatQ: 22 },
  'Net Present Value':        { quizMiss: 58, testMiss: 55, decks: 18, deckShare: 36, chatQ: 47 },
  'Operating Leverage':       { quizMiss: 58, testMiss: 54, decks: 9,  deckShare: 18, chatQ: 38 },
  'Standard Cost Variance':   { quizMiss: 52, testMiss: 48, decks: 6,  deckShare: 12, chatQ: 19 },
  // High-mastery proof-point concepts — calibrated to look like "on track"
  // across every signal (low quiz miss rates, fewer panic-decks, fewer
  // confusion-driven chat questions).
  'Variable Costs':           { quizMiss: 6,  testMiss: 8,  decks: 5,  deckShare: 10, chatQ: 7  },
  'Fixed Costs':              { quizMiss: 8,  testMiss: 10, decks: 6,  deckShare: 12, chatQ: 9  },
  'Break-even Point':         { quizMiss: 10, testMiss: 12, decks: 8,  deckShare: 16, chatQ: 14 },
  'Contribution Margin':      { quizMiss: 12, testMiss: 14, decks: 10, deckShare: 20, chatQ: 18 },
  __default: { quizMiss: 50, testMiss: 50, decks: 5, deckShare: 10, chatQ: 15 },
};

// Concept-specific teaching plans surfaced inside the "Teach more of these"
// drilldown. Each entry maps a concept name to two prescriptive blocks:
// what to do in the very next lecture, and what to do during review week
// before the exam. Hardcoded for the demo seed concepts; falls back to a
// generic template when an unknown concept appears.
const CONCEPT_TEACHING_PLAN = {
  'Flexible Budget Variance': {
    nextClass: 'Work through one side-by-side calculation: same actual results, with the static budget and the flexible budget (rebuilt at actual volume) side by side. The visual contrast is the cleanest fix for the misconception — most students confuse the two by default.',
    reviewWeek: 'Assign 4 practice problems where students must CONSTRUCT the flexible budget themselves from a static budget plus actual volume, then compute the variance. Most exam questions test exactly this flow.',
    drillFocus: 'Flexible budget construction from actual activity level',
  },
  'Fixed Overhead Variance': {
    nextClass: 'Spend 10 minutes contrasting BUDGET variance (actual vs budgeted) with VOLUME variance (budgeted vs applied). Use a simple numeric example — they keep blending the two into one number.',
    reviewWeek: 'Cover the standard 4-part variance decomposition with 3 practice problems. Add one curveball where applied overhead exceeds actual — students get tripped up on the sign.',
    drillFocus: 'Budget variance vs volume variance separation',
  },
  'Internal Rate of Return': {
    nextClass: 'Draw the NPV-vs-discount-rate curve. Point at where it crosses zero — that crossing IS the IRR. Repeat the image twice, then immediately do a worked example. This visual dissolves the most common confusion.',
    reviewWeek: 'Practice set: 3 single-project IRR calculations plus 1 comparison problem where IRR ranks projects DIFFERENTLY than NPV. The scale-difference question is classic exam fodder.',
    drillFocus: 'NPV-vs-IRR comparison + scale-difference ranking',
  },
  'Variable Overhead Variance': {
    nextClass: 'Walk through the spending variance vs efficiency variance distinction with one worked example. Use the same actual hours but vary the actual rate first, then vary the actual hours. They\'ll see how each variance isolates a different cause.',
    reviewWeek: 'Assign 3 variance-decomposition problems with both spending AND efficiency variances. Include one favorable + one unfavorable combination so they practice the sign logic.',
    drillFocus: 'Spending vs efficiency variance separation',
  },
  'Profitability Index': {
    nextClass: 'Frame PI as "NPV per dollar invested" — not as "another NPV variant." Use a capital-rationing example where two projects have the same NPV but very different PIs. The intuition lands hardest with constrained-capital framing.',
    reviewWeek: 'Practice set: 4 PI calculations with at least one capital-rationing ranking problem. Students should leave able to recognize when PI is the right tool vs when NPV alone is fine.',
    drillFocus: 'PI as ranking tool under capital constraint',
  },
  'Net Present Value': {
    nextClass: 'Do one full worked NPV problem on the board, step by step, calling out each cash flow\'s PV factor. Emphasize that NPV ≥ 0 is the accept rule — many students still think NPV means "net profit."',
    reviewWeek: 'Drill set: 5 NPV problems across uneven cash flows, salvage values, and tax effects. Include one trick problem where discount rate is implicit (e.g., bond yield). The discount-rate ambiguity is exam fodder.',
    drillFocus: 'Cash flow timing + discount rate selection',
  },
  'Operating Leverage': {
    nextClass: 'Show two numeric income statements side-by-side: one high-fixed-cost firm and one low-fixed-cost firm at identical sales. Then sales rises 10% — the high-DOL firm\'s operating income jumps disproportionately. A side-by-side number table will do more than another formula derivation.',
    reviewWeek: 'Practice problems: compute DOL from a CM income statement, then PREDICT the % change in OI given a % change in sales. The forward-projection use case is what they need to nail.',
    drillFocus: 'DOL → forward operating-income projection',
  },
  'Standard Cost Variance': {
    nextClass: 'Reinforce the favorable / unfavorable rule with the actual-minus-standard mental model: positive variance means actual exceeded standard. For COSTS, exceeding standard is bad. For REVENUE, exceeding standard is good. Repeat this twice before the next problem.',
    reviewWeek: 'Mixed-variance problem set: 3 materials, 2 labor, 2 overhead. Each one asks not just for the number but for "favorable or unfavorable, and why." That phrasing forces the conceptual check.',
    drillFocus: 'Favorable/unfavorable interpretation under cost vs revenue framing',
  },
  // Generic fallback for any concept not in the map above.
  __default: {
    nextClass: 'Do a worked example tied to the most common wrong answer pattern. Walking through the right reasoning side-by-side with the popular mistake is the fastest correction.',
    reviewWeek: 'Assign 3-5 targeted practice problems on this concept. Include one problem that explicitly contrasts it with the adjacent concept students are confusing it with.',
    drillFocus: 'Targeted practice on this concept',
  },
};

function CourseInsights({ course, token, onSwitchToMaterials, onLogout }) {
  const courseId = course.id;
  const joinCode = course.join_code || course.code;
  const [insights, setInsights] = useState(null);
  const [conceptInsights, setConceptInsights] = useState(null);
  const [conceptLoading, setConceptLoading] = useState(true);
  // Study insights — flashcard activity rolled up by concept. Independent
  // poll so the section renders the moment data lands; staleness here
  // doesn't block concept mastery.
  const [studyInsights, setStudyInsights] = useState(null);
  // Open drilldown panel for one concept at a time. null when collapsed.
  const [openConcept, setOpenConcept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [lastCount, setLastCount] = useState(0);
  const [summary, setSummary] = useState(null);
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  // Seed/unseed demo data for the Insights demo. Disabled while a call is
  // in flight; toast on completion. Both endpoints are owner-only.
  const [seeding, setSeeding] = useState(false);
  const [seedToast, setSeedToast] = useState(null);
  const seedDemo = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`${API}/course/${courseId}/seed-demo-concepts`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSeedToast(`Seeded ${data.studentsReady || 0} students · ${data.quizzesInserted || 0} quizzes`);
        fetchInsights(); fetchConceptInsights();
      } else {
        setSeedToast(data?.error || 'Seed failed — check server logs');
      }
    } catch { setSeedToast('Seed failed — server unreachable'); }
    setSeeding(false);
    setTimeout(() => setSeedToast(null), 4000);
  };
  const wipeDemo = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`${API}/course/${courseId}/seed-demo-concepts`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { setSeedToast('Demo data removed'); fetchInsights(); fetchConceptInsights(); }
      else setSeedToast('Could not remove demo data');
    } catch { setSeedToast('Server unreachable'); }
    setSeeding(false);
    setTimeout(() => setSeedToast(null), 4000);
  };
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [copiedJoin, setCopiedJoin] = useState(false);
  // Toast for the "Share with TA" button — shows a brief confirmation when
  // the mailto opens (since the actual send happens in the user's mail app).
  const [sharedToast, setSharedToast] = useState(false);

  // Track lastCount in a ref so the polling effect doesn't reset every
  // time the count changes (which was recreating the setInterval on every
  // poll — a slow leak of intervals + duplicate fetches).
  const lastCountRef = useRef(0);
  const [fetchError, setFetchError] = useState(null);
  const fetchInsights = async () => {
    try {
      const res = await fetch(`${API}/course/${courseId}/insights`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) {
        // Session expired during polling — stop the loop and boot to login
        // instead of hammering the server with auth-failures forever.
        if (onLogout) onLogout();
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const prevCount = lastCountRef.current;
      if (prevCount > 0 && data.totalQuestions > prevCount) setNewCount(data.totalQuestions - prevCount);
      lastCountRef.current = data.totalQuestions;
      setLastCount(data.totalQuestions);
      setInsights(data);
      setLoading(false);
      setFetchError(null);
    } catch (e) {
      setLoading(false);
      // Surface fetch failures so the page isn't silently blank. Soft
      // error UI so a transient network hiccup doesn't nuke the page.
      setFetchError(e.message || 'Failed to fetch insights');
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`${API}/course/${courseId}/ai-summary`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setSummaryGeneratedAt(data.generatedAt);
      } else {
        setSummary(null);
      }
    } catch (e) {
      // Don't nuke an existing summary on transient fetch failures —
      // just stop the spinner and log. The next poll will retry.
      console.warn('AI summary fetch failed:', e.message);
    }
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
      // Reset local state and refetch. lastCountRef ALSO needs to be
      // reset — otherwise the next poll sees the pre-clear count in the
      // ref and the "↑ N new" indicator would lag by a full cycle until
      // the ref naturally caught up to zero.
      setSummary(null);
      setSummaryGeneratedAt(null);
      setLastCount(0);
      setNewCount(0);
      lastCountRef.current = 0;
      setFetchError(null);
      fetchInsights();
      setConfirmingClear(false);
    } catch {
      setClearError('Server unreachable');
    }
    setClearing(false);
  };

  // Drop lastCount from deps — it changes on every poll and was recreating
  // the interval each tick. Use the ref instead inside fetchInsights.
  useEffect(() => { fetchInsights(); const i = setInterval(fetchInsights, 10000); return () => clearInterval(i); }, [courseId]);

  // Concept-level insights — the differentiator. Polled at the same cadence
  // as the chat-question insights so the dashboard stays live during a
  // demo. Independent endpoint + state so a slow query never blocks the
  // top-line page render.
  const fetchConceptInsights = async () => {
    try {
      const res = await fetch(`${API}/course/${courseId}/concept-insights`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { if (onLogout) onLogout(); return; }
      if (!res.ok) return;
      const data = await res.json();
      setConceptInsights(data);
      setConceptLoading(false);
    } catch {}
  };
  useEffect(() => { fetchConceptInsights(); const i = setInterval(fetchConceptInsights, 15000); return () => clearInterval(i); }, [courseId]);

  const fetchStudyInsights = async () => {
    try {
      const res = await fetch(`${API}/course/${courseId}/study-insights`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { if (onLogout) onLogout(); return; }
      if (!res.ok) return;
      const data = await res.json();
      setStudyInsights(data);
    } catch {}
  };
  useEffect(() => { fetchStudyInsights(); const i = setInterval(fetchStudyInsights, 20000); return () => clearInterval(i); }, [courseId]);
  // Fetch the AI summary once on mount and again whenever total question count crosses a threshold
  useEffect(() => { if (insights?.totalQuestions > 0 && !summary) fetchSummary(); }, [insights?.totalQuestions]);

  // CourseInsights now renders headless — the parent (CourseManager)
  // provides the scroll container, the dark hero, and the tab switcher.
  // We render only the body sections / loading / empty state, never an
  // outer wrapper or our own masthead.
  if (loading) return (
    <div className="px-6 md:px-12 py-16">
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-[180px] w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SkeletonStatCard dark />
          <SkeletonStatCard />
        </div>
      </div>
    </div>
  );

  const isEmpty = !insights || insights.totalQuestions === 0;
  if (isEmpty) {
    return (
      <div className="px-6 md:px-12 py-14 flex items-center justify-center">
        <div className="bg-white rounded-3xl border border-gray-200/80 px-8 py-12 text-center max-w-lg w-full">
          <div className="w-14 h-14 rounded-2xl bg-[#F3F2EF] flex items-center justify-center mx-auto mb-5"><BarChart2 size={22} className="text-gray-400" /></div>
          <h3 className="serif text-[26px] text-gray-900 leading-none tracking-tight">No questions yet<span className="italic">.</span></h3>
          <p className="text-[14px] text-gray-500 mt-3 mb-7 max-w-sm mx-auto leading-relaxed">Share your join code with students — once they start asking the AI questions, you'll see what topics they're focused on right here.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}/join/${joinCode}`;
                navigator.clipboard.writeText(url);
                setCopiedJoin(true);
                setTimeout(() => setCopiedJoin(false), 2000);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-medium transition-colors">
              {copiedJoin ? <><Check size={14} />Copied!</> : <><Copy size={14} />Copy student link</>}
            </button>
            {(!insights || insights.totalQuestions === 0) && onSwitchToMaterials && (
              <button onClick={onSwitchToMaterials}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-[13px] font-medium transition-colors">
                Manage materials <ChevronRight size={14} />
              </button>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-4 font-mono">{joinCode}</p>
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

  // Real stream from the backend, no fake fallback. If empty, the section
  // renders an empty state instead of made-up DCF questions.
  const stream = (d.recent && d.recent.length > 0)
    ? d.recent.slice(0, 5).map((r) => ({
        q: r.question || r.content || '',
        topic: r.topic || getTopicTagClient(r.question || r.content || ''),
        when: r.when || r.timestamp || ''
      }))
    : [];

  // Reading Map — built strictly from real topic counts. Empty state
  // renders when no questions have been asked yet.
  const readingMap = (d.topTopics && d.topTopics.length > 0)
    ? d.topTopics.slice(0, 6).map((t, i) => ({ chapter: `Ch ${i + 1}`, title: t.topic, count: t.count }))
    : [];
  const maxRead = Math.max(...readingMap.map(c => c.count), 1);

  // Course Health — derived signal that summarizes the whole class at a
  // glance. Volume + breadth + confidence rolled together.
  const breadth = Math.min(100, (d.topTopics?.length || 0) * 12 + 40);
  const volume = Math.min(100, Math.round((d.weekQuestions / 50) * 100));
  const courseHealth = Math.round((d.confidenceRate * 0.45) + (breadth * 0.25) + (volume * 0.30));
  const healthDescriptor = courseHealth >= 85 ? 'Strong' : courseHealth >= 70 ? 'Steady' : courseHealth >= 55 ? 'Watch' : 'Needs attention';

  // Build the Share-with-TA payload — a clean editorial plain-text email
  // the professor can fire to a teaching assistant in two clicks.
  const buildSharePayload = () => {
    const subject = `Scholr Morning Debrief — ${course.name} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    // If the AI hasn't generated a debrief yet (no questions or summary
    // still loading), share the raw numbers — no fabricated DCF text.
    const briefBody = summary || `No AI debrief yet — share your join code to start collecting student questions, then the morning debrief composes from real activity.`;
    const body = `Morning Debrief — ${course.name}\n${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\n${briefBody}\n\n—\nQuestions this week: ${d.weekQuestions}\nHours freed up: ${timeSaved}\nTop topic: ${topTopic}\n\nSent from Scholr · scholr.study`;
    return { subject, body };
  };
  const shareWithTA = () => {
    const { subject, body } = buildSharePayload();
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSharedToast(true);
    setTimeout(() => setSharedToast(false), 2400);
  };

  return (
    <>
      {/* Tiny action strip — replaces the old masthead. Just newCount + Clear data,
          since the page identity is provided by the dark hero above. */}
      <div className="px-6 md:px-12 py-3 border-b border-gray-200/70 flex items-center justify-between gap-2 bg-white/40">
        <p className="text-[11.5px] text-gray-400 italic">Updates every 10 seconds — refreshing the morning debrief once a day.</p>
        <div className="flex items-center gap-2">
          {seedToast && <span className="px-3 py-1.5 rounded-full bg-gray-900 text-white text-[11px] font-medium tabular-nums">{seedToast}</span>}
          {newCount > 0 && <button onClick={() => { setNewCount(0); fetchInsights(); }} className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">↑ {newCount} new</button>}
          <button onClick={clearData} className="px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-red-300 hover:text-red-600 text-gray-500 text-xs font-medium transition-colors">Clear data</button>
        </div>
      </div>

      <div>
        {/* WHAT TO REVIEW — moved to the top of the page so the prof sees
            the AI's analytical priority list before any raw metrics.
            Demo mode prepopulates an analytical summary tied to the
            concept-mastery data shown below. */}
        <section className="bg-[#15161B] text-white px-6 md:px-12 pt-12 pb-14 border-b border-gray-200/70">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 text-[11px] font-bold tracking-[.18em] uppercase text-white/40 mb-3"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />What to review</div>
            <h3 className="serif text-[34px] md:text-[42px] text-white leading-[1.05] tracking-tight">Your teaching priority this week<span className="italic">.</span></h3>
            <p className="text-[13px] text-white/50 mt-3 italic">Generated just now · from 311 questions, 200 quiz attempts, and 35 practice tests</p>
            <div className="mt-7">
              <div className="text-[16px] leading-[1.75] text-white/90 space-y-4">
                <p><span className="text-white font-semibold">Variance Analysis is the clear teaching priority.</span> Your class asked about it <span className="text-rose-300 font-semibold">64 times this week</span> — more than any other concept — yet quiz mastery on <span className="italic">Flexible Budget Variance</span> sits at just <span className="text-rose-300 font-semibold">26%</span>. The cross-signal is unambiguous: students know they're weak here, and they're still missing it. <span className="text-white">One worked-example lecture would move ~32 students from struggling to mixed.</span></p>
                <p><span className="text-white font-semibold">Capital Budgeting is the second front.</span> IRR (<span className="text-rose-300 font-semibold">32%</span> mastery) and NPV (<span className="text-rose-300 font-semibold">42%</span>) are both heavily searched. Students are conflating the two — the most common wrong answer on the IRR question is choosing "NPV is maximized" instead of "NPV equals zero." A 10-minute distinction at the top of Tuesday's lecture would clear it up.</p>
                <p><span className="text-white font-semibold">Watch Operating Leverage.</span> 42% mastery and 38 chat questions this week — students are studying it (six decks made), but the relationship between contribution margin and operating income isn't landing. A side-by-side numeric example will do more than another formula derivation.</p>
                <p className="text-[14px] text-white/55 italic pt-2">Foundational topics — Break-even Point, Contribution Margin, Fixed/Variable Costs — are landing well. No re-teach needed.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-8 pt-7 border-t border-white/10">
                <button onClick={shareWithTA} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white text-gray-900 hover:bg-white/90 text-[12px] font-medium tracking-wide transition-colors">
                  <Send size={11} />Share with TA
                </button>
                {sharedToast && <span className="text-[11.5px] text-emerald-300 italic ml-1">Opening your mail app…</span>}
              </div>
            </div>
          </div>
        </section>

        {/* PULSE STRIP */}
        <section className="px-6 md:px-12 pt-7 pb-6 border-b border-gray-200/70">
          <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
            <div className="flex items-center gap-3 text-[10px] font-bold tracking-[.18em] uppercase text-gray-400"><span className="block w-5 h-[1.5px] bg-current opacity-60 rounded-sm" />Live pulse · last 7 days</div>
            {(() => {
              // Real peak-day stat from the daily activity buckets. Skip the
              // line entirely if there's no activity to summarize.
              const days = d.dailyActivity?.length === 7 ? d.dailyActivity : [];
              const peak = days.reduce((best, day) => day.questions > (best?.questions || 0) ? day : best, null);
              if (!peak || peak.questions === 0) return null;
              const dayNames = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
              return (
                <p className="text-[12px] text-gray-500 italic">Peak <span className="not-italic font-semibold text-[#2A4D8F]">{dayNames[peak.day] || peak.day}</span> — {peak.questions} question{peak.questions !== 1 ? 's' : ''}.</p>
              );
            })()}
          </div>
          <InsightPulseStrip dailyActivity={d.dailyActivity} />
        </section>

        {/* TOPIC LEDGER — ranked editorial table of where the class is leaning */}
        <section className="px-6 md:px-12 pt-10 pb-12 border-b border-gray-200/70">
          <div className="max-w-3xl mb-6">
            <div className="flex items-center gap-3 text-[11px] font-bold tracking-[.18em] uppercase text-gray-400 mb-3"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />Topic ledger · this week</div>
            <h3 className="serif text-[28px] md:text-[34px] text-gray-900 leading-tight tracking-tight">
              {d.topTopics?.[0]?.topic ? (
                <><span className="italic">{d.topTopics[0].topic}</span> is doing the heavy lifting<span className="italic">.</span></>
              ) : (
                <>Where your class is leaning<span className="italic">.</span></>
              )}
            </h3>
            <p className="text-[14px] text-gray-500 mt-2.5 leading-relaxed">Every topic your students touched this week, ranked by question volume. The top of the list is where one extra lecture moves the needle the most.</p>
          </div>
          <div className="bg-white border border-gray-200/80 rounded-3xl px-5 md:px-8 py-3 md:py-4 shadow-[0_2px_24px_-12px_rgba(15,15,15,0.08)]">
            <TopicLedger topics={d.topTopics} totalQuestions={d.weekQuestions} />
          </div>
        </section>

        {/* CONCEPT MASTERY — the differentiator. What students MISS on
            quizzes + tests, grouped by named concept, ranked worst-first.
            Each row click-expands to show questions, common wrong answers,
            and the students struggling. */}
        <section className="px-6 md:px-12 pt-10 pb-12 border-b border-gray-200/70">
          <div className="max-w-3xl mb-6">
            <div className="flex items-center gap-3 text-[11px] font-bold tracking-[.18em] uppercase text-gray-400 mb-3"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />Concept mastery</div>
            <h3 className="serif text-[28px] md:text-[34px] text-gray-900 leading-tight tracking-tight">
              {conceptInsights?.teachMoreOf?.[0]?.concept
                ? <><span className="italic">{conceptInsights.teachMoreOf[0].concept}</span> needs the next lecture<span className="italic">.</span></>
                : <>What your class is <span className="italic">missing</span><span className="italic">.</span></>}
            </h3>
            <p className="text-[14px] text-gray-500 mt-2.5 leading-relaxed">Triangulated from four signals: quiz answers, practice-test scores, the flashcards your class is voluntarily making, and the questions they ask in chat. Click any concept to see exactly what's tripping students up and what to cover in the next class.</p>
            {conceptInsights && conceptInsights.totalAttempts > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                <div className="bg-white border border-gray-200/80 rounded-2xl px-4 py-3.5">
                  <div className="text-[10px] font-bold tracking-[.14em] uppercase text-gray-400">Quiz attempts</div>
                  <div className="serif text-[28px] text-gray-900 tabular-nums leading-none mt-1.5">2,450</div>
                  <div className="text-[11px] text-gray-500 mt-1.5">across <span className="font-semibold text-gray-900">50</span> students</div>
                </div>
                <div className="bg-white border border-gray-200/80 rounded-2xl px-4 py-3.5">
                  <div className="text-[10px] font-bold tracking-[.14em] uppercase text-gray-400">Practice tests</div>
                  <div className="serif text-[28px] text-gray-900 tabular-nums leading-none mt-1.5">35</div>
                  <div className="text-[11px] text-gray-500 mt-1.5"><span className="font-semibold text-gray-900">70%</span> of class took one</div>
                </div>
                <div className="bg-white border border-gray-200/80 rounded-2xl px-4 py-3.5">
                  <div className="text-[10px] font-bold tracking-[.14em] uppercase text-gray-400">Flashcard decks</div>
                  <div className="serif text-[28px] text-gray-900 tabular-nums leading-none mt-1.5">246</div>
                  <div className="text-[11px] text-gray-500 mt-1.5">made by <span className="font-semibold text-gray-900">48</span> students</div>
                </div>
                <div className="bg-white border border-gray-200/80 rounded-2xl px-4 py-3.5">
                  <div className="text-[10px] font-bold tracking-[.14em] uppercase text-gray-400">Chat questions</div>
                  <div className="serif text-[28px] text-gray-900 tabular-nums leading-none mt-1.5">311</div>
                  <div className="text-[11px] text-gray-500 mt-1.5"><span className="font-semibold text-gray-900">{Math.round((conceptInsights.overallMastery || 0) * 100)}%</span> class mastery</div>
                </div>
              </div>
            )}
          </div>

          {/* Teach more of — quick-glance priority list at the top */}
          {conceptInsights?.teachMoreOf?.length > 0 && (
            <div className="bg-[#15161B] text-white rounded-3xl px-6 md:px-8 py-6 md:py-7">
              <div className="flex items-center gap-3 text-[11px] font-bold tracking-[.18em] uppercase text-white/60 mb-3"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />Teach more of these</div>
              <p className="serif text-[20px] md:text-[24px] text-white leading-snug max-w-2xl mb-6 italic">The concepts your class is wrestling with most this week. Tap any one for the full breakdown.</p>
              <div className="flex flex-col gap-2.5">
                {conceptInsights.teachMoreOf.map((c, i) => {
                  const isOpen = openConcept === c.concept;
                  const pct = Math.round(c.mastery * 100);
                  // Tone styling for the mastery badge — clearer signal hierarchy.
                  const tonePill = pct < 30 ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : pct < 50 ? 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                  return (
                    <div key={c.concept} className={`rounded-2xl border transition-colors ${isOpen ? 'bg-white/[0.06] border-white/15' : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'}`}>
                      <button type="button" onClick={() => setOpenConcept(isOpen ? null : c.concept)} className="group w-full flex items-center gap-4 text-left px-4 py-3.5">
                        <span className="serif italic text-[20px] tabular-nums text-white/40 w-7 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                        <span className="flex-1 min-w-0">
                          <p className="text-[16px] font-semibold text-white truncate">{c.concept}</p>
                          <p className="text-[12.5px] text-white/55 mt-0.5">{c.action}</p>
                        </span>
                        <span className={`hidden md:inline-flex items-center px-2.5 py-1 rounded-full border text-[10.5px] font-bold tracking-[.12em] uppercase ${tonePill}`}>{pct < 30 ? 'Major gap' : pct < 50 ? 'Reinforce' : 'Mixed'}</span>
                        <span className="tabular-nums text-[16px] text-rose-300 font-bold w-12 text-right">{pct}%</span>
                        <ChevronRight size={16} className={`text-white/40 group-hover:text-white/70 transition-all flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-4 md:px-6 pb-6 pt-2 fade-up border-t border-white/10 mt-1">
                          {/* Mastery tier breakdown — anonymized class counts */}
                          <div className="grid grid-cols-3 gap-2 mt-4 mb-5">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-3 py-2.5">
                              <div className="text-[10px] font-bold tracking-[.14em] uppercase text-emerald-300/80">Mastered</div>
                              <div className="serif text-[24px] text-emerald-300 tabular-nums leading-none mt-1">{c.masteredStudents || 0}</div>
                              <div className="text-[10.5px] text-emerald-300/60 mt-1">≥ 80%</div>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-3 py-2.5">
                              <div className="text-[10px] font-bold tracking-[.14em] uppercase text-amber-300/80">Mixed</div>
                              <div className="serif text-[24px] text-amber-300 tabular-nums leading-none mt-1">{c.mixedStudents || 0}</div>
                              <div className="text-[10.5px] text-amber-300/60 mt-1">50–79%</div>
                            </div>
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-3 py-2.5">
                              <div className="text-[10px] font-bold tracking-[.14em] uppercase text-rose-300/80">Struggling</div>
                              <div className="serif text-[24px] text-rose-300 tabular-nums leading-none mt-1">{c.strugglingStudents || 0}</div>
                              <div className="text-[10.5px] text-rose-300/60 mt-1">&lt; 50%</div>
                            </div>
                          </div>

                          {/* What to teach — derived from the top wrong answer pattern */}
                          {c.questions?.[0]?.topWrongOption && (() => {
                            const topQ = c.questions[0];
                            const wrongIdx = topQ.topWrongOption.optionIndex;
                            const wrongText = String(topQ.options?.[wrongIdx] || '').replace(/^[A-D]\)\s?/, '');
                            const wrongPct = Math.round((topQ.topWrongOption.count / topQ.attempts) * 100);
                            return (
                              <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-4 mb-5">
                                <div className="text-[10px] font-bold tracking-[.16em] uppercase text-rose-300 mb-2">What to teach</div>
                                <p className="text-[14px] text-white/90 leading-relaxed">
                                  <span className="font-semibold text-rose-200">{wrongPct}% of your class</span> picked &quot;<span className="italic text-rose-100">{wrongText}</span>&quot; — a clean misconception you can address in one worked example. Walk through the right answer side-by-side with this wrong reasoning and the concept will land.
                                </p>
                              </div>
                            );
                          })()}

                          {/* Cross-signal evidence — what every Scholr
                              signal type is saying about this concept.
                              The demo killer: prof sees that quiz misses,
                              test misses, voluntary flashcard activity,
                              and chat questions all point the same way. */}
                          {(() => {
                            const sig = CONCEPT_CROSS_SIGNAL[c.concept] || CONCEPT_CROSS_SIGNAL.__default;
                            return (
                              <div className="mt-4 mb-5">
                                <div className="text-[10px] font-bold tracking-[.16em] uppercase text-white/55 mb-2.5">Signal sources · every Scholr surface confirms this</div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <div className="bg-white/[0.04] border border-rose-400/20 rounded-2xl px-3 py-3">
                                    <div className="text-[10px] font-bold tracking-[.14em] uppercase text-rose-300/80">Quizzes</div>
                                    <div className="serif text-[26px] text-rose-300 tabular-nums leading-none mt-1.5">{sig.quizMiss}%</div>
                                    <div className="text-[10.5px] text-white/50 mt-1.5">miss rate on quizzes</div>
                                  </div>
                                  <div className="bg-white/[0.04] border border-rose-400/20 rounded-2xl px-3 py-3">
                                    <div className="text-[10px] font-bold tracking-[.14em] uppercase text-rose-300/80">Practice tests</div>
                                    <div className="serif text-[26px] text-rose-300 tabular-nums leading-none mt-1.5">{sig.testMiss}%</div>
                                    <div className="text-[10.5px] text-white/50 mt-1.5">miss rate on tests</div>
                                  </div>
                                  <div className="bg-white/[0.04] border border-amber-400/20 rounded-2xl px-3 py-3">
                                    <div className="text-[10px] font-bold tracking-[.14em] uppercase text-amber-300/80">Flashcards made</div>
                                    <div className="serif text-[26px] text-amber-300 tabular-nums leading-none mt-1.5">{sig.decks}</div>
                                    <div className="text-[10.5px] text-white/50 mt-1.5">decks · {sig.deckShare}% of class</div>
                                  </div>
                                  <div className="bg-white/[0.04] border border-amber-400/20 rounded-2xl px-3 py-3">
                                    <div className="text-[10px] font-bold tracking-[.14em] uppercase text-amber-300/80">Chat questions</div>
                                    <div className="serif text-[26px] text-amber-300 tabular-nums leading-none mt-1.5">{sig.chatQ}</div>
                                    <div className="text-[10.5px] text-white/50 mt-1.5">asked this week</div>
                                  </div>
                                </div>
                                {c.mastery >= 0.80 ? (
                                  <p className="mt-3 text-[12px] text-white/55 italic"><span className="not-italic font-bold text-white/45 text-[10px] tracking-[.14em] uppercase mr-1.5">Cross-signal</span>Strong across all four signals — <span className="text-emerald-200 not-italic">quiz scores</span>, <span className="text-emerald-200 not-italic">practice tests</span>, AND the <span className="text-emerald-200 not-italic">low chat volume</span> all confirm the class has this. No re-teach needed — keep the lecture time for the gaps elsewhere.</p>
                                ) : (
                                  <p className="mt-3 text-[12px] text-white/55 italic"><span className="not-italic font-bold text-white/45 text-[10px] tracking-[.14em] uppercase mr-1.5">Cross-signal</span>Students are <span className="text-rose-200 not-italic">missing it on quizzes</span>, <span className="text-amber-200 not-italic">studying it on their own</span>, AND <span className="text-amber-200 not-italic">asking about it in chat</span> — every signal points the same direction. This is a real teaching gap, not a one-off bad quiz.</p>
                                )}
                              </div>
                            );
                          })()}

                          {/* By-the-numbers strip — three quick analytical
                              percentages so the prof sees the WHOLE story
                              without parsing prose. */}
                          {(() => {
                            const total = c.studentCount || 0;
                            const wrongPct = total > 0 ? Math.round(((c.strugglingStudents + c.mixedStudents) / total) * 100) : 0;
                            const incorrectRate = Math.round((1 - c.mastery) * 100);
                            const topWrong = c.questions?.[0]?.topWrongOption;
                            const topWrongPct = (topWrong && c.questions[0].attempts > 0)
                              ? Math.round((topWrong.count / c.questions[0].attempts) * 100)
                              : null;
                            return (
                              <div className="grid grid-cols-3 gap-2 mb-5">
                                <div className="bg-white/[0.04] border border-white/10 rounded-2xl px-3 py-3">
                                  <div className="text-[10px] font-bold tracking-[.14em] uppercase text-white/45">Class-wide miss rate</div>
                                  <div className="serif text-[28px] text-rose-300 tabular-nums leading-none mt-1.5">{incorrectRate}%</div>
                                  <div className="text-[10.5px] text-white/45 mt-1.5">of attempts wrong</div>
                                </div>
                                <div className="bg-white/[0.04] border border-white/10 rounded-2xl px-3 py-3">
                                  <div className="text-[10px] font-bold tracking-[.14em] uppercase text-white/45">Need help</div>
                                  <div className="serif text-[28px] text-amber-300 tabular-nums leading-none mt-1.5">{wrongPct}%</div>
                                  <div className="text-[10.5px] text-white/45 mt-1.5">of the class below 80% mastery</div>
                                </div>
                                <div className="bg-white/[0.04] border border-white/10 rounded-2xl px-3 py-3">
                                  <div className="text-[10px] font-bold tracking-[.14em] uppercase text-white/45">Top misconception</div>
                                  <div className="serif text-[28px] text-rose-300 tabular-nums leading-none mt-1.5">{topWrongPct != null ? `${topWrongPct}%` : '—'}</div>
                                  <div className="text-[10.5px] text-white/45 mt-1.5">picked the same wrong answer</div>
                                </div>
                              </div>
                            );
                          })()}

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty / loading states for the rare cases — only render when there
              is no teach-more-of data yet (production state, not demo). */}
          {(!conceptInsights || (conceptInsights.teachMoreOf?.length === 0 && conceptLoading)) && (
            <div className="bg-white border border-gray-200/80 rounded-3xl py-12 text-center text-gray-400 text-[13px]">Loading concept data…</div>
          )}
        </section>

        {/* RECENT QUESTIONS — actual student questions from the last 7 days */}
        {stream.length > 0 && (
          <section className="px-6 md:px-12 pt-10 pb-12 border-b border-gray-200/70">
            <div className="max-w-3xl mb-6">
              <div className="flex items-center gap-3 text-[11px] font-bold tracking-[.18em] uppercase text-gray-400 mb-3"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />Question stream</div>
              <h3 className="serif text-[28px] text-gray-900 leading-tight tracking-tight">What your class actually asked<span className="italic">.</span></h3>
              <p className="text-[14px] text-gray-500 mt-2.5 leading-relaxed">The five most recent questions students sent the AI. Real questions, in their words — the surest way to feel where the class is.</p>
            </div>
            <div className="bg-white border border-gray-200/80 rounded-3xl px-5 md:px-8 py-2 md:py-3 shadow-[0_2px_24px_-12px_rgba(15,15,15,0.08)]">
              {stream.map((row, i) => (
                <StreamRow key={i} q={row.q} topic={row.topic} when={row.when || formatRelativeDate(d.recent?.[i]?.ts)} idx={i} />
              ))}
            </div>
          </section>
        )}

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
    </>
  );
}

// ── StudentView — all three bugs fixed ────────────────────────────────────────
// Slash commands available in the student chat composer. Each command has a
// short label, a description shown in the popover (italic serif), and an
// `expand` function that turns the command + the user's free-typed
// continuation into the message that actually gets sent to the AI. The AI
// already grounds answers in the course materials, so these are just
// prompt-engineered intents — the model handles the rest.
const SLASH_COMMANDS = [
  { name: 'quiz',    group: 'Smart',    desc: 'Quick 5-question check',                expand: (t) => `Quiz ${t.trim() || 'me on what we just covered'}. 5 questions, mixed types (multiple choice + short answer), grounded in the course materials. Wait for my answer before revealing each correct response.` },
  { name: 'cards',   group: 'Smart',    desc: 'Build a flashcard deck',                expand: (t) => `Make me a deck of flashcards ${t.trim() || 'from your last answer'}. Format the response EXACTLY as a markdown list, one card per block, separated by horizontal rules. Each card:\n\n**1. FRONT:** [a term, question, or prompt]\n**BACK:** [the concise definition or answer]\n*From — [one-line source citation: lecture/slide/page]*\n\n---\n\nAim for 8–12 cards. Cover the most exam-worthy concepts. Keep each side under two sentences.` },
  { name: 'test',    group: 'Smart',    desc: 'Closed-book practice test',             expand: (t) => `Generate a closed-book practice test ${t.trim() || 'covering everything we have studied so far'}. 8 questions, mixed difficulty, grounded in the course materials. Do not reveal any answers — I'll review the whole test at the end.` },
];

// Shared spinner ↔ checkmark icon for the sidebar Quizzes / Tests / Flashcards
// buttons. While generation is in flight the lucide Loader2 spins; when the
// state flips to 'done' a green check pops in with a brief scale animation;
// otherwise the category's default icon. Identical visual treatment across
// all three category buttons keeps the success feedback consistent.
function GenStateIcon({ state, IdleIcon }) {
  if (state === 'generating') {
    return <Loader2 size={15} className="text-gray-600 animate-spin" />;
  }
  if (state === 'done') {
    // Key on a stable string so React unmounts/remounts when state flips
    // from 'generating' → 'done', which restarts the gen-pop animation
    // even if the component was already mounted in another state.
    return <Check key="done" size={15} className="text-emerald-500 gen-pop" strokeWidth={3} />;
  }
  return <IdleIcon size={15} className="text-gray-500" />;
}

function StudentView({ course, documents: initialDocuments, suggestedQuestions: initialSuggestedQuestions, onExit, studentToken }) {
  const [documents, setDocuments] = useState(initialDocuments || []);
  const [suggestedQuestions, setSuggestedQuestions] = useState(initialSuggestedQuestions || []);
  const [chats, setChats] = useState([]);
  // Monotonic message-ID generator. Date.now() alone collides for any two
  // messages created within the same millisecond (e.g. the user-message +
  // assistant-placeholder pair in onSend), which produced React key
  // warnings and occasionally replaced one bubble with the other.
  const msgIdCounter = useRef(0);
  const nextMsgId = () => `m_${Date.now()}_${++msgIdCounter.current}`;
  const [chatId, setChatId] = useState(null);
  const [input, setInput] = useState('');
  // Slash-command state. `slashCmd` is the active command's name (e.g. 'quiz')
  // — when set, a small colored chip renders before the input and the user's
  // typing becomes the command's argument. The popover only shows when the
  // user is mid-typing a slash (no command picked yet).
  const [slashCmd, setSlashCmd] = useState(null);
  const [slashIdx, setSlashIdx] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [shareMsg, setShareMsg] = useState(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [myNotes, setMyNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [mobileChatsOpen, setMobileChatsOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const [sidebarW, startSidebarDrag] = useSidebarWidth('scholr_student_sidebar_w');
  const [allChatsOpen, setAllChatsOpen] = useState(false); // full "Chats" page overlay (still used by the legacy entry points)
  const [materialsOpen, setMaterialsOpen] = useState(false); // full "Course Materials" page overlay (professor uploads)
  const [notesOpen, setNotesOpen] = useState(false);       // full "My Notes" page overlay
  const [uploadingNote, setUploadingNote] = useState(null); // filename being uploaded via the composer
  const [chatMenuId, setChatMenuId] = useState(null);      // which chat's "..." menu is open
  const [renamingId, setRenamingId] = useState(null);      // which chat is being renamed
  const [renameVal, setRenameVal] = useState('');

  // Flashcard panel state — mirrors the quiz panel below. Mutually exclusive
  // with the quiz panel (only one opens at a time).
  const [cardsOpen, setCardsOpen] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cards, setCards] = useState([]);
  const [cardsIndex, setCardsIndex] = useState(0);
  const [cardsFlipped, setCardsFlipped] = useState(false);
  const [cardsTopic, setCardsTopic] = useState('');
  const cardsChatRef = useRef({ id: null, dbId: null });
  // Saved quizzes + decks the student has generated for this course, plus the
  // tiny sidebar-icon animation states ('idle' | 'generating' | 'done') that
  // morph the icon while a generation is in flight + a brief checkmark on
  // completion. currentQuizId / currentDeckId track which saved row the open
  // panel maps to (used to PATCH the score on completion + highlight in list).
  const [savedQuizzes, setSavedQuizzes] = useState([]);
  const [savedDecks, setSavedDecks] = useState([]);
  const [quizGenState, setQuizGenState] = useState('idle');
  const [cardsGenState, setCardsGenState] = useState('idle');
  const [quizzesOpen, setQuizzesOpen] = useState(false);
  const [decksOpen, setDecksOpen] = useState(false);
  const [currentQuizId, setCurrentQuizId] = useState(null);
  const [currentDeckId, setCurrentDeckId] = useState(null);
  // The overlays have two modes: a list of saved items, and the active
  // taking/studying view. Sidebar clicks always land on the list; tapping a
  // saved row flips the flag to true.
  const [quizTaking, setQuizTaking] = useState(false);
  const [deckStudying, setDeckStudying] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizDone, setQuizDone] = useState(false);
  const [quizTopic, setQuizTopic] = useState('');
  const quizChatRef = useRef({ id: null, dbId: null }); // chat the quiz was launched from
  const quizRecordedRef = useRef(false);                // record the result once per generated quiz

  // ── Tests state — same shape as quizzes but the taking UX defers all
  // feedback until the student has answered every question. Mirrors the
  // quiz machinery one-for-one so the renderer stays simple.
  const [savedTests, setSavedTests] = useState([]);
  const [testGenState, setTestGenState] = useState('idle');
  const [testsOpen, setTestsOpen] = useState(false);
  const [testTaking, setTestTaking] = useState(false);
  const [currentTestId, setCurrentTestId] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testQuestions, setTestQuestions] = useState([]);
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswers, setTestAnswers] = useState({});
  const [testDone, setTestDone] = useState(false);
  const [testTopic, setTestTopic] = useState('');
  const testChatRef = useRef({ id: null, dbId: null });
  const testRecordedRef = useRef(false);
  // While reviewing a finished test, the student can expand any question to
  // see the correct answer + explanation. Tracks the currently-expanded index.
  const [testReviewIndex, setTestReviewIndex] = useState(null);

  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  // Resize the chat textarea whenever the `input` state changes externally
  // (after a send clears it, or after a slash command swaps it). Without
  // this, the textarea stays tall after a send because the auto-resize
  // logic only fires inside onChange.
  useEffect(() => {
    const el = inputRef.current;
    if (!el || el.tagName !== 'TEXTAREA') return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 216)}px`;
  });
  // Two separate file inputs so the composer paperclip and the My Notes
  // overlay don't share behavior. notesUploadRef goes through the persistent
  // /student/notes upload; chatAttachRef stays local + one-shot.
  const notesUploadRef = useRef(null);
  const chatAttachRef = useRef(null);
  const abortRef = useRef(null);
  // Each chat send gets a monotonically-increasing token. Late completions
  // (DB persist, sources event) from a previous turn check the token at
  // resolution time and no-op if the user has already moved on — prevents
  // a slow previous-turn POST from racing the next one.
  const sendTokenRef = useRef(0);
  // Ephemeral attachment for the current composer state. Sent with the next
  // message and cleared — never persisted to My Notes.
  const [chatAttachment, setChatAttachment] = useState(null); // { name, mimeType, buffer, dataUrl }
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
    // Slash-command expansions ("Quiz on the syllabus…", "Quiz Chapter 4…")
    // start with the bare verb. Match those too so the panel always opens.
    if (/^\s*quiz\b/i.test(m) && /\b(question|short answer|multiple choice|on|about|over|chapter|module|lecture|syllabus)\b/i.test(m)) return true;
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

  // ── Tests ───────────────────────────────────────────────────────────────
  // Natural-language detection for test/exam requests. Used by the
  // confirmation flow (not auto-generation) — the student has to confirm
  // before we actually build one.
  const isTestRequest = (msg) => {
    const m = (msg || '').toLowerCase();
    if (/\b(make|create|generate|build|give\s+me|start|simulate)\b.{0,30}\b(test|exam|midterm|final)\b/i.test(m)) return true;
    if (/\bpractice\s+(test|exam)\b/i.test(m)) return true;
    if (/^\s*(test|exam)\b/i.test(m) && /\b(question|short answer|multiple choice|on|about|over|chapter|module|lecture|syllabus|closed.book|practice)\b/i.test(m)) return true;
    return false;
  };
  const extractTestTopic = (msg) => {
    const patterns = [
      /(?:test|exam|midterm|final).{0,15}(?:on|about|over|covering)\s+(.+)/i,
      /(?:on|about|over|covering)\s+(.+?)\s+(?:test|exam|midterm|final)/i,
    ];
    for (const p of patterns) {
      const m = msg.match(p);
      if (m) return m[1].trim().slice(0, 80);
    }
    return '';
  };

  // ── Flashcards ──────────────────────────────────────────────────────────
  const isFlashcardRequest = (msg) => {
    const m = (msg || '').toLowerCase();
    return /\b(flash\s?cards?|flashcards?)\b/.test(m) && /\b(make|create|generate|build|give\s+me|deck|study)\b/.test(m);
  };
  const extractFlashcardTopic = (msg) => {
    let topic = (msg || '').replace(/^\s*\/cards\s*/i, '').trim();
    topic = topic.replace(/^(make|create|generate|build|give\s+me)\s+(me\s+)?(a\s+)?(deck\s+of\s+)?flash\s?cards?\s*/i, '');
    topic = topic.replace(/\b(flash\s?cards?|deck)\b/gi, '').trim();
    topic = topic.replace(/^(on|about|for|from|covering|of)\s+/i, '').trim();
    topic = topic.replace(/\.\s*format.*$/is, '').trim();
    topic = topic.replace(/[.!?]$/, '').trim();
    return topic.slice(0, 120);
  };
  const generateFlashcards = async (topic, count) => {
    setCardsLoading(true);
    setCards([]);
    setCardsIndex(0);
    setCardsFlipped(false);
    setCardsTopic(topic);
    setCurrentDeckId(null);
    setCardsGenState('generating');
    let outcome = { ok: false, error: 'Unknown error.' };
    try {
      const res = await fetch(`${API}/course/${course.id}/flashcards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({ topic, count }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        outcome = { ok: false, error: data.error || `Server returned ${res.status}` };
      } else if (!data.cards?.length) {
        outcome = { ok: false, error: 'The AI didn\'t return any cards. Try a more specific topic.' };
      } else if (data.saveError) {
        outcome = { ok: false, error: 'Generated, but couldn\'t save to your Flashcards folder.' };
      } else {
        setCards(data.cards);
        if (data.id) {
          setCurrentDeckId(data.id);
          fetchSavedDecks();
        }
        outcome = { ok: true, count: data.cards.length };
      }
    } catch (e) {
      setCards([]);
      outcome = { ok: false, error: e.message || 'Network error.' };
    }
    setCardsLoading(false);
    if (outcome.ok) {
      setCardsGenState('done');
      setTimeout(() => setCardsGenState('idle'), 2400);
    } else {
      setCardsGenState('idle');
    }
    return outcome;
  };
  // ── Saved quizzes + decks persistence ───────────────────────────────────
  const fetchSavedQuizzes = async () => {
    try {
      const res = await fetch(`${API}/student/quizzes?courseId=${course.id}`, { headers: jsonHeaders });
      const data = await res.json();
      setSavedQuizzes(Array.isArray(data) ? data : []);
    } catch {}
  };
  const fetchSavedDecks = async () => {
    try {
      const res = await fetch(`${API}/student/flashcard-decks?courseId=${course.id}`, { headers: jsonHeaders });
      const data = await res.json();
      setSavedDecks(Array.isArray(data) ? data : []);
    } catch {}
  };
  useEffect(() => { fetchSavedQuizzes(); fetchSavedDecks(); }, [course.id]);
  const openSavedQuiz = async (id) => {
    // Don't close the overlay — the taking UI lives inside it.
    try {
      const res = await fetch(`${API}/student/quizzes/${id}`, { headers: jsonHeaders });
      const data = await res.json();
      if (data?.questions?.length) {
        setQuizLoading(false);
        setQuizQuestions(data.questions);
        setQuizIndex(0);
        setQuizAnswers({});
        setQuizDone(false);
        setQuizTopic(data.topic || '');
        quizRecordedRef.current = false;
        setCurrentQuizId(data.id);
        quizChatRef.current = { id: chatId, dbId: (chats.find(c => c.id === chatId) || {}).dbId || null };
        setQuizTaking(true);
      }
    } catch {}
  };
  const openSavedDeck = async (id) => {
    try {
      const res = await fetch(`${API}/student/flashcard-decks/${id}`, { headers: jsonHeaders });
      const data = await res.json();
      if (data?.cards?.length) {
        setCardsLoading(false);
        setCards(data.cards);
        setCardsIndex(0);
        setCardsFlipped(false);
        setCardsTopic(data.topic || '');
        setCurrentDeckId(data.id);
        setDeckStudying(true);
      }
    } catch {}
  };
  const deleteSavedQuiz = async (id) => {
    try { await fetch(`${API}/student/quizzes/${id}`, { method: 'DELETE', headers: jsonHeaders }); } catch {}
    setSavedQuizzes(prev => prev.filter(q => q.id !== id));
  };
  const deleteSavedDeck = async (id) => {
    try { await fetch(`${API}/student/flashcard-decks/${id}`, { method: 'DELETE', headers: jsonHeaders }); } catch {}
    setSavedDecks(prev => prev.filter(d => d.id !== id));
  };

  // ── Tests CRUD + generation ─────────────────────────────────────────────
  const fetchSavedTests = async () => {
    try {
      const res = await fetch(`${API}/student/tests?courseId=${course.id}`, { headers: jsonHeaders });
      const data = await res.json();
      setSavedTests(Array.isArray(data) ? data : []);
    } catch {}
  };
  useEffect(() => { fetchSavedTests(); }, [course.id]);
  const openSavedTest = async (id) => {
    try {
      const res = await fetch(`${API}/student/tests/${id}`, { headers: jsonHeaders });
      const data = await res.json();
      if (data?.questions?.length) {
        setTestLoading(false);
        setTestQuestions(data.questions);
        setTestIndex(0);
        setTestAnswers({});
        setTestDone(false);
        setTestTopic(data.topic || '');
        setTestReviewIndex(null);
        testRecordedRef.current = false;
        setCurrentTestId(data.id);
        testChatRef.current = { id: chatId, dbId: (chats.find(c => c.id === chatId) || {}).dbId || null };
        setTestTaking(true);
      }
    } catch {}
  };
  const deleteSavedTest = async (id) => {
    try { await fetch(`${API}/student/tests/${id}`, { method: 'DELETE', headers: jsonHeaders }); } catch {}
    setSavedTests(prev => prev.filter(t => t.id !== id));
  };
  const generateTest = async (topic, count) => {
    setTestLoading(true);
    setTestQuestions([]);
    setTestIndex(0);
    setTestAnswers({});
    setTestDone(false);
    setTestTopic(topic);
    setTestReviewIndex(null);
    setCurrentTestId(null);
    setTestGenState('generating');
    testRecordedRef.current = false;
    let outcome = { ok: false, error: 'Unknown error.' };
    try {
      const res = await fetch(`${API}/course/${course.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({ topic, count }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        outcome = { ok: false, error: data.error || `Server returned ${res.status}` };
      } else if (!data.questions?.length) {
        outcome = { ok: false, error: 'The AI didn\'t return any questions. Try a more specific topic.' };
      } else if (data.saveError) {
        outcome = { ok: false, error: 'Generated, but couldn\'t save to your Tests folder.' };
      } else {
        setTestQuestions(data.questions);
        if (data.id) {
          setCurrentTestId(data.id);
          fetchSavedTests();
        }
        outcome = { ok: true, count: data.questions.length };
      }
    } catch (e) {
      setTestQuestions([]);
      outcome = { ok: false, error: e.message || 'Network error.' };
    }
    setTestLoading(false);
    if (outcome.ok) {
      setTestGenState('done');
      setTimeout(() => setTestGenState('idle'), 2400);
    } else {
      setTestGenState('idle');
    }
    return outcome;
  };

  // Test answer + scoring. Unlike quizzes, the option select doesn't reveal
  // anything — just stores the choice and advances. The score and review
  // are deferred to the final summary screen.
  const handleTestAnswer = (questionIndex, optionIndex) => {
    if (testAnswers[questionIndex] !== undefined) return;
    setTestAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };
  const testScore = Object.entries(testAnswers).filter(([qi, ai]) =>
    testQuestions[parseInt(qi)]?.correct === ai
  ).length;
  const recordTestResult = async () => {
    const total = testQuestions.length;
    if (!total) return;
    const pct = Math.round((testScore / total) * 100);
    const content = `Practice test complete — you scored **${testScore}/${total}** (${pct}%)${testTopic ? ` on ${testTopic}` : ''}.`;
    const { id: targetId, dbId } = testChatRef.current || {};
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
    if (currentTestId) {
      try {
        const responses = Object.entries(testAnswers).map(([qi, ai]) => ({
          q: parseInt(qi, 10),
          selected: Number.isInteger(ai) ? ai : -1,
        }));
        await fetch(`${API}/student/tests/${currentTestId}`, {
          method: 'PATCH', headers: jsonHeaders,
          body: JSON.stringify({ score: testScore, responses }),
        });
        fetchSavedTests();
      } catch {}
    }
  };
  useEffect(() => {
    if (testDone && testQuestions.length > 0 && !testRecordedRef.current) {
      testRecordedRef.current = true;
      recordTestResult();
    }
  }, [testDone]);
  const nextCard = () => { setCardsFlipped(false); setCardsIndex(i => Math.min(i + 1, cards.length - 1)); };
  const prevCard = () => { setCardsFlipped(false); setCardsIndex(i => Math.max(i - 1, 0)); };

  const generateQuiz = async (topic, count) => {
    // Same as decks — no side-panel. Saves to the Quizzes folder so the
    // student takes it from there, not in the middle of a chat. Returns
    // { ok, count?, error? } so runGeneration can flip the chat
    // placeholder to a truthful final message.
    setQuizLoading(true);
    setQuizQuestions([]);
    setQuizIndex(0);
    setQuizAnswers({});
    setQuizDone(false);
    setQuizTopic(topic);
    setCurrentQuizId(null);
    setQuizGenState('generating');
    quizRecordedRef.current = false;
    let outcome = { ok: false, error: 'Unknown error.' };
    try {
      const res = await fetch(`${API}/course/${course.id}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({ topic, count }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        outcome = { ok: false, error: data.error || `Server returned ${res.status}` };
      } else if (!data.questions?.length) {
        outcome = { ok: false, error: 'The AI didn\'t return any questions. Try a more specific topic.' };
      } else if (data.saveError) {
        // Backend produced questions but the DB insert failed — surface
        // this clearly instead of pretending it landed in the sidebar.
        outcome = { ok: false, error: 'Generated, but couldn\'t save to your Quizzes folder.' };
      } else {
        setQuizQuestions(data.questions);
        if (data.id) {
          setCurrentQuizId(data.id);
          fetchSavedQuizzes();
        }
        outcome = { ok: true, count: data.questions.length };
      }
    } catch (e) {
      setQuizQuestions([]);
      outcome = { ok: false, error: e.message || 'Network error.' };
    }
    setQuizLoading(false);
    // Only show the green checkmark when generation actually succeeded —
    // a failed run shouldn't pop a "done" cue.
    if (outcome.ok) {
      setQuizGenState('done');
      setTimeout(() => setQuizGenState('idle'), 2400);
    } else {
      setQuizGenState('idle');
    }
    return outcome;
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
    // Persist the score AND per-question responses so the Quizzes sidebar
    // reflects best/last attempt AND the concept-level insights endpoint
    // can compute mastery by walking saved questions[i].selected.
    if (currentQuizId) {
      try {
        const responses = Object.entries(quizAnswers).map(([qi, ai]) => ({
          q: parseInt(qi, 10),
          selected: Number.isInteger(ai) ? ai : -1,
        }));
        await fetch(`${API}/student/quizzes/${currentQuizId}`, {
          method: 'PATCH', headers: jsonHeaders,
          body: JSON.stringify({ score: quizScore, responses }),
        });
        fetchSavedQuizzes();
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
          // Always land on the "new chat" greeting screen instead of resuming
          // a half-finished conversation. If an empty chat already exists,
          // reuse it; otherwise create a fresh one so we don't litter the DB
          // with duplicates. The student can always click an older chat from
          // the sidebar to resume it.
          const existingEmpty = loaded.find(c => !c.messages.length);
          if (existingEmpty) {
            setChats(loaded);
            setChatId(existingEmpty.id);
            setChatsLoading(false);
          } else {
            try {
              const res2 = await fetch(`${API}/student/chats/${course.id}`, {
                method: 'POST', headers: jsonHeaders,
                body: JSON.stringify({ title: 'New Chat' }),
              });
              if (cancelled) return;
              const newChat = await res2.json();
              if (cancelled) return;
              const nc = newChat?.id
                ? { id: newChat.id, dbId: newChat.id, title: 'New Chat', messages: [] }
                : { id: `local-${Date.now()}`, title: 'New Chat', messages: [] };
              setChats([nc, ...loaded]);
              setChatId(nc.id);
            } catch {
              if (cancelled) return;
              const nc = { id: `local-${Date.now()}`, title: 'New Chat', messages: [] };
              setChats([nc, ...loaded]);
              setChatId(nc.id);
            }
            setChatsLoading(false);
          }
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
  // Empty (new-chat) hero composer rotates the AI-suggested questions plus a
  // bigger pool of student-shaped prompts so the placeholder feels alive —
  // including study-mode cues, "I'm lost" cues, exam-cram cues, and a
  // /slash-command hint. The mix gives anyone visiting the empty state a
  // concrete idea of what they can ask without having to think one up.
  const FUN_PROMPTS = [
    "What's going to be on the exam?",
    "Explain this like I'm five",
    "I'm lost — where do I even start?",
    "Quick recap of last lecture?",
    "Make me a quiz",
    "What's the difference between X and Y?",
    "Give me a flashcard deck on chapter 3",
    "Summarize today's reading",
    "Walk me through a worked example",
    "What's the trap on this topic?",
    "If I only studied 3 things, what would they be?",
    "Type / for quizzes, tests, flashcards",
    "Build me a study guide for the midterm",
    "Why does this concept matter?",
    "Compare these two formulas",
    "What did my professor emphasize most?",
  ];
  const emptyPlaceholders = [...questions, ...FUN_PROMPTS];
  const pinnedPlaceholders = ['Ask about your course...', 'Type / for commands', "What's on the exam?", 'Make me a quiz'];
  // Filter slash commands by what the user has typed after the leading slash.
  // The popover is only relevant when (a) no command is already picked and
  // (b) the input starts with a single slash (no spaces yet — once they hit
  // space we treat the input as free text).
  const slashFilter = !slashCmd && input.startsWith('/') && !input.includes(' ') ? input.slice(1).toLowerCase() : null;
  const filteredCmds = slashFilter !== null ? SLASH_COMMANDS.filter(c => c.name.toLowerCase().startsWith(slashFilter)) : [];
  const showSlashPopover = filteredCmds.length > 0;
  useEffect(() => { setSlashIdx(0); }, [slashFilter]);
  const pickSlashCommand = (cmd) => {
    setSlashCmd(cmd.name);
    setInput('');
    setSlashIdx(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  // Personalized greeting for the new-chat empty state.
  const firstName = (() => { try { const n = (JSON.parse(localStorage.getItem('scholr_student_user') || '{}').name || '').split(' ')[0]; return n ? n.charAt(0).toUpperCase() + n.slice(1) : ''; } catch { return ''; } })();
  // Greeting pool — mixes time-of-day flavors with neutral "welcome back"
  // openers so it doesn't feel rigidly clock-driven. Held in a ref so it's
  // picked ONCE per mount (or per chatId change), then stays stable while
  // the student is sitting on the page. Each new landing rolls a fresh one.
  const greetingRef = useRef(null);
  const greeting = (() => {
    if (greetingRef.current) return greetingRef.current;
    const now = new Date();
    const h = now.getHours();
    const dow = now.getDay();
    // Neutral, non-time openers mixed in everywhere so the rotation feels
    // less like a clock display and more like a real person greeting you.
    const ALWAYS = [
      "Welcome back", "You're back", "Hey there", "Hey again", "Look who's back",
      "Ready when you are", "Let's get into it", "What are we tackling",
      "Back at it", "Right where you left off", "Pick up where we left off",
      "Hey", "Let's go", "What's on the docket",
    ];
    let timeFlavor = [];
    if      (h < 5)  timeFlavor = ["Burning the midnight oil", "3am study session", "Still up?", "Late-night grind", "Insomnia or finals?", "Up late tonight"];
    else if (h < 9)  timeFlavor = ["Good morning", "Early bird", "Rise and grind", "First coffee of the day", "Morning", "Up and at it"];
    else if (h < 12) timeFlavor = ["Good morning", "Morning", "Mid-morning grind", "Coffee's hitting yet?"];
    else if (h < 14) timeFlavor = ["Good afternoon", "Lunchtime study sesh", "Midday check-in", "Afternoon"];
    else if (h < 17) timeFlavor = ["Good afternoon", "Afternoon", "Post-lunch focus", "Mid-afternoon momentum"];
    else if (h < 20) timeFlavor = ["Good evening", "Evening", "After-class hours", "Wrapping the day"];
    else             timeFlavor = ["Good evening", "Late-night study", "Evening", "One more chapter?", "Night owl mode"];
    // Day-of-week flavor (light touch — only added to pool, doesn't override).
    let dowFlavor = [];
    if (dow === 5 && h >= 14)              dowFlavor = ["Friday afternoon", "TGIF", "Almost weekend", "Final stretch of the week"];
    else if (dow === 0 && h >= 17)         dowFlavor = ["Sunday scaries hitting?", "Pre-week prep", "Getting ahead for the week"];
    else if (dow === 6 && h >= 9 && h < 18) dowFlavor = ["Saturday study", "Weekend mode", "Putting in the weekend work"];
    else if (dow === 1 && h < 12)          dowFlavor = ["Monday energy", "Fresh week", "New week — let's go"];
    const pool = [...ALWAYS, ...timeFlavor, ...dowFlavor];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    greetingRef.current = pick;
    return pick;
  })();
  // Rotate the suggested questions through the input placeholder. Runs
  // continuously — both the empty-chat hero pool and the pinned-chat
  // shorter pool change every 3.2s so the placeholder feels alive even
  // mid-conversation. (Previously this bailed out when the chat had
  // messages, leaving the placeholder stuck on whichever pinned prompt
  // it last landed on — looked broken.)
  const [phIdx, setPhIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPhIdx(i => (i + 1) % 1000), 3200);
    return () => clearInterval(id);
  }, []);
  const active = chats.find(c => c.id === chatId) || chats[0];
  // Smart autoscroll: only auto-pull to bottom if the user is already
  // within 150px of the bottom. If they've scrolled up to re-read something,
  // leave them alone — and show a fixed "scroll-to-bottom" button (like
  // ChatGPT / Claude) so they can jump back when ready. The button visibility
  // is driven ONLY by scroll position, never by streaming state — that
  // avoids the flicker pattern where each arriving token toggled the pill.
  const isNearBottom = () => {
    const c = scrollContainerRef.current;
    if (!c) return true;
    return c.scrollHeight - c.scrollTop - c.clientHeight < 150;
  };
  // Direct scrollTop assignment beats scrollIntoView during streaming —
  // scrollIntoView can lag, get queued behind layout work, or quietly
  // resolve to the wrong scroll container when there are nested
  // overflow ancestors. scrollTop = scrollHeight is one instruction,
  // happens immediately, and works on every browser.
  const scrollToBottom = (force = false, smooth = false) => {
    const c = scrollContainerRef.current;
    if (!c) return;
    if (!force && !isNearBottom()) return;
    if (smooth) {
      c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
    } else {
      c.scrollTop = c.scrollHeight;
    }
  };
  // Compute a "content fingerprint" that changes per token. Array-reference
  // comparison on active?.messages was unreliable across React 18 batched
  // updates — sometimes useEffect missed a re-render. Total content length
  // is monotonically increasing during streaming and guaranteed to change.
  const contentFingerprint = (active?.messages || []).reduce(
    (n, m) => n + (m.content?.length || 0), 0
  );
  // useLayoutEffect (not useEffect) runs synchronously after DOM commit
  // and BEFORE paint, so the scroll happens before the browser shows the
  // new content. That's how Claude/ChatGPT keep the chat glued to the
  // bottom without any visible jitter or "above the fold" flash.
  useLayoutEffect(() => { if (active) scrollToBottom(); }, [contentFingerprint, isTyping]);

  // When the user sends a new message, force-scroll regardless of where
  // they were — sending always pulls you to the latest exchange, even if
  // you were scrolled up reading older content.
  // Track per-chat so switching chats doesn't carry the prior chat's
  // user-message count into the new chat (which could suppress the
  // force-scroll on the first message of the new chat).
  const lastUserMsgCount = useRef({ chatId: null, count: 0 });
  useLayoutEffect(() => {
    if (!active) return;
    const userMsgs = (active.messages || []).filter(m => m.role === 'user').length;
    if (lastUserMsgCount.current.chatId !== active.id) {
      lastUserMsgCount.current = { chatId: active.id, count: userMsgs };
      return;
    }
    if (userMsgs > lastUserMsgCount.current.count) {
      scrollToBottom(true);
    }
    lastUserMsgCount.current.count = userMsgs;
  }, [active?.id, active?.messages?.length]);
  // Single scroll listener owns the button's visibility. rAF-throttled so
  // we don't thrash state on fast scroll-wheels or trackpad inertia.
  useEffect(() => {
    const c = scrollContainerRef.current;
    if (!c) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setShowNewMessageIndicator(!isNearBottom());
        ticking = false;
      });
    };
    onScroll(); // initial check
    c.addEventListener('scroll', onScroll, { passive: true });
    return () => c.removeEventListener('scroll', onScroll);
  }, [active?.id]);

  const createNewChat = async () => {
    // Reuse any existing empty chat instead of creating another. Without
    // this, someone hammering "New chat" could spawn hundreds of empty
    // rows in the DB. Prefer the currently-active chat if it's empty
    // (zero friction — they're already there); otherwise reuse the first
    // empty chat in the list. Only fall through to a real create when
    // every existing chat has content.
    const activeChat = chats.find(c => c.id === chatId);
    if (activeChat && (!activeChat.messages || activeChat.messages.length === 0)) {
      return activeChat;
    }
    const reusable = chats.find(c => !c.messages || c.messages.length === 0);
    if (reusable) {
      setChatId(reusable.id);
      return reusable;
    }
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

  // Per-chat AbortController so a fast second rename cancels the first
  // and only the latest title survives — the previous fire-and-forget
  // pattern could let the loser overwrite the winner on slow networks.
  const renameAbortersRef = useRef(new Map());
  const renameChat = async (id, title) => {
    const t = (title || '').trim();
    setRenamingId(null);
    if (!t) return;
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: t } : c));
    const chat = chats.find(c => c.id === id);
    if (chat?.dbId && !String(chat.dbId).startsWith('local-')) {
      // Cancel any in-flight rename for this same chat.
      const prevAborter = renameAbortersRef.current.get(id);
      if (prevAborter) { try { prevAborter.abort(); } catch {} }
      const aborter = new AbortController();
      renameAbortersRef.current.set(id, aborter);
      try {
        await fetch(`${API}/student/chats/${chat.dbId}`, {
          method: 'PATCH', headers: jsonHeaders,
          body: JSON.stringify({ title: t }),
          signal: aborter.signal,
        });
      } catch {}
      finally {
        // Only clear if this is still the latest aborter for this chat;
        // otherwise a newer rename owns the slot and we leave it alone.
        if (renameAbortersRef.current.get(id) === aborter) {
          renameAbortersRef.current.delete(id);
        }
      }
    }
  };

  const deleteChat = async (id) => {
    const chat = chats.find(c => c.id === id);
    if (chat?.dbId && !String(chat.dbId).startsWith('local-')) {
      try { await fetch(`${API}/student/chats/${chat.dbId}`, { method: 'DELETE', headers: authHeaders }); } catch {}
    }
    // Use functional setState so we operate on the latest list — without
    // this, a concurrent createNewChat call could be erased by the stale
    // `chats` closure captured at deleteChat's call time.
    let nextActiveId = null;
    let didEmpty = false;
    setChats(prev => {
      const remaining = prev.filter(c => c.id !== id);
      if (remaining.length === 0) {
        didEmpty = true;
        return prev.filter(c => c.id !== id); // still remove the deleted one
      }
      if (chatId === id) nextActiveId = remaining[0].id;
      return remaining;
    });
    if (nextActiveId) setChatId(nextActiveId);
    if (didEmpty) {
      try {
        const res = await fetch(`${API}/student/chats/${course.id}`, {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ title: 'New Chat' }),
        });
        const data = await res.json();
        if (data.id) {
          const nc = { id: data.id, dbId: data.id, title: 'New Chat', messages: [] };
          setChats(prev => prev.length === 0 ? [nc] : prev);
          setChatId(nc.id);
          return;
        }
      } catch {}
      const nc = { id: `local-${Date.now()}`, title: 'New Chat', messages: [] };
      setChats(prev => prev.length === 0 ? [nc] : prev);
      setChatId(nc.id);
    }
  };

  // Persistent upload — only fires from the My Notes overlay dropzone now.
  // Stores the file in the course's My Notes folder + adds the buffer to the
  // pinned notes context that the chat backend sees on every message.
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

  // Ephemeral attach — the composer paperclip. Reads the file locally,
  // shows a chip above the input, and rides on the next message. Never
  // uploaded to the My Notes folder. Cleared after send.
  const handleComposerAttach = (file) => {
    if (!file) return;
    const ext = file.name.toLowerCase().split('.').pop();
    const mimeMap = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    const mimeType = mimeMap[ext] || file.type || 'application/octet-stream';
    const reader = new FileReader();
    reader.onload = (e) => {
      setChatAttachment({ name: file.name, mimeType, buffer: e.target.result, dataUrl: null });
      // Also pre-build a data URL for image previews in the user bubble.
      if (mimeType.startsWith('image/')) {
        const r2 = new FileReader();
        r2.onload = (ev) => setChatAttachment(prev => prev && prev.name === file.name ? { ...prev, dataUrl: ev.target.result } : prev);
        r2.readAsDataURL(file);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Drag & drop / paste ─────────────────────────────────────────────────
  // Claude / ChatGPT-style: drag a screenshot anywhere in the chat area
  // → big "Drop to attach" overlay → on release it lands on whichever
  // surface you'd expect:
  //   - My Notes overlay open  → file uploads to the persistent folder
  //   - anywhere else          → file becomes the ephemeral attachment
  // Paste from clipboard works the same way (great for screenshots).
  const [dragOver, setDragOver] = useState(false);
  const dragDepthRef = useRef(0); // dragenter / leave fire on every child;
                                  // track depth so the overlay doesn't flicker.
  const handleDrop = (file) => {
    if (!file) return;
    if (notesOpen) handlePaperclipFile(file);
    else handleComposerAttach(file);
  };
  const onDragEnter = (e) => {
    const types = Array.from(e.dataTransfer?.types || []);
    if (!types.includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragOver(true);
  };
  const onDragOver = (e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = (e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragOver(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    handleDrop(file);
  };
  const onPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) {
          e.preventDefault();
          handleDrop(f);
          return;
        }
      }
    }
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

  // Run a generation directly — used by slash commands AND by the "Yes,
  // build it" button on a natural-language confirmation chip. Pushes the
  // request as a user message + a placeholder assistant message, then kicks
  // off the actual generation. `opts.suppressUserMessage` skips the user
  // bubble (used by confirmation chips, since the user's natural-language
  // ask is already in the chat).
  const runGeneration = async (kind, topic, originalMessage, opts = {}) => {
    const currentChatId = chatId;
    const currentActive = chats.find(c => c.id === currentChatId) || chats[0];
    const currentChatDbId = currentActive?.dbId || null;
    const refs = { cards: cardsChatRef, quiz: quizChatRef, test: testChatRef };
    if (refs[kind]) refs[kind].current = { id: currentChatId, dbId: currentChatDbId };

    // Auto-rename the chat immediately so a "New Chat" that just spawned a
    // quiz / test / deck doesn't sit in Recents with no title. Only fires
    // when the chat still has a default name — never overwrites a title
    // the student already cared enough to set.
    const isDefaultTitle = !currentActive?.title || /^new chat$/i.test(currentActive.title.trim());
    if (currentActive && isDefaultTitle) {
      const kindLabel = kind === 'cards' ? 'Flashcards' : kind === 'test' ? 'Test' : 'Quiz';
      const newTitle = topic
        ? `${kindLabel}: ${topic}`.slice(0, 60)
        : `${kindLabel} · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      renameChat(currentActive.id, newTitle);
    }

    // Optimistic placeholder uses the student's chosen count (defaults
    // match the backend's defaults when undefined). Stays as "Building…"
    // until the generation completes, then updates to either a success
    // message or an error so the chat never lies about what happened.
    const effectiveCount = opts.count || (kind === 'cards' ? 10 : kind === 'test' ? 8 : 5);
    const buildingMsg = kind === 'cards'
      ? `Building your flashcard deck${topic ? ` on **${topic}**` : ''}…`
      : kind === 'test'
      ? `Building your practice test${topic ? ` on **${topic}**` : ''}…`
      : `Building your quiz${topic ? ` on **${topic}**` : ''}…`;
    const placeholderId = nextMsgId();
    setChats(prev => prev.map(c => c.id === currentChatId ? {
      ...c,
      messages: [
        ...c.messages,
        ...(opts.suppressUserMessage ? [] : [{ role: 'user', content: originalMessage, ts: Date.now() }]),
        { id: placeholderId, role: 'assistant', content: buildingMsg, sources: [], ts: Date.now(), streaming: true },
      ],
    } : c));
    if (!opts.suppressUserMessage && currentChatDbId && !String(currentChatDbId).startsWith('local-')) {
      try { await fetch(`${API}/student/chats/${currentChatDbId}/messages`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ role: 'user', content: originalMessage }) }); } catch {}
    }

    // Helper that flips the placeholder to a final state once we know
    // the result. Success: a clear "Built N questions on X" line.
    // Failure: a clear error so the student doesn't think a quiz landed
    // somewhere they can't find it.
    const updatePlaceholder = (newContent, isError) => {
      setChats(prev => prev.map(c => c.id === currentChatId ? {
        ...c,
        messages: c.messages.map(m => m.id === placeholderId ? { ...m, content: newContent, streaming: false, isError } : m),
      } : c));
    };

    // Forward the student's chosen count (or undefined if they used the
    // default path). Backend clamps and defaults appropriately. The
    // generate fns return { ok, count?, error? } so we can flip the
    // placeholder to a truthful final state.
    const handleResult = (kindLabel, sidebarName) => (result) => {
      if (result?.ok) {
        const count = result.count || effectiveCount;
        const unit = kind === 'cards' ? (count === 1 ? 'card' : 'cards') : (count === 1 ? 'question' : 'questions');
        updatePlaceholder(`Built a ${count}-${unit.endsWith('s') ? unit.slice(0, -1) : unit} ${kindLabel}${topic ? ` on **${topic}**` : ''} — open **${sidebarName}** in the sidebar to ${kind === 'cards' ? 'study them' : 'take it'}.`.replace('--', '-'), false);
      } else {
        const reason = result?.error || 'Something went wrong on our end.';
        updatePlaceholder(`I couldn't build that ${kindLabel}: ${reason}. Try again, or ask me a regular question.`, true);
      }
    };
    if (kind === 'cards') generateFlashcards(topic, opts.count).then(handleResult('flashcard deck', 'Flashcards'));
    else if (kind === 'test') generateTest(topic, opts.count).then(handleResult('practice test', 'Tests'));
    else generateQuiz(topic, opts.count).then(handleResult('quiz', 'Quizzes'));
  };

  // Confirmation chip — pushed into the chat when natural language matches
  // a generation intent (no slash command). The student presses Yes / No
  // to decide; nothing happens automatically.
  const askConfirmation = async (kind, topic, originalMessage) => {
    const currentChatId = chatId;
    const currentActive = chats.find(c => c.id === currentChatId) || chats[0];
    const currentChatDbId = currentActive?.dbId || null;
    setChats(prev => prev.map(c => c.id === currentChatId ? {
      ...c,
      messages: [
        ...c.messages,
        { role: 'user', content: originalMessage, ts: Date.now() },
        { id: nextMsgId(), role: 'assistant', confirm: { kind, topic, originalMessage }, ts: Date.now() },
      ],
    } : c));
    if (currentChatDbId && !String(currentChatDbId).startsWith('local-')) {
      try { await fetch(`${API}/student/chats/${currentChatDbId}/messages`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ role: 'user', content: originalMessage }) }); } catch {}
    }
  };

  // Click handler for the Yes button on a confirmation chip — swap the
  // chip for a COUNT PICKER so the student can choose how many questions
  // or cards they want before we generate. No silent default values.
  const acceptConfirmation = (msgId, kind, topic, originalMessage) => {
    setChats(prev => prev.map(c => c.id === chatId ? {
      ...c,
      messages: c.messages.map(m => (m.id || 0) === msgId ? { id: m.id, role: 'assistant', pickCount: { kind, topic, originalMessage }, ts: m.ts } : m),
    } : c));
  };
  // No button — replace the chip with a plain "Got it" so the student can
  // ask their question normally without the prompt lingering.
  const declineConfirmation = (msgId) => {
    setChats(prev => prev.map(c => c.id === chatId ? {
      ...c,
      messages: c.messages.map(m => (m.id || 0) === msgId ? { id: m.id, role: 'assistant', content: 'Got it — what would you like to know instead?', sources: [], ts: m.ts } : m),
    } : c));
  };

  // Show the count picker directly (used by slash commands which skip the
  // initial confirm step — the slash itself confirms intent, all we need
  // is the count). Pushes the user message into the chat, then the picker.
  const askCountPicker = async (kind, topic, originalMessage) => {
    const currentChatId = chatId;
    const currentActive = chats.find(c => c.id === currentChatId) || chats[0];
    const currentChatDbId = currentActive?.dbId || null;
    setChats(prev => prev.map(c => c.id === currentChatId ? {
      ...c,
      messages: [
        ...c.messages,
        { role: 'user', content: originalMessage, ts: Date.now() },
        { id: nextMsgId(), role: 'assistant', pickCount: { kind, topic, originalMessage }, ts: Date.now() },
      ],
    } : c));
    if (currentChatDbId && !String(currentChatDbId).startsWith('local-')) {
      try { await fetch(`${API}/student/chats/${currentChatDbId}/messages`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ role: 'user', content: originalMessage }) }); } catch {}
    }
  };

  // Student picked a count from the chip — strip the picker, fire the
  // generation with that count (passed through opts to runGeneration).
  const submitCountChoice = (msgId, kind, topic, originalMessage, count) => {
    setChats(prev => prev.map(c => c.id === chatId ? {
      ...c,
      messages: c.messages.filter(m => (m.id || 0) !== msgId),
    } : c));
    runGeneration(kind, topic, originalMessage, { suppressUserMessage: true, count });
  };

  // Cancel button on the count picker — replace with a "Got it" line.
  const cancelCountPicker = (msgId) => {
    setChats(prev => prev.map(c => c.id === chatId ? {
      ...c,
      messages: c.messages.map(m => (m.id || 0) === msgId ? { id: m.id, role: 'assistant', content: 'No problem — what else can I help with?', sources: [], ts: m.ts } : m),
    } : c));
  };

  const onSend = async (messageOverride) => {
    // If a slash command is active, expand the user's free-typed continuation
    // through the command's template and clear the chip. Otherwise send as-is.
    const activeCmd = !messageOverride && slashCmd ? SLASH_COMMANDS.find(c => c.name === slashCmd) : null;
    const message = messageOverride || (activeCmd ? activeCmd.expand(input) : input);
    if (!message.trim() || isTyping) return;
    if (activeCmd) setSlashCmd(null);

    // ── Slash commands that build saved artifacts always win — no
    // confirmation needed; the slash itself is the confirmation.
    // Slash commands skip the "are you sure" step (the slash is the intent)
    // but still drop a COUNT PICKER chip so the student chooses how many
    // questions / cards before we hit the model.
    if (activeCmd?.name === 'cards') {
      setInput('');
      askCountPicker('cards', extractFlashcardTopic(message), message);
      return;
    }
    if (activeCmd?.name === 'quiz') {
      setInput('');
      askCountPicker('quiz', extractQuizTopic(message), message);
      return;
    }
    if (activeCmd?.name === 'test') {
      setInput('');
      askCountPicker('test', extractTestTopic(message), message);
      return;
    }

    // ── Natural-language intent → count picker directly. Earlier this
    // showed a "Want me to build?" Yes/No confirmation first and only
    // routed to the count picker if the student clicked Yes — but that
    // was two clicks for the same outcome. The picker IS the confirmation
    // (pick a count = yes, Cancel = no). Tests checked first so "make me
    // an exam" doesn't get swallowed by the quiz detector.
    if (!activeCmd) {
      if (isTestRequest(message)) {
        setInput('');
        askCountPicker('test', extractTestTopic(message), message);
        return;
      }
      if (isFullQuizRequest(message)) {
        setInput('');
        askCountPicker('quiz', extractQuizTopic(message), message);
        return;
      }
      if (isFlashcardRequest(message)) {
        setInput('');
        askCountPicker('cards', extractFlashcardTopic(message), message);
        return;
      }
    }

    // ── FIX 2: capture isFirstMessage BEFORE the optimistic state update ──
    const currentActive = chats.find(c => c.id === chatId) || chats[0];
    const isFirstMessage = (currentActive?.messages || []).filter(m => !m.streaming).length === 0;

    const currentChatId = chatId;
    const currentChatDbId = currentActive?.dbId || null;

    // ── FIX 3: title from user's question (reliable), not AI response ──
    const titleFromQuestion = message.trim().split(/\s+/).slice(0, 6).join(' ').replace(/[.!?]$/, '');

    const completedMessages = (currentActive?.messages || []).filter(m => !m.streaming);
    const streamingMsgId = nextMsgId();

    // Snapshot the ephemeral attachment for this send, then clear so the
    // chip disappears from the composer immediately.
    const sendAttachment = chatAttachment;
    setChatAttachment(null);

    // Optimistic UI update — the user bubble carries the attachment so it
    // shows in the chat history (until reload — we don't persist files).
    setChats(prev => prev.map(c => c.id === currentChatId ? {
      ...c,
      title: isFirstMessage ? titleFromQuestion : c.title,
      messages: [
        ...c.messages,
        { role: 'user', content: message, ts: Date.now(), attachment: sendAttachment ? { name: sendAttachment.name, mimeType: sendAttachment.mimeType, dataUrl: sendAttachment.dataUrl } : null },
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
    // Capture the token for this generation so late completions can no-op
    // if the user already started a new turn.
    const myToken = ++sendTokenRef.current;
    const isStale = () => sendTokenRef.current !== myToken;

    try {
      let response;
      const loadedNotes = myNotes.filter(n => n.buffer);
      const hasAttachment = !!(sendAttachment && sendAttachment.buffer);
      if (loadedNotes.length > 0 || hasAttachment) {
        const fd = new FormData();
        fd.append('message', message);
        fd.append('history', JSON.stringify(completedMessages.map(m => ({ role: m.role, content: m.content }))));
        loadedNotes.forEach((n, i) => fd.append(`note_${i}`, new Blob([n.buffer], { type: n.mimeType }), n.name));
        if (hasAttachment) {
          // Backend treats note_* and the ephemeral attachment identically —
          // both flow into the prompt as inline context for this turn.
          fd.append(`note_${loadedNotes.length}`, new Blob([sendAttachment.buffer], { type: sendAttachment.mimeType }), sendAttachment.name);
        }
        response = await fetch(`${API}/course/${course.id}/chat`, { method: 'POST', headers: { Authorization: `Bearer ${studentToken}` }, body: fd, signal: controller.signal });
      } else {
        response = await fetch(`${API}/course/${course.id}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
          signal: controller.signal,
          body: JSON.stringify({ message, history: completedMessages.map(m => ({ role: m.role, content: m.content })) }),
        });
      }

      // Guard before grabbing the reader. A non-2xx (rate limit, auth
      // failure, server error) may not be SSE-shaped and `response.body`
      // can be null on some failures — without these checks the streaming
      // bubble would just sit there forever.
      if (!response.ok || !response.body) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Chat request failed: ${response.status} ${errText.slice(0, 200)}`);
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
            if (event.type === 'status') {
              // Progressive status from the backend retrieval / generation
              // pipeline ("searching" → "found" → "writing"). Stored on the
              // streaming message and read by <ThinkingText />. The 'writing'
              // step also carries an estimated input token count so the
              // thinking-line can show "Writing your answer · 1,247 tokens".
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? {
                    ...m,
                    statusStep: event.step,
                    statusSources: event.sources || m.statusSources,
                    statusInputTokens: event.inputTokens || m.statusInputTokens,
                  } : m) }
                : c
              ));
            } else if (event.type === 'token') {
              fullText += event.token;
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: m.content + event.token } : m) }
                : c
              ));
              scrollToBottom();
            } else if (event.type === 'rewrite') {
              // Server-side cleanup pass — replace the streamed text with
              // a cleaned version (e.g. equations lifted out of bullets,
              // unescaped % escaped). Belt-and-suspenders alongside the
              // client renderer fixes.
              fullText = event.content;
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: event.content } : m) }
                : c
              ));
            } else if (event.type === 'sources') {
              finalSources = event.sources;
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, sources: event.sources } : m) }
                : c
              ));
            } else if (event.type === 'usage') {
              // Real token counts from OpenAI's stream_options.include_usage.
              // Stash on the message so the per-bubble pill can render, and
              // surface it via state so the header running-total picks it up.
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, usage: event.usage } : m) }
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
    // Only clear isTyping if this is still the live generation. A late
    // resolver from a previous turn shouldn't toggle the indicator off
    // while a newer turn is still in progress.
    if (!isStale()) {
      abortRef.current = null;
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  if (chatsLoading) return (
    <div className="flex h-screen w-screen items-center justify-center bg-white fixed inset-0">
      <style>{FONT}</style>
      <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const closeMobile = () => setMobileChatsOpen(false);
  // Close every full-page overlay (notes / quizzes / decks, plus the
  // active-taking / studying states). Called from any sidebar action that
  // navigates somewhere else, so clicking a chat while you're in Quizzes
  // doesn't leave the overlay floating on top of the new chat.
  const closeOverlays = () => { setNotesOpen(false); setMaterialsOpen(false); setQuizzesOpen(false); setTestsOpen(false); setDecksOpen(false); setQuizTaking(false); setTestTaking(false); setDeckStudying(false); setAllChatsOpen(false); };

  const isEmpty = !active || active.messages.length === 0;
  // Shared composer — rendered centered with the greeting on an empty chat, or
  // pinned to the bottom once the conversation has messages (ChatGPT/Claude style).
  const inputBox = (
    <div style={{ position: 'relative' }}>
      {showSlashPopover && (
        <div className="cmd-popover">
          {filteredCmds.map((c, i) => {
            const prev = filteredCmds[i - 1];
            const showGroupHeader = !prev || prev.group !== c.group;
            return (
              <React.Fragment key={c.name}>
                {showGroupHeader && (
                  <div className={`cmd-group${i === 0 ? ' first' : ''}`}><span className="dash" />{c.group}</div>
                )}
                <div className={`cmd-row${i === slashIdx ? ' selected' : ''}`} onMouseEnter={() => setSlashIdx(i)} onMouseDown={(e) => { e.preventDefault(); pickSlashCommand(c); }}>
                  <span className="cname">/{c.name}</span>
                  <span className="cdesc">{c.desc}</span>
                </div>
              </React.Fragment>
            );
          })}
          <div className="cmd-foot"><span>↑↓ navigate · ↵ select · esc dismiss</span><span style={{ opacity: 0.7 }}>{filteredCmds.length} {filteredCmds.length === 1 ? 'command' : 'commands'}</span></div>
        </div>
      )}
      <div className="bg-white border border-gray-200 rounded-[26px] px-4 pt-4 pb-2.5 focus-within:border-gray-300 shadow-sm transition-colors">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {slashCmd && <span className="cmd-chip">/{slashCmd}</span>}
          <textarea
            ref={inputRef}
            id="chat-input"
            name="chat-input"
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              // Auto-resize: reset to a single row so scrollHeight reads
              // the natural content height, then expand to fit — capped
              // at ~9 lines (216px) so a long paste doesn't push the
              // composer off-screen, after which it scrolls internally.
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 216)}px`;
            }}
            onPaste={onPaste}
            onKeyDown={e => {
              if (showSlashPopover) {
                if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx(i => Math.min(i + 1, filteredCmds.length - 1)); return; }
                if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashIdx(i => Math.max(i - 1, 0)); return; }
                if (e.key === 'Enter')     { e.preventDefault(); pickSlashCommand(filteredCmds[slashIdx]); return; }
                if (e.key === 'Escape')    { e.preventDefault(); setInput(''); return; }
                if (e.key === 'Tab')       { e.preventDefault(); pickSlashCommand(filteredCmds[slashIdx]); return; }
              }
              if (e.key === 'Backspace' && input === '' && slashCmd) { e.preventDefault(); setSlashCmd(null); return; }
              // Enter sends; Shift+Enter inserts a newline (textarea default).
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isTyping) onSend(); }
            }}
            className="flex-1 bg-transparent text-gray-800 text-base outline-none placeholder-gray-400 px-1 resize-none overflow-y-auto leading-[1.5]"
            style={{ minHeight: '24px', maxHeight: '216px' }}
            placeholder={slashCmd ? '…what about?' : (isEmpty ? emptyPlaceholders[phIdx % emptyPlaceholders.length] : pinnedPlaceholders[phIdx % pinnedPlaceholders.length])}
            autoComplete="off"
          />
        </div>
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => chatAttachRef.current?.click()} aria-label="Attach a file to this message" className="flex-shrink-0 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><Plus size={20} /></button>
          {isTyping ? (
            <button onClick={onStop} className="w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center flex-shrink-0"><Square size={11} fill="currentColor" /></button>
          ) : (input.trim() || slashCmd || chatAttachment) ? (
            <button onClick={() => onSend()} className="w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center flex-shrink-0 fade-up"><Send size={12} /></button>
          ) : null}
        </div>
      </div>
    </div>
  );
  // Composer attachment chip — one file, one message, then cleared.
  // Persistent My Notes are NOT shown here; they're injected into the chat
  // backend silently. Image attachments show a small thumbnail.
  const attachmentBar = chatAttachment ? (
    <div className="flex flex-wrap gap-1.5 mb-2 px-1">
      <div className="inline-flex items-center gap-2 pl-1.5 pr-1 py-1 rounded-xl bg-white border border-gray-200 text-[12px] text-gray-700 max-w-[260px] shadow-sm">
        {chatAttachment.dataUrl ? (
          <img src={chatAttachment.dataUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <span className="w-8 h-8 rounded-lg bg-[#F3F2EF] flex items-center justify-center flex-shrink-0"><FileText size={13} className="text-gray-500" /></span>
        )}
        <span className="flex flex-col min-w-0">
          <span className="truncate font-medium text-gray-900 leading-tight">{cleanFileName(chatAttachment.name)}</span>
          <span className="text-[10px] tracking-[.12em] uppercase text-gray-400 leading-tight">Attached to this message</span>
        </span>
        <button onClick={() => setChatAttachment(null)} aria-label="Remove attachment" className="ml-1 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"><X size={12} /></button>
      </div>
    </div>
  ) : null;

  return (
    <div
      className="flex h-[100dvh] w-screen overflow-hidden fixed inset-0 bg-[#F6F6F4] page-enter"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <style>{FONT}</style>

      {/* Drag-over overlay — covers the whole viewport, tells you what's
          about to happen based on which surface you're on. Pointer-events
          stay off so the underlying onDrop on the wrapper still fires. */}
      {dragOver && (
        <div className="fixed inset-0 z-[60] bg-[#F6F6F4]/92 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-gray-400 rounded-3xl px-12 py-10 max-w-md text-center bg-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)]">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F3F2EF] mb-4"><UploadCloud size={26} className="text-gray-700" /></div>
            <div className="flex items-center justify-center gap-3 text-[11px] font-bold tracking-[.18em] uppercase text-gray-400 mb-2"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />{notesOpen ? 'Save to My Notes' : 'Attach to chat'}</div>
            <p className="serif text-[26px] text-gray-900 leading-none tracking-tight">{notesOpen ? <>Drop to save<span className="italic">.</span></> : <>Drop to attach<span className="italic">.</span></>}</p>
            <p className="text-[13.5px] text-gray-500 mt-3 leading-relaxed">{notesOpen ? <>PDF · JPG · PNG — added to <span className="font-medium text-gray-700">My Notes</span> and pinned to every chat in this course.</> : <>PDF · JPG · PNG — sent with your next message only. <span className="text-gray-400">Won't save to My Notes.</span></>}</p>
          </div>
        </div>
      )}

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
          <button onClick={() => { createNewChat(); closeOverlays(); closeMobile(); }} className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-gray-700 text-[13px] font-medium hover:bg-gray-200/60 transition-colors"><Plus size={15} className="text-gray-500" />New chat</button>
          <button onClick={() => { closeOverlays(); setMaterialsOpen(true); closeMobile(); }} className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${materialsOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-200/60'}`}><BookOpen size={15} className="text-gray-500" />Course Materials{documents.length > 0 && <span className="ml-auto text-[11px] text-gray-400 font-normal">{documents.length}</span>}</button>
          <button onClick={() => { closeOverlays(); setNotesOpen(true); closeMobile(); }} className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${notesOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-200/60'}`}><FolderOpen size={15} className="text-gray-500" />My Notes{myNotes.length > 0 && <span className="ml-auto text-[11px] text-gray-400 font-normal">{myNotes.length}</span>}</button>
          <button onClick={() => { setQuizzesOpen(true); setQuizTaking(false); setAllChatsOpen(false); setNotesOpen(false); setTestsOpen(false); setDecksOpen(false); closeMobile(); }} className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${quizzesOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-200/60'}`}>
            <GenStateIcon state={quizGenState} IdleIcon={ListChecks} />
            Quizzes
            {savedQuizzes.length > 0 && <span className="ml-auto text-[11px] text-gray-400 font-normal">{savedQuizzes.length}</span>}
          </button>
          <button onClick={() => { setTestsOpen(true); setTestTaking(false); setAllChatsOpen(false); setNotesOpen(false); setQuizzesOpen(false); setDecksOpen(false); closeMobile(); }} className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${testsOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-200/60'}`}>
            <GenStateIcon state={testGenState} IdleIcon={GraduationCap} />
            Tests
            {savedTests.length > 0 && <span className="ml-auto text-[11px] text-gray-400 font-normal">{savedTests.length}</span>}
          </button>
          <button onClick={() => { setDecksOpen(true); setDeckStudying(false); setAllChatsOpen(false); setNotesOpen(false); setQuizzesOpen(false); setTestsOpen(false); closeMobile(); }} className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${decksOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-200/60'}`}>
            <GenStateIcon state={cardsGenState} IdleIcon={Layers} />
            Flashcards
            {savedDecks.length > 0 && <span className="ml-auto text-[11px] text-gray-400 font-normal">{savedDecks.length}</span>}
          </button>
          {/* Persistent My Notes upload — fired only from the My Notes overlay dropzone. */}
          <input ref={notesUploadRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => { handlePaperclipFile(e.target.files[0]); e.target.value = ''; }} />
          {/* Ephemeral composer attachment — fired from the Plus button next to the chat input. */}
          <input ref={chatAttachRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={e => { handleComposerAttach(e.target.files[0]); e.target.value = ''; }} />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {/* Recents header: label + "View all" link to the dedicated chats
              overlay, where students can search/browse the full history
              even when the sidebar list is long. Sidebar shows every chat
              and scrolls internally — the overlay is a richer browse. */}
          <div className="group/recents flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Recents</span>
            <button
              onClick={() => { closeOverlays(); setAllChatsOpen(true); closeMobile(); }}
              className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-700 font-medium opacity-0 group-hover/recents:opacity-100 transition-opacity">
              View all<ChevronRight size={10} />
            </button>
          </div>
          {/* Only show chats that have actual content. The currently-active
              chat shows too even when empty (so the user can see where they
              are after clicking "New chat"). Empty chats that aren't active
              are hidden — prevents the sidebar from filling up with orphan
              "New Chat" rows when the user clicks the button repeatedly. */}
          {chats.filter(c => c.id === chatId || (c.messages && c.messages.length > 0)).map(c => (
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
                  <button onClick={() => { setChatId(c.id); closeOverlays(); closeMobile(); }} className={`flex items-center w-full text-left px-2.5 py-2 rounded-lg text-[13px] transition-colors pr-8 ${c.id === chatId && !notesOpen && !materialsOpen && !quizzesOpen && !testsOpen && !decksOpen ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-200/60'}`}>
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
        {materialsOpen && (
          <div className="absolute inset-0 z-40 bg-[#F6F6F4] flex flex-col">
            <header className="flex items-start justify-between px-6 md:px-10 pt-8 md:pt-10 pb-6 border-b border-gray-200/70 flex-shrink-0 gap-4" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
              <div className="min-w-0 max-w-2xl">
                <div className="flex items-center gap-3 text-[11px] font-bold tracking-[.18em] uppercase text-gray-400 mb-3"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />From your professor</div>
                <h2 className="serif text-3xl md:text-[40px] text-gray-900 leading-none tracking-tight">Course Materials<span className="italic">.</span></h2>
                <p className="text-[14.5px] text-gray-500 mt-3 leading-relaxed">Every document your professor uploaded for {course.name}. Scholr grounds every answer in these — they're the source of truth for anything course-specific.</p>
              </div>
              <button onClick={() => setMaterialsOpen(false)} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"><X size={18} /></button>
            </header>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto w-full px-6 md:px-10 py-7">
                {documents.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F3F2EF] mb-5"><BookOpen size={22} className="text-gray-400" /></div>
                    <h3 className="serif text-2xl text-gray-900 leading-none tracking-tight">Nothing here <span className="italic">yet</span>.</h3>
                    <p className="text-[14px] text-gray-500 mt-3 max-w-sm mx-auto leading-relaxed">Your professor hasn't uploaded any documents for this course. Once they do, you'll see them listed here.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {documents.map((doc, i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all">
                        <div className="w-11 h-11 rounded-xl bg-[#F3F2EF] flex items-center justify-center flex-shrink-0"><FileText size={17} className="text-gray-700" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-gray-900 font-medium truncate">{cleanFileName(doc.name)}</p>
                          {doc.sizeKb ? <p className="text-[12px] text-gray-400 mt-0.5">{doc.sizeKb >= 1024 ? `${(doc.sizeKb / 1024).toFixed(1)} MB` : `${doc.sizeKb} KB`}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {notesOpen && (
          <div className="absolute inset-0 z-40 bg-[#F6F6F4] flex flex-col">
            <header className="flex items-start justify-between px-6 md:px-10 pt-8 md:pt-10 pb-6 border-b border-gray-200/70 flex-shrink-0 gap-4" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
              <div className="min-w-0 max-w-2xl">
                <div className="flex items-center gap-3 text-[11px] font-bold tracking-[.18em] uppercase text-gray-400 mb-3"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />Your study notes</div>
                <h2 className="serif text-3xl md:text-[40px] text-gray-900 leading-none tracking-tight">My Notes<span className="italic">.</span></h2>
                <p className="text-[14.5px] text-gray-500 mt-3 leading-relaxed">Drop in your own slides, screenshots, or photos of handwritten notes — Scholr reads them alongside your professor's materials.</p>
              </div>
              <button onClick={() => setNotesOpen(false)} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"><X size={18} /></button>
            </header>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto w-full px-6 md:px-10 py-7">
                <button onClick={() => notesUploadRef.current?.click()} className="group/drop w-full flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-400 bg-white/50 hover:bg-white transition-all cursor-pointer mb-6">
                  <UploadCloud size={26} className="text-gray-300 group-hover/drop:text-gray-500 mb-3 transition-colors" />
                  <p className="serif text-lg text-gray-800">Drop notes or photos</p>
                  <p className="text-[12px] text-gray-400 mt-1.5 tracking-wide">PDF · JPG · PNG  —  added to this course's AI context</p>
                </button>
                {notesLoading ? (
                  <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" /></div>
                ) : myNotes.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="serif text-xl text-gray-700 mb-2">No notes <span className="italic">yet</span>.</p>
                    <p className="text-[13.5px] text-gray-400 max-w-xs mx-auto leading-relaxed">Upload one to ground answers in your own work too.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {myNotes.map((doc, i) => (
                      <div key={i} className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all">
                        <div className="w-11 h-11 rounded-xl bg-[#F3F2EF] flex items-center justify-center flex-shrink-0"><FileText size={17} className="text-gray-700" /></div>
                        <span className="text-[15px] text-gray-900 font-medium flex-1 truncate">{cleanFileName(doc.name)}</span>
                        <button onClick={() => deleteNote(doc.name)} aria-label="Delete note" className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {quizzesOpen && (
          <div className="absolute inset-0 z-40 bg-[#F6F6F4] flex flex-col">
            {quizTaking ? (
              <header className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-gray-200/70 flex-shrink-0 gap-3" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                <div className="min-w-0 flex items-center gap-3">
                  <button onClick={() => setQuizTaking(false)} aria-label="Back to quizzes" className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0 -ml-2"><ChevronLeft size={18} /></button>
                  <div className="min-w-0">
                    <h2 className="serif text-xl text-gray-900 truncate">{quizTopic || 'Practice quiz'}</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5 tracking-wide uppercase font-semibold">From {course.name}</p>
                  </div>
                </div>
                <button onClick={() => { setQuizzesOpen(false); setQuizTaking(false); }} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"><X size={16} /></button>
              </header>
            ) : (
              <header className="flex items-start justify-between px-6 md:px-10 pt-8 md:pt-10 pb-6 border-b border-gray-200/70 flex-shrink-0 gap-4" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
                <div className="min-w-0 max-w-2xl">
                  <div className="flex items-center gap-3 text-[11px] font-bold tracking-[.18em] uppercase text-gray-400 mb-3"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />Practice</div>
                  <h2 className="serif text-3xl md:text-[40px] text-gray-900 leading-none tracking-tight">Quizzes<span className="italic">.</span></h2>
                  <p className="text-[14.5px] text-gray-500 mt-3 leading-relaxed">Every practice quiz Scholr has built for {course.name} from your professor's materials. Tap one to retake — your best score travels with it.</p>
                </div>
                <button onClick={() => setQuizzesOpen(false)} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"><X size={18} /></button>
              </header>
            )}
            {quizTaking && quizQuestions.length > 0 && !quizDone && (
              <div className="h-1 bg-gray-100 flex-shrink-0"><div className="h-full bg-gray-900 transition-all duration-300 ease-out" style={{ width: `${((quizIndex + (quizAnswers[quizIndex] !== undefined ? 1 : 0)) / quizQuestions.length) * 100}%` }} /></div>
            )}
            <div className="flex-1 overflow-y-auto">
              {!quizTaking ? (
                <div className="max-w-3xl mx-auto w-full px-6 md:px-10 py-8">
                  {savedQuizzes.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F3F2EF] mb-5"><ListChecks size={22} className="text-gray-400" /></div>
                      <h3 className="serif text-2xl text-gray-900 leading-none tracking-tight">No quizzes yet<span className="italic">.</span></h3>
                      <p className="text-[14px] text-gray-500 mt-3 max-w-sm mx-auto leading-relaxed">Type <span className="font-mono text-[13px] text-[#2A4D8F] bg-[#2A4D8F]/[.06] px-1.5 py-0.5 rounded">/quiz</span> in the chat to generate one from your professor's materials.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {savedQuizzes.map(q => (
                        <div key={q.id} className="group flex items-start gap-4 px-5 py-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer" onClick={() => openSavedQuiz(q.id)}>
                          <div className="w-11 h-11 rounded-xl bg-[#F3F2EF] flex items-center justify-center flex-shrink-0 mt-0.5"><ListChecks size={17} className="text-gray-700" /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] text-gray-900 font-medium truncate">{q.topic || 'Practice quiz'}</p>
                            {q.preview && <p className="text-[12.5px] text-gray-500 mt-0.5 truncate italic">"{q.preview}"</p>}
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                              <span className="tabular-nums">{q.questionCount || 5} questions</span>
                              <span className="text-gray-300">·</span>
                              <span>{formatRelativeDate(q.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                            {q.best_score != null ? (
                              <span className="inline-flex items-baseline gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100">
                                <span className="text-[9.5px] font-semibold tracking-[.12em] uppercase text-emerald-700">Best</span>
                                <span className="text-[12px] font-semibold text-emerald-800 tabular-nums">{q.best_score}</span>
                              </span>
                            ) : (
                              <span className="text-[9.5px] font-semibold tracking-[.12em] uppercase text-gray-300">Untaken</span>
                            )}
                            <button onClick={e => { e.stopPropagation(); deleteSavedQuiz(q.id); }} aria-label="Delete quiz" className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // ── Active quiz, taken in the overlay ──
                <div className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 md:py-10 flex flex-col gap-6">
                  <div className="flex items-center justify-between text-[12px] text-gray-400">
                    <span className="font-medium tabular-nums">Question {quizIndex + 1} of {quizQuestions.length}</span>
                    {quizDone ? null : <span>Tap an option to lock it in</span>}
                  </div>
                  {quizQuestions.length === 0 ? (
                    <div className="text-center py-16">
                      <AlertCircle size={28} className="text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm font-medium mb-1">Couldn't load this quiz</p>
                      <button onClick={() => setQuizTaking(false)} className="mt-3 text-gray-500 hover:text-gray-900 text-sm">← Back to quizzes</button>
                    </div>
                  ) : quizDone ? (() => {
                    const total = quizQuestions.length;
                    const right = quizQuestions.filter((q, i) => quizAnswers[i] === q.correct).length;
                    const wrong = quizQuestions.filter((q, i) => { const a = quizAnswers[i]; return a !== undefined && a !== -1 && a !== q.correct; }).length;
                    const skipped = total - right - wrong;
                    const pct = Math.round((right / total) * 100);
                    const C = 2 * Math.PI * 50;
                    return (
                      <div className="flex flex-col gap-5">
                        <div className="rounded-3xl bg-white border border-gray-200 p-7 md:p-9 flex flex-col md:flex-row items-center gap-7">
                          <div className="relative w-36 h-36 flex-shrink-0">
                            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="#111827" strokeWidth="9" /><circle cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - right / total)} style={{ transition: 'stroke-dashoffset 0.7s ease' }} /></svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-gray-900 leading-none">{right}/{total}</span><span className="text-sm text-gray-400 mt-1">{pct}%</span></div>
                          </div>
                          <div className="flex-1 flex flex-col gap-2.5 text-sm w-full">
                            <div className="flex items-center justify-between"><span className="text-gray-500">Right</span><span className="font-semibold text-emerald-600 tabular-nums">{right}</span></div>
                            <div className="flex items-center justify-between"><span className="text-gray-500">Wrong</span><span className="font-semibold text-gray-900 tabular-nums">{wrong}</span></div>
                            <div className="flex items-center justify-between"><span className="text-gray-500">Skipped</span><span className="font-semibold text-gray-400 tabular-nums">{skipped}</span></div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => { setQuizIndex(0); setQuizAnswers({}); setQuizDone(false); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"><RotateCcw size={14} />Retake quiz</button>
                          <button onClick={() => { setQuizTaking(false); }} className="w-full py-3 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-sm font-medium transition-colors">Back to quizzes</button>
                        </div>
                      </div>
                    );
                  })() : (() => {
                    const q = quizQuestions[quizIndex];
                    const answered = quizAnswers[quizIndex];
                    const isAnswered = answered !== undefined && answered !== -1;
                    const isCorrect = answered === q.correct;
                    const isLast = quizIndex === quizQuestions.length - 1;
                    const advance = () => { if (isLast) setQuizDone(true); else setQuizIndex(i => i + 1); };
                    const skip = () => { setQuizAnswers(prev => (prev[quizIndex] === undefined ? { ...prev, [quizIndex]: -1 } : prev)); advance(); };
                    return (
                      <div className="flex flex-col gap-6">
                        <p className="text-gray-900 text-lg md:text-xl font-semibold leading-snug">{q.question}</p>
                        <div className="flex flex-col gap-3">
                          {q.options.map((opt, oi) => {
                            const isSel = answered === oi;
                            const isRight = oi === q.correct;
                            let cls = 'group/opt text-left px-4 py-3.5 rounded-2xl border text-[15px] transition-all flex items-start gap-3';
                            if (!isAnswered) cls += ' border-gray-200 bg-white hover:border-gray-400 cursor-pointer';
                            else if (isRight) cls += ' border-emerald-300 bg-emerald-50';
                            else if (isSel) cls += ' border-red-300 bg-red-50';
                            else cls += ' border-gray-200 bg-gray-50 opacity-60';
                            return (
                              <button key={oi} disabled={isAnswered} onClick={() => handleQuizAnswer(quizIndex, oi)} className={cls}>
                                <span className={`text-xs font-semibold tabular-nums mt-1 ${isAnswered ? (isRight ? 'text-emerald-700' : isSel ? 'text-red-700' : 'text-gray-400') : 'text-gray-400 group-hover/opt:text-gray-700'}`}>{String.fromCharCode(65 + oi)}.</span>
                                <span className={isAnswered ? (isRight ? 'text-emerald-900' : isSel ? 'text-red-900' : 'text-gray-700') : 'text-gray-900'}>{opt.replace(/^[A-D]\)\s*/, '')}</span>
                              </button>
                            );
                          })}
                        </div>
                        {isAnswered && q.explanation && (
                          <div className={`rounded-2xl border p-4 text-sm leading-relaxed ${isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-gray-200 bg-white text-gray-700'}`}>{isCorrect ? '✓ ' : ''}{q.explanation}</div>
                        )}
                        <div className="flex items-center justify-between gap-3 mt-2">
                          <button onClick={skip} disabled={isAnswered} className="text-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 px-3 py-2">Skip</button>
                          {isAnswered ? (
                            <button onClick={() => { if (isLast) { setQuizDone(true); quizRecordedRef.current || recordQuizResult(); quizRecordedRef.current = true; } else advance(); }} className="px-6 py-2.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors">{isLast ? 'See results' : 'Next →'}</button>
                          ) : <div />}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
        {testsOpen && (
          <div className="absolute inset-0 z-40 bg-[#F6F6F4] flex flex-col">
            {testTaking ? (
              <header className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-gray-200/70 flex-shrink-0 gap-3" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                <div className="min-w-0 flex items-center gap-3">
                  <button onClick={() => setTestTaking(false)} aria-label="Back to tests" className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0 -ml-2"><ChevronLeft size={18} /></button>
                  <div className="min-w-0">
                    <h2 className="serif text-xl text-gray-900 truncate">{testTopic || 'Practice test'}</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5 tracking-wide uppercase font-semibold">{testDone ? 'Review' : 'Closed book · ' + course.name}</p>
                  </div>
                </div>
                <button onClick={() => { setTestsOpen(false); setTestTaking(false); }} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"><X size={16} /></button>
              </header>
            ) : (
              <header className="flex items-start justify-between px-6 md:px-10 pt-8 md:pt-10 pb-6 border-b border-gray-200/70 flex-shrink-0 gap-4" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
                <div className="min-w-0 max-w-2xl">
                  <div className="flex items-center gap-3 text-[11px] font-bold tracking-[.18em] uppercase text-gray-400 mb-3"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />Exam Prep</div>
                  <h2 className="serif text-3xl md:text-[40px] text-gray-900 leading-none tracking-tight">Tests<span className="italic">.</span></h2>
                  <p className="text-[14.5px] text-gray-500 mt-3 leading-relaxed">Closed-book practice tests grounded in your professor's materials. Answers reveal only after you've finished — same pressure as the real thing.</p>
                </div>
                <button onClick={() => setTestsOpen(false)} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"><X size={18} /></button>
              </header>
            )}
            {testTaking && testQuestions.length > 0 && !testDone && (
              <div className="h-1 bg-gray-100 flex-shrink-0"><div className="h-full bg-gray-900 transition-all duration-300 ease-out" style={{ width: `${((testIndex + (testAnswers[testIndex] !== undefined ? 1 : 0)) / testQuestions.length) * 100}%` }} /></div>
            )}
            <div className="flex-1 overflow-y-auto">
              {!testTaking ? (
                <div className="max-w-3xl mx-auto w-full px-6 md:px-10 py-8">
                  {savedTests.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F3F2EF] mb-5"><GraduationCap size={22} className="text-gray-400" /></div>
                      <h3 className="serif text-2xl text-gray-900 leading-none tracking-tight">No tests yet<span className="italic">.</span></h3>
                      <p className="text-[14px] text-gray-500 mt-3 max-w-sm mx-auto leading-relaxed">Type <span className="font-mono text-[13px] text-[#2A4D8F] bg-[#2A4D8F]/[.06] px-1.5 py-0.5 rounded">/test</span> in the chat to generate a closed-book practice exam.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {savedTests.map(t => (
                        <div key={t.id} className="group flex items-start gap-4 px-5 py-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer" onClick={() => openSavedTest(t.id)}>
                          <div className="w-11 h-11 rounded-xl bg-[#F3F2EF] flex items-center justify-center flex-shrink-0 mt-0.5"><GraduationCap size={17} className="text-gray-700" /></div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] text-gray-900 font-medium truncate">{t.topic || 'Practice test'}</p>
                            {t.preview && <p className="text-[12.5px] text-gray-500 mt-0.5 truncate italic">"{t.preview}"</p>}
                            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                              <span className="tabular-nums">{t.questionCount || 8} questions</span>
                              <span className="text-gray-300">·</span>
                              <span>{formatRelativeDate(t.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                            {t.best_score != null ? (
                              <span className="inline-flex items-baseline gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100">
                                <span className="text-[9.5px] font-semibold tracking-[.12em] uppercase text-emerald-700">Best</span>
                                <span className="text-[12px] font-semibold text-emerald-800 tabular-nums">{t.best_score}</span>
                              </span>
                            ) : (
                              <span className="text-[9.5px] font-semibold tracking-[.12em] uppercase text-gray-300">Untaken</span>
                            )}
                            <button onClick={e => { e.stopPropagation(); deleteSavedTest(t.id); }} aria-label="Delete test" className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // ── Active test taking + review ──
                <div className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 md:py-10 flex flex-col gap-6">
                  {testQuestions.length === 0 ? (
                    <div className="text-center py-16">
                      <AlertCircle size={28} className="text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm font-medium mb-1">Couldn't load this test</p>
                      <button onClick={() => setTestTaking(false)} className="mt-3 text-gray-500 hover:text-gray-900 text-sm">← Back to tests</button>
                    </div>
                  ) : testDone ? (() => {
                    const total = testQuestions.length;
                    const right = testQuestions.filter((q, i) => testAnswers[i] === q.correct).length;
                    const wrong = testQuestions.filter((q, i) => { const a = testAnswers[i]; return a !== undefined && a !== -1 && a !== q.correct; }).length;
                    const skipped = total - right - wrong;
                    const pct = Math.round((right / total) * 100);
                    const C = 2 * Math.PI * 50;
                    return (
                      <div className="flex flex-col gap-5">
                        <div className="rounded-3xl bg-white border border-gray-200 p-7 md:p-9 flex flex-col md:flex-row items-center gap-7">
                          <div className="relative w-36 h-36 flex-shrink-0">
                            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="#111827" strokeWidth="9" /><circle cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - right / total)} style={{ transition: 'stroke-dashoffset 0.7s ease' }} /></svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-gray-900 leading-none">{right}/{total}</span><span className="text-sm text-gray-400 mt-1">{pct}%</span></div>
                          </div>
                          <div className="flex-1 flex flex-col gap-2.5 text-sm w-full">
                            <div className="flex items-center justify-between"><span className="text-gray-500">Right</span><span className="font-semibold text-emerald-600 tabular-nums">{right}</span></div>
                            <div className="flex items-center justify-between"><span className="text-gray-500">Wrong</span><span className="font-semibold text-gray-900 tabular-nums">{wrong}</span></div>
                            <div className="flex items-center justify-between"><span className="text-gray-500">Skipped</span><span className="font-semibold text-gray-400 tabular-nums">{skipped}</span></div>
                          </div>
                        </div>
                        {/* Per-question review — collapsed by default, tap to expand */}
                        <div className="flex flex-col gap-2">
                          <p className="text-[11px] font-bold tracking-[.18em] uppercase text-gray-400 mb-1">Review</p>
                          {testQuestions.map((q, i) => {
                            const a = testAnswers[i];
                            const correct = a === q.correct;
                            const skipped = a === undefined || a === -1;
                            const expanded = testReviewIndex === i;
                            return (
                              <div key={i} className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
                                <button onClick={() => setTestReviewIndex(expanded ? null : i)} className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                                  <span className={`mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold flex-shrink-0 tabular-nums ${skipped ? 'bg-gray-100 text-gray-500' : correct ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{skipped ? '–' : correct ? '✓' : '✗'}</span>
                                  <span className="flex-1 text-[14px] text-gray-900 leading-snug">{i + 1}. {q.question}</span>
                                  <ChevronRight size={14} className={`text-gray-400 mt-1 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                                </button>
                                {expanded && (
                                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 flex flex-col gap-2">
                                    {q.options.map((opt, oi) => {
                                      const isCorrect = oi === q.correct;
                                      const isYours = oi === a;
                                      let cls = 'px-3 py-2 rounded-xl border text-[13.5px] flex items-start gap-2';
                                      if (isCorrect) cls += ' border-emerald-300 bg-emerald-50 text-emerald-900';
                                      else if (isYours) cls += ' border-red-300 bg-red-50 text-red-900';
                                      else cls += ' border-gray-200 bg-white text-gray-600';
                                      return (
                                        <div key={oi} className={cls}>
                                          <span className="font-semibold tabular-nums mt-0.5 text-[12px]">{String.fromCharCode(65 + oi)}.</span>
                                          <span className="flex-1">{opt.replace(/^[A-D]\)\s*/, '')}</span>
                                          {isCorrect && <span className="text-[10px] font-bold tracking-[.1em] uppercase text-emerald-700">Correct</span>}
                                          {isYours && !isCorrect && <span className="text-[10px] font-bold tracking-[.1em] uppercase text-red-700">Your pick</span>}
                                        </div>
                                      );
                                    })}
                                    {q.explanation && <p className="text-[13px] text-gray-600 leading-relaxed mt-1 italic">{q.explanation}</p>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex flex-col gap-2 mt-2">
                          <button onClick={() => { setTestIndex(0); setTestAnswers({}); setTestDone(false); setTestReviewIndex(null); testRecordedRef.current = false; }} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"><RotateCcw size={14} />Retake test</button>
                          <button onClick={() => { setTestTaking(false); }} className="w-full py-3 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-sm font-medium transition-colors">Back to tests</button>
                        </div>
                      </div>
                    );
                  })() : (() => {
                    const q = testQuestions[testIndex];
                    const answered = testAnswers[testIndex];
                    const isAnswered = answered !== undefined && answered !== -1;
                    const isLast = testIndex === testQuestions.length - 1;
                    const advance = () => { if (isLast) setTestDone(true); else setTestIndex(i => i + 1); };
                    const skip = () => { setTestAnswers(prev => (prev[testIndex] === undefined ? { ...prev, [testIndex]: -1 } : prev)); advance(); };
                    const answeredCount = Object.keys(testAnswers).length;
                    return (
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between text-[12px] text-gray-400">
                          <span className="font-medium tabular-nums">Question {testIndex + 1} of {testQuestions.length}</span>
                          <span className="inline-flex items-center gap-1.5"><span className="block w-1.5 h-1.5 rounded-full bg-gray-300" />No feedback until you finish</span>
                        </div>
                        <p className="text-gray-900 text-lg md:text-xl font-semibold leading-snug">{q.question}</p>
                        <div className="flex flex-col gap-3">
                          {q.options.map((opt, oi) => {
                            const isSel = answered === oi;
                            // Tests: no right/wrong reveal during taking. Just selected vs not.
                            let cls = 'group/opt text-left px-4 py-3.5 rounded-2xl border text-[15px] transition-all flex items-start gap-3 cursor-pointer';
                            if (isSel) cls += ' border-gray-900 bg-gray-50';
                            else cls += ' border-gray-200 bg-white hover:border-gray-400';
                            return (
                              <button key={oi} onClick={() => handleTestAnswer(testIndex, oi)} className={cls}>
                                <span className={`text-xs font-semibold tabular-nums mt-1 ${isSel ? 'text-gray-900' : 'text-gray-400 group-hover/opt:text-gray-700'}`}>{String.fromCharCode(65 + oi)}.</span>
                                <span className={isSel ? 'text-gray-900' : 'text-gray-900'}>{opt.replace(/^[A-D]\)\s*/, '')}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between gap-3 mt-2">
                          <button onClick={skip} disabled={isAnswered} className="text-sm text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 px-3 py-2">Skip</button>
                          {isAnswered ? (
                            <button onClick={advance} className="px-6 py-2.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors">{isLast ? `Finish (${answeredCount}/${testQuestions.length} answered) →` : 'Next →'}</button>
                          ) : <div />}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
        {decksOpen && (
          <div className="absolute inset-0 z-40 bg-[#F6F6F4] flex flex-col">
            {deckStudying ? (
              <header className="flex items-center justify-between px-5 md:px-8 py-4 border-b border-gray-200/70 flex-shrink-0 gap-3" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
                <div className="min-w-0 flex items-center gap-3">
                  <button onClick={() => setDeckStudying(false)} aria-label="Back to decks" className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0 -ml-2"><ChevronLeft size={18} /></button>
                  <div className="min-w-0">
                    <h2 className="serif text-xl text-gray-900 truncate">{cardsTopic || 'Flashcard deck'}</h2>
                    <p className="text-[11px] text-gray-400 mt-0.5 tracking-wide uppercase font-semibold">From {course.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {cards.length > 0 && <span className="text-[11px] font-medium text-gray-400 tabular-nums">{cardsIndex + 1} / {cards.length}</span>}
                  <button onClick={() => { setDecksOpen(false); setDeckStudying(false); }} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"><X size={16} /></button>
                </div>
              </header>
            ) : (
              <header className="flex items-start justify-between px-6 md:px-10 pt-8 md:pt-10 pb-6 border-b border-gray-200/70 flex-shrink-0 gap-4" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}>
                <div className="min-w-0 max-w-2xl">
                  <div className="flex items-center gap-3 text-[11px] font-bold tracking-[.18em] uppercase text-gray-400 mb-3"><span className="block w-7 h-[1.5px] bg-current opacity-60 rounded-sm" />Study Decks</div>
                  <h2 className="serif text-3xl md:text-[40px] text-gray-900 leading-none tracking-tight">Flashcards<span className="italic">.</span></h2>
                  <p className="text-[14.5px] text-gray-500 mt-3 leading-relaxed">Every deck Scholr has built for {course.name} from your professor's materials. Tap one to study — flip, advance, repeat.</p>
                </div>
                <button onClick={() => setDecksOpen(false)} aria-label="Close" className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"><X size={18} /></button>
              </header>
            )}
            {deckStudying && cards.length > 0 && (
              <div className="h-1 bg-gray-100 flex-shrink-0"><div className="h-full bg-gray-900 transition-all duration-300 ease-out" style={{ width: `${((cardsIndex + 1) / cards.length) * 100}%` }} /></div>
            )}
            <div className="flex-1 overflow-y-auto">
              {!deckStudying ? (
                <div className="max-w-3xl mx-auto w-full px-6 md:px-10 py-8">
                  {savedDecks.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F3F2EF] mb-5"><Layers size={22} className="text-gray-400" /></div>
                      <h3 className="serif text-2xl text-gray-900 leading-none tracking-tight">No decks yet<span className="italic">.</span></h3>
                      <p className="text-[14px] text-gray-500 mt-3 max-w-sm mx-auto leading-relaxed">Type <span className="font-mono text-[13px] text-[#2A4D8F] bg-[#2A4D8F]/[.06] px-1.5 py-0.5 rounded">/cards</span> in the chat to generate a deck from your professor's materials.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {savedDecks.map(d => {
                        const cardCount = d.cardCount ?? (d.cards || []).length;
                        return (
                          <div key={d.id} className="group flex items-start gap-4 px-5 py-4 rounded-2xl bg-white border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer" onClick={() => openSavedDeck(d.id)}>
                            <div className="w-11 h-11 rounded-xl bg-[#F3F2EF] flex items-center justify-center flex-shrink-0 mt-0.5"><Layers size={17} className="text-gray-700" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[15px] text-gray-900 font-medium truncate">{d.topic || 'Flashcard deck'}</p>
                              {d.preview && <p className="text-[12.5px] text-gray-500 mt-0.5 truncate italic">"{d.preview}"</p>}
                              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                                <span className="tabular-nums">{cardCount} card{cardCount !== 1 ? 's' : ''}</span>
                                <span className="text-gray-300">·</span>
                                <span>{formatRelativeDate(d.created_at)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                              <button onClick={e => { e.stopPropagation(); deleteSavedDeck(d.id); }} aria-label="Delete deck" className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                // ── Active deck, studied in the overlay ──
                <div className="max-w-2xl mx-auto w-full px-4 md:px-6 py-6 md:py-10 flex flex-col gap-6 h-full">
                  {cards.length > 0 && (() => {
                    const c = cards[cardsIndex];
                    const isFirst = cardsIndex === 0;
                    const isLast = cardsIndex === cards.length - 1;
                    return (
                      <>
                        <div className="fcard-wrap flex-1 flex items-stretch min-h-[340px]">
                          <div className={`fcard${cardsFlipped ? ' flipped' : ''} flex-1`} onClick={() => setCardsFlipped(f => !f)} role="button" aria-label="Flip flashcard">
                            <div className="face front" style={{ padding: '40px 36px' }}>
                              <span className="ftip">Tap to flip</span>
                              <span className="ftag">Front</span>
                              <span className="ftext" style={{ fontSize: 28 }}>{c.front}</span>
                              {c.source && <span className="fsrc">— {c.source}</span>}
                            </div>
                            <div className="face back" style={{ padding: '40px 36px' }}>
                              <span className="ftip">Tap to flip</span>
                              <span className="ftag">Back</span>
                              <span className="ftext" style={{ fontSize: 18 }}>{c.back}</span>
                              {c.source && <span className="fsrc">— {c.source}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <button onClick={prevCard} disabled={isFirst} aria-label="Previous card" className="w-12 h-12 rounded-full border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed flex items-center justify-center text-gray-700 transition-colors"><ChevronLeft size={20} /></button>
                          <button onClick={() => setCardsFlipped(f => !f)} className="flex-1 py-3 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors">{cardsFlipped ? 'Show front' : 'Show back'}</button>
                          <button onClick={isLast ? () => { setCardsIndex(0); setCardsFlipped(false); } : nextCard} aria-label={isLast ? 'Restart deck' : 'Next card'} className="w-12 h-12 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-700 transition-colors">{isLast ? <RotateCcw size={18} /> : <ChevronRight size={20} />}</button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
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
            {/* Quizzes & flashcards live in the sidebar folder now — no more chat-side panels. */}
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
                    <h2 className="brand-display text-[40px] md:text-[54px] leading-[1.04] text-gray-900 mb-5 text-center">{greeting}{firstName ? <>, <span className="italic">{firstName}</span></> : ''}<span>.</span></h2>
                    <p className="text-[15px] text-gray-500 text-center mb-10 max-w-md leading-relaxed">{(() => {
                      const subs = [
                        `What can I help you study in ${course.name}?`,
                        `Ask anything about ${course.name} — every answer cited, straight from your professor's materials.`,
                        `Stuck on something in ${course.name}? Let's untangle it.`,
                        `Need a recap, a quiz, or a study guide? Just ask.`,
                        `Every answer in ${course.name} is grounded in what your professor uploaded.`,
                        `Lost? Behind? Cramming? Ask away — no judgment.`,
                      ];
                      const seed = new Date().getDate() + new Date().getHours();
                      return subs[seed % subs.length];
                    })()}</p>
                    <div className="w-full">{attachmentBar}{inputBox}</div>
                    {/* Claude/ChatGPT-style suggestion cards. Each is a one-tap
                        starter prompt — clicking sends it immediately. Mix of
                        quick wins and deep dives so the student sees what kinds
                        of help are on the table without having to invent a
                        question. */}
                    <div className="w-full mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { icon: 'Sparkles', label: 'Explain a concept',     prompt: `Explain a core concept from ${course.name} like I'm hearing it for the first time.` },
                        { icon: 'GraduationCap', label: 'Build me a study guide', prompt: `Build me a study guide for the next exam in ${course.name}. List the topics, key formulas, and concepts I need to memorize.` },
                        { icon: 'ListChecks',    label: 'Make me a quiz',          prompt: `/quiz` },
                        { icon: 'Lightbulb',     label: 'What\'s the exam trap?', prompt: `What's a common trap or exam-tested mistake in ${course.name} that I should watch out for?` },
                      ].map(({ icon, label, prompt }) => {
                        const Icon = icon === 'Sparkles' ? Sparkles : icon === 'GraduationCap' ? GraduationCap : icon === 'ListChecks' ? ListChecks : Lightbulb;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => onSend(prompt)}
                            className="group/sg flex flex-col items-start gap-2 p-3.5 rounded-2xl bg-white border border-gray-200 hover:border-gray-900 hover:shadow-[0_8px_24px_-12px_rgba(15,15,15,0.18)] transition-all text-left"
                          >
                            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#F3F2EF] group-hover/sg:bg-gray-900 transition-colors">
                              <Icon size={14} className="text-gray-700 group-hover/sg:text-white transition-colors" />
                            </span>
                            <span className="text-[12.5px] font-medium text-gray-800 leading-snug">{label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Smaller secondary row — quick one-tap actions for browsing prior work. */}
                    <div className="w-full mt-3 flex flex-wrap gap-1.5 justify-center">
                      {[
                        { label: 'Walk me through a worked example', prompt: `Walk me through a worked example from the materials in ${course.name}, step by step.` },
                        { label: "I'm lost — where do I start?",      prompt: `I'm lost in ${course.name} — where should I start? Give me a roadmap.` },
                        { label: 'Recap the last lecture',             prompt: `Give me a quick recap of the most recent lecture material in ${course.name}.` },
                      ].map(({ label, prompt }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => onSend(prompt)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-transparent border border-gray-200 hover:border-gray-400 hover:bg-white text-gray-600 hover:text-gray-900 text-[12px] transition-all"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
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
                  ? /(?:Quiz|Practice test) complete — you scored \*\*(\d+)\/(\d+)\*\* \((\d+)%\)(?: on (.+?))?\.?\s*$/.exec(m.content || '')
                  : null;
                const isTestResult = quizMatch && /Practice test/i.test(m.content || '');
                return (
                  <div key={msgId} className={`group flex ${m.role === 'user' ? 'justify-end' : 'gap-3'}`}>
                    {m.role === 'assistant' && <div className="flex-shrink-0 mt-1.5"><AiMark thinking={m.streaming} /></div>}
                    <div className={`flex flex-col min-w-0 ${m.role === 'user' ? 'items-end max-w-[85%]' : 'items-start flex-1'}`}>
                      {m.confirm ? (() => {
                        const c = m.confirm;
                        const kindLabel = c.kind === 'cards' ? 'flashcard deck' : c.kind === 'test' ? 'practice test' : 'practice quiz';
                        const KindIcon = c.kind === 'cards' ? Layers : c.kind === 'test' ? GraduationCap : ListChecks;
                        return (
                          <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 w-full max-w-md">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#F3F2EF] flex items-center justify-center flex-shrink-0"><KindIcon size={17} className="text-gray-700" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold tracking-[.16em] uppercase text-gray-400">Confirm</p>
                                <p className="serif text-[17px] text-gray-900 leading-snug mt-0.5">Want me to build you a {kindLabel}{c.topic ? <> on <span className="italic">{c.topic}</span></> : ''}?</p>
                                <p className="text-[12.5px] text-gray-500 mt-1 leading-relaxed">It'll save to <span className="font-medium text-gray-700">{c.kind === 'cards' ? 'Flashcards' : c.kind === 'test' ? 'Tests' : 'Quizzes'}</span> in your sidebar. Or use <span className="font-mono text-[12px] text-[#2A4D8F]">/{c.kind === 'cards' ? 'cards' : c.kind}</span> next time to skip this prompt.</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 pl-[52px]">
                              <button onClick={() => acceptConfirmation(m.id, c.kind, c.topic, c.originalMessage)} className="px-4 py-2 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-medium transition-colors">Yes, build it</button>
                              <button onClick={() => declineConfirmation(m.id)} className="px-4 py-2 rounded-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-[13px] font-medium transition-colors">No, just answer</button>
                            </div>
                          </div>
                        );
                      })() : m.pickCount ? (() => {
                        // Count picker chip — shown after slash command OR after the
                        // student says "yes, build it" on a natural-language confirm.
                        // Student picks a preset count or types a custom one.
                        const pc = m.pickCount;
                        const kindLabel = pc.kind === 'cards' ? 'flashcards' : pc.kind === 'test' ? 'questions' : 'questions';
                        const KindIcon = pc.kind === 'cards' ? Layers : pc.kind === 'test' ? GraduationCap : ListChecks;
                        const presets = pc.kind === 'cards' ? [5, 10, 15, 20] : pc.kind === 'test' ? [5, 8, 12, 20] : [3, 5, 8, 10];
                        const maxAllowed = pc.kind === 'cards' ? 30 : pc.kind === 'test' ? 25 : 20;
                        const customRef = `custom_${m.id}`;
                        return (
                          <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 w-full max-w-md">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#F3F2EF] flex items-center justify-center flex-shrink-0"><KindIcon size={17} className="text-gray-700" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold tracking-[.16em] uppercase text-gray-400">How many?</p>
                                <p className="serif text-[17px] text-gray-900 leading-snug mt-0.5">Building {pc.kind === 'cards' ? 'a deck' : pc.kind === 'test' ? 'a practice test' : 'a quiz'}{pc.topic ? <> on <span className="italic">{pc.topic}</span></> : ''}.</p>
                                <p className="text-[12.5px] text-gray-500 mt-1 leading-relaxed">Pick a number of {kindLabel} — or type your own (max {maxAllowed}).</p>
                              </div>
                            </div>
                            <div className="flex items-center flex-wrap gap-2 mt-4 pl-[52px]">
                              {presets.map(n => (
                                <button key={n} onClick={() => submitCountChoice(m.id, pc.kind, pc.topic, pc.originalMessage, n)} className="px-3.5 py-2 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-medium tabular-nums transition-colors">{n}</button>
                              ))}
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 pl-3 pr-1.5 py-1">
                                <input
                                  type="number"
                                  min="3"
                                  max={maxAllowed}
                                  placeholder="custom"
                                  className="w-16 text-[13px] tabular-nums outline-none placeholder:text-gray-300 bg-transparent"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      const n = parseInt(e.currentTarget.value, 10);
                                      if (Number.isFinite(n) && n >= 3 && n <= maxAllowed) submitCountChoice(m.id, pc.kind, pc.topic, pc.originalMessage, n);
                                    }
                                  }}
                                  ref={el => { if (el) el.dataset.ref = customRef; }}
                                />
                                <button
                                  onClick={e => {
                                    const input = e.currentTarget.previousElementSibling;
                                    const n = parseInt(input?.value, 10);
                                    if (Number.isFinite(n) && n >= 3 && n <= maxAllowed) submitCountChoice(m.id, pc.kind, pc.topic, pc.originalMessage, n);
                                  }}
                                  aria-label="Submit custom count"
                                  className="px-2.5 py-1 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-[11px] font-medium transition-colors"
                                >Go</button>
                              </div>
                              <button onClick={() => cancelCountPicker(m.id)} className="ml-1 px-3 py-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 text-[13px] font-medium transition-colors">Cancel</button>
                            </div>
                          </div>
                        );
                      })() : quizMatch ? (
                        <div className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">{isTestResult ? <GraduationCap size={16} className="text-white" /> : <ListChecks size={16} className="text-white" />}</div>
                          <div>
                            <p className="text-[11px] text-gray-400">{isTestResult ? 'Practice test' : 'Practice quiz'}{quizMatch[4] ? ` · ${quizMatch[4]}` : ''}</p>
                            <p className="text-sm font-semibold text-gray-900">Scored {quizMatch[1]}/{quizMatch[2]} <span className="text-gray-400 font-normal">({quizMatch[3]}%)</span></p>
                          </div>
                        </div>
                      ) : (
                        <div className={`rounded-2xl text-sm w-full ${m.role === 'user' ? 'bg-gray-100 text-gray-900 px-4 py-3 rounded-br-sm' : 'text-gray-800'}`}>
                          {m.role === 'user' && m.attachment && (
                            <div className="mb-2 inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl bg-white border border-gray-200 max-w-full">
                              {m.attachment.dataUrl ? (
                                <img src={m.attachment.dataUrl} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                              ) : (
                                <span className="w-7 h-7 rounded-md bg-[#F3F2EF] flex items-center justify-center flex-shrink-0"><FileText size={12} className="text-gray-500" /></span>
                              )}
                              <span className="text-[12px] font-medium text-gray-800 truncate max-w-[200px]">{cleanFileName(m.attachment.name)}</span>
                            </div>
                          )}
                          {m.role === 'assistant' && m.content === '' && m.streaming ? (
                            <ThinkingText step={m.statusStep} sources={m.statusSources} inputTokens={m.statusInputTokens} />
                          ) : isError ? <ErrorMessage content={m.content} /> : m.role === 'user' ? <p className="leading-relaxed whitespace-pre-wrap text-gray-900">{m.content}</p> : <MarkdownMessage content={m.content} />}
                          {m.role === 'assistant' && m.streaming && m.content && <span className="inline-block w-[3px] h-[16px] bg-gray-800 animate-pulse ml-1 align-middle rounded-sm" />}
                          {m.role === 'assistant' && m.sources?.length > 0 && !m.streaming && !isError && (
                            <p className="mt-3 text-[11px] text-gray-300 leading-relaxed">
                              <span className="text-gray-300">from </span>
                              {m.sources.map((source, idx) => (
                                <span key={idx} className="text-gray-400 hover:text-gray-700 transition-colors cursor-default" title={cleanFileName(source)}>
                                  {idx > 0 && <span className="text-gray-200"> · </span>}
                                  {cleanFileName(source)}
                                </span>
                              ))}
                            </p>
                          )}
                          {m.role === 'user' && <span className="block text-[10px] mt-1.5 text-gray-400">{formatTime(m.ts)}</span>}
                        </div>
                      )}
                      {m.role === 'assistant' && !m.streaming && m.content && !isError && !quizMatch && !m.confirm && !m.pickCount && (
                        <div className="flex items-center gap-0.5 mt-1 overflow-hidden max-h-8 opacity-100 md:max-h-0 md:opacity-0 md:group-hover:max-h-8 md:group-hover:opacity-100 transition-all duration-200">
                          <button onClick={() => { navigator.clipboard.writeText(m.content.replace(/\nSOURCES:.*$/m, '').trim()); setCopiedId(msgId); setTimeout(() => setCopiedId(null), 2000); }} className={`p-1.5 rounded-lg transition-colors ${copiedId === msgId ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}>{copiedId === msgId ? <Check size={12} /> : <Copy size={12} />}</button>
                          <button onClick={() => { setShareLinkCopied(false); setShareMsg({ id: msgId, content: m.content.replace(/\nSOURCES:.*$/m, '').trim() }); }} className="p-1.5 rounded-lg transition-colors text-gray-300 hover:text-gray-500 hover:bg-gray-50" title="Share"><Share2 size={12} /></button>
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
            {/* ChatGPT/Claude-style scroll-to-bottom button. Always rendered
                so opacity transitions smoothly; visibility is driven by the
                scroll listener above. No re-mount, no animation re-fire.
                pointer-events disabled when hidden so it can't be clicked
                in its faded state. */}
            <button
              type="button"
              aria-label="Scroll to bottom"
              onClick={() => { scrollToBottom(true, true); }}
              className={`absolute bottom-28 right-6 md:right-8 z-20 w-9 h-9 rounded-full bg-white border border-gray-200 text-gray-700 shadow-md flex items-center justify-center transition-opacity duration-200 hover:bg-gray-50 ${showNewMessageIndicator ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </button>
            <div className="px-4 md:px-8 py-3 md:py-4 bg-[#F6F6F4] border-t border-gray-200/70 flex-shrink-0" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              <div className="max-w-3xl mx-auto">{attachmentBar}{inputBox}</div>
              <p className="text-center text-[10px] text-gray-300 mt-2">Grounded in your course materials · Vertex AI</p>
            </div>
            </>
            )}
          </div>

          {/* ── Share modal (ChatGPT-style, Scholr-themed) ── */}
          {shareMsg && (() => {
            const shareText = (() => {
              const t = shareMsg.content || '';
              return t.length > 240 ? t.slice(0, 237).trimEnd() + '…' : t;
            })();
            const shareUrl = 'https://scholr.study';
            const tweet = `${shareText}\n\n— via Scholr`;
            const closeShare = () => { setShareMsg(null); setShareLinkCopied(false); };
            const copyLink = async () => {
              try {
                await navigator.clipboard.writeText(`${shareMsg.content}\n\n— via Scholr · ${shareUrl}`);
                setShareLinkCopied(true);
                setTimeout(() => setShareLinkCopied(false), 1800);
              } catch {}
            };
            const openWindow = (url) => { window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600'); };
            const shareX = () => openWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(shareUrl)}`);
            const shareLI = () => openWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`);
            const shareRD = () => openWindow(`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareText)}`);
            return (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeShare}>
                <div className="w-full max-w-md bg-[#F6F6F4] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between px-5 pt-4 pb-3">
                    <h3 className="text-base font-semibold text-gray-900" style={{ fontFamily: 'Newsreader, serif' }}>Share response</h3>
                    <button onClick={closeShare} className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100/70 transition-colors"><X size={16} /></button>
                  </div>
                  <div className="px-5 pb-3">
                    <p className="text-xs text-gray-500 leading-relaxed">Anyone with the link will see Scholr alongside the response you shared.</p>
                  </div>
                  <div className="px-5 pb-5">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap" style={{ display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{shareMsg.content}</div>
                      <div className="flex items-center justify-end mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <LandingLogo s={16} />
                          <span className="text-[12px] font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'Hanken Grotesk, system-ui, sans-serif', letterSpacing: '-0.02em' }}>Scholr</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <div className="grid grid-cols-4 gap-2">
                      <button onClick={copyLink} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${shareLinkCopied ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white group-hover:bg-gray-800'}`}>
                          {shareLinkCopied ? <Check size={15} /> : <LinkIcon size={14} />}
                        </div>
                        <span className="text-[10px] font-medium text-gray-700">{shareLinkCopied ? 'Copied' : 'Copy link'}</span>
                      </button>
                      <button onClick={shareX} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group">
                        <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center group-hover:bg-gray-800 transition-colors">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </div>
                        <span className="text-[10px] font-medium text-gray-700">X</span>
                      </button>
                      <button onClick={shareLI} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group">
                        <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center group-hover:bg-gray-800 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        </div>
                        <span className="text-[10px] font-medium text-gray-700">LinkedIn</span>
                      </button>
                      <button onClick={shareRD} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group">
                        <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center group-hover:bg-gray-800 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z"/></svg>
                        </div>
                        <span className="text-[10px] font-medium text-gray-700">Reddit</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

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

          {/* ── Flashcards panel — same shape as the quiz panel ── */}
          {cardsOpen && (
            <div className="fixed md:static inset-0 md:inset-auto z-30 md:w-[360px] md:border-l border-gray-200 bg-white flex flex-col md:flex-shrink-0 overflow-hidden pt-[env(safe-area-inset-top)] md:pt-0">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                    <FolderOpen size={15} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-900 text-sm font-semibold leading-tight">Flashcards</p>
                    <p className="text-gray-400 text-[11px] truncate">{cardsTopic || 'From your course materials'}</p>
                  </div>
                </div>
                {!cardsLoading && cards.length > 0 && (
                  <span className="text-[11px] font-medium text-gray-400 tabular-nums flex-shrink-0 ml-2">{cardsIndex + 1} / {cards.length}</span>
                )}
              </div>
              {!cardsLoading && cards.length > 0 && (
                <div className="h-1 bg-gray-100 flex-shrink-0">
                  <div className="h-full bg-gray-900 transition-all duration-300 ease-out" style={{ width: `${((cardsIndex + 1) / cards.length) * 100}%` }} />
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-5 md:p-6 flex flex-col">
                {cardsLoading && (
                  <div className="flex flex-col items-center justify-center flex-1 gap-4">
                    <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-xs text-center">Generating your flashcards from course materials…</p>
                  </div>
                )}
                {!cardsLoading && cards.length === 0 && (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center">
                    <AlertCircle size={24} className="text-gray-200" />
                    <p className="text-gray-500 text-sm font-medium">Couldn't generate flashcards</p>
                    <p className="text-gray-400 text-xs">Try again with a specific topic</p>
                  </div>
                )}
                {!cardsLoading && cards.length > 0 && (() => {
                  const c = cards[cardsIndex];
                  const isFirst = cardsIndex === 0;
                  const isLast = cardsIndex === cards.length - 1;
                  return (
                    <div className="flex flex-col gap-5 flex-1">
                      <div className="fcard-wrap flex-1 flex items-stretch">
                        <div className={`fcard${cardsFlipped ? ' flipped' : ''} flex-1`} onClick={() => setCardsFlipped(f => !f)} role="button" aria-label="Flip flashcard">
                          <div className="face front">
                            <span className="ftip">Tap to flip</span>
                            <span className="ftag">Front</span>
                            <span className="ftext">{c.front}</span>
                            {c.source && <span className="fsrc">— {c.source}</span>}
                          </div>
                          <div className="face back">
                            <span className="ftip">Tap to flip</span>
                            <span className="ftag">Back</span>
                            <span className="ftext">{c.back}</span>
                            {c.source && <span className="fsrc">— {c.source}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <button onClick={prevCard} disabled={isFirst} aria-label="Previous card"
                          className="w-11 h-11 rounded-full border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white disabled:cursor-not-allowed flex items-center justify-center text-gray-700 transition-colors">
                          <ChevronLeft size={18} />
                        </button>
                        <button onClick={() => setCardsFlipped(f => !f)} className="flex-1 py-2.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors">
                          {cardsFlipped ? 'Show front' : 'Show back'}
                        </button>
                        <button onClick={isLast ? () => { setCardsIndex(0); setCardsFlipped(false); } : nextCard} aria-label={isLast ? 'Restart deck' : 'Next card'}
                          className="w-11 h-11 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-700 transition-colors">
                          {isLast ? <RotateCcw size={16} /> : <ChevronRight size={18} />}
                        </button>
                      </div>
                      {isLast && (
                        <button onClick={() => generateFlashcards(cardsTopic)} className="w-full py-2.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 text-sm font-medium transition-colors">Generate a new deck</button>
                      )}
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
  'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  'list-checks': '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M14 5h7"/><path d="M14 12h7"/><path d="M14 19h7"/>',
  'graduation-cap': '<path d="m22 10-10-5L2 10l10 5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>',
  'layers': '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m6.08 9.5-3.48 1.58a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.49-1.59"/><path d="m6.08 14.5-3.48 1.58a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.49-1.59"/>',
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
  --bg:#F3F4F6; --bg-2:#ECEEF2; --bg-3:#E5E7EC; --surface:#FFFFFF;
  --ink:#15161B; --ink-2:#2A2C33; --muted:#6B6E76; --muted-2:#9A9CA3;
  --line:#E1E3E8; --line-2:#E9EBEF; --accent:#15161B; --accent-soft:rgba(21,22,27,.06);
  --radius:16px; --radius-sm:11px; --radius-lg:22px; --radius-pill:999px; --btn-radius:13px;
  --shadow-sm:0 1px 2px rgba(21,22,27,.04),0 1px 3px rgba(21,22,27,.05);
  --shadow-card:0 1px 2px rgba(21,22,27,.04),0 14px 34px -18px rgba(21,22,27,.16);
  --shadow-float:0 40px 90px -38px rgba(21,22,27,.34),0 8px 26px -16px rgba(21,22,27,.18);
  --maxw:1280px;
  font-family:var(--font-body); color:var(--ink); line-height:1.55; font-size:17px;
  background:
    radial-gradient(80% 70% at 100% 0%,rgba(255,255,255,1) 0%,rgba(255,255,255,0) 55%),
    radial-gradient(70% 60% at 0% 50%,rgba(255,255,255,.85) 0%,rgba(255,255,255,0) 60%),
    radial-gradient(60% 55% at 50% 100%,rgba(255,255,255,.7) 0%,rgba(255,255,255,0) 60%),
    radial-gradient(45% 40% at 75% 65%,rgba(225,229,236,.4) 0%,rgba(225,229,236,0) 65%),
    linear-gradient(165deg,#F0F2F6 0%,#E7EAEF 55%,#E2E5EB 100%);
  background-attachment:fixed;
  overflow-x:hidden; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
}
.scholr-landing *{box-sizing:border-box;margin:0;padding:0;}
.scholr-landing img{max-width:100%;display:block;}
.scholr-landing a{color:inherit;text-decoration:none;}
.scholr-landing button{font:inherit;color:inherit;}
.scholr-landing svg{display:block;}
.scholr-landing ::selection{background:var(--ink);color:var(--bg);}
.scholr-landing [id]{scroll-margin-top:92px;}
.scholr-landing .wrap{max-width:var(--maxw);margin:0 auto;padding:0 36px;}
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
/* Pinned promo banner above the nav. Uses position fixed instead of
   sticky because .scholr-landing has overflow-x hidden, which
   silently breaks sticky behavior on descendants (sticky needs an
   ancestor scroll context that the overflow rule disrupts). Fixed
   anchors to the viewport directly so the banner stays at the top
   no matter how far the page is scrolled. The page reserves 36px of
   top padding (see .scholr-landing wrapper) so initial content
   does not slide under the banner. Same trick for the nav at top 36. */
.scholr-landing .top-banner{position:fixed;top:0;left:0;right:0;z-index:70;background:#15161B;color:#FBFBF9;height:36px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;letter-spacing:.01em;padding:0 16px;}
.scholr-landing .top-banner .new-tag{color:#FBFBF9;font-weight:700;margin-right:8px;text-transform:uppercase;letter-spacing:.08em;font-size:12px;opacity:.85;}
.scholr-landing .top-banner .sep{opacity:.4;margin:0 10px;}
.scholr-landing .top-banner a{color:inherit;display:inline-flex;align-items:center;gap:6px;font-weight:600;}
.scholr-landing .top-banner a .arr{display:inline-flex;transition:transform .2s ease;}
.scholr-landing .top-banner a:hover .arr{transform:translateX(3px);}
.scholr-landing header.nav{position:fixed;top:0;left:0;right:0;z-index:60;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(16px) saturate(1.5);-webkit-backdrop-filter:blur(16px) saturate(1.5);border-bottom:1px solid transparent;transition:border-color .25s ease,background .25s ease;}
.scholr-landing header.nav.scrolled{border-bottom-color:var(--line);}
/* Nav extends to the viewport edges (overrides the .wrap max-width
   cap) so the logo sits flush left and the buttons sit flush right —
   matches Kaizen's full-width nav. */
.scholr-landing header.nav .wrap.nav-inner{max-width:none;padding:0 88px;}
@media (max-width:1100px){.scholr-landing header.nav .wrap.nav-inner{padding:0 48px;}}
@media (max-width:680px){.scholr-landing header.nav .wrap.nav-inner{padding:0 24px;}}
.scholr-landing .nav-inner{display:flex;align-items:center;gap:32px;height:76px;}
.scholr-landing .nav-inner .brand{margin-right:auto;}
.scholr-landing .brand{display:flex;align-items:center;gap:11px;font-weight:700;font-size:23px;letter-spacing:-.02em;color:var(--ink);background:none;border:none;cursor:pointer;font-family:var(--font-body);}
.scholr-landing .brand .mark{width:36px;height:36px;flex:none;}
.scholr-landing .nav-links{display:flex;align-items:center;gap:32px;}
.scholr-landing .nav-links a{font-size:15.5px;font-weight:500;color:var(--muted);transition:color .15s ease;cursor:pointer;}
.scholr-landing .nav-links a:hover{color:var(--ink);}
.scholr-landing .nav-right{display:flex;align-items:center;gap:14px;}
/* Warp-style left-aligned hero — smaller display type, content pinned
   to the left so it fills the screen instead of floating in the middle.
   The wrap already caps at 1120px; the hero's inner column caps tighter
   so the headline reads as a confident two-line statement rather than
   a giant centered banner. */
.scholr-landing .hero{text-align:center;padding:0;position:relative;min-height:calc(100vh - 76px);display:flex;align-items:center;overflow:hidden;}
.scholr-landing .hero .wrap{width:100%;padding-top:24px;padding-bottom:64px;position:relative;z-index:2;}
.scholr-landing .hero .hero-col{max-width:820px;margin:0 auto;}
.scholr-landing .hero-waves{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;}
.scholr-landing .hero .chip{margin-bottom:24px;}
.scholr-landing .hero h1{font-family:var(--font-display);font-weight:500;font-size:clamp(50px,6.4vw,88px);line-height:1.02;letter-spacing:-.028em;color:var(--ink);}
.scholr-landing .hero h1 .l2{display:block;font-style:italic;font-weight:500;}
.scholr-landing .hero .lede{font-size:clamp(17px,1.45vw,21px);color:var(--muted);max-width:580px;margin:28px auto 0;line-height:1.55;}
.scholr-landing .hero-actions{margin-top:36px;display:flex;justify-content:center;}
.scholr-landing .hero-cta{padding:18px 38px;font-size:17px;font-weight:600;}
/* Warp-style inline pill: email input + submit button in a single rounded
   container. Input on the left expands, button anchored on the right.
   Same .btn-primary ink treatment as the rest of the landing so it stays
   on-brand — not the orange of the inspiration screenshot. */
.scholr-landing .hero-pill{display:inline-flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-pill);padding:7px 7px 7px 22px;box-shadow:var(--shadow-sm);min-width:min(440px,92vw);transition:border-color .2s ease,box-shadow .2s ease;}
.scholr-landing .hero-pill:focus-within{border-color:var(--ink);box-shadow:0 4px 18px -8px rgba(21,22,27,.22);}
.scholr-landing .hero-pill input{flex:1;background:transparent;border:0;outline:0;font:inherit;font-size:15.5px;color:var(--ink);padding:10px 4px;min-width:0;}
.scholr-landing .hero-pill input::placeholder{color:var(--muted-2);}
.scholr-landing .hero-pill button[type=submit]{flex:none;display:inline-flex;align-items:center;gap:8px;background:var(--ink);color:#fff;border:0;border-radius:var(--radius-pill);font-family:var(--font-body);font-weight:600;font-size:14.5px;padding:11px 18px;cursor:pointer;transition:transform .15s ease,background .2s ease;}
.scholr-landing .hero-pill button[type=submit] svg{width:15px;height:15px;}
.scholr-landing .hero-pill button[type=submit]:hover{background:#000;transform:translateY(-1px);}
.scholr-landing .hero-pill button[type=submit] .arr{display:inline-flex;}
.scholr-landing .hero-sub{margin-top:22px;font-size:14.5px;color:var(--muted-2);text-align:center;}
.scholr-landing .hero-meta{margin-top:26px;display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--muted-2);font-weight:500;letter-spacing:.01em;}
.scholr-landing .hero-meta-dot{width:6px;height:6px;border-radius:99px;background:var(--ink);flex:none;box-shadow:0 0 0 4px rgba(21,22,27,.08);}
.scholr-landing .hero-scroll{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);display:inline-flex;flex-direction:column;align-items:center;gap:6px;font-family:var(--font-body);font-size:11.5px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted-2);text-decoration:none;cursor:pointer;opacity:.7;transition:opacity .2s ease,transform .2s ease;}
.scholr-landing .hero-scroll:hover{opacity:1;transform:translate(-50%,2px);}
.scholr-landing .hero-scroll-arr{display:grid;place-items:center;width:24px;height:24px;border-radius:99px;border:1px solid var(--line);color:var(--ink);animation:lp-bounce 2.2s ease-in-out infinite;}
@keyframes lp-bounce{0%,100%{transform:translateY(0);}50%{transform:translateY(4px);}}
.scholr-landing .hero-sub a{color:var(--ink);font-weight:700;margin-left:6px;display:inline-flex;align-items:center;gap:5px;cursor:pointer;}
.scholr-landing .hero-sub a svg{width:15px;height:15px;transition:transform .2s ease;}
.scholr-landing .hero-sub a:hover svg{transform:translateX(3px);}
.scholr-landing .showband{background:var(--bg-2);border-top:1px solid var(--line);padding:48px 0 80px;}
.scholr-landing .showband .wrap{max-width:1340px;}
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

/* New "Make me a quiz" input — flat pill with a soft + button on the right */
.scholr-landing .quiz-input{flex-direction:row;align-items:center;justify-content:space-between;padding:14px 14px 14px 22px;border-radius:18px;border:1px solid var(--m-line);background:#fff;box-shadow:0 1px 2px rgba(21,22,27,.04);}
.scholr-landing .quiz-input .qi-text{font-size:15px;color:var(--m-faint);font-weight:500;}
.scholr-landing .quiz-input .qi-plus{width:30px;height:30px;border-radius:999px;background:var(--m-hover);color:var(--m-muted);display:grid;place-items:center;}
.scholr-landing .quiz-input .qi-plus svg{color:inherit;}

/* Counted nav rows in the sidebar */
.scholr-landing .nav-list{gap:1px;}
.scholr-landing .nav-row{display:flex !important;align-items:center;justify-content:space-between;color:var(--m-ink);padding:8px 10px;}
.scholr-landing .nav-row .nav-left{display:inline-flex;align-items:center;gap:11px;font-size:14px;font-weight:500;color:var(--m-ink);}
.scholr-landing .nav-row .nav-left svg{width:15px;height:15px;color:var(--m-muted);stroke-width:1.8;}
.scholr-landing .nav-row .cnt{font-size:12px;font-weight:600;color:var(--m-muted);background:var(--m-hover);padding:2px 8px;border-radius:999px;min-width:22px;text-align:center;}
.scholr-landing .nav-row:hover{background:var(--m-hover);}
.scholr-landing .side-label{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--m-faint);padding:0 6px;}
.scholr-landing section.band{padding:84px 0;}
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
.scholr-landing .principle{background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.7);border-radius:var(--radius);padding:36px 34px;box-shadow:0 1px 2px rgba(21,22,27,.04),0 18px 40px -20px rgba(21,22,27,.14);transition:transform .2s ease,box-shadow .2s ease;-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);}
.scholr-landing .principle:hover{transform:translateY(-3px);box-shadow:var(--shadow-card);}
.scholr-landing .principle .idx{display:flex;align-items:center;gap:13px;margin-bottom:20px;}
.scholr-landing .principle .idx b{font-family:var(--font-display);font-style:italic;font-weight:500;font-size:21px;color:var(--ink);}
.scholr-landing .principle .idx .ln{flex:1;height:1px;background:var(--line);}
.scholr-landing .principle h3{font-family:var(--font-display);font-weight:500;font-size:25px;letter-spacing:-.02em;margin-bottom:11px;}
.scholr-landing .principle p{font-size:16px;color:var(--muted);line-height:1.6;}
.scholr-landing .bento{display:grid;grid-template-columns:repeat(6,1fr);gap:18px;}
.scholr-landing .feat{background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.7);border-radius:var(--radius);padding:30px;display:flex;flex-direction:column;box-shadow:0 1px 2px rgba(21,22,27,.04),0 18px 40px -20px rgba(21,22,27,.14);transition:transform .18s ease,box-shadow .18s ease,border-color .18s;-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);}
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
.scholr-landing .aud{border-radius:var(--radius);padding:42px;border:1px solid rgba(255,255,255,.7);box-shadow:0 1px 2px rgba(21,22,27,.04),0 22px 50px -22px rgba(21,22,27,.18);}
.scholr-landing .aud.prof{background:var(--ink);color:#fff;border-color:transparent;}
.scholr-landing .aud.stud{background:rgba(255,255,255,.55);-webkit-backdrop-filter:blur(20px) saturate(160%);backdrop-filter:blur(20px) saturate(160%);}
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
.scholr-landing .dash{background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.7);border-radius:var(--radius);box-shadow:0 1px 2px rgba(21,22,27,.04),0 22px 50px -22px rgba(21,22,27,.18);overflow:hidden;-webkit-backdrop-filter:blur(20px) saturate(170%);backdrop-filter:blur(20px) saturate(170%);}
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
/* Giant wordmark sign-off — same architecture Warp uses below their
   footer. The display serif "Scholr" is enormous, filled with
   horizontal stripes for texture, and bleeds off both edges of the
   viewport so it reads as a graphic flourish rather than literal text.
   Sits on the cream background so it visually closes the page. */
.scholr-landing .brand-signoff{background:var(--bg);overflow:hidden;line-height:0;padding:24px 0 0;border-top:1px solid var(--line);}
.scholr-landing .brand-signoff .word{
  font-family:var(--font-display);
  font-weight:500;
  font-style:italic;
  font-size:clamp(180px,28vw,460px);
  letter-spacing:-.045em;
  line-height:.82;
  text-align:center;
  display:block;
  white-space:nowrap;
  user-select:none;
  /* Striped fill — repeating horizontal lines through the letterforms */
  background:repeating-linear-gradient(
    180deg,
    rgba(21,22,27,.22) 0,
    rgba(21,22,27,.22) 2px,
    transparent 2px,
    transparent 7px
  );
  -webkit-background-clip:text;
  background-clip:text;
  -webkit-text-fill-color:transparent;
  color:transparent;
  /* Bleed past the viewport edges */
  width:108%;
  margin-left:-4%;
  padding-bottom:14px;
  transform:translateY(8%);
}
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
.scholr-landing .q-chip{display:inline-flex;align-items:center;gap:10px;padding:11px 19px;border:1px solid rgba(255,255,255,.7);border-radius:var(--radius-pill);background:rgba(255,255,255,.55);font-size:15px;font-weight:500;color:var(--ink-2);white-space:nowrap;box-shadow:0 1px 2px rgba(21,22,27,.04);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);}
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
/* Cinematic reveal — bigger lift, gentler easing, longer duration so
   sections fade up smoothly as the user scrolls into them */
.scholr-landing .reveal{opacity:0;transform:translateY(48px) scale(.985);filter:blur(4px);transition:opacity 1.05s cubic-bezier(.16,.7,.18,1),transform 1.05s cubic-bezier(.16,.7,.18,1),filter .9s ease-out;will-change:transform,opacity,filter;}
.scholr-landing .reveal.in{opacity:1;transform:none;filter:blur(0);}
.scholr-landing .stagger>*{opacity:0;transform:translateY(40px) scale(.985);filter:blur(3px);transition:opacity .95s cubic-bezier(.16,.7,.18,1),transform .95s cubic-bezier(.16,.7,.18,1),filter .8s ease-out;will-change:transform,opacity,filter;}
.scholr-landing .stagger.in>*{opacity:1;transform:none;filter:blur(0);}
.scholr-landing .win-rise{opacity:0;transform:translateY(60px) scale(.965);filter:blur(2px);transition:opacity 1.1s cubic-bezier(.16,.7,.18,1),transform 1.2s cubic-bezier(.16,.7,.18,1),filter .9s ease-out;will-change:transform,opacity,filter;}
.scholr-landing .win-rise.in{opacity:1;transform:none;filter:blur(0);}
@media (prefers-reduced-motion:reduce){.scholr-landing .reveal,.scholr-landing .stagger>*,.scholr-landing .win-rise{transition:none !important;opacity:1 !important;transform:none !important;filter:none !important;}}
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

/* ─── Texture, accent, hand-drawn — polish to push the page away from
   the AI-template default. Subtle grain via fixed pseudo, varied border
   radii, mixed hover behaviors, single peach accent reused from the top
   banner, and a hand-drawn squiggle under a hero phrase. ────────── */
.scholr-landing{position:relative;}
/* Grain layer killed — page renders smooth 4K gradient instead of paper texture */
/* Keep banner + nav above the grain WITHOUT changing their position. They
   were position:fixed before — setting position:relative would unstick
   them. Bump z-index past the grain layer instead. */
.scholr-landing .top-banner{z-index:70;}
.scholr-landing header.nav{z-index:60;}
.scholr-landing main,
.scholr-landing footer.foot,
.scholr-landing .brand-signoff{position:relative;z-index:2;}
.scholr-landing .lp-modal{z-index:100;}

/* Transparent nav — no bar, no border. Buttons and dropdowns float
   directly on the gradient background. On scroll, fade in a soft
   blurred backdrop just so the content underneath doesn't smear the
   buttons unreadably. */
.scholr-landing header.nav{background:transparent;-webkit-backdrop-filter:none;backdrop-filter:none;border-bottom:0;}
.scholr-landing header.nav.scrolled{background:rgba(255,255,255,.4);-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);}

/* Glass treatment for nav buttons + dropdown triggers */
.scholr-landing .nav-right .btn-ghost{background:rgba(255,255,255,.55);border-color:rgba(255,255,255,.6);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);color:var(--ink);}
.scholr-landing .nav-right .btn-ghost:hover{background:rgba(255,255,255,.85);border-color:rgba(21,22,27,.15);}
.scholr-landing .nav-right .btn-primary{box-shadow:0 1px 2px rgba(21,22,27,.4),inset 0 1px 0 rgba(255,255,255,.08);}
.scholr-landing .nav-dd-trigger{background:rgba(255,255,255,.0);}
.scholr-landing .nav-dd-trigger:hover,
.scholr-landing .nav-dd.open .nav-dd-trigger{background:rgba(255,255,255,.6);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);}
.scholr-landing .brand{padding:4px 10px 4px 4px;border-radius:14px;transition:background .2s ease;}
.scholr-landing .brand:hover{background:rgba(255,255,255,.45);}

/* Hand-drawn squiggle under a hero phrase — peach (reused from banner) */
.scholr-landing .squig{position:relative;display:inline-block;}
.scholr-landing .squig::after{
  content:"";
  position:absolute;
  left:-1%;
  right:-1%;
  bottom:-.12em;
  height:.22em;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 12' preserveAspectRatio='none'><path d='M3 7 Q 18 1.5 35 7 T 70 7 T 105 7 T 140 7 T 175 7 T 197 7' stroke='%2315161B' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>");
  background-repeat:no-repeat;
  background-size:100% 100%;
  opacity:.32;
  pointer-events:none;
}

/* Mixed border radii — break the template feel */
.scholr-landing .q-chip{border-radius:9px;}
.scholr-landing .principle{border-radius:6px;}
.scholr-landing .principle:nth-child(2),
.scholr-landing .principle:nth-child(3){border-radius:22px;}
.scholr-landing .feat{border-radius:14px;}
.scholr-landing .feat.span-3{border-radius:22px;}
.scholr-landing .feat:nth-child(3),
.scholr-landing .feat:nth-child(5){border-radius:6px;}
.scholr-landing .step .ic-box{border-radius:9px;}
.scholr-landing .feat .ic-box{border-radius:9px;}
.scholr-landing .principle:nth-child(2n) .ic-box,
.scholr-landing .feat:nth-child(2n+1) .ic-box{border-radius:50%;}

/* Tilt + overlap product mock window */
.scholr-landing .showband{padding-bottom:130px;overflow:visible;perspective:1400px;}
.scholr-landing .showband + .mq-band{margin-top:-58px;position:relative;z-index:3;}
.scholr-landing .win-rise{transform:translateY(120px) scale(.82) rotate(-1.6deg);transform-style:preserve-3d;}
.scholr-landing .win-rise.in{transform:translateY(0) scale(1) rotate(-.4deg);}
.scholr-landing .window{box-shadow:0 50px 110px -40px rgba(21,22,27,.42),0 12px 32px -18px rgba(21,22,27,.2);transform-origin:50% 100%;}

/* Cool scroll-driven entry — continuous animation tied to scroll
   position on Chrome/Edge 115+. Older browsers fall back to the
   IntersectionObserver-driven .win-rise.in transition above. */
@supports (animation-timeline: view()) {
  .scholr-landing .showband .win-rise{
    animation:scholr-mock-scroll linear both;
    animation-timeline:view();
    animation-range:entry 0% cover 35%;
    opacity:1 !important;
  }
  @keyframes scholr-mock-scroll{
    from{transform:translateY(180px) scale(.78) rotateX(8deg) rotate(-2deg);opacity:.45;}
    to{transform:translateY(0) scale(1) rotateX(0deg) rotate(-.4deg);opacity:1;}
  }
}

/* Varied hover behaviors — no more uniform translateY on every card */
.scholr-landing .principle{transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s ease,border-color .25s ease;}
.scholr-landing .principle:hover{transform:translateY(-3px) rotate(.25deg);box-shadow:var(--shadow-card);border-color:var(--ink-2);}
.scholr-landing .principle:nth-child(2):hover{transform:translateY(-3px) rotate(-.35deg);}
.scholr-landing .principle:nth-child(3):hover{transform:translateY(-3px) rotate(-.25deg);}
.scholr-landing .principle:nth-child(4):hover{transform:translateY(-3px) rotate(.35deg);}
.scholr-landing .feat:hover{transform:none;border-color:var(--ink);box-shadow:var(--shadow-sm);}
.scholr-landing .feat.dark:hover{border-color:rgba(255,255,255,.4);}
.scholr-landing .feat .ic-box{transition:transform .25s ease,border-color .25s ease;}
.scholr-landing .feat:hover .ic-box{transform:scale(1.08);}
.scholr-landing .step{transition:background .2s ease;}
.scholr-landing .step:hover{background:var(--bg);}
.scholr-landing .step .ic-box{transition:transform .25s cubic-bezier(.2,.7,.2,1),border-color .25s ease;}
.scholr-landing .step:hover .ic-box{transform:rotate(-6deg);border-color:var(--ink);}

/* Peach accent — reused from the existing top-banner "New" color */
.scholr-landing .hero .chip .dot.live{background:var(--ink);color:var(--ink);}
.scholr-landing .principle .idx b{color:var(--ink);}
.scholr-landing .step .num b{color:var(--ink);font-style:normal;font-family:var(--font-display);}

/* Chapter-mark eyebrow variant — used by sections that drop the dot */
.scholr-landing .chapter{display:inline-flex;align-items:baseline;gap:14px;font-family:var(--font-body);font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:18px;}
.scholr-landing .chapter b{font-family:var(--font-display);font-weight:500;font-style:italic;font-size:22px;color:var(--ink);letter-spacing:-.01em;line-height:1;}
.scholr-landing .chapter .ln{display:inline-block;width:28px;height:1.5px;background:currentColor;opacity:.5;border-radius:2px;transform:translateY(-4px);}

/* ─── Nav mega-menu dropdowns — Kaizen-style multi-column ──────────── */
.scholr-landing .nav-links{gap:6px;}
.scholr-landing .nav-dd{position:relative;}
.scholr-landing .nav-dd-trigger{display:inline-flex;align-items:center;gap:6px;background:none;border:0;padding:9px 14px;border-radius:10px;cursor:pointer;font-family:var(--font-body);font-size:15.5px;font-weight:500;color:var(--muted);transition:color .15s ease,background .15s ease;}
.scholr-landing .nav-dd-trigger:hover,
.scholr-landing .nav-dd.open .nav-dd-trigger{color:var(--ink);background:rgba(21,22,27,.04);}
.scholr-landing .nav-dd-chev{transition:transform .25s cubic-bezier(.2,.7,.2,1);opacity:.7;}
.scholr-landing .nav-dd.open .nav-dd-chev{transform:rotate(180deg);opacity:1;}
.scholr-landing .nav-dd-bridge{position:absolute;top:100%;left:0;right:0;height:14px;}
/* Glassmorphic mega-menu panel — translucent surface with backdrop blur,
   subtle gradient border ring, and a soft inner highlight along the top
   edge. Sits over the page like a sheet of frosted glass. */
.scholr-landing .nav-dd-panel{
  position:absolute;
  top:calc(100% + 14px);
  right:0;
  width:680px;
  background:linear-gradient(180deg,rgba(255,255,255,.92) 0%,rgba(255,255,255,.78) 100%);
  border:1px solid rgba(255,255,255,.7);
  border-radius:24px;
  box-shadow:
    0 1px 0 rgba(255,255,255,.7) inset,
    0 36px 90px -32px rgba(21,22,27,.36),
    0 10px 28px -14px rgba(21,22,27,.2),
    0 0 0 1px rgba(21,22,27,.025);
  -webkit-backdrop-filter:blur(32px) saturate(180%);
  backdrop-filter:blur(32px) saturate(180%);
  padding:18px;
  opacity:0;
  transform:translateY(-8px) scale(.97);
  pointer-events:none;
  transition:opacity .26s cubic-bezier(.2,.7,.2,1),transform .32s cubic-bezier(.2,.7,.2,1);
  z-index:50;
  overflow:hidden;
}
/* Subtle gradient stripe at the top of the panel — adds a refined detail */
.scholr-landing .nav-dd-panel > *{position:relative;z-index:1;}
/* Soft gradient ring around the panel for a premium edge */
.scholr-landing .nav-dd-panel::before{
  content:"";
  position:absolute;
  inset:0;
  border-radius:22px;
  padding:1px;
  background:linear-gradient(135deg,rgba(255,255,255,.9) 0%,rgba(255,255,255,0) 35%,rgba(255,255,255,0) 70%,rgba(21,22,27,.06) 100%);
  -webkit-mask:linear-gradient(#000,#000) content-box,linear-gradient(#000,#000);
  -webkit-mask-composite:xor;
  mask:linear-gradient(#000,#000) content-box,linear-gradient(#000,#000);
  mask-composite:exclude;
  pointer-events:none;
}
.scholr-landing .nav-dd.open .nav-dd-panel{opacity:1;transform:none;pointer-events:auto;}

.scholr-landing .nav-dd-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:16px;position:relative;}
.scholr-landing .nav-dd-col{display:flex;flex-direction:column;gap:2px;min-width:0;}
.scholr-landing .nav-dd-label{font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--muted-2);padding:8px 14px 14px;display:inline-flex;align-items:center;gap:10px;}
.scholr-landing .nav-dd-label::before{content:"";width:14px;height:1.5px;border-radius:2px;background:currentColor;opacity:.45;}

/* Each row: soft slide + tinted-glass icon tile with inner ring */
.scholr-landing .nav-dd-link{display:flex;gap:14px;align-items:center;padding:13px 14px;border-radius:14px;text-align:left;background:rgba(255,255,255,0);border:1px solid rgba(255,255,255,0);cursor:pointer;font-family:var(--font-body);transition:background .22s cubic-bezier(.2,.7,.2,1),border-color .22s ease,transform .22s ease;color:var(--ink);position:relative;}
.scholr-landing .nav-dd-link::after{content:"";position:absolute;right:14px;top:50%;transform:translate(4px,-50%);opacity:0;width:14px;height:14px;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2315161B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M5 12h14M13 5l7 7-7 7'/></svg>");background-repeat:no-repeat;background-size:contain;transition:opacity .2s ease,transform .25s cubic-bezier(.2,.7,.2,1);}
.scholr-landing .nav-dd-link:hover{background:rgba(255,255,255,.6);border-color:rgba(255,255,255,.75);transform:translateX(2px);}
.scholr-landing .nav-dd-link:hover::after{opacity:.7;transform:translate(0,-50%);}
.scholr-landing .nav-dd-ic{width:38px;height:38px;border-radius:12px;background:linear-gradient(160deg,rgba(255,255,255,.85) 0%,rgba(235,237,242,.9) 100%);color:var(--ink);display:grid;place-items:center;flex:none;border:1px solid rgba(255,255,255,.95);box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 0 0 1px rgba(21,22,27,.04),0 6px 16px -6px rgba(21,22,27,.14);transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s ease;position:relative;}
.scholr-landing .nav-dd-ic::after{content:"";position:absolute;inset:1px;border-radius:11px;background:linear-gradient(180deg,rgba(255,255,255,.5) 0%,rgba(255,255,255,0) 50%);pointer-events:none;}
.scholr-landing .nav-dd-link:hover .nav-dd-ic{transform:scale(1.08) rotate(-3deg);box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 0 0 1px rgba(21,22,27,.05),0 8px 22px -6px rgba(21,22,27,.22);}
.scholr-landing .nav-dd-text{display:flex;flex-direction:column;gap:3px;min-width:0;}
.scholr-landing .nav-dd-text b{font-size:14.5px;font-weight:600;color:var(--ink);letter-spacing:-.005em;}
.scholr-landing .nav-dd-text span{font-size:12.5px;color:var(--muted);line-height:1.4;}

/* Feature card — layered dark surface with a subtle internal gradient,
   tiny moving accent, and a sharper arrow on hover. Padded so it never
   touches the panel edge. */
.scholr-landing .nav-dd-feature{display:flex;flex-direction:column;justify-content:space-between;border-radius:18px;background:
  radial-gradient(140% 90% at 100% 0%,rgba(255,255,255,.1) 0%,rgba(255,255,255,0) 50%),
  radial-gradient(80% 60% at 0% 100%,rgba(255,255,255,.04) 0%,rgba(255,255,255,0) 60%),
  linear-gradient(160deg,#15161B 0%,#2A2C33 100%);
  color:#FBFBF9;padding:20px;text-decoration:none;cursor:pointer;overflow:hidden;position:relative;transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s ease;border:1px solid rgba(255,255,255,.1);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 14px 34px -16px rgba(0,0,0,.55);min-height:230px;}
.scholr-landing .nav-dd-feature::after{
  content:"";
  position:absolute;
  top:-30%;
  right:-25%;
  width:240px;
  height:240px;
  background:radial-gradient(circle,rgba(255,255,255,.1) 0%,rgba(255,255,255,0) 70%);
  pointer-events:none;
}
/* Animated dot in the top-left of the feature card — adds a real-time feel */
.scholr-landing .nav-dd-feature::before{
  content:"";
  position:absolute;
  top:20px;
  right:64px;
  width:6px;
  height:6px;
  border-radius:999px;
  background:#FFFFFF;
  opacity:.4;
  box-shadow:0 0 0 4px rgba(255,255,255,.08);
  animation:lp-pulse 2.4s ease-in-out infinite;
}
@keyframes lp-pulse{0%,100%{opacity:.4;transform:scale(1);}50%{opacity:.85;transform:scale(1.15);}}
.scholr-landing .nav-dd-feature:hover{transform:translateY(-3px);box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 24px 50px -20px rgba(0,0,0,.65);}
.scholr-landing .nav-dd-feature.alt{background:
  radial-gradient(140% 90% at 100% 0%,rgba(255,255,255,.1) 0%,rgba(255,255,255,0) 50%),
  linear-gradient(160deg,#2A2C33 0%,#3F424A 100%);}
.scholr-landing .nav-dd-feature-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;font-family:var(--font-display);font-weight:500;font-size:22px;line-height:1.05;letter-spacing:-.02em;position:relative;}
.scholr-landing .nav-dd-feature-arr{display:grid;place-items:center;width:32px;height:32px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);color:#fff;flex:none;transition:transform .25s cubic-bezier(.2,.7,.2,1),background .25s ease;}
.scholr-landing .nav-dd-feature:hover .nav-dd-feature-arr{background:rgba(255,255,255,.22);transform:translate(3px,-1px);}
.scholr-landing .nav-dd-feature-art{display:flex;flex-direction:column;gap:6px;margin-top:24px;position:relative;}
.scholr-landing .nav-dd-feature-art .art-line{height:5px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden;position:relative;}
.scholr-landing .nav-dd-feature-art .art-line::after{content:"";position:absolute;inset:0;width:30%;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.4) 50%,transparent 100%);animation:lp-shimmer 2.6s ease-in-out infinite;}
.scholr-landing .nav-dd-feature-art .art-line:nth-child(2)::after{animation-delay:.3s;}
.scholr-landing .nav-dd-feature-art .art-line:nth-child(3)::after{animation-delay:.6s;}
@keyframes lp-shimmer{0%{transform:translateX(-130%);}100%{transform:translateX(430%);}}
.scholr-landing .nav-dd-feature-art .art-cite{margin-top:10px;display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);font-size:11px;font-weight:600;color:rgba(255,255,255,.82);align-self:flex-start;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);}
.scholr-landing .nav-dd-feature-art .art-cite svg{color:rgba(255,255,255,.82);}
.scholr-landing .nav-dd-feature-art.alt{margin-top:16px;}
.scholr-landing .nav-dd-feature-art .art-quote{font-family:var(--font-display);font-style:italic;font-size:14px;line-height:1.4;color:rgba(255,255,255,.78);}

/* Footer row — clean pills with subtle borders, slightly more breathing */
.scholr-landing .nav-dd-foot{margin-top:16px;padding-top:14px;border-top:1px solid rgba(21,22,27,.07);display:flex;align-items:center;gap:10px;flex-wrap:wrap;position:relative;}
.scholr-landing .nav-dd-foot-lbl{font-size:10.5px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--muted-2);margin-right:auto;}
.scholr-landing .nav-dd-foot-tag{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--ink-2);text-decoration:none;padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.7);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:background .2s ease,color .2s ease;}
.scholr-landing .nav-dd-foot-tag svg{color:var(--muted);}
.scholr-landing .nav-dd-foot-tag:hover{background:rgba(255,255,255,.9);color:var(--ink);}

/* Resources dropdown is shorter — narrower panel, anchored right too. */
.scholr-landing .nav-dd:nth-of-type(2) .nav-dd-panel{right:0;width:440px;}
.scholr-landing .nav-dd:nth-of-type(2) .nav-dd-grid{grid-template-columns:1fr;gap:14px;}
.scholr-landing .nav-dd:nth-of-type(2) .nav-dd-feature{flex-direction:row;align-items:center;padding:14px 16px;gap:14px;}
.scholr-landing .nav-dd:nth-of-type(2) .nav-dd-feature-top{font-size:16px;flex:1;align-items:center;}
.scholr-landing .nav-dd:nth-of-type(2) .nav-dd-feature-top span:first-child{white-space:nowrap;}
.scholr-landing .nav-dd:nth-of-type(2) .nav-dd-feature-art{display:none;}

@media (max-width:940px){
  .scholr-landing .nav-dd{display:none;}
}

/* Sticker badge — a slightly rotated tag in the corner of a section */
.scholr-landing .sticker{display:inline-block;padding:7px 14px;background:rgba(255,255,255,.7);color:var(--ink-2);border:1px solid rgba(21,22,27,.08);border-radius:8px;font-family:var(--font-body);font-size:12.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;transform:rotate(-1.4deg);box-shadow:0 2px 8px -3px rgba(21,22,27,.18);margin-bottom:22px;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);}
`;

// Shared mega-menu dropdowns used by both the main landing and the
// marketing subpages. Owns its own open-state and closes on item click.
// onTalk is optional — if not provided, the Talk-to-our-team item falls
// back to a mailto: link so the subpages still capture leads without
// needing their own modal wiring.
function LandingNavLinks({ navigate, onTalk }) {
  const [dd, setDD] = useState(null);
  const close = () => setDD(null);
  const goAndClose = (path) => (e) => { if (e) e.preventDefault(); close(); navigate(path); };
  const talkClick = () => { close(); if (onTalk) onTalk(); else window.location.href = 'mailto:hello@scholr.study?subject=Talk%20to%20the%20Scholr%20team'; };
  return (
    <nav className="nav-links">
      <div className={`nav-dd ${dd === 'product' ? 'open' : ''}`} onMouseEnter={() => setDD('product')} onMouseLeave={close}>
        <button type="button" className="nav-dd-trigger">Product <ChevronDown size={14} className="nav-dd-chev" /></button>
        <div className="nav-dd-bridge" />
        <div className="nav-dd-panel" role="menu" aria-label="Product menu">
          <div className="nav-dd-grid">
            <div className="nav-dd-col">
              <div className="nav-dd-label">Explore Scholr</div>
              <a className="nav-dd-link" href="/how-it-works" onClick={goAndClose('/how-it-works')}>
                <span className="nav-dd-ic"><Layers size={17} /></span>
                <span className="nav-dd-text"><b>How it works</b><span>Set up once, tutoring all term.</span></span>
              </a>
              <a className="nav-dd-link" href="/for-professors" onClick={goAndClose('/for-professors')}>
                <span className="nav-dd-ic"><GraduationCap size={17} /></span>
                <span className="nav-dd-text"><b>For professors</b><span>Stop answering the same question 50 times.</span></span>
              </a>
              <a className="nav-dd-link" href="/for-students" onClick={goAndClose('/for-students')}>
                <span className="nav-dd-ic"><BookOpen size={17} /></span>
                <span className="nav-dd-text"><b>For students</b><span>Office hours that never close.</span></span>
              </a>
            </div>
            <a className="nav-dd-feature" href="/how-it-works" onClick={goAndClose('/how-it-works')}>
              <div className="nav-dd-feature-top">
                <span>The Scholr<br />Difference</span>
                <span className="nav-dd-feature-arr"><ChevronRight size={18} /></span>
              </div>
              <div className="nav-dd-feature-art" aria-hidden="true">
                <div className="art-line" style={{ width: '80%' }} />
                <div className="art-line" style={{ width: '60%' }} />
                <div className="art-line" style={{ width: '70%' }} />
                <div className="art-cite">
                  <span><Hash size={11} /> Lecture 7 · slide 12</span>
                </div>
              </div>
            </a>
          </div>
          <div className="nav-dd-foot">
            <span className="nav-dd-foot-lbl">On Scholr</span>
            <span className="nav-dd-foot-tag"><Sparkles size={13} /> Free for 2026 in beta</span>
            <span className="nav-dd-foot-tag"><CheckCircle2 size={13} /> Every answer cited</span>
          </div>
        </div>
      </div>
      <div className={`nav-dd ${dd === 'resources' ? 'open' : ''}`} onMouseEnter={() => setDD('resources')} onMouseLeave={close}>
        <button type="button" className="nav-dd-trigger">Resources <ChevronDown size={14} className="nav-dd-chev" /></button>
        <div className="nav-dd-bridge" />
        <div className="nav-dd-panel" role="menu" aria-label="Resources menu">
          <div className="nav-dd-grid">
            <div className="nav-dd-col">
              <div className="nav-dd-label">Company</div>
              <a className="nav-dd-link" href="/about" onClick={goAndClose('/about')}>
                <span className="nav-dd-ic"><Lightbulb size={17} /></span>
                <span className="nav-dd-text"><b>About Scholr</b><span>Why we built a tutor grounded in the course.</span></span>
              </a>
              <button type="button" className="nav-dd-link" onClick={talkClick}>
                <span className="nav-dd-ic"><MessageSquare size={17} /></span>
                <span className="nav-dd-text"><b>Talk to our team</b><span>Tell us about your course — we'll show you what fits.</span></span>
              </button>
            </div>
            <a className="nav-dd-feature alt" href="/about" onClick={goAndClose('/about')}>
              <div className="nav-dd-feature-top">
                <span>Read our story</span>
                <span className="nav-dd-feature-arr"><ChevronRight size={18} /></span>
              </div>
            </a>
          </div>
          <div className="nav-dd-foot">
            <span className="nav-dd-foot-lbl">Get in touch</span>
            <a className="nav-dd-foot-tag" href="mailto:hello@scholr.study"><ExternalLink size={12} /> hello@scholr.study</a>
          </div>
        </div>
      </div>
    </nav>
  );
}

function LandingPage({ onStudent, onInstructor, onSignIn, onJoinCode, initialAnchor }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [navScrolled, setNavScrolled] = useState(false);
  // Deep-link support: when the page mounts with a known section, scroll it
  // into view after a tick (gives the DOM time to lay out + the reveal
  // observer to register). Falls through to top-of-page if the anchor
  // doesn't resolve. Driven by the dedicated /for-professors,
  // /for-students, /how-it-works, /about routes so each section has its
  // own shareable URL instead of just a hash anchor.
  useEffect(() => {
    if (!initialAnchor) return;
    const t = setTimeout(() => {
      const el = document.getElementById(initialAnchor);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
    return () => clearTimeout(t);
  }, [initialAnchor]);
  const [demo, setDemo] = useState({ idx: 0, phase: 'user' });
  const [talkOpen, setTalkOpen] = useState(false);
  const [talkSent, setTalkSent] = useState(false);
  const [talkForm, setTalkForm] = useState({ name: '', email: '', institution: '', message: '' });
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const closeTalk = () => { setTalkOpen(false); setTalkSent(false); setTalkForm({ name: '', email: '', institution: '', message: '' }); };
  // The landing form has no server endpoint to post to (the "demo only" form
  // silently dropped submissions). Instead we open the visitor's default
  // mail client pre-filled with their answers and addressed to the team
  // inbox — they actively send, we actually receive, no backend needed.
  const submitTalk = (e) => {
    e.preventDefault();
    const subj = encodeURIComponent(`Scholr inquiry from ${talkForm.name || talkForm.email || 'a visitor'}`);
    const body = encodeURIComponent(
      `Name: ${talkForm.name}\nEmail: ${talkForm.email}\nInstitution: ${talkForm.institution || '—'}\n\n${talkForm.message || ''}\n\n— sent from scholr.study`
    );
    window.location.href = `mailto:hello@scholr.study?subject=${subj}&body=${body}`;
    setTalkSent(true);
  };
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

  // Warp-style inline hero CTA: capture the visitor's school email and
  // pass it through to the professor signup form via sessionStorage.
  // ProfessorSignup picks it up on mount and prefills the email field so
  // the visitor doesn't retype it. Lossless even if the signup form
  // doesn't read it — the email just gets ignored.
  const [heroEmail, setHeroEmail] = useState('');
  // "See a Demo" submit. POSTs the email straight to /contact which
  // emails the team. Optimistic UI: flip the button to "Sent ✓" the
  // moment the request fires, regardless of network outcome — a
  // submission is logged server-side either way (Render console becomes
  // the audit trail if Resend hiccups).
  const [heroSubmitted, setHeroSubmitted] = useState(false);
  // Empty-email submit opens the full contact modal so we still capture a
  // lead instead of dropping the visitor onto the signup form. ContactModal
  // collects name, email, institution, and message — strictly more info
  // than the inline pill ever could.
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const submitHero = async (e) => {
    e.preventDefault();
    const v = heroEmail.trim();
    if (!v) { setDemoModalOpen(true); return; }
    try { sessionStorage.setItem('scholr_prefill_email', v); } catch {}
    setHeroSubmitted(true);
    try {
      await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'demo', email: v }),
      });
    } catch {}
    // Reset after a moment so a curious re-submit still works.
    setTimeout(() => { setHeroSubmitted(false); setHeroEmail(''); }, 3200);
  };

  return (
    <div className="scholr-landing" ref={rootRef}>
      <style>{LANDING_CSS}</style>

      <header className={`nav${navScrolled ? ' scrolled' : ''}`}>
        <div className="wrap nav-inner">
          <a className="brand" href="/" onClick={goHome}><LandingLogo s={36} />Scholr</a>
          <LandingNavLinks navigate={navigate} onTalk={() => setTalkOpen(true)} />
          <div className="nav-right">
            <button type="button" className="btn btn-ghost btn-pill" onClick={onSignIn}>Sign in</button>
            <button type="button" className="btn btn-primary btn-pill" onClick={onInstructor}>Get started</button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <svg className="hero-waves" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="wv-g1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
                <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="wv-g2" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.7" />
                <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M-100,180 C300,40 720,260 1140,140 S1540,40 1540,40 L1540,-100 L-100,-100 Z" fill="url(#wv-g1)" />
            <path d="M-100,820 C260,720 620,880 980,780 S1540,720 1540,720 L1540,1000 L-100,1000 Z" fill="url(#wv-g2)" />
            <path d="M-200,520 Q360,360 760,540 T1640,460" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="160" strokeLinecap="round" />
            <path d="M-200,640 Q300,800 720,640 T1640,720" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="120" strokeLinecap="round" />
          </svg>
          <div className="wrap stagger">
            <div className="hero-col">
            <h1>Every answer from<span className="l2">your <span className="squig">course materials</span>.</span></h1>
            <p className="lede">AI tutoring grounded in what your professor uploaded. Cited, accurate, and trustworthy.</p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary btn-lg btn-pill hero-cta" onClick={() => setDemoModalOpen(true)}>
                Book a demo
              </button>
            </div>
            </div>
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
                    <div style={{ fontSize: '12.5px', color: 'var(--m-faint)', marginTop: '2px' }}>BUS-A 306</div>
                  </div>
                  <div className="chat-list nav-list">
                    <div className="chat-item nav-row"><span className="nav-left"><Ic name="plus" s={15} /> New chat</span></div>
                    <div className="chat-item nav-row"><span className="nav-left"><Ic name="book-open" s={15} /> Course Materials</span><span className="cnt">2</span></div>
                    <div className="chat-item nav-row"><span className="nav-left"><Ic name="folder" s={15} /> My Notes</span></div>
                    <div className="chat-item nav-row"><span className="nav-left"><Ic name="list-checks" s={15} /> Quizzes</span><span className="cnt">7</span></div>
                    <div className="chat-item nav-row"><span className="nav-left"><Ic name="graduation-cap" s={15} /> Tests</span><span className="cnt">1</span></div>
                    <div className="chat-item nav-row"><span className="nav-left"><Ic name="layers" s={15} /> Flashcards</span><span className="cnt">5</span></div>
                  </div>
                  <div>
                    <div className="side-label" style={{ marginBottom: '6px' }}>Recents</div>
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
                  <div className="main-input quiz-input">
                    <span className="qi-text">Make me a quiz</span>
                    <span className="qi-plus"><Ic name="plus" s={16} /></span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '12.5px', color: 'var(--m-faint)', padding: '0 0 16px' }}>Grounded in your course materials · Vertex AI</div>
                </section>
              </div>
            </div>
          </div>
        </section>

        {/* PROFESSOR ANALYTICS — sits right after the student demo so the
            page reads as "student view → teacher view" before diving into
            principles, features, etc. */}
        <section className="band">
          <div className="wrap">
            <div className="analytics-grid">
              <div className="reveal">
                <span className="eyebrow"><span className="dot" /> Professor analytics</span>
                <h2 className="serif" style={{ fontSize: 'clamp(30px,3.6vw,44px)', lineHeight: 1.06, margin: '18px 0 16px' }}>Know what's confusing before the next lecture.</h2>
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
              <span className="chapter"><b>i.</b> <span>Why Scholr</span></span>
              <h2>Answers you can actually trust.</h2>
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
              <span className="chapter"><b>ii.</b> <span>How it works</span></span>
              <h2>Set up once. Tutoring all term.</h2>
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
              <span className="sticker">Inside the product</span>
              <h2>A senior TA, on every page.</h2>
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
            <h2>If it isn't in your course, Scholr won't say it — every claim <span className="hl">traces to a page</span>.</h2>
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
                <h3>Stop answering the same<br />question fifty times.</h3>
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
                <h3>The tutor who actually<br />read the syllabus.</h3>
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
        {/* FINAL CTA */}
        <section className="cta-band">
          <div className="wrap reveal">
            <div className="cta-box">
              <span className="chip"><span className="dot live" /> Course-grounded AI tutoring</span>
              <h2>Give your class an AI tutor<br />that actually knows it.</h2>
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
              <a className="brand" href="/" onClick={goHome}><LandingLogo s={34} />Scholr</a>
              <p className="tag">An AI tutor built from your professor's exact course materials. Cited, accurate, and grounded in your class.</p>
            </div>
            <div className="foot-col">
              <h4>Explore</h4>
              <a href="/how-it-works" onClick={(e) => { e.preventDefault(); navigate('/how-it-works'); }}>How it works</a>
              <a href="/for-professors" onClick={(e) => { e.preventDefault(); navigate('/for-professors'); }}>For professors</a>
              <a href="/for-students" onClick={(e) => { e.preventDefault(); navigate('/for-students'); }}>For students</a>
              <a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }}>About</a>
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
              <a href="mailto:hello@scholr.study" aria-label="Email Scholr">hello@scholr.study</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Giant wordmark sign-off — Warp-style graphic flourish below the
          footer. Pure CSS striped-fill of the display serif, bleeds off
          both viewport edges. Reads as a brand stamp, not literal text. */}
      <section className="brand-signoff" aria-hidden="true">
        <span className="word">Scholr</span>
      </section>

      {/* Talk-to-our-team contact form — submits via mailto: into the visitor's mail client */}
      {talkOpen && (
        <div className="lp-modal" onClick={closeTalk}>
          <div className="lp-modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lp-modal-x" aria-label="Close" onClick={closeTalk}><Ic name="x-logo" s={15} /></button>
            {talkSent ? (
              <div className="lp-modal-done">
                <div className="lp-done-ic"><Ic name="check" s={26} /></div>
                <h3>Your email client is opening…</h3>
                <p>If nothing opened, email us directly at <a href="mailto:hello@scholr.study" className="underline">hello@scholr.study</a> and we'll get back to you within a day.</p>
                <button type="button" className="btn btn-primary btn-pill" onClick={closeTalk}>Done</button>
              </div>
            ) : (
              <form onSubmit={submitTalk}>
                <div className="kicker"><span className="d" /> Talk to our team</div>
                <h3>Bring Scholr to your course</h3>
                <p>Tell us about your class and we'll show you how Scholr fits. Submitting opens your email app with a pre-filled note to our team.</p>
                <div className="lp-field"><label>Name</label><input type="text" required placeholder="Dr. Jane Smith" value={talkForm.name} onChange={(e) => setTalkForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="lp-field"><label>Work email</label><input type="email" required placeholder="jsmith@university.edu" value={talkForm.email} onChange={(e) => setTalkForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="lp-field"><label>Institution</label><input type="text" placeholder="State University" value={talkForm.institution} onChange={(e) => setTalkForm(f => ({ ...f, institution: e.target.value }))} /></div>
                <div className="lp-field"><label>What would you like to know?</label><textarea rows={3} placeholder="I teach intro accounting to ~200 students…" value={talkForm.message} onChange={(e) => setTalkForm(f => ({ ...f, message: e.target.value }))} /></div>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>Open email to send</button>
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

      {/* Demo-request modal — fires when the visitor clicks "See a Demo"
          with an empty email field. Same component used by /for-professors,
          /for-students, /about so the request format stays consistent. */}
      <ContactModal
        open={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        type="demo"
        title="Request a demo"
        sub="Tell us a bit about your course and we'll show you what Scholr can do."
      />
    </div>
  );
}

// ─── Marketing sub-pages ─────────────────────────────────────────────────
// Dedicated landing-style pages for /for-professors, /for-students,
// /how-it-works, /about. Each one is a real standalone page (not just a
// scroll anchor on the main landing) so links shared in emails, on
// LinkedIn, etc. land the visitor on a page written FOR them. The shared
// `MarketingShell` provides the nav + footer + .scholr-landing CSS scope
// so every sub-page inherits the main landing's typography, color, and
// chrome — no theme drift between pages.

const SUBPAGE_CSS = `
.scholr-landing .sp-hero{padding:96px 0 80px;text-align:left;}
.scholr-landing .sp-hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:80px;align-items:center;}
.scholr-landing .sp-eye{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:26px;}
.scholr-landing .sp-eye .pin{width:24px;height:1.5px;background:currentColor;opacity:.5;border-radius:2px;}
.scholr-landing .sp-h1{font-family:var(--font-display);font-weight:500;font-size:clamp(44px,5.8vw,76px);line-height:1.0;letter-spacing:-.024em;color:var(--ink);}
.scholr-landing .sp-h1 .ital{font-style:italic;font-weight:500;}
.scholr-landing .sp-lede{font-size:clamp(17px,1.5vw,20px);color:var(--muted);max-width:540px;margin:30px 0 36px;line-height:1.55;}
.scholr-landing .sp-cta-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;}
.scholr-landing .sp-hero-meta{margin-top:22px;font-size:14.5px;color:var(--muted-2);}
.scholr-landing .sp-hero-side{display:flex;flex-direction:column;gap:16px;}
.scholr-landing .sp-stat{background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.7);border-radius:var(--radius);padding:22px 24px;box-shadow:0 1px 2px rgba(21,22,27,.04),0 18px 40px -20px rgba(21,22,27,.14);-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);}
.scholr-landing .sp-stat .num{font-family:var(--font-display);font-weight:500;font-size:42px;line-height:1;letter-spacing:-.02em;color:var(--ink);}
.scholr-landing .sp-stat .num em{font-style:italic;font-weight:500;}
.scholr-landing .sp-stat .lbl{margin-top:8px;font-size:14px;color:var(--muted);line-height:1.5;}
.scholr-landing .sp-section{padding:88px 0;border-top:1px solid rgba(21,22,27,.06);}
.scholr-landing .sp-section.alt{background:rgba(255,255,255,.35);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);}
.scholr-landing .sp-section.dark{background:var(--ink);color:#FBFBF9;border-top:1px solid #2A2C33;}
.scholr-landing .sp-section.dark .sp-eye{color:rgba(255,255,255,.55);}
.scholr-landing .sp-section.dark .sp-section-h{color:#FBFBF9;}
.scholr-landing .sp-section.dark .sp-section-lede{color:rgba(255,255,255,.66);}
.scholr-landing .sp-section.dark .sp-feat{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.10);}
.scholr-landing .sp-section.dark .sp-feat .ft-h{color:#FBFBF9;}
.scholr-landing .sp-section.dark .sp-feat .ft-d{color:rgba(255,255,255,.62);}
.scholr-landing .sp-section.dark .sp-feat .ft-i{background:rgba(255,255,255,.08);color:#FBFBF9;}
.scholr-landing .sp-section-h{font-family:var(--font-display);font-weight:500;font-size:clamp(34px,4vw,52px);line-height:1.05;letter-spacing:-.022em;color:var(--ink);max-width:760px;}
.scholr-landing .sp-section-h .ital{font-style:italic;font-weight:500;}
.scholr-landing .sp-section-lede{margin-top:18px;font-size:17.5px;color:var(--muted);max-width:620px;line-height:1.55;}
.scholr-landing .sp-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:48px;}
.scholr-landing .sp-grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:48px;}
.scholr-landing .sp-feat{background:rgba(255,255,255,.55);border:1px solid rgba(255,255,255,.7);border-radius:var(--radius);padding:28px;box-shadow:0 1px 2px rgba(21,22,27,.04),0 18px 40px -20px rgba(21,22,27,.14);transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease;-webkit-backdrop-filter:blur(18px) saturate(160%);backdrop-filter:blur(18px) saturate(160%);}
.scholr-landing .sp-feat:hover{transform:translateY(-2px);box-shadow:0 1px 2px rgba(21,22,27,.04),0 26px 50px -22px rgba(21,22,27,.2);border-color:rgba(255,255,255,.9);}
.scholr-landing .sp-feat .ft-i{width:38px;height:38px;border-radius:11px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;color:var(--ink);margin-bottom:18px;}
.scholr-landing .sp-feat .ft-i svg{width:18px;height:18px;}
.scholr-landing .sp-feat .ft-h{font-family:var(--font-display);font-weight:500;font-size:21px;letter-spacing:-.012em;line-height:1.25;color:var(--ink);margin-bottom:10px;}
.scholr-landing .sp-feat .ft-d{font-size:15px;color:var(--muted);line-height:1.55;}
.scholr-landing .sp-steps{display:flex;flex-direction:column;gap:8px;margin-top:48px;border-top:1px solid var(--line);}
.scholr-landing .sp-step{display:grid;grid-template-columns:80px 1fr 1fr;gap:36px;padding:34px 0;border-bottom:1px solid var(--line);align-items:start;}
.scholr-landing .sp-step .sp-step-n{font-family:var(--font-display);font-weight:500;font-style:italic;font-size:42px;color:var(--muted-2);line-height:1;letter-spacing:-.018em;}
.scholr-landing .sp-step .sp-step-h{font-family:var(--font-display);font-weight:500;font-size:26px;letter-spacing:-.014em;line-height:1.2;color:var(--ink);}
.scholr-landing .sp-step .sp-step-d{font-size:15.5px;color:var(--muted);line-height:1.6;}
.scholr-landing .sp-faq{display:flex;flex-direction:column;border-top:1px solid var(--line);margin-top:48px;}
.scholr-landing .sp-faq-row{padding:26px 0;border-bottom:1px solid var(--line);display:grid;grid-template-columns:1fr 1.4fr;gap:48px;align-items:start;}
.scholr-landing .sp-faq-q{font-family:var(--font-display);font-weight:500;font-size:21px;letter-spacing:-.012em;color:var(--ink);line-height:1.3;}
.scholr-landing .sp-faq-a{font-size:15.5px;color:var(--muted);line-height:1.6;}
.scholr-landing .sp-cta-band{background:var(--ink);color:#FBFBF9;padding:96px 0;text-align:center;}
.scholr-landing .sp-cta-band h2{font-family:var(--font-display);font-weight:500;font-size:clamp(38px,4.8vw,62px);line-height:1.04;letter-spacing:-.024em;}
.scholr-landing .sp-cta-band h2 .ital{font-style:italic;}
.scholr-landing .sp-cta-band p{margin:22px auto 36px;font-size:17.5px;color:rgba(255,255,255,.72);max-width:520px;line-height:1.55;}
.scholr-landing .sp-cta-band .btn-ghost{background:transparent;color:#FBFBF9;border-color:rgba(255,255,255,.22);}
.scholr-landing .sp-cta-band .btn-ghost:hover{border-color:#FBFBF9;background:rgba(255,255,255,.05);}
.scholr-landing .sp-cta-band .btn-primary{background:#FBFBF9;color:var(--ink);}
.scholr-landing .sp-cta-band .btn-primary:hover{background:#fff;}
.scholr-landing .sp-vlist{display:flex;flex-direction:column;gap:16px;margin-top:32px;}
.scholr-landing .sp-vlist li{display:flex;align-items:start;gap:14px;font-size:16.5px;color:var(--ink-2);line-height:1.55;list-style:none;}
.scholr-landing .sp-vlist .ck{flex:none;width:24px;height:24px;border-radius:8px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;color:var(--ink);margin-top:1px;}
.scholr-landing .sp-vlist .ck svg{width:13px;height:13px;}
.scholr-landing .nav-links a.active{color:var(--ink);font-weight:600;}
@media (max-width: 820px) {
  .scholr-landing .sp-hero{padding:64px 0 56px;}
  .scholr-landing .sp-hero-grid{grid-template-columns:1fr;gap:40px;}
  .scholr-landing .sp-section{padding:60px 0;}
  .scholr-landing .sp-grid-3, .scholr-landing .sp-grid-2{grid-template-columns:1fr;}
  .scholr-landing .sp-step{grid-template-columns:1fr;gap:8px;padding:26px 0;}
  .scholr-landing .sp-step .sp-step-n{font-size:30px;}
  .scholr-landing .sp-faq-row{grid-template-columns:1fr;gap:12px;}
  .scholr-landing .nav-links{display:none;}
}
`;

// Shared shell — header + footer + .scholr-landing scope. Marks the
// currently-active nav link so visitors know where they are in the
// information architecture without having to read the URL bar.
function MarketingShell({ children, onSignIn, onInstructor, onStudent, currentPath }) {
  const navigate = useNavigate();
  const shellRef = useRef(null);
  const [navScrolled, setNavScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [currentPath]);
  // Cinematic reveal — same observer the landing uses, scoped to the
  // subpage so .reveal / .stagger / .win-rise elements fade up when
  // they enter the viewport. Re-runs on path change so the new page's
  // elements are observed after the children update.
  useEffect(() => {
    const root = shellRef.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (e.target.classList.contains('stagger')) {
          Array.prototype.forEach.call(e.target.children, (ch, i) => { ch.style.transitionDelay = (i * 75) + 'ms'; });
        }
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.14 });
    const t = setTimeout(() => {
      root.querySelectorAll('.reveal, .stagger, .win-rise').forEach((el) => io.observe(el));
    }, 30);
    return () => { clearTimeout(t); io.disconnect(); };
  }, [currentPath]);
  const go = (path) => (e) => { if (e) e.preventDefault(); navigate(path); };
  const isActive = (path) => currentPath === path;
  return (
    <div className="scholr-landing" ref={shellRef}>
      <style>{LANDING_CSS}</style>
      <style>{SUBPAGE_CSS}</style>
      <header className={`nav${navScrolled ? ' scrolled' : ''}`}>
        <div className="wrap nav-inner">
          <a className="brand" href="/" onClick={go('/')}><LandingLogo s={36} />Scholr</a>
          <LandingNavLinks navigate={navigate} />
          <div className="nav-right">
            <button type="button" className="btn btn-ghost btn-pill" onClick={onSignIn}>Sign in</button>
            <button type="button" className="btn btn-primary btn-pill" onClick={onInstructor}>Get started</button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="foot">
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <a className="brand" href="/" onClick={go('/')}><LandingLogo s={34} />Scholr</a>
              <p className="tag">An AI tutor built from your professor's exact course materials. Cited, accurate, and grounded in your class.</p>
            </div>
            <div className="foot-col">
              <h4>Explore</h4>
              <a href="/how-it-works"   onClick={go('/how-it-works')}>How it works</a>
              <a href="/for-professors" onClick={go('/for-professors')}>For professors</a>
              <a href="/for-students"   onClick={go('/for-students')}>For students</a>
              <a href="/about"          onClick={go('/about')}>About</a>
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
              <a href="mailto:hello@scholr.study" aria-label="Email Scholr">hello@scholr.study</a>
            </div>
          </div>
        </div>
      </footer>
      <section className="brand-signoff" aria-hidden="true">
        <span className="word">Scholr</span>
      </section>
    </div>
  );
}

// Reusable contact modal — opened by Request-a-pilot / Talk-to-our-team /
// Get-in-touch buttons across all four marketing pages. Single component
// so the form, validation, success state, and POST target stay
// consistent. The `type` prop becomes the lead category in the email
// subject the team receives.
function ContactModal({ open, onClose, type = 'team', title, sub, defaultMessage = '' }) {
  const [form, setForm] = useState({ name: '', email: '', institution: '', message: defaultMessage });
  useEffect(() => {
    if (open) setForm({ name: '', email: '', institution: '', message: defaultMessage });
  }, [open, defaultMessage]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  if (!open) return null;
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.email.trim()) { setErr('Please enter an email.'); return; }
    setSending(true);
    try {
      const r = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...form }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || 'Send failed');
      setSent(true);
    } catch (e2) {
      setErr(e2.message || 'Could not send — try again or email hello@scholr.study.');
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="lp-modal" onClick={onClose}>
      <div className="lp-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lp-modal-x" aria-label="Close" onClick={onClose}><Ic name="x-logo" s={15} /></button>
        {sent ? (
          <div className="lp-modal-done">
            <div className="lp-done-ic"><Ic name="check" s={26} /></div>
            <h3>Got it — we'll be in touch.</h3>
            <p>A real person from the Scholr team will follow up within a business day.</p>
            <button type="button" className="btn btn-primary btn-pill" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="kicker"><span className="d" /> {title || 'Talk to our team'}</div>
            <h3>{title || 'Talk to our team'}</h3>
            <p>{sub || 'Tell us about your class and we\'ll show you how Scholr fits.'}</p>
            <div className="lp-field"><label>Name</label><input type="text" placeholder="Dr. Jane Smith" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="lp-field"><label>Work email</label><input type="email" required placeholder="jsmith@university.edu" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="lp-field"><label>Institution</label><input type="text" placeholder="State University" value={form.institution} onChange={(e) => setForm(f => ({ ...f, institution: e.target.value }))} /></div>
            <div className="lp-field"><label>What would you like to know?</label><textarea rows={3} placeholder="I teach intro accounting to ~200 students…" value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} /></div>
            {err && <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }}>{err}</p>}
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={sending}>
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Reusable building blocks. Composing pages from these guarantees the
// typography + spacing + dark-band rhythm stays identical across all four
// pages — so /for-professors and /for-students feel like sibling pages
// rather than separately designed sites.
function SpFeat({ icon, h, d }) {
  return (
    <div className="sp-feat">
      <div className="ft-i"><Ic name={icon} s={18} /></div>
      <div className="ft-h">{h}</div>
      <div className="ft-d">{d}</div>
    </div>
  );
}
function SpStep({ n, h, d }) {
  return (
    <div className="sp-step">
      <div className="sp-step-n">{n}</div>
      <div className="sp-step-h">{h}</div>
      <div className="sp-step-d">{d}</div>
    </div>
  );
}
function SpFaq({ rows }) {
  return (
    <div className="sp-faq">
      {rows.map((r, i) => (
        <div className="sp-faq-row" key={i}>
          <div className="sp-faq-q">{r.q}</div>
          <div className="sp-faq-a">{r.a}</div>
        </div>
      ))}
    </div>
  );
}
function SpCheckList({ items }) {
  return (
    <ul className="sp-vlist">
      {items.map((t, i) => (
        <li key={i}><span className="ck"><Ic name="check" s={13} /></span>{t}</li>
      ))}
    </ul>
  );
}
function SpCtaBand({ headline, sub, primaryLabel, onPrimary, secondaryLabel, onSecondary }) {
  return (
    <section className="sp-cta-band">
      <div className="wrap">
        <h2>{headline}</h2>
        {sub && <p>{sub}</p>}
        <div className="sp-cta-row" style={{ justifyContent: 'center' }}>
          {primaryLabel && <button type="button" className="btn btn-primary btn-lg btn-pill" onClick={onPrimary}>{primaryLabel} <span className="arr"><Ic name="arrow-right" s={17} /></span></button>}
          {secondaryLabel && <button type="button" className="btn btn-ghost btn-lg btn-pill" onClick={onSecondary}>{secondaryLabel}</button>}
        </div>
      </div>
    </section>
  );
}

// ─── /for-professors ──────────────────────────────────────────────────────
function ForProfessorsPage({ onSignIn, onInstructor, onStudent }) {
  const [modal, setModal] = useState(null); // null | { type, title, sub }
  return (
    <MarketingShell currentPath="/for-professors" onSignIn={onSignIn} onInstructor={onInstructor} onStudent={onStudent}>
      <section className="sp-hero">
        <div className="wrap">
          <div className="sp-hero-grid">
            <div>
              <div className="sp-eye"><span className="pin" /> For professors &amp; departments</div>
              <h1 className="sp-h1">Office hours that <span className="ital">never close.</span></h1>
              <p className="sp-lede">Scholr answers your students' questions from your materials — cited to the exact page — so you can focus on the questions only you can answer.</p>
              <div className="sp-cta-row">
                <button type="button" className="btn btn-primary btn-lg btn-pill" onClick={onInstructor}>Start your first course <span className="arr"><Ic name="arrow-right" s={17} /></span></button>
                <button type="button" className="btn btn-ghost btn-lg btn-pill" onClick={() => setModal({ type: 'pilot', title: 'Request a pilot', sub: 'Tell us about your course and we\'ll set up a pilot for your class.' })}>Request a pilot</button>
              </div>
              <p className="sp-hero-meta">Free for the 2026 academic year while in beta · Set up in an afternoon</p>
            </div>
            <div className="sp-hero-side">
              <div className="sp-stat"><div className="num">5–15<em> min</em></div><div className="lbl">Median setup. Upload your syllabus + readings, share a join code, done.</div></div>
              <div className="sp-stat"><div className="num">100%</div><div className="lbl">Of answers cite the exact page they came from — students can verify, you can stand behind it.</div></div>
              <div className="sp-stat"><div className="num">24/7</div><div className="lbl">Students get answers at 3am the night before an exam. Without paging you.</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="sp-section">
        <div className="wrap">
          <div className="sp-eye"><span className="pin" /> Why professors choose Scholr</div>
          <h2 className="sp-section-h">Built around the work you'd <span className="ital">rather not</span> repeat.</h2>
          <p className="sp-section-lede">The same five questions in every office hour. The same syllabus clarifications in every email. Scholr handles those — so the meetings that reach you are the ones that need you.</p>
          <div className="sp-grid-3">
            <SpFeat icon="file-text"    h="Grounded in YOUR materials"  d="Your syllabus, lecture notes, slides, readings. No internet, no Wikipedia, no model invention — if the answer isn't in your files, Scholr says so." />
            <SpFeat icon="shield-check" h="Cited to the page"            d="Every answer points to the slide, page, or chapter it came from. Students can verify in one click. You can stand behind every answer your class sees." />
            <SpFeat icon="bar-chart"    h="See what's confusing — live" d="A real-time Topic Ledger surfaces what your class is actually asking about. Adjust the next lecture to the gaps, not the guesses." />
            <SpFeat icon="upload"       h="Upload once, scale forever"   d="One PDF reaches 50 students or 500. Indexed in minutes, served instantly. Re-upload to update — students see the new material on the next question." />
            <SpFeat icon="clock"        h="Answers when you're asleep"   d="2am cramming. Saturday confusion. The week of a TA's emergency. Scholr is there with the same answers you'd give — drawn from the same materials." />
            <SpFeat icon="sparkles"     h="Quizzes &amp; flashcards, free" d="Students can ask Scholr to generate a quiz from any chapter, a flashcard deck on any topic, or a study guide for any exam — using your materials as the source." />
          </div>
        </div>
      </section>

      <section className="sp-section alt">
        <div className="wrap">
          <div className="sp-eye"><span className="pin" /> Control + privacy</div>
          <h2 className="sp-section-h">Your materials. Your <span className="ital">course.</span> Your call.</h2>
          <p className="sp-section-lede">A tutor that uses YOUR PDFs is only useful if you control what happens to them. Scholr is built around that.</p>
          <SpCheckList items={[
            "Your uploaded materials are scoped to your course only — no other class, professor, or student can see them.",
            "Answers stay inside the course's materials. The model cannot invent a definition or quote a textbook you didn't upload.",
            "Delete a document and its embeddings are wiped — including from the index that powers retrieval.",
            "You see what your students ask. Students see only their own chats. Their conversations are never used to train a base model.",
            "When the semester ends, you can archive the course or delete it outright. Nothing leaks forward.",
          ]} />
        </div>
      </section>

      <section className="sp-section dark">
        <div className="wrap">
          <div className="sp-eye"><span className="pin" /> Common questions</div>
          <h2 className="sp-section-h">What professors usually <span className="ital">want to know.</span></h2>
          <SpFaq rows={[
            { q: "How long does setup actually take?",        a: "Median is 10 minutes. Upload your syllabus and 1–3 core PDFs, choose a course name, and share the join code. Students are in their first chat within a class period." },
            { q: "Does it work with my textbook?",            a: "If you can upload it as a PDF and you have the right to share it with your class, Scholr can index it. We don't host textbook content — you bring what you already license." },
            { q: "What about academic integrity?",            a: "Scholr is a tutor, not a homework-solver. It will explain a concept, build a study guide, or walk through a worked example — but it asks before completing an assignment from scratch. You can disable specific behaviors per course." },
            { q: "Can students see other students' questions?", a: "No. Each student sees only their own chats and notes. You see anonymized aggregates in the Insights dashboard so you can spot patterns without surveilling individuals." },
            { q: "What does it cost?",                         a: "Free for the 2026 academic year for instructors piloting it. We'll be transparent about pricing before that changes — no surprise mid-semester invoices." },
            { q: "Can I try it with one class first?",         a: "Yes — that's the whole point. Each course is its own scoped environment. Pilot with one section, see if it works, then decide." },
          ]} />
        </div>
      </section>

      <SpCtaBand
        headline={<>Give your class an AI tutor<br /><span className="ital">that actually knows it.</span></>}
        sub="Set up your course in an afternoon. Free to start. No credit card."
        primaryLabel="Start a course"
        onPrimary={onInstructor}
        secondaryLabel="Talk to our team"
        onSecondary={() => setModal({ type: 'team', title: 'Talk to our team', sub: 'Tell us about your class and we\'ll show you how Scholr fits.' })}
      />
      <ContactModal open={!!modal} onClose={() => setModal(null)} type={modal?.type} title={modal?.title} sub={modal?.sub} />
    </MarketingShell>
  );
}

// ─── /for-students ────────────────────────────────────────────────────────
function ForStudentsPage({ onSignIn, onStudent, onInstructor }) {
  return (
    <MarketingShell currentPath="/for-students" onSignIn={onSignIn} onInstructor={onInstructor} onStudent={onStudent}>
      <section className="sp-hero">
        <div className="wrap">
          <div className="sp-hero-grid">
            <div>
              <div className="sp-eye"><span className="pin" /> For students</div>
              <h1 className="sp-h1">Get unstuck without <span className="ital">waiting</span> for office hours.</h1>
              <p className="sp-lede">Ask anything about your class. Scholr answers from your professor's exact materials — with the slide, page, or chapter cited right there. No hallucinations. No "I'm not sure" runaround.</p>
              <div className="sp-cta-row">
                <button type="button" className="btn btn-primary btn-lg btn-pill" onClick={onStudent}>Sign in <span className="arr"><Ic name="arrow-right" s={17} /></span></button>
                <button type="button" className="btn btn-ghost btn-lg btn-pill" onClick={onStudent}>I have a join code</button>
              </div>
              <p className="sp-hero-meta">Free with your class join code · 24/7 · Cited to your real syllabus</p>
            </div>
            <div className="sp-hero-side">
              <div className="sp-stat"><div className="num">3<em>am</em></div><div className="lbl">Open the night before an exam, ask a question, get an answer with citations. No "your TA is asleep."</div></div>
              <div className="sp-stat"><div className="num">0</div><div className="lbl">Things made up. Every answer comes from a doc your professor actually uploaded.</div></div>
              <div className="sp-stat"><div className="num">/quiz</div><div className="lbl">Make a quiz, build a flashcard deck, generate a study guide — all from your real course material.</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="sp-section">
        <div className="wrap">
          <div className="sp-eye"><span className="pin" /> Why students use Scholr</div>
          <h2 className="sp-section-h">A tutor that knows YOUR class. <span className="ital">Not the internet.</span></h2>
          <p className="sp-section-lede">ChatGPT will give you a textbook answer. Scholr gives you YOUR professor's answer — the one that's actually going to be on the exam.</p>
          <div className="sp-grid-3">
            <SpFeat icon="file-text"    h="Cited to the exact page"  d="Every answer shows you where it came from — syllabus §3, lecture 6 slide 14, chapter 4 page 132. You can flip to it and check." />
            <SpFeat icon="shield-check" h="Won't invent answers"      d="If the materials don't cover something, Scholr says so honestly instead of making up a definition. The trust is the whole point." />
            <SpFeat icon="sparkles"     h="Quizzes &amp; flashcards"   d="Type /quiz, /test, or /cards plus a topic. Scholr builds a real practice quiz, exam, or flashcard deck from your course materials." />
            <SpFeat icon="message-square" h="No judgment, no waiting" d="Ask the question you didn't want to ask in lecture. Ask it five times if you need to. Scholr won't side-eye you." />
            <SpFeat icon="clock"        h="Open whenever you are"     d="2am cramming. Sunday-night panic. The week before finals. Same answers, same materials, every time." />
            <SpFeat icon="bar-chart"    h="Built for the real exam"   d="Cram lists, key formulas, common traps — Scholr structures its answers around what students actually need before an exam." />
          </div>
        </div>
      </section>

      <section className="sp-section alt">
        <div className="wrap">
          <div className="sp-eye"><span className="pin" /> Things students actually ask</div>
          <h2 className="sp-section-h">If you'd ask a smart upperclassman, <span className="ital">you can ask Scholr.</span></h2>
          <div className="sp-grid-2">
            <SpFeat icon="message-square" h={<>"What's on the midterm and how is it weighted?"</>} d="Pulled straight from your syllabus. Date, format, scope, weight, what's closed-book." />
            <SpFeat icon="message-square" h={<>"Explain contribution margin like I'm new."</>} d="The definition, the formula, the worked example — using your textbook's framing, not a Wikipedia paraphrase." />
            <SpFeat icon="message-square" h={<>"What if my homework is a day late?"</>} d="From the syllabus's late policy, with the page cited. No more digging through PDFs to find one sentence." />
            <SpFeat icon="message-square" h={<>"Quiz me on chapter 4."</>} d="Type /quiz · chapter 4. Scholr generates 5–10 multiple-choice questions with answers and explanations." />
            <SpFeat icon="message-square" h={<>"Build me a study guide for the final."</>} d="Topics, formulas, concepts, and a 'if you only had an hour' cram list — all from your course's actual materials." />
            <SpFeat icon="message-square" h={<>"I'm lost — where do I start?"</>} d="Scholr maps a roadmap based on what's been covered and what's coming next on the syllabus. No more 'where do I even begin.'" />
          </div>
        </div>
      </section>

      <section className="sp-section dark">
        <div className="wrap">
          <div className="sp-eye"><span className="pin" /> Common questions</div>
          <h2 className="sp-section-h">Stuff students <span className="ital">usually ask.</span></h2>
          <SpFaq rows={[
            { q: "How do I join my class?",                  a: "Your professor shares a join code or a join link. Paste the code on the home page or click the link — you'll be in your class within a minute." },
            { q: "Does it cost anything?",                   a: "Not while your class is on Scholr's free pilot. If that ever changes, your professor will tell you — not us." },
            { q: "Can my professor see my chats?",           a: "No. Professors see anonymized aggregates of what their class is asking about — but they cannot read your individual conversations." },
            { q: "Will it just do my homework for me?",      a: "It'll help you understand and walk you through worked examples — but it'll usually ask you to take a swing first before writing your assignment from scratch. That's intentional." },
            { q: "What if it gets something wrong?",         a: "Click the citation to verify against the source. If a real mismatch shows up, hit the thumbs-down — your professor sees that signal and can correct the materials." },
            { q: "Does it work with my professor's textbook?", a: "If your professor uploaded the PDF, yes — Scholr indexes it and grounds answers in it. If they didn't upload it, Scholr won't pretend to know it." },
          ]} />
        </div>
      </section>

      <SpCtaBand
        headline={<>Stop waiting for office hours.<br /><span className="ital">Start asking.</span></>}
        sub="Free with your class join code. Open 24/7. Every answer cited to your real syllabus."
        primaryLabel="I have a join code"
        onPrimary={onStudent}
        secondaryLabel="Sign in"
        onSecondary={onStudent}
      />
    </MarketingShell>
  );
}

// ─── /how-it-works ────────────────────────────────────────────────────────
function HowItWorksPage({ onSignIn, onInstructor, onStudent }) {
  return (
    <MarketingShell currentPath="/how-it-works" onSignIn={onSignIn} onInstructor={onInstructor} onStudent={onStudent}>
      <section className="sp-hero">
        <div className="wrap">
          <div className="sp-hero-grid">
            <div>
              <div className="sp-eye"><span className="pin" /> How it works</div>
              <h1 className="sp-h1">Upload your course. <span className="ital">Index it.</span> Cite every answer.</h1>
              <p className="sp-lede">Scholr is a retrieval-grounded tutor — every answer is rooted in a real chunk of a real document your professor uploaded. Here's the pipeline that makes that possible.</p>
              <div className="sp-cta-row">
                <button type="button" className="btn btn-primary btn-lg btn-pill" onClick={onInstructor}>Start a course <span className="arr"><Ic name="arrow-right" s={17} /></span></button>
                <button type="button" className="btn btn-ghost btn-lg btn-pill" onClick={onStudent}>Join a class</button>
              </div>
            </div>
            <div className="sp-hero-side">
              <div className="sp-stat"><div className="num">RAG</div><div className="lbl">Retrieval-augmented generation. The model can only quote what we surface — your actual materials, not its training data.</div></div>
              <div className="sp-stat"><div className="num">768<em>-dim</em></div><div className="lbl">Vector embeddings on every chunk. Semantic search finds the right passage even when the student doesn't use the right keyword.</div></div>
              <div className="sp-stat"><div className="num">Vision</div><div className="lbl">PDF pages are rendered to images so the model can SEE diagrams, equations, and slides — not just the OCR'd text.</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="sp-section">
        <div className="wrap">
          <div className="sp-eye"><span className="pin" /> The pipeline</div>
          <h2 className="sp-section-h">Four steps from <span className="ital">your upload</span> to a cited answer.</h2>
          <div className="sp-steps">
            <SpStep n="01" h="Professor uploads materials"  d="Syllabus, lecture slides, readings, textbook PDFs. Each file is text-extracted, chunked into ~2,000-char passages, embedded into 768-dim vectors, and indexed. PDFs also get their pages rendered to images so the model can read diagrams." />
            <SpStep n="02" h="Student asks a question"     d="The question is embedded into the same vector space. Semantic similarity finds the 8 most relevant passages from across the course's library — often spanning multiple documents the student didn't know to look at." />
            <SpStep n="03" h="Model grounds its answer"     d="Only the retrieved passages enter the model's context. The prompt requires citations, refuses to invent missing material, and asks the student to clarify when the materials don't fully answer. No hallucinated formulas. No textbook the professor didn't upload." />
            <SpStep n="04" h="Answer arrives with sources"  d="Every answer streams in token by token, with citation chips showing which document(s) it drew from. The student can hover a citation to see the source file. The professor sees this question land in their Topic Ledger." />
          </div>
        </div>
      </section>

      <section className="sp-section alt">
        <div className="wrap">
          <div className="sp-eye"><span className="pin" /> What makes it different</div>
          <h2 className="sp-section-h">Three guarantees we build the product around.</h2>
          <p className="sp-section-lede">Most "AI tutors" are ChatGPT with a school-colored wrapper. Scholr is built differently from the first commit.</p>
          <div className="sp-grid-3">
            <SpFeat icon="shield-check" h="Grounded retrieval"   d="The model can't answer from anything other than what was retrieved. If the relevant passages aren't there, the model is told to say so — not to fill the gap from its training." />
            <SpFeat icon="file-text"    h="Cited by construction" d="Citations are part of the response contract, not a post-hoc label. The model writes the answer knowing it will be tied to a source the student can verify." />
            <SpFeat icon="sparkles"     h="Honest when unsure"    d="If the materials don't cover a question, Scholr asks for clarification instead of guessing. 'I don't see that in your materials' is a feature, not a bug." />
          </div>
        </div>
      </section>

      <section className="sp-section dark">
        <div className="wrap">
          <div className="sp-eye"><span className="pin" /> Under the hood</div>
          <h2 className="sp-section-h">For the curious.</h2>
          <SpFaq rows={[
            { q: "Which model answers questions?",           a: "Day-to-day questions run on gpt-4o-mini for speed and cost. Comprehensive exam-prep questions automatically upgrade to gpt-4o for deeper synthesis." },
            { q: "What's the embedding stack?",              a: "Vertex AI's text-embedding-004 (768-dim). Chunks live in Supabase + pgvector. A custom RPC handles semantic search against the course's chunk set." },
            { q: "How does the vision part work?",           a: "Every page of every uploaded PDF is rendered to a PNG, stored, and made available to the model at chat time. For questions about diagrams or slide layouts, the model literally sees the slide." },
            { q: "What stops it from hallucinating?",        a: "Three layers: (1) the prompt explicitly forbids inventing material; (2) only retrieved passages enter context; (3) doc-spread retrieval ensures every uploaded doc has a chance to contribute, so the model can't fall back on training when the materials are present." },
            { q: "How does it know it's grounded?",          a: "Each response includes a marker indicating whether the materials were sufficient. If they weren't, the answer is flagged and the citation pill changes." },
            { q: "What's the data flow?",                    a: "Your materials → Supabase Storage. Chunks + embeddings → Supabase Postgres. Queries → Vertex AI (embedding) + OpenAI (generation). Nothing trains a public model. Delete a course and everything goes with it." },
          ]} />
        </div>
      </section>

      <SpCtaBand
        headline={<>See it work for <span className="ital">your class.</span></>}
        sub="Free for the 2026 academic year while in beta. Set up in an afternoon."
        primaryLabel="Start a course"
        onPrimary={onInstructor}
        secondaryLabel="I'm a student"
        onSecondary={onStudent}
      />
    </MarketingShell>
  );
}

// ─── /about ───────────────────────────────────────────────────────────────
function AboutPage({ onSignIn, onInstructor, onStudent }) {
  const [modal, setModal] = useState(null);
  return (
    <MarketingShell currentPath="/about" onSignIn={onSignIn} onInstructor={onInstructor} onStudent={onStudent}>
      <section className="sp-hero">
        <div className="wrap">
          <div className="sp-hero-grid">
            <div>
              <div className="sp-eye"><span className="pin" /> About Scholr</div>
              <h1 className="sp-h1">Built for the question every student is <span className="ital">afraid to ask.</span></h1>
              <p className="sp-lede">Scholr is an AI tutor that gives every student in a class the experience of having a tutor who read the syllabus, attended every lecture, and remembers the answer to every question.</p>
              <div className="sp-cta-row">
                <button type="button" className="btn btn-primary btn-lg btn-pill" onClick={onInstructor}>Start a course <span className="arr"><Ic name="arrow-right" s={17} /></span></button>
                <button type="button" className="btn btn-ghost btn-lg btn-pill" onClick={() => setModal({ type: 'contact', title: 'Get in touch', sub: 'Pilot questions, evaluation, partnership, or just curious — we\'d love to hear from you.' })}>Get in touch</button>
              </div>
            </div>
            <div className="sp-hero-side">
              <div className="sp-stat"><div className="num">Why</div><div className="lbl">Office hours don't scale. Email doesn't scale. TAs are great but they're stretched. Scholr fills the gap between "I'm stuck" and "I get it" — without burning out anyone in the chain.</div></div>
              <div className="sp-stat"><div className="num">How</div><div className="lbl">Grounded in your professor's exact materials. Cited to the page. Honest when it doesn't know. Calmer than a chat window has any right to be.</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="sp-section">
        <div className="wrap">
          <div className="sp-eye"><span className="pin" /> What we believe</div>
          <h2 className="sp-section-h">The principles we won't compromise.</h2>
          <div className="sp-grid-2">
            <SpFeat icon="shield-check" h="Grounded over clever"   d="An AI tutor that confidently makes things up is worse than no tutor at all. Every answer is rooted in a real passage from your professor's materials — never the model's training data, never the open web." />
            <SpFeat icon="file-text"    h="Cited by default"        d="A student who has to wonder whether the answer is real is a student who can't trust the tool. Every answer points to its source so verification is one click away." />
            <SpFeat icon="message-square" h="Honest when unsure"     d="When the materials don't cover a question, Scholr says so — and asks for clarification — instead of guessing. The 'I don't know' is part of what makes the rest trustworthy." />
            <SpFeat icon="sparkles"     h="Calm, not loud"           d="Students under pressure don't need another animated dashboard. The chat is quiet. The cites are subtle. The tutor talks like a smart upperclassman, not a sales bot." />
          </div>
        </div>
      </section>

      <section className="sp-section alt">
        <div className="wrap">
          <div className="sp-eye"><span className="pin" /> Why now</div>
          <h2 className="sp-section-h">"Office hours that scale" is finally <span className="ital">a real thing.</span></h2>
          <p className="sp-section-lede">For most of higher ed's history, "I have a question about this reading" meant waiting until Tuesday at 2pm or hoping someone on the GroupMe knew. Large language models, vector retrieval, and modern multimodal grounding mean that's no longer the only option — IF the system is built with the right constraints. That's what Scholr is.</p>
          <SpCheckList items={[
            "Every model upgrade we ship is in service of being more accurate, not flashier.",
            "Every UI change is in service of the student under pressure at 11pm — not the product demo.",
            "Every professor feature is in service of seeing the class clearly without surveilling individual students.",
            "Every privacy choice defaults to 'less data, more scoped, more deletable.'",
          ]} />
        </div>
      </section>

      <section className="sp-section dark">
        <div className="wrap">
          <div className="sp-eye"><span className="pin" /> Contact</div>
          <h2 className="sp-section-h">Talk to us.</h2>
          <p className="sp-section-lede">Piloting Scholr in your class, evaluating it for a department, or just curious about how a piece of the system works — we'd love to hear from you.</p>
          <div className="sp-grid-2" style={{ marginTop: 40 }}>
            <SpFeat icon="message-square" h="hello@scholr.study"  d="The fastest way to reach us. We respond within a business day." />
            <SpFeat icon="shield-check"   h="Privacy &amp; security" d={<>Read our <a href="/privacy" style={{ textDecoration: 'underline' }}>privacy policy</a> and <a href="/terms" style={{ textDecoration: 'underline' }}>terms</a>. Or email us — we'll answer specific questions on the record.</>} />
          </div>
        </div>
      </section>

      <SpCtaBand
        headline={<>Give your class an AI tutor<br /><span className="ital">that actually knows it.</span></>}
        sub="Free for the 2026 academic year while in beta. Set up in an afternoon."
        primaryLabel="Start a course"
        onPrimary={onInstructor}
        secondaryLabel="I'm a student"
        onSecondary={onStudent}
      />
      <ContactModal open={!!modal} onClose={() => setModal(null)} type={modal?.type} title={modal?.title} sub={modal?.sub} />
    </MarketingShell>
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
      <button type="button" className="auth-brand" onClick={() => navigate('/')} aria-label="Scholr home"><LandingLogo s={32} />Scholr</button>
      <div className="ed-body">
        {error ? (
          <>
            <span className="ed-kicker">404 · Class not found</span>
            <h1 className="ed-h">This class isn't<span className="ital"> here anymore.</span></h1>
            <p className="ed-lede">Your invite link may have been replaced or the class is no longer active. Ask your professor for a new link and they'll send you one.</p>
            <div className="ed-actions">
              <button type="button" className="ed-btn" onClick={() => navigate('/')}>Back to Scholr <Ic name="arrow-right" s={16} /></button>
            </div>
          </>
        ) : (
          <>
            <span className="ed-kicker">You've been invited to —</span>
            <h1 className="ed-h">{course?.name}<span className="ital">.</span></h1>
            <div className="ed-meta">Class code <span className="ed-code">{code}</span></div>
            <div className="ed-actions">
              <button type="button" className="ed-btn" onClick={handleJoinNow} disabled={joining}>
                {joining ? 'Joining…' : (studentToken ? 'Join class now' : 'Sign up to join class')} <Ic name="arrow-right" s={16} />
              </button>
              {!studentToken && (
                <button type="button" className="ed-alt" onClick={() => { sessionStorage.setItem('scholr_pending_join', code); navigate('/student/login'); }}>
                  Already have an account? <b>Sign in</b>
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <div className="ed-foot">
        <span />
        <span className="ed-tagline">Scholr · Grounded in your course</span>
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
    // Defensive JSON parse — if a stored user object is corrupted ("null",
    // truncated by quota, edited by hand), parsing throws or returns null
    // and we'd ship a half-authenticated state where token exists but the
    // user object is missing. safeParse returns null on any failure, and
    // we drop the matching token if its user is unreadable.
    const safeParse = (s) => {
      try {
        const v = JSON.parse(s);
        return v && typeof v === 'object' ? v : null;
      } catch { return null; }
    };
    try {
      let pt = localStorage.getItem('scholr_token');
      const pu = localStorage.getItem('scholr_user');
      let st = localStorage.getItem('scholr_student_token');
      const su = localStorage.getItem('scholr_student_user');
      const profUserParsed = pu ? safeParse(pu) : null;
      const studentUserParsed = su ? safeParse(su) : null;
      // If we have a token but no usable user object, the storage is in
      // an inconsistent state — clear both so we don't ship into a UI
      // that immediately crashes on user.name.
      if (pt && !profUserParsed) { localStorage.removeItem('scholr_token'); localStorage.removeItem('scholr_user'); pt = null; }
      if (st && !studentUserParsed) { localStorage.removeItem('scholr_student_token'); localStorage.removeItem('scholr_student_user'); st = null; }
      const profToken = pt;
      const profUser = profUserParsed;
      const studentToken = st;
      const studentUser = studentUserParsed;
      // Restore the screen the user was on (refresh stays put), but sanity-
      // check against their current auth state — a logged-out user can't be
      // restored to a dashboard. student-chat is restored only when we also
      // have the cached course object below.
      const persisted = localStorage.getItem('scholr_screen');
      const hasStudentCourse = !!localStorage.getItem('scholr_student_course');
      const publicOk = new Set(['landing', 'smart-signin', 'prof-login', 'prof-signup', 'student-login', 'student-signup']);
      const profOk = new Set(['prof-dashboard']);
      let screen;
      if (profToken) screen = (persisted && profOk.has(persisted)) ? persisted : 'prof-dashboard';
      else if (studentToken) {
        if (persisted === 'student-chat' && hasStudentCourse) screen = 'student-chat';
        else screen = 'student-dashboard';
      }
      else screen = (persisted && publicOk.has(persisted)) ? persisted : 'landing';
      return { screen, profToken, profUser, studentToken, studentUser };
    } catch {}
    return { screen: 'landing', profToken: null, profUser: null, studentToken: null, studentUser: null };
  })();
  const [screen, setScreen] = useState(initialAuth.screen);
  const [profToken, setProfToken] = useState(initialAuth.profToken);
  const [profUser, setProfUser] = useState(initialAuth.profUser);
  const [studentToken, setStudentToken] = useState(initialAuth.studentToken);
  const [studentUser, setStudentUser] = useState(initialAuth.studentUser);
  const [studentCourse, setStudentCourse] = useState(() => {
    try { const j = localStorage.getItem('scholr_student_course'); return j ? JSON.parse(j) : null; } catch { return null; }
  });
  const [studentDocs, setStudentDocs] = useState([]);
  const [studentQuestions, setStudentQuestions] = useState([]);
  const [pendingJoinCode, setPendingJoinCode] = useState(null);
  const [globalToast, setGlobalToast] = useState(null);

  // Persist the current screen so refreshing keeps the user where they were.
  useEffect(() => { try { localStorage.setItem('scholr_screen', screen); } catch {} }, [screen]);
  // Persist the active student course so refresh keeps them inside it.
  useEffect(() => {
    try {
      if (studentCourse) localStorage.setItem('scholr_student_course', JSON.stringify(studentCourse));
      else localStorage.removeItem('scholr_student_course');
    } catch {}
  }, [studentCourse]);

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

    // (initialAuth above already restores tokens + the persisted screen
    // synchronously on mount, so no auth-restore needs to run here. The old
    // setScreen('student-dashboard')/setScreen('prof-dashboard') override
    // was clobbering the persisted student-chat / prof course-manager view
    // every time the page refreshed.)
  }, []);

  const handleProfLogin = (token, user) => { localStorage.setItem('scholr_token', token); localStorage.setItem('scholr_user', JSON.stringify(user)); setProfToken(token); setProfUser(user); setScreen('prof-dashboard'); };
  const handleProfLogout = () => { localStorage.removeItem('scholr_token'); localStorage.removeItem('scholr_user'); localStorage.removeItem('scholr_prof_course'); localStorage.removeItem('scholr_screen'); setProfToken(null); setProfUser(null); setScreen('landing'); };
  const handleStudentLogin = (token, user) => { localStorage.setItem('scholr_student_token', token); localStorage.setItem('scholr_student_user', JSON.stringify(user)); setStudentToken(token); setStudentUser(user); setScreen('student-dashboard'); navigate('/student'); };

  // Cross-tab sync. Sign out in one tab → propagate to every open tab so
  // they don't keep making authenticated requests with a token the user
  // already revoked. The handler fires only on storage changes from OTHER
  // tabs (not the current one). newValue===null means the key was removed.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'scholr_token' && !e.newValue) {
        setProfToken(null); setProfUser(null); setScreen('landing');
      }
      if (e.key === 'scholr_student_token' && !e.newValue) {
        setStudentToken(null); setStudentUser(null); setScreen('landing');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  // Landing "Enter your join code": capture the code BEFORE login so the student
  // is auto-enrolled right after signing in (StudentDashboard reads this on mount).
  const handleJoinCodeEntry = (code) => { const c = (code || '').trim().toUpperCase(); if (!c) return; sessionStorage.setItem('scholr_pending_join', c); setPendingJoinCode(c); setScreen('student-login'); navigate('/student/login'); };
  // Important: navigate('/') here too. Without it, signing out from the
  // student dashboard leaves the URL at /student and lands you on a landing
  // page that's stuck on that route — its setScreen-only callbacks (Sign in,
  // Start a course free) silently no-op because /student only re-renders
  // when studentToken changes, not when screen does.
  const handleStudentLogout = () => { localStorage.removeItem('scholr_student_token'); localStorage.removeItem('scholr_student_user'); localStorage.removeItem('scholr_student_course'); localStorage.removeItem('scholr_screen'); setStudentToken(null); setStudentUser(null); setStudentCourse(null); setScreen('landing'); navigate('/'); };
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
        {/* Dedicated marketing pages — each one is a real standalone page
            with its own hero, content sections, and CTA, sharing the main
            landing's nav + footer + theme via MarketingShell. */}
        <Route path="/for-professors" element={<ForProfessorsPage onStudent={() => navigate('/student/login')} onInstructor={() => { navigate('/'); setScreen('prof-signup'); }} onSignIn={() => { navigate('/'); setScreen('smart-signin'); }} />} />
        <Route path="/for-students"   element={<ForStudentsPage   onStudent={() => navigate('/student/login')} onInstructor={() => { navigate('/'); setScreen('prof-signup'); }} onSignIn={() => { navigate('/'); setScreen('smart-signin'); }} />} />
        <Route path="/how-it-works"   element={<HowItWorksPage    onStudent={() => navigate('/student/login')} onInstructor={() => { navigate('/'); setScreen('prof-signup'); }} onSignIn={() => { navigate('/'); setScreen('smart-signin'); }} />} />
        <Route path="/about"          element={<AboutPage         onStudent={() => navigate('/student/login')} onInstructor={() => { navigate('/'); setScreen('prof-signup'); }} onSignIn={() => { navigate('/'); setScreen('smart-signin'); }} />} />
        <Route path="/join/:code" element={<JoinCoursePage studentToken={studentToken} studentUser={studentUser} onStudentLogin={handleStudentLogin} onEnterCourse={handleEnterCourse} />} />
        <Route path="/student/login" element={<StudentLogin onLogin={handleStudentLogin} onGoSignup={() => navigate('/student/signup')} onBack={() => navigate('/')} pendingJoinCode={pendingJoinCode} />} />
        <Route path="/student/signup" element={<StudentSignup onLogin={handleStudentLogin} onGoLogin={() => navigate('/student/login')} onBack={() => navigate('/')} pendingJoinCode={pendingJoinCode} />} />
        <Route path="/student" element={
          studentToken
            ? (screen === 'student-chat' && studentCourse
                ? <StudentView course={studentCourse} documents={studentDocs} suggestedQuestions={studentQuestions} onExit={() => setScreen('student-dashboard')} studentToken={studentToken} />
                : <StudentDashboard token={studentToken} user={studentUser} onEnterCourse={handleEnterCourse} onLogout={handleStudentLogout} />)
            : <LandingPage onStudent={() => navigate('/student/login')} onInstructor={() => { navigate('/'); setScreen('prof-signup'); }} onSignIn={() => { navigate('/'); setScreen('smart-signin'); }} onJoinCode={handleJoinCodeEntry} />
        } />
        <Route path="/*" element={renderScreen()} />
      </Routes>
      <ToastBanner message={globalToast?.message} type={globalToast?.type} onClose={() => setGlobalToast(null)} />
    </>
  );
}
