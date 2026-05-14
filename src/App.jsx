import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, GraduationCap, Send, LogOut,
  Trash2, ShieldCheck, Plus, BookOpen, FileText,
  ChevronRight, Users, AlertCircle,
  UploadCloud, Search, BarChart2, Zap, Clock, Hash, CheckCircle2, Copy, Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API = 'http://localhost:3001';

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
      }}>
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}

function MessageText({ role, content }) {
  if (role === 'user') return <PlainMessage content={content} />;
  return <MarkdownMessage content={content} />;
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
          <span className="text-gray-400 text-[11px]">{m.chars ? Math.round(m.chars / 1000) : 0}k chars</span>
          <span className="w-1 h-1 rounded-full bg-gray-200"></span>
          <span className="text-gray-400 text-[11px]">{m.chunks || 0} sections</span>
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
      <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mb-4 shadow-lg`}>
        <GraduationCap size={22} className="text-white" />
      </div>
      <p className="text-gray-500 text-sm font-medium mb-6">{label}</p>
      <div className="flex gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
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
      // Fetch questions and documents in parallel during loading screen
      try {
        const [docsRes, qRes] = await Promise.all([
          fetch(`${API}/documents`),
          fetch(`${API}/suggested-questions`)
        ]);
        const docs = await docsRes.json();
        const qData = await qRes.json();
        const questions = qData.questions?.length ? qData.questions : DEFAULT_QUESTIONS;
        const documents = Array.isArray(docs) ? docs : [];
        // Small buffer so loading screen shows for at least 600ms
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

  if (loading) {
    return <LoadingPortal
      label={loading === 'student' ? 'Loading Student Portal...' : 'Loading Instructor Portal...'}
      color={loading === 'student' ? 'bg-blue-600' : 'bg-indigo-600'}
    />;
  }

  return (
    <div className="min-h-screen w-screen bg-white flex flex-col" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        .serif { font-family: 'DM Serif Display', Georgia, serif; }
        .portal-card { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .portal-card:hover { transform: translateY(-2px); }
      `}</style>
      <nav className="flex items-center justify-between px-10 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="text-gray-900 font-semibold text-lg tracking-tight">ScholrAI</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
          Powered by Google Vertex AI
        </div>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium mb-8">
              <Zap size={11} />
              Built for universities
            </div>
            <h1 className="serif text-6xl text-gray-900 mb-5 leading-tight">
              Learning grounded in<br />
              <span className="text-blue-600 italic">your course materials</span>
            </h1>
            <p className="text-gray-500 text-lg max-w-lg mx-auto leading-relaxed">
              AI answers tied directly to what your professor uploaded — cited, trustworthy, grounded.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-10">
            <button onClick={() => handleSelect('student')} className="portal-card group text-left p-7 rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/80 bg-white">
              <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center mb-5 shadow-sm group-hover:bg-blue-700 transition-colors">
                <Users size={20} className="text-white" />
              </div>
              <h2 className="text-gray-900 font-semibold text-base mb-1.5">Student Portal</h2>
              <p className="text-gray-400 text-sm mb-5 leading-relaxed">Ask questions, get cited answers from your professor's materials.</p>
              <div className="flex items-center gap-1.5 text-blue-600 text-sm font-medium">
                Enter as student <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
            <button onClick={() => handleSelect('teacher')} className="portal-card group text-left p-7 rounded-2xl border border-gray-200 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/80 bg-white">
              <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center mb-5 shadow-sm group-hover:bg-indigo-700 transition-colors">
                <BookOpen size={20} className="text-white" />
              </div>
              <h2 className="text-gray-900 font-semibold text-base mb-1.5">Instructor Portal</h2>
              <p className="text-gray-400 text-sm mb-5 leading-relaxed">Upload course materials and deploy an AI tutor for your class.</p>
              <div className="flex items-center gap-1.5 text-indigo-600 text-sm font-medium">
                Enter as instructor <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
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
  const fileRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch(`${API}/documents`)
      .then(res => res.json())
      .then(data => {
        const docs = Array.isArray(data) ? data : (data.documents || []);
        setMods(docs.map(d => ({ id: d.name, name: d.name, chars: d.charCount, chunks: d.chunkCount, uploaded: new Date(d.uploadedAt) })));
      })
      .catch(() => showToast('Could not load documents from server.', 'error'));
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
        setMods(prev => [{ id: data.fileName, name: data.fileName, chars: data.charCount, chunks: data.chunkCount, uploaded: new Date() }, ...prev]);
        showToast(`"${file.name}" uploaded and indexed.`);
      } else {
        showToast(data.error || 'Upload failed.', 'error');
      }
    } catch {
      showToast('Server unreachable.', 'error');
    }
    setUploading(false);
  };

  const onUpload = (e) => { handleFile(e.target.files[0]); e.target.value = ''; };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };
  const onDelete = async (mod) => {
    setMods(prev => prev.filter(m => m.id !== mod.id));
    await fetch(`${API}/document/${encodeURIComponent(mod.name)}`, { method: 'DELETE' });
    showToast(`"${cleanFileName(mod.name)}" removed.`);
  };

  const totalChars = mods.reduce((acc, m) => acc + (m.chars || 0), 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8f9fb] fixed inset-0" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <GraduationCap size={14} className="text-white" />
            </div>
            <span className="text-gray-900 font-semibold text-sm tracking-tight">ScholrAI</span>
          </div>
          <div className="bg-indigo-600 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <BookOpen size={13} className="text-indigo-200" />
              <span className="text-white text-xs font-semibold">Instructor Portal</span>
            </div>
            <p className="text-indigo-200 text-[10px] mt-0.5">Course management</p>
          </div>
        </div>
        <nav className="p-3 flex-1">
          <p className="text-[10px] text-gray-300 font-semibold px-2 mb-1.5 uppercase tracking-widest">Navigation</p>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
            <FileText size={14} />Course Materials
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-gray-300 text-xs cursor-not-allowed mt-0.5">
            <BarChart2 size={14} />Student Insights
            <span className="ml-auto text-[9px] bg-gray-100 text-gray-300 px-1.5 py-0.5 rounded-full font-semibold">Soon</span>
          </div>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
            <span className="text-[10px] text-gray-400">Vertex AI connected</span>
          </div>
          <button onClick={onExit} className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-xs">
            <LogOut size={12} /> Exit Portal
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-gray-900 text-base font-semibold">Course Materials</h2>
              <p className="text-gray-400 text-xs mt-0.5">AI tutor reads all uploaded documents</p>
            </div>
            <div className="flex items-center gap-3">
              <input type="file" ref={fileRef} onChange={onUpload} className="hidden" accept=".pdf" />
              <button onClick={() => fileRef.current.click()} disabled={uploading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200">
                <UploadCloud size={14} />
                {uploading ? 'Indexing...' : 'Upload PDF'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <FileText size={12} className="text-gray-300" />
              <span className="font-semibold text-gray-600">{mods.length}</span> document{mods.length !== 1 ? 's' : ''} indexed
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Hash size={12} className="text-gray-300" />
              <span className="font-semibold text-gray-600">{Math.round(totalChars / 1000)}k</span> characters
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
              Live for all students
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {mods.length === 0 ? (
            <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} onClick={() => fileRef.current.click()}
              className={`flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${dragOver ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <UploadCloud size={24} className={dragOver ? 'text-blue-500' : 'text-gray-400'} />
              </div>
              <h3 className="text-gray-700 text-sm font-semibold mb-1">{dragOver ? 'Drop to upload' : 'Upload your first document'}</h3>
              <p className="text-gray-400 text-xs text-center max-w-xs">Drag and drop a PDF, or click to browse. Syllabi, lecture notes, readings — anything students need.</p>
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

function StudentView({ onExit, initialQuestions, initialDocuments }) {
  const [chats, setChats] = useState([{ id: 1, title: 'New Chat', messages: [] }]);
  const [chatId, setChatId] = useState(1);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [documents, setDocuments] = useState(initialDocuments || []);
  const [suggestedQuestions, setSuggestedQuestions] = useState(initialQuestions || DEFAULT_QUESTIONS);
  const [copiedId, setCopiedId] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const active = chats.find(c => c.id === chatId) || chats[0];

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
    }, 50);
  };

  // No need to fetch documents or questions on mount — already preloaded
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

  const onSend = async (messageOverride) => {
    const message = messageOverride || input;
    if (!message.trim() || isTyping) return;
    const userMsg = { role: 'user', content: message, sources: [], ts: Date.now() };
    const isFirstMessage = active.messages.length === 0;
    const newTitle = isFirstMessage ? generateTitle(message) : null;
    const currentChatId = chatId;

    setChats(prev => prev.map(c => c.id === currentChatId
      ? { ...c, messages: [...c.messages, userMsg], ...(newTitle ? { title: newTitle } : {}) }
      : c
    ));
    setInput('');
    setIsTyping(true);

    const streamingMsgId = Date.now();
    setChats(prev => prev.map(c => c.id === currentChatId
      ? { ...c, messages: [...c.messages, { id: streamingMsgId, role: 'assistant', content: '', sources: [], ts: Date.now(), streaming: true }] }
      : c
    ));

    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

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
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: m.content + event.token } : m) }
                : c
              ));
              scrollToBottom();
            } else if (event.type === 'sources') {
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, sources: event.sources } : m) }
                : c
              ));
            } else if (event.type === 'done') {
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, streaming: false } : m) }
                : c
              ));
            } else if (event.type === 'error') {
              setChats(prev => prev.map(c => c.id === currentChatId
                ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: 'Error: ' + event.error, streaming: false } : m) }
                : c
              ));
            }
          } catch {}
        }
      }
    } catch {
      setChats(prev => prev.map(c => c.id === currentChatId
        ? { ...c, messages: c.messages.map(m => m.id === streamingMsgId ? { ...m, content: 'Server unreachable. Is it running?', streaming: false } : m) }
        : c
      ));
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
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <GraduationCap size={14} className="text-white" />
            </div>
            <span className="text-gray-900 font-semibold text-sm tracking-tight">ScholrAI</span>
          </div>
          <div className="bg-gray-900 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Users size={12} className="text-gray-400" />
              <span className="text-white text-xs font-semibold">Student Portal</span>
            </div>
            <p className="text-gray-500 text-[10px] mt-0.5">{documents.length} document{documents.length !== 1 ? 's' : ''} available</p>
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
        <div className="p-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-300 mb-3 leading-relaxed">Answers grounded in your professor's uploaded materials only</p>
          <button onClick={onExit} className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors text-xs">
            <LogOut size={12} /> Exit Portal
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-gray-800 text-sm font-semibold">{active.title}</h2>
            <span className="text-gray-300">·</span>
            <p className="text-gray-400 text-xs">Grounded in your professor's materials</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-100 text-green-600 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            AI Active
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
          {active.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 pb-10">
              {documents.length === 0 ? (
                <div className="text-center max-w-xs">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 mx-auto">
                    <Clock size={22} className="text-gray-300" />
                  </div>
                  <h3 className="text-gray-700 font-semibold text-sm mb-2">Your course is being set up</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">Your instructor is still uploading course materials. Check back soon — everything will be ready before your next class.</p>
                </div>
              ) : (
                <div className="text-center max-w-md w-full">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-5 mx-auto shadow-lg shadow-blue-200">
                    <span className="text-white text-lg font-bold">S</span>
                  </div>
                  <h3 className="text-gray-900 font-semibold text-lg mb-2">Ask anything about your course</h3>
                  <p className="text-gray-400 text-sm mb-8 leading-relaxed">Every answer is grounded in your professor's uploaded materials — cited, trustworthy, and accurate.</p>
                  <div className="grid grid-cols-1 gap-2">
                    {suggestedQuestions.map((q, i) => (
                      <button key={i} onClick={() => onSend(q)}
                        className="text-left px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all shadow-sm">
                        <span className="text-gray-300 mr-2 text-xs font-mono">{i + 1}.</span>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {active.messages.map((m, i) => (
            <div key={m.id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'items-start gap-3'}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-blue-200">
                  <span className="text-white text-[11px] font-bold">S</span>
                </div>
              )}
              <div className={`relative group/msg rounded-2xl text-sm ${m.role === 'user'
                ? 'bg-gray-900 text-white px-4 py-3 rounded-br-sm max-w-sm'
                : 'bg-white border border-gray-100 text-gray-800 px-5 py-4 rounded-bl-sm max-w-[62%] shadow-sm'}`}>
                {m.role === 'assistant' && !m.streaming && m.content && (
                  <button onClick={() => copyMessage(m.content, m.id || i)}
                    className="absolute top-3 right-3 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                    {copiedId === (m.id || i) ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                )}
                {m.role === 'assistant' && m.content === '' && m.streaming ? (
                  <div className="flex items-center gap-2 py-1">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-gray-400">Searching your materials</span>
                  </div>
                ) : (
                  <MessageText role={m.role} content={m.content} />
                )}
                {m.role === 'assistant' && m.streaming && m.content && (
                  <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />
                )}
                {m.role === 'assistant' && m.sources && m.sources.length > 0 && !m.streaming && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-gray-300 font-medium uppercase tracking-wide mr-0.5">From</span>
                      {m.sources.map((source, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 text-[11px] font-medium">
                          <FileText size={9} className="flex-shrink-0" />
                          <span className="max-w-[180px] truncate">{cleanFileName(source)}</span>
                        </span>
                      ))}
                      <span className="text-[10px] text-gray-200 ml-auto">{formatTime(m.ts)}</span>
                    </div>
                  </div>
                )}
                {m.role === 'assistant' && (!m.sources || m.sources.length === 0) && !m.streaming && (
                  <span className="block text-[10px] mt-2 text-gray-300">{formatTime(m.ts)}</span>
                )}
                {m.role === 'user' && (
                  <span className="block text-[10px] mt-1.5 opacity-40">{formatTime(m.ts)}</span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="px-8 py-4 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="flex gap-3 items-center max-w-3xl mx-auto">
            <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-blue-400 focus-within:shadow-sm focus-within:shadow-blue-100 transition-all">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
                className="flex-1 bg-transparent text-gray-800 text-sm outline-none placeholder-gray-300"
                placeholder="Ask about your course material..."
              />
            </div>
            <button onClick={() => onSend()} disabled={!input.trim() || isTyping}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white flex items-center justify-center flex-shrink-0 transition-colors shadow-sm shadow-blue-200">
              <Send size={15} />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-200 mt-2">Grounded in your professor's materials · Powered by Vertex AI</p>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [preloaded, setPreloaded] = useState({});

  const handleSelect = (role, data) => {
    setPreloaded(data || {});
    setRole(role);
  };

  if (!role) return <LoginScreen onSelect={handleSelect} />;
  if (role === 'teacher') return <TeacherView onExit={() => setRole(null)} />;
  return <StudentView
    onExit={() => setRole(null)}
    initialQuestions={preloaded.questions}
    initialDocuments={preloaded.documents}
  />;
}
