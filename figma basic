import { ArrowLeft, FileText, Sparkles, Send } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { Input } from './ui/input';

interface EntryScreenProps {
  imageUrl: string | null;
  onBack: () => void;
}

type ModeType = 'default' | 'enhanced';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

export function EntryScreen({ onBack }: EntryScreenProps) {
  const [selectedMode, setSelectedMode] = useState<ModeType>('default');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: 'assistant',
      content: "Hi! I've analyzed your notes. I can help you organize your thoughts, create action items, or answer questions about what you've written. What would you like to explore?"
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: messages.length + 1,
      role: 'user',
      content: inputMessage
    };

    setMessages([...messages, userMessage]);
    setInputMessage('');

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: messages.length + 2,
        role: 'assistant',
        content: "Based on your notes, I can see you have three key priorities: connecting with your mom about her garden project, achieving Q4 targets, and reading 'Atomic Habits'. Would you like me to help you create a schedule or break these down into actionable steps?"
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <div className="flex h-screen">
      {/* Left Sidebar - Entry Tab */}
      <div className="w-24 bg-white/60 backdrop-blur-sm border-r border-purple-100/50 py-8 flex flex-col items-center gap-3">
        <button
          className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-purple-400 to-blue-400 text-white shadow-lg shadow-purple-200/50"
        >
          <FileText className="w-5 h-5" />
          <span className="text-xs">Entry</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-sm">
        {/* Header */}
        <div className="px-8 py-6 bg-white/60 backdrop-blur-sm border-b border-purple-100/50 flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-gray-800">Your Entry</h1>
            <p className="text-gray-500 text-sm">Just now</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto px-8 py-8">
          <div className="space-y-6 max-w-xl mx-auto">
            {/* Mode Selection */}
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedMode('default')}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all ${
                  selectedMode === 'default'
                    ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50 shadow-sm'
                    : 'border-purple-100 bg-white/60 hover:bg-purple-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedMode === 'default' ? 'bg-purple-200' : 'bg-purple-100'
                  }`}>
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-gray-800 text-sm">Default Mode</p>
                    <p className="text-gray-500 text-xs">View extracted text</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedMode('enhanced')}
                className={`flex-1 p-4 rounded-2xl border-2 transition-all ${
                  selectedMode === 'enhanced'
                    ? 'border-blue-300 bg-gradient-to-br from-blue-50 to-purple-50 shadow-sm'
                    : 'border-purple-100 bg-white/60 hover:bg-blue-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedMode === 'enhanced' ? 'bg-blue-200' : 'bg-blue-100'
                  }`}>
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-gray-800 text-sm">Enhanced Mode</p>
                    <p className="text-gray-500 text-xs">Chat with AI</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Default Mode - Extracted Text */}
            {selectedMode === 'default' && (
              <div className="space-y-3">
                <h2 className="text-gray-700">Extracted Text</h2>
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 space-y-4 border border-purple-100/50 shadow-sm">
                  <p className="text-gray-800">
                    "Remember to call mom this weekend. She mentioned wanting to talk about the garden project."
                  </p>
                  <p className="text-gray-800">
                    "Meeting notes: Q4 targets - increase engagement by 25%, launch new feature by Nov 30th."
                  </p>
                  <p className="text-gray-800">
                    "Book recommendation from Sarah: 'Atomic Habits' - she said it changed her perspective on productivity."
                  </p>
                </div>
              </div>
            )}

            {/* Enhanced Mode - Chatbot */}
            {selectedMode === 'enhanced' && (
              <div className="space-y-4">
                <h2 className="text-gray-700">AI Assistant</h2>
                
                {/* Chat Messages */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-purple-100/50 shadow-sm overflow-hidden">
                  <div className="p-6 space-y-4 max-h-[500px] overflow-auto">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-gradient-to-r from-purple-400 to-blue-400 text-white'
                              : 'bg-gradient-to-br from-purple-50 to-blue-50 text-gray-800 border border-purple-100'
                          }`}
                        >
                          {message.role === 'assistant' && (
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center">
                                <Sparkles className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-xs text-purple-600">AI Assistant</span>
                            </div>
                          )}
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input Area */}
                  <div className="border-t border-purple-100/50 p-4 bg-white/60">
                    <div className="flex gap-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSendMessage();
                          }
                        }}
                        placeholder="Ask me anything about your notes..."
                        className="flex-1 rounded-2xl border-purple-200 bg-white focus:border-purple-300"
                      />
                      <Button
                        onClick={handleSendMessage}
                        size="icon"
                        className="rounded-2xl bg-gradient-to-r from-purple-400 to-blue-400 hover:from-purple-500 hover:to-blue-500 text-white w-10 h-10"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Suggested Questions */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Summarize my notes",
                      "Create action items",
                      "What are my priorities?"
                    ].map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setInputMessage(suggestion)}
                        className="px-4 py-2 rounded-full bg-white/80 border border-purple-100 text-sm text-gray-700 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
