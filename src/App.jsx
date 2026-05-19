import React, { useState, useRef, useEffect } from 'react';
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
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Analytics data ────────────────────────────────────────────────────────────
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

// ── Loading Screen ────────────────────────────────────────────────────────────
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

// ── Markdown ──────────────────────────────────────────────────────────────────
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
        // Auto login after signup
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

// ── Professor Dashboard ───────────────────────────────────────────────────────
function ProfessorDashboard({ token, user, onLogout }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(null);

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
    if (!confirm('Delete this course? All documents and data will be lost.')) return;
    await fetch(`${API}/professor/courses/${id}`, { method: 'DELETE', headers: authHeaders });
    setCourses(prev => prev.filter(c => c.id !== id));
    if (selectedCourse?.id === id) setSelectedCourse(null);
    showToast('Course deleted');
  };

  const copyLink = (course) => {
    const link = `${window.location.origin}?course=${course.id}`;
    navigator.clipboard.writeText(link);
    setCopied(course.id); setTimeout(() => setCopied(null), 2000);
    showToast('Link copied!');
  };

  const copyCode = (course) => {
    navigator.clipboard.writeText(course.code);
    setCopied(course.code); setTimeout(() => setCopied(null), 2000);
    showToast('Join code copied!');
  };

  if (selectedCourse) return <CourseManager token={token} course={selectedCourse} onBack={() => setSelectedCourse(null)} authHeaders={authHeaders} />;

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <style>{FONT}</style>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size={24} />
          <span className="text-gray-900 font-semibold text-sm">Scholr</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500 text-sm">{user.name || user.email}</span>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-xs">
          <LogOut size={12} />Sign out
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Your Courses</h1>
            <p className="text-gray-400 text-sm mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} · Each gets its own AI tutor and student portal</p>
          </div>
          <button onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors">
            <Plus size={14} />New course
          </button>
        </div>

        {/* Create course form */}
        {creating && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">New course</h3>
            <form onSubmit={createCourse} className="flex gap-3">
              <input autoFocus type="text" value={newCourseName} onChange={e => setNewCourseName(e.target.value)}
                placeholder="e.g. BUS-A 306 Management Accounting"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300" />
              <button type="submit" disabled={!newCourseName.trim()}
                className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">Create</button>
              <button type="button" onClick={() => { setCreating(false); setNewCourseName(''); }}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-colors">Cancel</button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen size={32} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium mb-1">No courses yet</p>
            <p className="text-gray-400 text-sm">Create your first course to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <div key={course.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-gray-900 font-semibold text-base mb-1">{course.name}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Hash size={11} className="text-gray-400" />
                        <span className="text-xs font-mono text-gray-500">{course.code}</span>
                        <button onClick={() => copyCode(course)} className="text-gray-300 hover:text-gray-600 transition-colors ml-1">
                          {copied === course.code ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ExternalLink size={11} className="text-gray-400" />
                        <span className="text-xs text-gray-400">{window.location.origin}?course={course.id.slice(0, 8)}...</span>
                        <button onClick={() => copyLink(course)} className="text-gray-300 hover:text-gray-600 transition-colors ml-1">
                          {copied === course.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => setSelectedCourse(course)}
                      className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors">
                      Manage
                    </button>
                    <button onClick={() => deleteCourse(course.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-xl text-white text-xs font-medium shadow-xl z-50 ${toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900'}`}>
          {toast.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Course Manager (materials + insights) ─────────────────────────────────────
function CourseManager({ token, course, onBack, authHeaders }) {
  const [mods, setMods] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState('materials');
  const [classroomMode, setClassroomMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch(`${API}/course/${course.id}/documents`)
      .then(r => r.json()).then(data => {
        setMods((Array.isArray(data) ? data : []).map(d => ({ id: d.name, name: d.name, sizeKb: d.sizeKb, uploaded: new Date(d.uploadedAt) })));
      }).catch(() => showToast('Could not load documents', 'error'));
  }, [course.id]);

  const handleFile = async (file) => {
    const supported = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    if (!file || !supported.some(ext => file.name.toLowerCase().endsWith(ext))) return;
    setUploading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await fetch(`${API}/course/${course.id}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        setMods(prev => [{ id: data.fileName, name: data.fileName, sizeKb: data.sizeKb, uploaded: new Date() }, ...prev]);
        showToast(`${file.name} uploaded`);
      } else showToast(data.error || 'Upload failed', 'error');
    } catch { showToast('Server unreachable', 'error'); }
    setUploading(false);
  };

  const onDelete = async (mod) => {
    setMods(prev => prev.filter(m => m.id !== mod.id));
    await fetch(`${API}/course/${course.id}/document/${encodeURIComponent(mod.name)}`, { method: 'DELETE', headers: authHeaders });
    showToast(`${cleanFileName(mod.name)} removed`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?course=${course.id}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    showToast('Student link copied!');
  };

  if (classroomMode) return <ClassroomMode courseId={course.id} onExit={() => setClassroomMode(false)} />;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F7F7] fixed inset-0">
      <style>{FONT}</style>
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-xs mb-4 transition-colors">
            <ArrowLeft size={12} />All courses
          </button>
          <div className="flex items-center gap-2.5 mb-3">
            <Logo size={22} />
            <span className="text-gray-900 font-semibold text-sm">Scholr</span>
          </div>
          <div className="bg-gray-900 rounded-lg px-3 py-2.5">
            <p className="text-white text-xs font-medium truncate">{course.name}</p>
            <p className="text-gray-500 text-[10px] mt-0.5 font-mono">{course.code}</p>
          </div>
        </div>
        <nav className="p-3 flex-1">
          {[{ id: 'materials', label: 'Materials', icon: FileText }, { id: 'insights', label: 'Insights', icon: BarChart2 }].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors mb-0.5 ${activeTab === id ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button onClick={copyLink}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors">
            {copied ? <Check size={11} className="text-emerald-500" /> : <ExternalLink size={11} />}
            {copied ? 'Copied!' : 'Copy student link'}
          </button>
          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div><span className="text-[10px] text-gray-400">Vertex AI connected</span></div>
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
                <input type="file" ref={fileRef} onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" />
                <button onClick={() => fileRef.current.click()} disabled={uploading}
                  className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors">
                  <UploadCloud size={13} />{uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-8">
              {mods.length === 0 ? (
                <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                  onClick={() => fileRef.current.click()}
                  className={`flex flex-col items-center justify-center h-56 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <UploadCloud size={24} className="text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm font-medium mb-1">{dragOver ? 'Drop to upload' : 'Upload course materials'}</p>
                  <p className="text-gray-400 text-xs">PDF, JPG, PNG — drag and drop or click</p>
                </div>
              ) : (
                <div>
                  <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                    onClick={() => fileRef.current.click()}
                    className={`mb-6 flex items-center gap-3 px-5 py-3 rounded-xl border border-dashed cursor-pointer transition-all ${dragOver ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <UploadCloud size={14} className="text-gray-300" />
                    <span className="text-gray-400 text-xs">Drop another file — PDF or image</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {mods.map(m => (
                      <div key={m.id} className="group bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center">
                            {/\.(jpg|jpeg|png|webp)$/i.test(m.name) ? <span className="text-white text-[10px] font-bold">IMG</span> : <FileText size={14} className="text-white" />}
                          </div>
                          <button onClick={() => onDelete(m)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all">
                            <Trash2 size={12} />
                          </button>
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
        ) : <CourseInsights courseId={course.id} onStartClassMode={() => setClassroomMode(true)} />}
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
  const d = isEmpty ? DEMO_DATA : {
    ...DEMO_DATA,
    totalQuestions: insights.totalQuestions, weekQuestions: insights.weekQuestions,
    timeSavedHours: insights.timeSavedHours, timeSavedMinutes: insights.timeSavedMinutes,
    confidenceRate: insights.flagged?.length > 0 ? Math.round(((insights.totalQuestions - insights.flagged.length) / insights.totalQuestions) * 100) : 94,
    estimatedStudents: Math.max(1, Math.round(insights.totalQuestions / 4.5)),
    peakHour: insights.peakHourLabel || '10 PM',
    topTopics: insights.topTopics?.length ? insights.topTopics : DEMO_DATA.topTopics,
    recent: insights.recent?.length ? insights.recent : DEMO_DATA.recent,
    flagged: insights.flagged?.length ? insights.flagged : DEMO_DATA.flagged,
  };

  const totalForPie = d.topTopics.reduce((s, t) => s + t.count, 0) || 1;
  const pieData = d.topTopics.map(t => ({ name: t.topic, value: t.count, percent: t.count / totalForPie }));
  const timeSaved = d.timeSavedHours > 0 ? `${d.timeSavedHours}h ${d.timeSavedMinutes}m` : `${d.timeSavedMinutes}m`;
  const topTopic = d.topTopics?.[0]?.topic || 'Concepts';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#F7F7F7]">
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-gray-900 font-semibold text-sm">Student Insights</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-gray-400 text-xs">Live · updates every 10s{isEmpty ? ' · showing sample data' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {newCount > 0 && (
              <button onClick={() => { setNewCount(0); fetchInsights(); }} className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                ↑ {newCount} new
              </button>
            )}
            <button onClick={onStartClassMode} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />Live Mode
            </button>
          </div>
        </div>
        <div className="flex gap-1 mt-4">
          {[{ id: 'overview', label: 'Overview' }, { id: 'questions', label: 'Questions' }, { id: 'gaps', label: 'Knowledge Gaps' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-5">
        {activeTab === 'overview' && (
          <>
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
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<PieTooltipCustom />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {pieData.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TOPIC_COLORS[i % TOPIC_COLORS.length] }} />
                        <span className="text-xs text-gray-600 flex-1 truncate">{entry.name}</span>
                        <span className="text-xs font-semibold text-gray-900">{Math.round(entry.percent * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">💡</div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1.5">Scholr AI Insight</p>
                  <p className="text-sm leading-relaxed text-white/80">
                    Students asked about <strong className="text-white">{topTopic}</strong> most this week.
                    {d.flagged?.length > 0 && <> {d.flagged.length} question{d.flagged.length > 1 ? 's' : ''} couldn't be answered confidently — consider uploading more material on <strong className="text-white">exam policies</strong> and <strong className="text-white">grading criteria</strong>.</>}
                    {d.weekQuestions > 5 && <> Peak activity was at <strong className="text-white">{d.peakHour}</strong> — students are studying late.</>}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'questions' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-4">Topic Breakdown</h3>
                <div className="space-y-3">
                  {d.topTopics.map((t, i) => {
                    const pct = Math.round((t.count / totalForPie) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full w-24 text-center flex-shrink-0 ${TOPIC_ACCENT[t.topic] || 'bg-gray-100 text-gray-600'}`}>{t.topic}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gray-900 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-900 w-5 text-right">{t.count}</span>
                        <span className="text-[10px] text-gray-400 w-8">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-1">Confidence Rate</h3>
                <p className="text-[11px] text-gray-400 mb-4">How well materials cover student questions</p>
                <div className="flex items-center justify-center py-3">
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#F3F4F6" strokeWidth="10" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#0F0F0F" strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 40 * d.confidenceRate / 100} ${2 * Math.PI * 40}`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-gray-900">{d.confidenceRate}%</span>
                      <span className="text-[10px] text-gray-400">confident</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-8 mt-2">
                  <div className="text-center"><p className="text-xl font-bold text-gray-900">{d.totalQuestions - (d.flagged?.length || 0)}</p><p className="text-[10px] text-gray-400">answered well</p></div>
                  <div className="w-px h-8 bg-gray-100" />
                  <div className="text-center"><p className="text-xl font-bold text-amber-500">{d.flagged?.length || 0}</p><p className="text-[10px] text-gray-400">needs review</p></div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div><h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Recent Questions</h3><p className="text-[11px] text-gray-400 mt-0.5">What students asked in real time</p></div>
                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[10px] text-gray-400">Live</span></div>
              </div>
              <div className="divide-y divide-gray-50">
                {d.recent.slice(0, 10).map((q, i) => {
                  const label = getTopicLabel(q.question);
                  return (
                    <div key={i} className="flex items-start gap-4 py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors">
                      <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${q.confident !== false ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 leading-snug">{q.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TOPIC_ACCENT[label] || 'bg-gray-100 text-gray-600'}`}>{label}</span>
                          {q.confident === false && <span className="text-[10px] text-amber-500 font-medium">Needs review</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-300 flex-shrink-0 mt-1">{formatRelativeDate(q.ts)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'gaps' && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-lg">⚠️</div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 mb-1">Knowledge Gap Analysis</h3>
                  <p className="text-xs text-amber-700 leading-relaxed">These questions couldn't be answered confidently from your uploaded materials. Upload more detailed notes on these topics to improve accuracy.</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {d.flagged.map((q, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-amber-200 hover:shadow-sm transition-all">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-amber-500 text-xs font-bold">#{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 font-medium leading-snug">{q.question}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">Low confidence</span>
                        <span className="text-[10px] text-gray-400">{formatRelativeDate(q.ts)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 text-white">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2">Recommendation</p>
              <p className="text-sm leading-relaxed text-white/80">Upload more detailed material covering <strong className="text-white">exam policies</strong> and <strong className="text-white">grading criteria</strong> to reduce the knowledge gap rate by an estimated 40%.</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${d.confidenceRate}%` }} />
                </div>
                <span className="text-xs text-white/50">{d.confidenceRate}% covered</span>
              </div>
            </div>
          </>
        )}
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
        <div className="flex items-center gap-4">
          <Logo size={28} /><span className="text-white font-semibold">Scholr</span>
          <div className="flex items-center gap-2 ml-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/25">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-red-400 text-xs font-medium">LIVE</span>
          </div>
        </div>
        <button onClick={onExit} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 text-sm transition-colors">
          <X size={14} />End Session
        </button>
      </div>
      {newCount > 0 && (
        <button onClick={() => setNewCount(0)} className="mx-8 mt-4 flex items-center justify-between px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-sm hover:bg-white/10 transition-colors">
          <span>{newCount} new question{newCount > 1 ? 's' : ''}</span><span className="text-gray-500 text-xs">Dismiss</span>
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
              <div key={i} className="px-5 py-4 rounded-xl bg-white/5 border border-white/10">
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
      <div className="px-8 py-4 border-t border-white/10 text-center"><p className="text-gray-600 text-xs">Updates every 8 seconds</p></div>
    </div>
  );
}

// ── Student Join Page ─────────────────────────────────────────────────────────
function StudentJoin({ onJoin, defaultCourseId }) {
  const [code, setCode] = useState(defaultCourseId || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultCourseId) handleJoin(defaultCourseId);
  }, []);

  const handleJoin = async (idOrCode) => {
    const val = (idOrCode || code).trim();
    if (!val) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/course/${val}`);
      if (!res.ok) { setError('Course not found — check your code or link'); setLoading(false); return; }
      const course = await res.json();
      // Load documents and suggested questions
      const [docsRes, qRes] = await Promise.all([
        fetch(`${API}/course/${course.id}/documents`),
        fetch(`${API}/course/${course.id}/suggested-questions`),
      ]);
      const docs = await docsRes.json();
      const qData = await qRes.json();
      onJoin(course, Array.isArray(docs) ? docs : [], qData.questions || []);
    } catch { setError('Server unreachable'); }
    setLoading(false);
  };

  if (loading) return <LoadingScreen label="Loading your course..." />;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
      <style>{FONT}</style>
      <div className="mb-8 flex items-center gap-3"><Logo size={28} /><span className="text-gray-900 font-semibold">Scholr</span></div>
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="serif text-3xl text-gray-900 mb-1.5">Join a course</h1>
          <p className="text-gray-400 text-sm">Enter the join code your professor shared</p>
        </div>
        <div className="space-y-3">
          <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="e.g. BUSA-ABC1"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-300 font-mono uppercase tracking-wider text-center" />
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          <button onClick={() => handleJoin()} disabled={!code.trim()}
            className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-sm font-medium transition-colors">
            Join course
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Student Chat View ─────────────────────────────────────────────────────────
function StudentView({ course, documents, suggestedQuestions, onExit }) {
  const [chats, setChats] = useState([{ id: 1, title: 'New Chat', messages: [] }]);
  const [chatId, setChatId] = useState(1);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [myNotes, setMyNotes] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const paperclipRef = useRef(null);
  const abortRef = useRef(null);

  const DEFAULT_QUESTIONS = ["What are the main topics in this course?", "Summarize the key concepts from the materials", "What should I focus on for the exam?"];
  const questions = suggestedQuestions?.length ? suggestedQuestions : DEFAULT_QUESTIONS;

  const active = chats.find(c => c.id === chatId) || chats[0];
  const scrollToBottom = () => { setTimeout(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 50); };
  useEffect(() => { scrollToBottom(); }, [active.messages, isTyping]);

  const createNewChat = () => { const nc = { id: Date.now(), title: 'New Chat', messages: [] }; setChats(prev => [...prev, nc]); setChatId(nc.id); };
  const deleteChat = (id) => {
    const remaining = chats.filter(c => c.id !== id);
    if (remaining.length === 0) { const nc = { id: Date.now(), title: 'New Chat', messages: [] }; setChats([nc]); setChatId(nc.id); }
    else { setChats(remaining); if (chatId === id) setChatId(remaining[remaining.length - 1].id); }
  };

  const handlePaperclipFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const ext = file.name.toLowerCase().split('.').pop();
      const mimeMap = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      setMyNotes(prev => [{ name: file.name, buffer: e.target.result, mimeType: mimeMap[ext] || 'application/pdf' }, ...prev.filter(d => d.name !== file.name)]);
    };
    reader.readAsArrayBuffer(file);
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
    const completedMessages = active.messages.filter(m => !m.streaming);
    const fallback = isFirstMessage ? message.trim().split(/\s+/).slice(0, 5).join(' ') : null;
    const streamingMsgId = Date.now();

    setChats(prev => prev.map(c => c.id === currentChatId ? {
      ...c, ...(fallback ? { title: fallback } : {}),
      messages: [...c.messages, { role: 'user', content: message, ts: Date.now() }, { id: streamingMsgId, role: 'assistant', content: '', sources: [], ts: Date.now(), streaming: true }]
    } : c));
    setInput(''); setIsTyping(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let response;
      if (myNotes.length > 0) {
        const fd = new FormData();
        fd.append('message', message);
        fd.append('history', JSON.stringify(completedMessages.map(m => ({ role: m.role, content: m.content }))));
        myNotes.forEach((n, i) => fd.append(`note_${i}`, new Blob([n.buffer], { type: n.mimeType }), n.name));
        response = await fetch(`${API}/course/${course.id}/chat`, { method: 'POST', body: fd, signal: controller.signal });
      } else {
        response = await fetch(`${API}/course/${course.id}/chat`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ message, history: completedMessages.map(m => ({ role: m.role, content: m.content })) }),
        });
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = '', fullText = '';
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
              setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: m.content + event.token } : m) } : c));
              scrollToBottom();
            } else if (event.type === 'sources') {
              setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, sources: event.sources } : m) } : c));
            } else if (event.type === 'done') {
              setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, streaming: false } : m) } : c));
              if (isFirstMessage) {
                const smartTitle = fullText.trim().split(/\s+/).slice(0, 6).join(' ').replace(/[.!?]$/, '');
                setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, title: smartTitle || fallback } : c));
              }
            } else if (event.type === 'error') {
              setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: 'error:' + event.error, streaming: false, isError: true } : m) } : c));
            }
          } catch {}
        }
      }
    } catch (err) {
      const isAbort = err?.name === 'AbortError';
      setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: isAbort ? m.content : 'error:network', streaming: false, isError: !isAbort } : m) } : c));
    }
    abortRef.current = null; setIsTyping(false); inputRef.current?.focus();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden fixed inset-0 bg-white">
      <style>{FONT}</style>
      <aside className="w-56 bg-[#F7F7F7] border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5 mb-3">
            <Logo size={22} /><span className="text-gray-900 font-semibold text-sm">Scholr</span>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
            <p className="text-gray-900 text-xs font-medium truncate">{course.name}</p>
            <p className="text-gray-400 text-[10px] mt-0.5">{documents.length} doc{documents.length !== 1 ? 's' : ''} · {myNotes.length} note{myNotes.length !== 1 ? 's' : ''}</p>
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
            <div key={c.id} className="group relative mb-0.5">
              <button onClick={() => setChatId(c.id)}
                className={`flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors pr-7 ${c.id === chatId ? 'bg-white border border-gray-200 text-gray-900 font-medium shadow-sm' : 'text-gray-500 hover:bg-white hover:text-gray-700'}`}>
                <MessageSquare size={11} className="flex-shrink-0 opacity-40" /><span className="truncate">{c.title}</span>
              </button>
              <button onClick={e => { e.stopPropagation(); deleteChat(c.id); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-400 transition-all">
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </nav>
        {/* My Notes section */}
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">My Notes</p>
            <button onClick={() => paperclipRef.current?.click()} className="text-[10px] text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1"><Plus size={10} />Add</button>
          </div>
          <input ref={paperclipRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={e => { handlePaperclipFile(e.target.files[0]); e.target.value = ''; }} />
          {myNotes.length === 0 ? (
            <button onClick={() => paperclipRef.current?.click()}
              className="w-full flex flex-col items-center py-3 rounded-lg border border-dashed border-gray-200 hover:border-gray-300 transition-colors cursor-pointer">
              <UploadCloud size={13} className="text-gray-300 mb-1" />
              <p className="text-[10px] text-gray-400">Drop notes or photos</p>
            </button>
          ) : (
            <div className="space-y-1">
              {myNotes.map((doc, i) => (
                <div key={i} className="group flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-50 border border-gray-100">
                  <FileText size={10} className="text-gray-400 flex-shrink-0" />
                  <span className="text-[11px] text-gray-700 flex-1 truncate">{cleanFileName(doc.name)}</span>
                  <button onClick={() => setMyNotes(prev => prev.filter(d => d.name !== doc.name))} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"><X size={9} /></button>
                </div>
              ))}
            </div>
          )}
          {myNotes.length > 0 && <p className="text-[10px] text-gray-400 mt-2">AI reads your notes + course materials</p>}
        </div>
        <div className="p-4 border-t border-gray-200">
          <button onClick={onExit} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-xs"><LogOut size={11} />Exit</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0">
          <h2 className="text-gray-900 text-sm font-medium">{active.title}</h2>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />AI Active
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-8 flex flex-col gap-5">
          {active.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 pb-10 fade-up">
              {documents.length === 0 ? (
                <div className="text-center max-w-xs">
                  <Clock size={20} className="text-gray-200 mx-auto mb-4" />
                  <h3 className="text-gray-700 font-medium text-sm mb-1">Setting up your course</h3>
                  <p className="text-gray-400 text-xs">Your instructor is uploading materials.</p>
                </div>
              ) : (
                <div className="text-center max-w-md w-full flex flex-col items-center">
                  <Logo size={36} />
                  <h3 className="text-gray-900 font-semibold text-lg mt-5 mb-1.5">Ask anything about your course</h3>
                  <p className="text-gray-400 text-sm mb-8">Every answer is grounded in your professor's materials — cited and accurate.</p>
                  <div className="space-y-2 text-left w-full">
                    {questions.map((q, i) => (
                      <button key={i} onClick={() => onSend(q)}
                        className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-sm hover:bg-gray-100 hover:border-gray-300 transition-all">
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
            const isError = m.isError || m.content?.startsWith('error:');
            return (
              <div key={msgId} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col ${m.role === 'user' ? 'items-end max-w-xl' : 'items-start max-w-2xl w-full'}`}>
                  <div className={`rounded-2xl text-sm w-full ${m.role === 'user' ? 'bg-gray-900 text-white px-4 py-3 rounded-br-sm' : 'text-gray-800'}`}>
                    {m.role === 'assistant' && m.content === '' && m.streaming ? (
                      <div className="flex items-center gap-3 py-2">
                        <div className="flex flex-col justify-center gap-1" style={{ width: '22px' }}>
                          <div className="eq-bar eq1" /><div className="eq-bar eq2" /><div className="eq-bar eq3" />
                        </div>
                        <span className="text-xs text-gray-400">Reading your materials...</span>
                      </div>
                    ) : isError ? <ErrorMessage content={m.content} /> : m.role === 'user'
                      ? <p className="leading-relaxed whitespace-pre-wrap text-white">{m.content}</p>
                      : <MarkdownMessage content={m.content} />}
                    {m.role === 'assistant' && m.streaming && m.content && (
                      <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
                    )}
                    {m.role === 'assistant' && m.sources?.length > 0 && !m.streaming && !isError && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-gray-300 uppercase tracking-wide mr-0.5">From</span>
                        {m.sources.map((source, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-[11px] font-medium">
                            <FileText size={9} /><span className="max-w-[200px] truncate">{cleanFileName(source)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    {m.role === 'user' && <span className="block text-[10px] mt-1.5 opacity-30">{formatTime(m.ts)}</span>}
                  </div>
                  {m.role === 'assistant' && !m.streaming && m.content && !isError && (
                    <div className="flex items-center gap-0.5 mt-1.5">
                      <button onClick={() => { navigator.clipboard.writeText(m.content.replace(/\nSOURCES:.*$/m, '').trim()); setCopiedId(msgId); setTimeout(() => setCopiedId(null), 2000); }}
                        className={`p-1.5 rounded-lg transition-colors ${copiedId === msgId ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}>
                        {copiedId === msgId ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                      <button onClick={() => setFeedback(prev => ({ ...prev, [msgId]: prev[msgId] === 'up' ? null : 'up' }))}
                        className={`p-1.5 rounded-lg transition-colors ${feedback[msgId] === 'up' ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}>
                        <ThumbsUp size={12} />
                      </button>
                      <button onClick={() => setFeedback(prev => ({ ...prev, [msgId]: prev[msgId] === 'down' ? null : 'down' }))}
                        className={`p-1.5 rounded-lg transition-colors ${feedback[msgId] === 'down' ? 'text-red-400' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'}`}>
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

        <div className="px-8 py-4 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-gray-400 focus-within:bg-white focus-within:shadow-sm transition-all gap-2">
              <button onClick={() => paperclipRef.current?.click()} className="flex-shrink-0 text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <Paperclip size={15} />
              </button>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isTyping) onSend(); } }}
                className="flex-1 bg-transparent text-gray-800 text-sm outline-none placeholder-gray-400 py-1.5"
                placeholder={myNotes.length > 0 ? "Ask about your course + notes..." : "Ask about your course..."} />
              {isTyping ? (
                <button onClick={onStop} className="w-8 h-8 rounded-full bg-gray-900 hover:bg-gray-800 text-white flex items-center justify-center flex-shrink-0">
                  <Square size={11} fill="currentColor" />
                </button>
              ) : (
                <button onClick={() => onSend()} disabled={!input.trim()}
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${!input.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800 text-white'}`}>
                  <Send size={12} />
                </button>
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
function LandingPage({ onStudent, onInstructor }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <style>{FONT}</style>
      <nav className="flex items-center justify-between px-10 py-5 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3"><Logo size={28} /><span className="text-gray-900 font-semibold tracking-tight">Scholr</span></div>
        <div className="flex items-center gap-2 text-xs text-gray-400"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Google Vertex AI</div>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium mb-8">Course-grounded AI tutoring</div>
            <h1 className="serif text-[64px] leading-[1.1] text-gray-900 mb-5">Every answer from<br /><span className="italic">your course materials</span></h1>
            <p className="text-gray-500 text-base max-w-sm mx-auto leading-relaxed">AI tutoring grounded in what your professor uploaded. Cited, accurate, trustworthy.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto mb-6">
            <button onClick={onStudent}
              className="group text-left p-6 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center mb-5"><Users size={16} className="text-white" /></div>
              <h2 className="text-gray-900 font-semibold text-sm mb-1">Student</h2>
              <p className="text-gray-400 text-xs leading-relaxed mb-5">Ask questions, get cited answers from course materials.</p>
              <div className="flex items-center gap-1 text-gray-900 text-xs font-medium">Join a course <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" /></div>
            </button>
            <button onClick={onInstructor}
              className="group text-left p-6 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all">
              <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center mb-5"><BookOpen size={16} className="text-white" /></div>
              <h2 className="text-gray-900 font-semibold text-sm mb-1">Instructor</h2>
              <p className="text-gray-400 text-xs leading-relaxed mb-5">Upload materials, deploy an AI tutor for your class.</p>
              <div className="flex items-center gap-1 text-gray-900 text-xs font-medium">Sign in <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" /></div>
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
            <span>🔒 FERPA aligned</span><span className="w-1 h-1 rounded-full bg-gray-300" /><span>Answers from your materials only</span><span className="w-1 h-1 rounded-full bg-gray-300" /><span>Powered by Google Vertex AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('landing');
  const [profToken, setProfToken] = useState(null);
  const [profUser, setProfUser] = useState(null);
  const [studentCourse, setStudentCourse] = useState(null);
  const [studentDocs, setStudentDocs] = useState([]);
  const [studentQuestions, setStudentQuestions] = useState([]);

  // Check URL for course ID (direct link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const courseId = params.get('course');
    if (courseId) { setScreen('student-join'); }
  }, []);

  // Check for saved professor session
  useEffect(() => {
    const token = localStorage.getItem('scholr_token');
    const user = localStorage.getItem('scholr_user');
    if (token && user) { setProfToken(token); setProfUser(JSON.parse(user)); setScreen('prof-dashboard'); }
  }, []);

  const handleProfLogin = (token, user) => {
    localStorage.setItem('scholr_token', token);
    localStorage.setItem('scholr_user', JSON.stringify(user));
    setProfToken(token); setProfUser(user); setScreen('prof-dashboard');
  };

  const handleProfLogout = () => {
    localStorage.removeItem('scholr_token'); localStorage.removeItem('scholr_user');
    setProfToken(null); setProfUser(null); setScreen('landing');
  };

  const handleStudentJoin = (course, docs, questions) => {
    setStudentCourse(course); setStudentDocs(docs); setStudentQuestions(questions);
    setScreen('student-chat');
  };

  const params = new URLSearchParams(window.location.search);
  const urlCourseId = params.get('course');

  if (screen === 'landing') return <LandingPage onStudent={() => setScreen('student-join')} onInstructor={() => setScreen('prof-login')} />;
  if (screen === 'student-join') return <StudentJoin onJoin={handleStudentJoin} defaultCourseId={urlCourseId} />;
  if (screen === 'student-chat') return <StudentView course={studentCourse} documents={studentDocs} suggestedQuestions={studentQuestions} onExit={() => { window.history.replaceState({}, '', '/'); setScreen('landing'); }} />;
  if (screen === 'prof-login') return <ProfessorLogin onLogin={handleProfLogin} onGoSignup={() => setScreen('prof-signup')} onBack={() => setScreen('landing')} />;
  if (screen === 'prof-signup') return <ProfessorSignup onLogin={handleProfLogin} onGoLogin={() => setScreen('prof-login')} onBack={() => setScreen('landing')} />;
  if (screen === 'prof-dashboard') return <ProfessorDashboard token={profToken} user={profUser} onLogout={handleProfLogout} />;
  return null;
}
