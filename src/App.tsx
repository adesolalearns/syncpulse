import { useState, useEffect, useRef, useMemo } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import {
  Hash, MessageSquare, Send, Paperclip, FileText, Image as ImageIcon, Search,
  Sun, Moon, CheckCircle2, Clock, Users, FileCheck, Bell, Plus, X,
  LayoutDashboard, Folder, MoreVertical, MessageCircle, ChevronRight,
  TrendingUp, Award, Download, Eye, UserCheck
} from 'lucide-react';

// --- TYPES ---
type Theme = 'light' | 'dark';
type Tab = 'dashboard' | 'chat' | 'files';
type FileKind = 'pdf' | 'doc' | 'image';

interface User { id: string; name: string; role: string; status: 'online' | 'away' | 'offline'; avatar: string }
interface Channel { id: string; name: string; description: string; icon: string; unread: number; isReportChannel?: boolean }
interface Attachment { name: string; size: string; type: FileKind; url: string }
interface ReportData { completed: string; blockers: string; nextSteps: string }
interface Message {
  id: string; userId: string; text?: string; timestamp: string;
  reactions: Record<string, number>; reacted?: string[];
  attachments?: Attachment[]; threadsCount: number;
  isReport?: boolean; reportData?: ReportData;
}
interface ThreadReply { id: string; userId: string; text: string; timestamp: string }
interface SharedFile { id: string; name: string; size: string; type: FileKind; channel: string; uploader: string; date: string; url?: string }

// --- INITIAL MOCK DATA ---
const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Sarah Jenkins', role: 'Product Manager', status: 'online', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { id: 'u2', name: 'Alex Rivera', role: 'Senior Lead Dev', status: 'online', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { id: 'u3', name: 'Elena Rostova', role: 'UI/UX Designer', status: 'away', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { id: 'u4', name: 'Marcus Chen', role: 'Backend Engineer', status: 'offline', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
  { id: 'u5', name: 'David K.', role: 'QA Lead', status: 'online', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150' }
];

const INITIAL_CHANNELS: Channel[] = [
  { id: 'c1', name: 'general-announcements', description: 'Company-wide announcements and updates', icon: 'Hash', unread: 2 },
  { id: 'c2', name: 'daily-reports', description: 'Submit and view daily team progress updates', icon: 'FileText', unread: 0, isReportChannel: true },
  { id: 'c3', name: 'team-chat', description: 'Casual team banter and daily check-ins', icon: 'Hash', unread: 5 },
  { id: 'c4', name: 'project-updates', description: 'Sprint tasks, milestones, and release notes', icon: 'Hash', unread: 0 }
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  'c1': [
    {
      id: 'm1',
      userId: 'u1',
      text: 'Good morning everyone! Please remember to submit your end-of-week summary reports before 5 PM today.',
      timestamp: '09:00 AM',
      reactions: { '👍': 4, '❤️': 2 },
      attachments: [],
      threadsCount: 3
    },
    {
      id: 'm2',
      userId: 'u2',
      text: 'The Q3 Roadmap revision document has been uploaded for everyone to review.',
      timestamp: '10:15 AM',
      reactions: { '🙌': 3 },
      attachments: [
        { name: 'Q3_Roadmap_Final_v2.pdf', size: '2.4 MB', type: 'pdf', url: '#' }
      ],
      threadsCount: 0
    }
  ],
  'c2': [
    {
      id: 'm3',
      userId: 'u2',
      timestamp: '08:45 AM',
      isReport: true,
      reportData: {
        completed: 'Finished refactoring Auth API module & resolved database deadlock issue.',
        blockers: 'Waiting on design approval for user profile modal.',
        nextSteps: 'Implement OAuth token refresh mechanism & write unit tests.'
      },
      reactions: { '👏': 3 },
      threadsCount: 1
    },
    {
      id: 'm4',
      userId: 'u3',
      timestamp: '09:20 AM',
      isReport: true,
      reportData: {
        completed: 'Completed mobile wireframes for Dashboard view. Conducted user interview session.',
        blockers: 'None at the moment.',
        nextSteps: 'Create interactive Figma prototype for mobile navigation.'
      },
      reactions: { '🔥': 2 },
      threadsCount: 0
    }
  ],
  'c3': [
    {
      id: 'm5',
      userId: 'u3',
      text: 'Hey team! Anyone up for a quick virtual coffee break around 2 PM?',
      timestamp: '11:00 AM',
      reactions: { '☕': 3, '👍': 2 },
      attachments: [],
      threadsCount: 2
    }
  ],
  'c4': [
    {
      id: 'm6',
      userId: 'u4',
      text: 'DB Migration completed successfully on Staging environment. Ready for testing.',
      timestamp: '08:30 AM',
      reactions: { '✅': 4 },
      attachments: [
        { name: 'migration_log_v1.4.txt', size: '45 KB', type: 'doc', url: '#' }
      ],
      threadsCount: 0
    }
  ]
};

const MOCK_FILES: SharedFile[] = [
  { id: 'f1', name: 'Q3_Roadmap_Final_v2.pdf', size: '2.4 MB', type: 'pdf', channel: '#general-announcements', uploader: 'Alex Rivera', date: 'Today, 10:15 AM' },
  { id: 'f2', name: 'Sprint_3_Task_Overview.docx', size: '1.1 MB', type: 'doc', channel: '#project-updates', uploader: 'Sarah Jenkins', date: 'Yesterday' },
  { id: 'f3', name: 'Mobile_Wireframe_v1.png', size: '4.8 MB', type: 'image', channel: '#daily-reports', uploader: 'Elena Rostova', date: 'Yesterday' },
  { id: 'f4', name: 'API_Documentation_2026.pdf', size: '3.6 MB', type: 'pdf', channel: '#project-updates', uploader: 'Marcus Chen', date: 'Oct 28, 2026' }
];

// --- HELPERS ---
const STORAGE_PREFIX = 'teamhub:v1:';

function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    // blob: URLs die when the page closes, so neutralise any saved from an earlier session
    return raw ? (JSON.parse(raw.replace(/"blob:[^"]*"/g, '"#"')) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveState(key: string, value: unknown) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable: the app still works, it just won't persist */
  }
}

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const getFileType = (file: File): FileKind =>
  file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'doc';

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function App() {
  // Theme & Active Tab State
  const [theme, setTheme] = useState<Theme>(() => loadState<Theme>('theme', 'light'));
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [activeChannelId, setActiveChannelId] = useState('c1');
  const [activeDMUserId, setActiveDMUserId] = useState<string | null>(null);

  // Data States (messages, threads and files persist in this browser)
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => loadState('messages', INITIAL_MESSAGES));
  const [files, setFiles] = useState<SharedFile[]>(() => loadState('files', MOCK_FILES));
  const [threads, setThreads] = useState<Record<string, ThreadReply[]>>(() => loadState('threads', {}));
  const [users] = useState<User[]>(INITIAL_USERS);
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);

  // UI States
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeThreadMessage, setActiveThreadMessage] = useState<Message | null>(null);
  const [threadInput, setThreadInput] = useState('');

  // Daily Report Form State
  const [reportForm, setReportForm] = useState({ completed: '', blockers: '', nextSteps: '' });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Current logged in user (simulated: replace with real auth, see deployment guide)
  const currentUser = users[0];

  useEffect(() => { saveState('messages', messages); }, [messages]);
  useEffect(() => { saveState('threads', threads); }, [threads]);
  useEffect(() => { saveState('files', files); }, [files]);
  useEffect(() => { saveState('theme', theme); }, [theme]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId, activeDMUserId]);

  // Escape closes the report modal / thread panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsReportModalOpen(false); setActiveThreadMessage(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Channel/DM Resolution
  const isDirectMessage = Boolean(activeDMUserId);
  const currentChannel = channels.find(c => c.id === activeChannelId);
  const currentDMUser = users.find(u => u.id === activeDMUserId);
  const activeChatKey = isDirectMessage ? `dm_${activeDMUserId}` : activeChannelId;
  const currentMessages = messages[activeChatKey] || [];

  // Search (filters the open conversation and the file library)
  const query = searchQuery.trim().toLowerCase();
  const visibleMessages = useMemo(() => {
    if (!query) return currentMessages;
    return currentMessages.filter(m =>
      [m.text, m.reportData?.completed, m.reportData?.blockers, m.reportData?.nextSteps, ...(m.attachments || []).map(a => a.name)]
        .some(s => s?.toLowerCase().includes(query))
    );
  }, [currentMessages, query]);
  const visibleFiles = useMemo(
    () => (query ? files.filter(f => `${f.name} ${f.uploader} ${f.channel}`.toLowerCase().includes(query)) : files),
    [files, query]
  );
  const unreadAnnouncements = channels.find(c => c.id === 'c1')?.unread ?? 0;

  // Opening a channel clears its unread badge; switching chats closes the thread panel
  useEffect(() => {
    if (activeTab !== 'chat' || activeDMUserId) return;
    setChannels(prev => prev.map(c => (c.id === activeChannelId && c.unread > 0 ? { ...c, unread: 0 } : c)));
  }, [activeTab, activeChannelId, activeDMUserId]);
  useEffect(() => { setActiveThreadMessage(null); }, [activeChatKey]);

  // Message Actions
  const handleSendMessage = (e?: FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() && !selectedFile) return;

    const attachment: Attachment | null = selectedFile
      ? { name: selectedFile.name, size: formatSize(selectedFile.size), type: getFileType(selectedFile), url: URL.createObjectURL(selectedFile) }
      : null;

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      userId: currentUser.id,
      text: messageText.trim(),
      timestamp: nowTime(),
      reactions: {},
      attachments: attachment ? [attachment] : [],
      threadsCount: 0
    };

    if (attachment) {
      setFiles(prev => [{
        id: `f_${Date.now()}`,
        ...attachment,
        channel: isDirectMessage ? `@${currentDMUser?.name}` : `#${currentChannel?.name}`,
        uploader: currentUser.name,
        date: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      }, ...prev]);
    }

    setMessages(prev => ({ ...prev, [activeChatKey]: [...(prev[activeChatKey] || []), newMsg] }));
    setMessageText('');
    setSelectedFile(null);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
    e.target.value = ''; // allow re-selecting the same file
  };

  // Click a reaction to add yours; click again to take it back
  const handleAddReaction = (msgId: string, emoji: string) => {
    setMessages(prev => ({
      ...prev,
      [activeChatKey]: (prev[activeChatKey] || []).map(msg => {
        if (msg.id !== msgId) return msg;
        const mine = (msg.reacted || []).includes(emoji);
        const reactions = { ...msg.reactions };
        const next = (reactions[emoji] || 0) + (mine ? -1 : 1);
        if (next <= 0) delete reactions[emoji]; else reactions[emoji] = next;
        const reacted = mine ? (msg.reacted || []).filter(r => r !== emoji) : [...(msg.reacted || []), emoji];
        return { ...msg, reactions, reacted };
      })
    }));
  };

  // File preview / download (real for files uploaded this session; demo files explain themselves)
  const openFile = (url?: string) => {
    if (url && url !== '#') window.open(url, '_blank', 'noopener');
    else window.alert('This is demo data, or the file was uploaded in an earlier session. Add file storage (see the deployment guide) to keep uploads permanently.');
  };
  const downloadFile = (name: string, url?: string) => {
    if (!url || url === '#') return openFile(url);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
  };

  // Submit Daily Report
  const handleSubmitReport = (e: FormEvent) => {
    e.preventDefault();
    if (!reportForm.completed.trim()) return;

    const reportMsg: Message = {
      id: `msg_rep_${Date.now()}`,
      userId: currentUser.id,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isReport: true,
      reportData: {
        completed: reportForm.completed,
        blockers: reportForm.blockers || 'None reported.',
        nextSteps: reportForm.nextSteps || 'Continuing current priorities.'
      },
      reactions: { '👏': 1 },
      threadsCount: 0
    };

    setMessages(prev => ({
      ...prev,
      'c2': [...(prev['c2'] || []), reportMsg]
    }));

    // Reset Form
    setReportForm({ completed: '', blockers: '', nextSteps: '' });
    setIsReportModalOpen(false);

    // Switch to daily reports channel if not there
    setActiveTab('chat');
    setActiveChannelId('c2');
    setActiveDMUserId(null);
  };

  // Send Thread Reply
  const handleSendThreadReply = (e: FormEvent) => {
    e.preventDefault();
    if (!threadInput.trim() || !activeThreadMessage) return;

    const threadId = activeThreadMessage.id;
    const newReply: ThreadReply = {
      id: `th_${Date.now()}`,
      userId: currentUser.id,
      text: threadInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setThreads(prev => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), newReply]
    }));

    // Update main message thread count
    setMessages(prev => {
      const channelMsgs = prev[activeChatKey] || [];
      const updated = channelMsgs.map(msg => {
        if (msg.id === threadId) {
          return { ...msg, threadsCount: (msg.threadsCount || 0) + 1 };
        }
        return msg;
      });
      return { ...prev, [activeChatKey]: updated };
    });

    setThreadInput('');
  };

  // Quick stats calculation
  const totalReportsSubmitted = (messages['c2'] || []).filter(m => m.isReport).length;
  const activeMembersCount = users.filter(u => u.status === 'online').length;

  return (
    <div className={`h-screen w-screen flex flex-col font-sans transition-colors duration-200 ${theme === 'dark' ? 'dark ' : ''}${
      theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* --- TOP APP HEADER --- */}
      <header className={`h-14 border-b px-4 flex items-center justify-between shrink-0 select-none ${
        theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center me-1 justify-center text-white font-bold shadow-md shadow-indigo-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight flex items-center gap-2">
              SyncPulse <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-semibold border border-indigo-500/20">Workspace</span>
            </h1>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-6 hidden md:block">
          <div className={`relative flex items-center rounded-lg border px-3 py-1.5 text-sm ${
            theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <Search className="w-4 h-4 text-slate-400 me-2 shrink-0" />
            <input 
              type="text" 
              placeholder="Search this channel or the file library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full placeholder-slate-400 text-xs sm:text-sm"
            />
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Daily Report</span>
          </button>

          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-lg border transition-colors ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
            }`}
            title="Toggle Light/Dark Theme" aria-label="Toggle light or dark theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile Thumbnail */}
          <div className="flex items-center space-x-2 border-l pl-3 border-slate-300 dark:border-slate-700">
            <div className="relative">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN APP WORKSPACE --- */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* --- LEFT SIDEBAR NAVIGATION --- */}
        <aside className={`w-64 flex-shrink-0 flex flex-col border-r ${
          theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 text-slate-300 border-slate-800'
        }`}>
          {/* Main Navigation Views */}
          <div className="p-3 border-b border-slate-800/60 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>General Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'files' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Shared File Library</span>
            </button>
          </div>

          {/* Scrollable Channels & DMs */}
          <div className="flex-1 overflow-y-auto p-3 space-y-6">
            
            {/* CHANNELS SECTION */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">
                <span>Channels</span>
                <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">{channels.length}</span>
              </div>
              <div className="space-y-0.5">
                {channels.map((ch) => {
                  const isActive = activeTab === 'chat' && activeChannelId === ch.id && !activeDMUserId;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setActiveTab('chat');
                        setActiveChannelId(ch.id);
                        setActiveDMUserId(null);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                        isActive 
                          ? 'bg-indigo-600/20 text-indigo-400 font-semibold border-l-2 border-indigo-500' 
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {ch.isReportChannel ? (
                          <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{ch.name}</span>
                      </div>
                      {ch.unread > 0 && (
                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                          {ch.unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DIRECT MESSAGES SECTION */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 mb-2">
                <span>Direct Messages</span>
                <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">{users.length - 1}</span>
              </div>
              <div className="space-y-0.5">
                {users.filter(u => u.id !== currentUser.id).map((u) => {
                  const isActive = activeTab === 'chat' && activeDMUserId === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        setActiveTab('chat');
                        setActiveDMUserId(u.id);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                        isActive 
                          ? 'bg-indigo-600/20 text-indigo-400 font-semibold border-l-2 border-indigo-500' 
                          : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="relative shrink-0">
                          <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
                            u.status === 'online' ? 'bg-emerald-500' : u.status === 'away' ? 'bg-amber-500' : 'bg-slate-500'
                          }`}></span>
                        </div>
                        <span className="truncate">{u.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Quick Network Status */}
          <div className="p-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Demo workspace
            </span>
            <span className="text-[10px] text-slate-500">saved in this browser</span>
          </div>
        </aside>

        {/* --- MAIN CONTENT AREA --- */}
        <main className="flex-1 flex flex-col min-w-0 bg-transparent overflow-hidden">
          
          {/* VIEW 1: DASHBOARD OVERVIEW PANEL */}
          {activeTab === 'dashboard' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Dashboard Banner */}
              <div className={`p-6 rounded-2xl border bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-indigo-950/60 via-slate-900 to-slate-900 border-indigo-900/40' 
                  : 'from-indigo-50/80 via-white to-white border-indigo-100'
              }`}>
                <div className="max-w-3xl">
                  <h2 className="text-2xl font-bold tracking-tight mb-2">
                    Welcome back, {currentUser.name} 👋
                  </h2>
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    Here is what’s happening across your team today. You have <span className="font-semibold text-indigo-500">{unreadAnnouncements} unread {unreadAnnouncements === 1 ? 'announcement' : 'announcements'}</span> and <span className="font-semibold text-emerald-500">{totalReportsSubmitted} daily reports</span> submitted.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button 
                      onClick={() => setIsReportModalOpen(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
                    >
                      <FileCheck className="w-4 h-4" /> Submit Today's Report
                    </button>
                    <button 
                      onClick={() => { setActiveTab('chat'); setActiveChannelId('c1'); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 ${
                        theme === 'dark' ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Bell className="w-4 h-4" /> View Announcements
                    </button>
                  </div>
                </div>
              </div>

              {/* STAT CARDS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">Active Team</p>
                    <p className="text-2xl font-black mt-1">{activeMembersCount} / {users.length}</p>
                    <span className="text-[11px] text-emerald-500 flex items-center gap-1 mt-1">
                      <UserCheck className="w-3 h-3" /> Online right now
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">Reports Submitted</p>
                    <p className="text-2xl font-black mt-1">{totalReportsSubmitted}</p>
                    <span className="text-[11px] text-indigo-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> Updated today
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                    <FileCheck className="w-6 h-6" />
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">Shared Documents</p>
                    <p className="text-2xl font-black mt-1">{files.length}</p>
                    <span className="text-[11px] text-amber-500 flex items-center gap-1 mt-1">
                      <Folder className="w-3 h-3" /> PDF, DOCX, Images
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">Sprint Progress</p>
                    <p className="text-2xl font-black mt-1">84%</p>
                    <span className="text-[11px] text-emerald-500 flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3" /> On Track
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                    <Award className="w-6 h-6" />
                  </div>
                </div>

              </div>

              {/* TWO COLUMN SUMMARY */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* RECENT DAILY REPORTS SUMMARY */}
                <div className={`p-5 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-emerald-500" /> Recent Daily Reports
                    </h3>
                    <button 
                      onClick={() => { setActiveTab('chat'); setActiveChannelId('c2'); }}
                      className="text-xs text-indigo-500 hover:underline flex items-center gap-1 font-medium"
                    >
                      View channel <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(messages['c2'] || []).filter(m => m.isReport).map((report) => {
                      const author = users.find(u => u.id === report.userId) || currentUser;
                      return (
                        <div key={report.id} className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                          theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between font-semibold">
                            <span className="flex items-center gap-2 text-indigo-400">
                              <img src={author.avatar} alt="" className="w-4 h-4 rounded-full" />
                              {author.name}
                            </span>
                            <span className="text-slate-400 font-normal">{report.timestamp}</span>
                          </div>
                          <p className="line-clamp-2 text-slate-300">
                            <strong className="text-emerald-400">Done:</strong> {report.reportData.completed}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RECENT SHARED DOCUMENTS SUMMARY */}
                <div className={`p-5 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base flex items-center gap-2">
                      <Folder className="w-5 h-5 text-amber-500" /> Recent Team Attachments
                    </h3>
                    <button 
                      onClick={() => setActiveTab('files')}
                      className="text-xs text-indigo-500 hover:underline flex items-center gap-1 font-medium"
                    >
                      All files <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {files.slice(0, 4).map((f) => (
                      <div key={f.id} className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                        theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center space-x-3 truncate me-2">
                          {f.type === 'pdf' ? (
                            <FileText className="w-6 h-6 text-red-500 shrink-0" />
                          ) : f.type === 'image' ? (
                            <ImageIcon className="w-6 h-6 text-blue-500 shrink-0" />
                          ) : (
                            <FileText className="w-6 h-6 text-indigo-500 shrink-0" />
                          )}
                          <div className="truncate">
                            <p className="font-medium truncate">{f.name}</p>
                            <p className="text-[11px] text-slate-400">{f.size} • Uploaded by {f.uploader}</p>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono shrink-0">
                          {f.channel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* VIEW 2: FILE LIBRARY TAB */}
          {activeTab === 'files' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Shared Team Files</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Central repository of documents, specs, and report attachments uploaded across channels.
                  </p>
                </div>
              </div>

              {/* FILES TABLE */}
              <div className={`rounded-xl border overflow-hidden ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-slate-800 bg-slate-900/50 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      <th className="p-3.5 font-semibold">File Name</th>
                      <th className="p-3.5 font-semibold">Channel</th>
                      <th className="p-3.5 font-semibold">Uploader</th>
                      <th className="p-3.5 font-semibold">Date</th>
                      <th className="p-3.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {visibleFiles.map((file) => (
                      <tr key={file.id} className={`hover:bg-slate-500/5 transition-colors`}>
                        <td className="p-3.5 flex items-center space-x-3">
                          {file.type === 'pdf' ? (
                            <FileText className="w-5 h-5 text-red-500 shrink-0" />
                          ) : file.type === 'image' ? (
                            <ImageIcon className="w-5 h-5 text-blue-500 shrink-0" />
                          ) : (
                            <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                          )}
                          <div>
                            <p className="font-semibold text-indigo-400">{file.name}</p>
                            <p className="text-[11px] text-slate-400">{file.size}</p>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-400">{file.channel}</td>
                        <td className="p-3.5 font-medium">{file.uploader}</td>
                        <td className="p-3.5 text-slate-400">{file.date}</td>
                        <td className="p-3.5 text-right space-x-2">
                          <button className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white inline-flex" title="Preview" onClick={() => openFile(file.url)}>
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white inline-flex" title="Download" onClick={() => downloadFile(file.name, file.url)}>
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: ACTIVE CHAT & MESSAGING INTERFACE */}
          {activeTab === 'chat' && (
            <div className="flex-1 flex overflow-hidden">
              
              {/* CHAT MAIN COLUMN */}
              <div className="flex-1 flex flex-col min-w-0 h-full">
                
                {/* ACTIVE CHANNEL / DM HEADER */}
                <header className={`h-14 border-b px-6 flex items-center justify-between shrink-0 ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center space-x-3 truncate">
                    {isDirectMessage ? (
                      <div className="flex items-center space-x-2.5">
                        <img src={currentDMUser?.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <h2 className="font-bold text-sm tracking-tight flex items-center gap-2">
                            {currentDMUser?.name}
                            <span className={`w-2 h-2 rounded-full ${currentDMUser?.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          </h2>
                          <p className="text-[11px] text-slate-400">{currentDMUser?.role}</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h2 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                          {currentChannel?.isReportChannel ? (
                            <FileText className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Hash className="w-4 h-4 text-indigo-500" />
                          )}
                          {currentChannel?.name}
                        </h2>
                        <p className="text-[11px] text-slate-400 truncate">{currentChannel?.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Channel Header Actions */}
                  <div className="flex items-center space-x-2">
                    {currentChannel?.isReportChannel && (
                      <button 
                        onClick={() => setIsReportModalOpen(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Submit Report
                      </button>
                    )}
                    <button className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </header>

                {/* MESSAGES SCROLL AREA */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {visibleMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                      <MessageSquare className="w-12 h-12 opacity-30 text-indigo-500" />
                      <div>
                        <p className="font-semibold text-base text-slate-300">No messages here yet</p>
                        <p className="text-xs max-w-sm mt-1">Start the discussion by typing a message or uploading a document below.</p>
                      </div>
                    </div>
                  ) : (
                    visibleMessages.map((msg) => {
                      const author = users.find(u => u.id === msg.userId) || currentUser;

                      return (
                        <div key={msg.id} className="group relative flex space-x-3 hover:bg-slate-500/5 p-2 rounded-xl transition-colors">
                          <img src={author.avatar} alt={author.name} className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5" />
                          
                          <div className="flex-1 min-w-0">
                            {/* Author & Timestamp */}
                            <div className="flex items-baseline space-x-2">
                              <span className="font-semibold text-sm">{author.name}</span>
                              <span className="text-[11px] text-slate-400">{msg.timestamp}</span>
                            </div>

                            {/* STANDARD TEXT MESSAGE */}
                            {msg.text && (
                              <p className={`text-sm mt-1 leading-relaxed ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                                {msg.text}
                              </p>
                            )}

                            {/* SPECIAL STRUCTURED DAILY REPORT BLOCK */}
                            {msg.isReport && msg.reportData && (
                              <div className={`mt-2 p-4 rounded-xl border space-y-3 ${
                                theme === 'dark' 
                                  ? 'bg-slate-950/80 border-emerald-900/40 text-slate-200' 
                                  : 'bg-emerald-50/40 border-emerald-200 text-slate-800'
                              }`}>
                                <div className="flex items-center justify-between border-b pb-2 border-emerald-500/20">
                                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" /> Daily Progress Summary
                                  </span>
                                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-mono font-medium">Submitted</span>
                                </div>

                                <div className="space-y-2 text-xs sm:text-sm">
                                  <div>
                                    <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wide">1. Tasks Completed Today</p>
                                    <p className="mt-0.5 leading-relaxed">{msg.reportData.completed}</p>
                                  </div>

                                  <div>
                                    <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wide">2. Blockers / Challenges</p>
                                    <p className="mt-0.5 text-amber-500 font-medium leading-relaxed">{msg.reportData.blockers}</p>
                                  </div>

                                  <div>
                                    <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wide">3. Planned Next Steps</p>
                                    <p className="mt-0.5 leading-relaxed">{msg.reportData.nextSteps}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* FILE ATTACHMENTS PREVIEW */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {msg.attachments.map((att, idx) => (
                                  <div key={idx} className={`p-3 rounded-lg border max-w-md flex items-center justify-between text-xs ${
                                    theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                                  }`}>
                                    <div className="flex items-center space-x-2.5 truncate me-2">
                                      {att.type === 'pdf' ? (
                                        <FileText className="w-5 h-5 text-red-500 shrink-0" />
                                      ) : (
                                        <ImageIcon className="w-5 h-5 text-blue-500 shrink-0" />
                                      )}
                                      <div className="truncate">
                                        <p className="font-medium truncate">{att.name}</p>
                                        <p className="text-[10px] text-slate-400">{att.size}</p>
                                      </div>
                                    </div>
                                    <button className="p-1.5 hover:bg-slate-800 rounded text-indigo-400" title="Preview attachment" onClick={() => openFile(att.url)}>
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* REACTIONS & THREAD ACTIONS */}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {/* Reactions Pills */}
                              {msg.reactions && Object.entries(msg.reactions).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleAddReaction(msg.id, emoji)}
                                  className={`px-2 py-0.5 rounded-full border text-xs flex items-center space-x-1 ${msg.reacted?.includes(emoji) ? 'ring-1 ring-indigo-500 ' : ''}${
                                    theme === 'dark' 
                                      ? 'bg-slate-800 border-slate-700 hover:border-slate-600' 
                                      : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-bold text-[10px]">{count}</span>
                                </button>
                              ))}

                              {/* Quick Reaction Buttons (on hover) */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 border-l pl-2 border-slate-700">
                                <button onClick={() => handleAddReaction(msg.id, '👍')} className="p-1 text-slate-400 hover:text-amber-400">👍</button>
                                <button onClick={() => handleAddReaction(msg.id, '❤️')} className="p-1 text-slate-400 hover:text-rose-400">❤️</button>
                                <button onClick={() => handleAddReaction(msg.id, '🔥')} className="p-1 text-slate-400 hover:text-orange-400">🔥</button>
                                
                                <button 
                                  onClick={() => setActiveThreadMessage(msg)}
                                  className="text-xs text-indigo-400 font-medium px-2 py-0.5 rounded hover:bg-indigo-500/10 flex items-center gap-1"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> Reply in thread
                                </button>
                              </div>

                              {/* Thread count summary badge */}
                              {msg.threadsCount > 0 && (
                                <button 
                                  onClick={() => setActiveThreadMessage(msg)}
                                  className="text-[11px] font-semibold text-indigo-400 hover:underline flex items-center gap-1"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" /> {msg.threadsCount} replies
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* CHAT INPUT FORM */}
                <div className={`p-4 border-t ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  {/* Selected Attachment Bar */}
                  {selectedFile && (
                    <div className="mb-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-xs">
                      <span className="truncate flex items-center gap-2 text-indigo-400">
                        <Paperclip className="w-3.5 h-3.5" /> {selectedFile.name}
                      </span>
                      <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-200">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <label className="p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 cursor-pointer shrink-0 transition-colors">
                      <Paperclip className="w-4 h-4" />
                      <input type="file" onChange={handleFileSelect} className="hidden" />
                    </label>

                    <input 
                      type="text" 
                      placeholder={
                        isDirectMessage 
                          ? `Message @${currentDMUser?.name}...` 
                          : `Message #${currentChannel?.name}...`
                      }
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors ${
                        theme === 'dark' 
                          ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-indigo-500' 
                          : 'bg-slate-100 border-slate-200 text-slate-900 focus:border-indigo-500'
                      }`}
                    />

                    <button 
                      type="submit" 
                      disabled={!messageText.trim() && !selectedFile}
                      aria-label="Send message"
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium flex items-center justify-center transition-all shadow-md active:scale-95 shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>

              </div>

              {/* THREAD REPLIES SIDEBAR PANEL */}
              {activeThreadMessage && (
                <div className={`w-80 border-l flex flex-col shrink-0 ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-indigo-400" /> Thread Discussion
                    </h3>
                    <button onClick={() => setActiveThreadMessage(null)} className="p-1 text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Thread original message summary */}
                  <div className="p-4 border-b border-slate-800/60 bg-slate-900/30 text-xs">
                    <p className="font-semibold text-slate-300">Original Post</p>
                    <p className="mt-1 text-slate-400 line-clamp-3">{activeThreadMessage.text || 'Daily Report Submission'}</p>
                  </div>

                  {/* Thread Replies List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {(threads[activeThreadMessage.id] || []).length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">No replies yet. Be the first to reply!</p>
                    ) : (
                      (threads[activeThreadMessage.id] || []).map((reply) => {
                        const rAuthor = users.find(u => u.id === reply.userId) || currentUser;
                        return (
                          <div key={reply.id} className="flex space-x-2.5 text-xs">
                            <img src={rAuthor.avatar} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" />
                            <div className="flex-1 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                              <div className="flex justify-between font-semibold text-[11px] text-slate-300">
                                <span>{rAuthor.name}</span>
                                <span className="text-[10px] text-slate-500">{reply.timestamp}</span>
                              </div>
                              <p className="mt-1 text-slate-200">{reply.text}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Thread Reply Input */}
                  <form onSubmit={handleSendThreadReply} className="p-3 border-t border-slate-800 flex space-x-2">
                    <input 
                      type="text" 
                      placeholder="Reply to thread..."
                      value={threadInput}
                      onChange={(e) => setThreadInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold">
                      Send
                    </button>
                  </form>
                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* --- DAILY REPORT SUBMISSION MODAL --- */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
            theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-emerald-500/10">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base">Submit Structured Daily Report</h3>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  1. Tasks Completed Today *
                </label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Summarize the core tasks, commits, or milestones completed today..."
                  value={reportForm.completed}
                  onChange={(e) => setReportForm({ ...reportForm, completed: e.target.value })}
                  className={`w-full rounded-xl border p-3 outline-none transition-colors text-xs sm:text-sm ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  2. Blockers / Impediments (Optional)
                </label>
                <input 
                  type="text"
                  placeholder="Any dependencies or issues holding back progress?"
                  value={reportForm.blockers}
                  onChange={(e) => setReportForm({ ...reportForm, blockers: e.target.value })}
                  className={`w-full rounded-xl border p-2.5 outline-none transition-colors text-xs sm:text-sm ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  3. Next Steps & Objectives for Tomorrow
                </label>
                <input 
                  type="text"
                  placeholder="What will you focus on during the next work session?"
                  value={reportForm.nextSteps}
                  onChange={(e) => setReportForm({ ...reportForm, nextSteps: e.target.value })}
                  className={`w-full rounded-xl border p-2.5 outline-none transition-colors text-xs sm:text-sm ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100 focus:border-emerald-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800/60">
                <button 
                  type="button" 
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Submit to #daily-reports
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}