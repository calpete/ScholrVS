import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, GraduationCap, Send, LogOut,
  Trash2, ShieldCheck, Plus, BookOpen, FileText,
  ChevronRight, Sparkles, Users, AlertCircle, X,
  UploadCloud, Search, BarChart2, Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API = 'http://localhost:3001';

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function CitationBadge({ number, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-blue-600 text-white hover:bg-blue-500 cursor-pointer mx-0.5 align-super leading-none">
      {number}
    </button>
  );
}

function processCitations(children, citations, onCitationClick) {
  if (typeof children === 'string') {
    if (!citations || citations.length === 0) return children;
    const parts = children.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const num = parseInt(match[1], 10);
        const citation = citations[num - 1];
        if (citation) return <CitationBadge key={i} number={num} onClick={() => onCitationClick(citation)} />;
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  }
  if (Array.isArray(children)) {
    return children.map((c, i) => <React.Fragment key={i}>{processCitations(c, citations, onCitationClick)}</React.Fragment>);
  }
  return children;
}

function PlainMessage({ content }) {
  return <p className="m-0 leading-relaxed whitespace-pre-wrap">{content}</p>;
}

function MarkdownMessage({ content, citations, onCitationClick }) {
  const cite = (children) => processCitations(children, citations, onCitationClick);
  return (
    <div className="text-sm leading-relaxed text-gray-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{cite(children)}</p>,
        h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 mt-3 mb-2 first:mt-0">{cite(children)}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 mt-3 mb-2 first:mt-0">{cite(children)}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-1 first:mt-0">{cite(children)}</h3>,
        ul: ({ children }) => <ul className="list-disc list-outside pl-5 my-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside pl-5 my-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-gray-800">{cite(children)}</li>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900">{cite(children)}</strong>,
        em: ({ children }) => <em className="italic text-gray-700">{cite(children)}</em>,
        code: ({ inline, children }) => inline
          ? <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px] text-blue-700 font-mono">{children}</code>
          : <code className="block bg-gray-50 border border-gray-200 rounded-md p-3 my-2 overflow-x-auto text-[12px] text-gray-800 font-mono">{children}</code>,
        pre: ({ children }) => <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 my-2 overflow-x-auto text-[12px] font-mono whitespace-pre">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 pl-3 italic text-gray-600 my-2">{children}</blockquote>,
        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 underline">{children}</a>,
        hr: () => <hr className="my-3 border-gray-200" />,
        table: ({ children }) => <table className="my-2 border-collapse w-full">{children}</table>,
        th: ({ children }) => <th className="border border-gray-200 px-2 py-1 text-left text-gray-900 font-semibold text-xs bg-gray-50">{cite(children)}</th>,
        td: ({ children }) => <td className="border border-gray-200 px-2 py-1 text-gray-800 text-xs">{cite(children)}</td>,
      }}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function MessageText({ role, content, citations, onCitationClick }) {
  if (role === 'user') return <PlainMessage content={content} />;
  return <MarkdownMessage content={content} citations={citations} onCitationClick={onCitationClick} />;
}

function CitationPanel({ citation, onClose }) {
  if (!citation) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-blue-600 text-xs font-semibold uppercase tracking-wide mb-1">Source [{citation.number}]</p>
            <p className="text-gray-900 font-semibold">{citation.source}</p>
            <p className="text-gray-500 text-sm">Page {citation.page}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-500">
          <p className="text-gray-700 text-sm leading-relaxed italic">"{citation.excerpt}"</p>
        </div>
        <p className="text-gray-400 text-xs mt-3">Exact passage from your course materials</p>
      </div>
    </div>
  );
}

function LoginScreen({ onSelect }) {
  return (
    <div className="min-h-screen w-screen bg-white flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <GraduationCap size={18} className="text-white" />
          </div>
          <span className="text-gray-900 font-semibold text-lg tracking-tight">ScholrAI</span>
        </div>
        <div className="text-xs text-gray-400 font-medium">Powered by Google Cloud · Vertex AI</div>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Now available for universities
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
              Learning grounded in<br />
              <span className="text-blue-600">your course materials</span>
            </h1>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              AI-powered answers tied directly to what your professor uploaded — not the open internet.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto mb-12">
            <button onClick={() => onSelect('student')} className="group text-left p-7 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50 transition-all duration-200 bg-white">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5 group-hover:bg-blue-100 transition-colors">
                <Users size={22} className="text-blue-600" />
              </div>
              <h2 className="text-gray-900 font-semibold text-lg mb-1">Student Portal</h2>
              <p className="text-gray-500 text-sm mb-5">Ask questions about your course materials and get cited, trustworthy answers.</p>
              <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                Enter as student <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
            <button onClick={() => onSelect('teacher')} className="group text-left p-7 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-200 bg-white">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-5 group-hover:bg-indigo-100 transition-colors">
                <BookOpen size={22} className="text-indigo-600" />
              </div>
              <h2 className="text-gray-900 font-semibold text-lg mb-1">Instructor Portal</h2>
              <p className="text-gray-500 text-sm mb-5">Upload your course materials and give every student a grounded AI tutor.</p>
              <div className="flex items-center gap-1 text-indigo-600 text-sm font-medium">
                Enter as instructor <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
          <div className="flex items-center justify-center gap-8 text-gray-400 text-xs">
            <span>🔒 FERPA aligned</span>
            <span>✓ Answers from your materials only</span>
            <span>⚡ Powered by Vertex AI</span>
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

  const onUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);
    try {
      const res = await fetch(`${API}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setMods(prev => [{ id: data.fileName, name: data.fileName, chars: data.charCount, chunks: data.chunkCount, uploaded: new Date() }, ...prev]);
        showToast(`"${file.name}" uploaded and indexed successfully.`);
      } else {
        showToast(data.error || 'Upload failed.', 'error');
      }
    } catch {
      showToast('Server unreachable. Is it running?', 'error');
    }
    setUploading(false);
    e.target.value = '';
  };

  const onDelete = async (mod) => {
    setMods(prev => prev.filter(m => m.id !== mod.id));
    await fetch(`${API}/document/${encodeURIComponent(mod.name)}`, { method: 'DELETE' });
    showToast(`"${mod.name}" removed.`);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 fixed inset-0">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <GraduationCap size={16} className="text-white" />
            </div>
            <span className="text-gray-900 font-semibold text-base">ScholrAI</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
            <BookOpen size={14} className="text-indigo-600" />
            <span className="text-indigo-700 text-xs font-semibold">Instructor Portal</span>
          </div>
        </div>
        <nav className="p-4 flex-1 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
            <FileText size={16} />
            Course Materials
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 text-sm cursor-not-allowed">
            <BarChart2 size={16} />
            Student Insights
            <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Soon</span>
          </div>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 mb-3">Powered by Google Vertex AI</div>
          <button onClick={onExit} className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors text-sm font-medium w-full">
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-8 flex-shrink-0">
          <div>
            <h2 className="text-gray-900 text-base font-semibold">Course Materials</h2>
            <p className="text-gray-400 text-xs">{mods.length} document{mods.length !== 1 ? 's' : ''} indexed · available to all students</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="file" ref={fileRef} onChange={onUpload} className="hidden" accept=".pdf" />
            <button onClick={() => fileRef.current.click()} disabled={uploading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              <UploadCloud size={16} />
              {uploading ? 'Indexing...' : 'Upload PDF'}
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {mods.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                <UploadCloud size={28} className="text-blue-400" />
              </div>
              <h3 className="text-gray-700 text-lg font-semibold mb-2">No materials uploaded yet</h3>
              <p className="text-gray-400 text-sm mb-6">Upload your syllabus, lecture notes, or readings. Students can start asking questions immediately after indexing.</p>
              <button onClick={() => fileRef.current.click()} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
                <UploadCloud size={16} /> Upload your first PDF
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mods.map(m => (
                <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md hover:border-gray-200 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={20} className="text-blue-600" />
                    </div>
                    <button onClick={() => onDelete(m)} className="text-gray-300 hover:text-red-400 transition-colors p-1">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <p className="text-gray-900 text-sm font-medium truncate mb-1">{m.name}</p>
                  <p className="text-gray-400 text-xs mb-3">{m.chunks || 0} sections indexed · {m.chars ? Math.round(m.chars/1000) : 0}k characters</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    <span className="text-xs text-green-600 font-medium">Live for students</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3 rounded-xl text-white text-sm font-medium shadow-xl z-50 ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <ShieldCheck size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function StudentView({ onExit }) {
  const [chats, setChats] = useState([{ id: 1, title: 'New Chat', messages: [] }]);
  const [chatId, setChatId] = useState(1);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "What are the main topics in this course?",
    "Summarize the key concepts from the materials",
    "What should I focus on for the exam?",
  ]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const active = chats.find(c => c.id === chatId) || chats[0];

  useEffect(() => {
    fetch(`${API}/documents`)
      .then(res => res.json())
      .then(data => setDocuments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (documents.length > 0) {
      fetch(`${API}/suggested-questions`)
        .then(r => r.json())
        .then(data => { if (data.questions?.length) setSuggestedQuestions(data.questions); })
        .catch(() => {});
    }
  }, [documents]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active.messages, isTyping]);

  const createNewChat = () => {
    const newChat = { id: Date.now(), title: 'New Chat', messages: [] };
    setChats(prev => [...prev, newChat]);
    setChatId(newChat.id);
  };

  const generateTitle = (message) => {
    const words = message.trim().split(/\s+/).slice(0, 5).join(' ');
    return words.length < message.trim().length ? words + '...' : words;
  };

  const onSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = { role: 'user', content: input, citations: [], ts: Date.now() };
    const isFirstMessage = active.messages.length === 0;
    const newTitle = isFirstMessage ? generateTitle(input) : null;
    setChats(prev => prev.map(c => c.id === chatId
      ? { ...c, messages: [...c.messages, userMsg], ...(newTitle ? { title: newTitle } : {}) }
      : c
    ));
    setInput('');
    setIsTyping(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();
      const aiMsg = { role: 'assistant', content: data.answer || data.error || 'No response.', citations: data.citations || [], ts: Date.now() };
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, aiMsg] } : c));
    } catch {
      const errMsg = { role: 'assistant', content: 'Server unreachable. Is it running?', citations: [], ts: Date.now() };
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, errMsg] } : c));
    }
    setIsTyping(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 fixed inset-0">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <GraduationCap size={16} className="text-white" />
            </div>
            <span className="text-gray-900 font-semibold text-base">ScholrAI</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
            <Users size={14} className="text-green-600" />
            <span className="text-green-700 text-xs font-semibold">Student Portal</span>
          </div>
        </div>
        <div className="px-4 pt-4">
          <button onClick={createNewChat} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors">
            <Plus size={15} /> New conversation
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          <p className="text-xs text-gray-400 font-medium px-2 mb-2 uppercase tracking-wide">Recent</p>
          {chats.map(c => (
            <button key={c.id} onClick={() => setChatId(c.id)}
              className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${c.id === chatId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <MessageSquare size={14} className="flex-shrink-0" />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="text-xs text-gray-400 mb-3">Answers grounded in your course materials only</div>
          <button onClick={onExit} className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors text-sm font-medium">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-8 flex-shrink-0">
          <div>
            <h2 className="text-gray-900 text-base font-semibold">{active.title}</h2>
            <p className="text-gray-400 text-xs">Answers cited from your professor's uploaded materials</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100 text-green-700 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            AI Active
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">
          {active.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 pb-16">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-5">
                <Search size={28} className="text-blue-400" />
              </div>
              {documents.length === 0 ? (
                <>
                  <h3 className="text-gray-800 font-semibold text-lg mb-2">No materials uploaded yet</h3>
                  <p className="text-gray-400 text-sm text-center max-w-xs">Your instructor hasn't uploaded any course materials yet. Check back once they've added content.</p>
                </>
              ) : (
                <>
                  <h3 className="text-gray-800 font-semibold text-lg mb-2">Ask anything about your course</h3>
                  <p className="text-gray-400 text-sm text-center max-w-xs mb-8">Every answer is grounded in your professor's uploaded materials with citations so you know exactly where information comes from.</p>
                  <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                    {suggestedQuestions.map((q, i) => (
                      <button key={i} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                        className="text-left px-4 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all">
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {active.messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'items-start gap-3'}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles size={14} className="text-white" />
                </div>
              )}
              <div className={`px-4 py-3 rounded-2xl text-sm max-w-xl shadow-sm ${m.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm'}`}>
                <MessageText role={m.role} content={m.content} citations={[]} onCitationClick={setSelectedCitation} />
                {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                    <p className="text-xs text-gray-400 font-medium">Sources from your course materials</p>
                    {m.citations.map(c => (
                      <button key={c.number} onClick={() => setSelectedCitation(c)}
                        className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 transition-colors w-full text-left">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 font-bold text-[10px] flex-shrink-0">{c.number}</span>
                        {c.source} · p.{c.page}
                      </button>
                    ))}
                  </div>
                )}
                <span className="block text-xs mt-2 opacity-40">{formatTime(m.ts)}</span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-sm text-gray-400">Searching your course materials...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-8 py-4 border-t border-gray-100 bg-white flex-shrink-0">
          <div className="flex gap-3 items-center max-w-3xl mx-auto">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onSend()}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-gray-800 text-sm outline-none focus:border-blue-400 focus:bg-white transition-all placeholder-gray-400"
              placeholder="Ask about your course material..."
            />
            <button onClick={onSend} disabled={!input.trim() || isTyping}
              className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center flex-shrink-0 transition-colors shadow-sm">
              <Send size={18} />
            </button>
          </div>
          <p className="text-center text-xs text-gray-300 mt-2">Grounded in your professor's materials · Powered by Vertex AI</p>
        </div>
      </main>

      <CitationPanel citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  if (!role) return <LoginScreen onSelect={setRole} />;
  if (role === 'teacher') return <TeacherView onExit={() => setRole(null)} />;
  return <StudentView onExit={() => setRole(null)} />;
}
