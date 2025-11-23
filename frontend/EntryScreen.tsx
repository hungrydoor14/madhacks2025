import { FileText, Sparkles, Send, Play, Pause, ChevronDown, Plus, Clock, Menu, X, Home, Edit2, Check, X as XIcon } from 'lucide-react';
import { Logo } from './components/Logo';
import { useState, useRef, useEffect } from 'react';
import { Entry, Message } from './types';

interface EntryScreenProps {
  entry: Entry;
  entries: Entry[];
  voiceFile: File | null;
  voiceFileUrl: string | null;
  onEntryUpdate: (entryId: string, updates: Partial<Entry>) => void;
  onEntrySelect: (entryId: string) => void;
  onNewEntry: () => void;
  onBack: () => void;
}

type ModeType = 'default' | 'enhanced';

const SUGGESTED_QUESTIONS = [
  "Summarize my notes",
  "Create action items",
  "What are my priorities?"
];

export function EntryScreen({ entry, entries, voiceFile, voiceFileUrl: _voiceFileUrl, onEntryUpdate, onEntrySelect, onNewEntry, onBack }: EntryScreenProps) {
  const [selectedMode, setSelectedMode] = useState<ModeType>('default');
  const [messages, setMessages] = useState<Message[]>(entry.messages);
  const [inputMessage, setInputMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'default' | 'custom'>('default');
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl] = useState<string | null>(null); // Will be set when Fish Audio generates audio
  const [isRenaming, setIsRenaming] = useState(false);
  const [editTopicName, setEditTopicName] = useState(entry.topic);

  // Update messages when entry changes
  useEffect(() => {
    setMessages(entry.messages);
    setEditTopicName(entry.topic);
  }, [entry.id, entry.topic]);

  const handleRename = () => {
    const trimmedName = editTopicName.trim();
    if (trimmedName && trimmedName !== entry.topic) {
      onEntryUpdate(entry.id, { topic: trimmedName });
    } else if (!trimmedName) {
      // If empty, revert to original
      setEditTopicName(entry.topic);
    }
    setIsRenaming(false);
  };

  const handleCancelRename = () => {
    setEditTopicName(entry.topic);
    setIsRenaming(false);
  };

  // Generate topic name from chat context
  const generateTopicName = (userMessage: string, aiResponse: string): string => {
    // Extract key words from user message
    const userWords = userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const aiWords = aiResponse.toLowerCase().substring(0, 200).split(/\s+/).filter(w => w.length > 4);
    
    // Find common meaningful words
    const keywords = [...new Set([...userWords.slice(0, 3), ...aiWords.slice(0, 3)])];
    
    if (keywords.length > 0) {
      return keywords.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    
    // Fallback to first part of user message
    return userMessage.substring(0, 40) + (userMessage.length > 40 ? '...' : '');
  };

  async function runEnhancedMode(userInstruction: string) {
    const res = await fetch("/api/enhanced", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        extractedText: entry.extractedText || "",
        userInstruction
      })
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || error.details || "Failed to get AI response");
    }

    const data = await res.json();
    return data.script;
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      role: 'user',
      content: inputMessage
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const script = await runEnhancedMode(currentInput);

      const aiMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: script
      };

      const updatedMessages = [...messages, userMessage, aiMessage];
      setMessages(updatedMessages);

      // Generate topic name from chat context
      const topicName = generateTopicName(currentInput, script);
      
      // Update entry with new messages and topic
      onEntryUpdate(entry.id, {
        messages: updatedMessages,
        topic: topicName
      });
    } catch (error) {
      const errorMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
  };

  const handlePlayAudio = () => {
    // TODO: Generate audio using Fish Audio API with selected voice
    // For now, this is a placeholder
    if (audioUrl) {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } else {
      // Generate audio - placeholder for Fish Audio integration
      alert(`Generating audio with ${selectedVoice === 'default' ? 'default' : 'your custom'} voice...`);
    }
  };

  const handleVoiceChange = (voice: 'default' | 'custom') => {
    setSelectedVoice(voice);
    setShowVoiceDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.voice-dropdown-container')) {
        setShowVoiceDropdown(false);
      }
    };

    if (showVoiceDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showVoiceDropdown]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Left Sidebar */}
      <div className={`fixed md:static inset-y-0 left-0 w-72 border-r border-cyan-200/40 bg-white/90 md:bg-white/60 backdrop-blur-xl p-6 flex-col shadow-lg z-50 transition-transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } flex`}>
        <div className="mb-6">
          <Logo className="text-2xl" />
        </div>
        
        {/* New Entry Button */}
        <button
          onClick={() => {
            onNewEntry();
            setSidebarOpen(false);
          }}
          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          New Entry
        </button>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">All Entries</p>
              {entries.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                onEntrySelect(e.id);
                setSidebarOpen(false);
              }}
              className={`w-full px-4 py-3 rounded-xl text-left transition-all group ${
                e.id === entry.id
                  ? 'bg-gradient-to-r from-cyan-100/80 to-blue-100/80 border-2 border-cyan-300/60 shadow-md'
                  : 'bg-slate-50/50 border-2 border-transparent hover:bg-slate-100/50 hover:border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  e.id === entry.id ? 'bg-cyan-600' : 'bg-slate-300'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-semibold truncate flex-1 ${
                      e.id === entry.id ? 'text-cyan-900' : 'text-slate-700'
                    }`}>
                      {e.topic}
                    </p>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        // Handle rename in sidebar - could open a modal or inline edit
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/50 transition-all"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3 text-slate-500" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(e.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
          {entries.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No entries yet</p>
              <p className="text-xs mt-1">Create your first entry!</p>
            </div>
          )}
        </div>

        {/* Current Entry Info */}
        <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-200/50">
          <p className="text-xs font-semibold text-slate-600 mb-1">Current Entry</p>
          <p className="text-xs text-slate-500 truncate mb-2">{entry.topic}</p>
          <p className="text-xs text-slate-400">{formatDate(entry.updatedAt)}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-cyan-200/40 bg-white/40 backdrop-blur-sm px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden text-slate-600 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="flex-1 min-w-0">
                {isRenaming ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editTopicName}
                      onChange={(e) => setEditTopicName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleRename();
                        if (e.key === 'Escape') handleCancelRename();
                      }}
                      className="flex-1 px-3 py-1 rounded-lg border-2 border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-lg font-bold text-slate-900"
                      autoFocus
                    />
                    <button
                      onClick={handleRename}
                      className="p-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="p-1.5 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{entry.topic}</h2>
                    <button
                      onClick={() => setIsRenaming(true)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 transition-all"
                      title="Rename entry"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                )}
                <p className="text-xs md:text-sm text-slate-500 mt-1">{formatDate(entry.updatedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={onNewEntry}
                className="text-slate-600 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100 hidden md:flex items-center gap-2"
                title="New Entry"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button 
                onClick={onBack}
                className="text-slate-600 hover:text-slate-900 transition-colors p-2 rounded-lg hover:bg-slate-100"
                title="Back to Home"
              >
                <Home className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {/* Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl">
            <button
              onClick={() => setSelectedMode('default')}
              className={`group p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${
                selectedMode === 'default'
                  ? 'border-cyan-400 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-xl shadow-cyan-200/40'
                  : 'border-slate-200 bg-white/60 hover:border-cyan-300 hover:bg-cyan-50/40 hover:shadow-lg'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  selectedMode === 'default'
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg'
                    : 'bg-slate-100 group-hover:bg-cyan-100'
                }`}>
                  <FileText className={`w-6 h-6 ${selectedMode === 'default' ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div className="text-left flex-1">
                  <p className={`font-bold text-lg mb-1 ${selectedMode === 'default' ? 'text-slate-900' : 'text-slate-700'}`}>
                    Default Mode
                  </p>
                  <p className="text-sm text-slate-500">View extracted text</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedMode('enhanced')}
              className={`group p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${
                selectedMode === 'enhanced'
                  ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-xl shadow-blue-200/40'
                  : 'border-slate-200 bg-white/60 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-lg'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  selectedMode === 'enhanced'
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg'
                    : 'bg-slate-100 group-hover:bg-blue-100'
                }`}>
                  <Sparkles className={`w-6 h-6 ${selectedMode === 'enhanced' ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div className="text-left flex-1">
                  <p className={`font-bold text-lg mb-1 ${selectedMode === 'enhanced' ? 'text-slate-900' : 'text-slate-700'}`}>
                    Enhanced Mode
                  </p>
                  <p className="text-sm text-slate-500">Chat with AI</p>
                </div>
              </div>
            </button>
          </div>

          {/* Default Mode - Extracted Text */}
          {selectedMode === 'default' && (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-cyan-600" />
                  </div>
                  Extracted Content
                </h3>
                
                {/* Audio Player */}
                {entry.extractedText && (
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePlayAudio}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-4 h-4" />
                            <span className="text-sm font-medium">Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span className="text-sm font-medium">Play Audio</span>
                          </>
                        )}
                      </button>
                      
                      <div className="relative voice-dropdown-container">
                        <button
                          onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                          className="px-4 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-cyan-300 text-slate-700 hover:bg-cyan-50 transition-all flex items-center gap-2"
                        >
                          <span className="text-sm font-medium">
                            {selectedVoice === 'default' ? 'Default Voice' : 'Your Voice'}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showVoiceDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showVoiceDropdown && (
                          <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white border-2 border-slate-200 shadow-xl z-20 overflow-hidden animate-fade-in">
                            <button
                              onClick={() => handleVoiceChange('default')}
                              className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                                selectedVoice === 'default'
                                  ? 'bg-cyan-50 text-cyan-700'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${selectedVoice === 'default' ? 'bg-cyan-600' : 'bg-slate-300'}`}></div>
                              Default Voice
                            </button>
                            <button
                              onClick={() => handleVoiceChange('custom')}
                              disabled={!voiceFile}
                              className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                                selectedVoice === 'custom'
                                  ? 'bg-cyan-50 text-cyan-700'
                                  : voiceFile
                                  ? 'text-slate-700 hover:bg-slate-50'
                                  : 'text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${selectedVoice === 'custom' ? 'bg-cyan-600' : voiceFile ? 'bg-slate-300' : 'bg-slate-200'}`}></div>
                              {voiceFile ? 'Your Voice' : 'Your Voice (Not uploaded)'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                {entry.extractedText ? (
                  <div className="p-6 rounded-2xl bg-white border-2 border-slate-200 hover:border-cyan-300 hover:bg-gradient-to-br hover:from-cyan-50/50 hover:to-blue-50/50 transition-all shadow-sm hover:shadow-md">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{entry.extractedText}</p>
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50/30 border-2 border-dashed border-slate-300 text-center">
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No text extracted yet</p>
                    <p className="text-sm text-slate-400 mt-1">Upload an image to get started</p>
                  </div>
                )}
              </div>
              
              {audioUrl && (
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  className="hidden"
                />
              )}
            </div>
          )}

          {/* Enhanced Mode - Chat Interface */}
          {selectedMode === 'enhanced' && (
            <div className="max-w-2xl flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">AI Assistant</h3>
                  <p className="text-xs text-slate-500">Powered by Claude AI</p>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 md:pr-4 scroll-smooth">
                {isLoading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="max-w-xs lg:max-w-md px-5 py-4 rounded-2xl shadow-lg bg-white border border-cyan-200 text-slate-700">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                        </div>
                        <span className="text-xs font-medium text-cyan-600">AI Assistant</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <p className="text-sm text-slate-600 ml-2">Thinking...</p>
                      </div>
                    </div>
                  </div>
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-5 py-4 rounded-2xl shadow-lg transition-all hover:shadow-xl ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-sm shadow-cyan-200/50'
                          : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-xs font-medium text-cyan-600">AI Assistant</span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Suggested Questions */}
              {messages.length === 1 && (
                <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border-2 border-cyan-100/60 shadow-sm">
                  <p className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    Try asking:
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {SUGGESTED_QUESTIONS.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedQuestion(suggestion)}
                        className="px-5 py-2.5 rounded-full text-sm font-medium bg-white border-2 border-slate-200 text-slate-700 hover:border-cyan-400 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 hover:shadow-md hover:scale-105 transition-all active:scale-95"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio Player for Enhanced Mode */}
              {messages.length > 1 && (
                <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Generated Audio</p>
                        <p className="text-xs text-slate-600">Listen to your AI response</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePlayAudio}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-4 h-4" />
                            <span className="text-sm font-medium">Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span className="text-sm font-medium">Play</span>
                          </>
                        )}
                      </button>
                      
                      <div className="relative voice-dropdown-container">
                        <button
                          onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                          className="px-4 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-indigo-300 text-slate-700 hover:bg-indigo-50 transition-all flex items-center gap-2"
                        >
                          <span className="text-sm font-medium">
                            {selectedVoice === 'default' ? 'Default' : 'Your Voice'}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showVoiceDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {showVoiceDropdown && (
                          <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white border-2 border-slate-200 shadow-xl z-20 overflow-hidden animate-fade-in">
                            <button
                              onClick={() => handleVoiceChange('default')}
                              className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                                selectedVoice === 'default'
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${selectedVoice === 'default' ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
                              Default Voice
                            </button>
                            <button
                              onClick={() => handleVoiceChange('custom')}
                              disabled={!voiceFile}
                              className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-2 ${
                                selectedVoice === 'custom'
                                  ? 'bg-indigo-50 text-indigo-700'
                                  : voiceFile
                                  ? 'text-slate-700 hover:bg-slate-50'
                                  : 'text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${selectedVoice === 'custom' ? 'bg-indigo-600' : voiceFile ? 'bg-slate-300' : 'bg-slate-200'}`}></div>
                              {voiceFile ? 'Your Voice' : 'Your Voice (Not uploaded)'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="flex gap-2 md:gap-3">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask me anything about your notes..."
                  className="flex-1 px-5 py-4 rounded-2xl border-2 border-cyan-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all shadow-sm hover:border-cyan-300"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-5 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 hover:shadow-xl hover:shadow-cyan-300/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg transition-all flex items-center justify-center flex-shrink-0 shadow-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              
              {audioUrl && (
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  onPause={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  className="hidden"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
