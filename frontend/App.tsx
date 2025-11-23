import { useState } from 'react';
import { EntryScreen } from './EntryScreen';
import { FileText, Upload, Sparkles, Mic, Zap, Brain, Wand2, Star, TrendingUp } from 'lucide-react';
import { Entry } from './types';
import { Logo } from './components/Logo';

function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [showEntryScreen, setShowEntryScreen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceFileUrl, setVoiceFileUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewFile(file);
    setPreviewUrl(url);
    setShowPreview(true);
    setError(null);
  };

  const handleProcessImage = async () => {
    if (!previewFile || !previewUrl) return;

    setIsProcessing(true);
    setError(null);

    // Upload and process image
    const formData = new FormData();
    formData.append("photo", previewFile);

    try {
      const res = await fetch("/ocr", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.text || `OCR failed with status ${res.status}`);
      }

      const data = await res.json();
      const text = data.text || "";
      
      // Create new entry
      const newEntryId = `entry-${Date.now()}`;
      const newEntry: Entry = {
        id: newEntryId,
        topic: text.substring(0, 50) + (text.length > 50 ? '...' : '') || 'New Entry',
        extractedText: text,
        messages: [
          {
            id: 1,
            role: 'assistant',
            content: "Hi! I've analyzed your notes. I can help you organize your thoughts, create action items, or answer questions about what you've written. What would you like to explore?"
          }
        ],
        imageUrl: previewUrl,
        voiceFile: voiceFile,
        voiceFileUrl: voiceFileUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setEntries(prev => [newEntry, ...prev]);
      setCurrentEntryId(newEntryId);
      setShowPreview(false);
      setShowEntryScreen(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to process image. Please try again.";
      setError(errorMessage);
      alert(errorMessage);
      console.error("OCR Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const handleVoiceUpload = (file: File) => {
    setVoiceFile(file);
    const url = URL.createObjectURL(file);
    setVoiceFileUrl(url);
  };

  const currentEntry = currentEntryId ? entries.find(e => e.id === currentEntryId) : null;

  const handleEntryUpdate = (entryId: string, updates: Partial<Entry>) => {
    setEntries(prev => prev.map(entry => 
      entry.id === entryId 
        ? { ...entry, ...updates, updatedAt: new Date() }
        : entry
    ));
  };

  const handleEntrySelect = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      setCurrentEntryId(entryId);
      setVoiceFile(entry.voiceFile);
      setVoiceFileUrl(entry.voiceFileUrl);
      setShowEntryScreen(true);
    }
  };

  const handleNewEntry = () => {
    setVoiceFile(null);
    setVoiceFileUrl(null);
    setCurrentEntryId(null);
    setShowEntryScreen(false);
    setShowPreview(false);
    setPreviewFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  if (showEntryScreen && currentEntry) {
    return (
      <EntryScreen
        entry={currentEntry}
        entries={entries}
        voiceFile={voiceFile}
        voiceFileUrl={voiceFileUrl}
        onEntryUpdate={handleEntryUpdate}
        onEntrySelect={handleEntrySelect}
        onNewEntry={handleNewEntry}
        onBack={() => {
          setShowEntryScreen(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-6 flex justify-center">
            <Logo />
          </div>
          <p className="text-xl md:text-2xl text-slate-700 max-w-2xl mx-auto font-medium mb-4">
            Transform your notes into actionable insights with AI-powered OCR and intelligent assistance
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>Powered by Advanced OCR & Claude AI</span>
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          </div>
        </div>

        {/* Upload Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-cyan-100/60 p-8 md:p-12 relative overflow-hidden">
          {/* Decorative gradient background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-200/20 to-blue-200/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-200/20 to-purple-200/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
          
          <div className="relative space-y-6">
            {/* File Upload Area */}
            <div className="relative">
              <div className="border-2 border-dashed border-cyan-300 rounded-2xl p-8 md:p-12 text-center hover:border-cyan-400 hover:bg-gradient-to-br hover:from-cyan-50/50 hover:to-blue-50/30 transition-all group relative overflow-hidden">
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-50/0 via-blue-50/0 to-indigo-50/0 group-hover:from-cyan-50/30 group-hover:via-blue-50/20 group-hover:to-indigo-50/30 transition-all duration-500"></div>
                
                <div className="relative flex flex-col items-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg group-hover:shadow-xl">
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Upload Your Notes</h3>
                  <p className="text-slate-600 mb-6 text-lg">Choose an image or take a photo to extract text</p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                    <label className="flex-1 cursor-pointer group/btn">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileSelect(file);
                          }
                        }}
                        className="hidden"
                      />
                      <div className="px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl text-center flex items-center justify-center gap-2 group-hover/btn:scale-105">
                        <FileText className="w-5 h-5" />
                        Choose File
                      </div>
                    </label>
                    
                    <label className="flex-1 cursor-pointer group/btn">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileSelect(file);
                          }
                        }}
                        className="hidden"
                      />
                      <div className="px-6 py-4 rounded-xl bg-white border-2 border-cyan-600 text-cyan-600 font-semibold hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 transition-all text-center flex items-center justify-center gap-2 group-hover/btn:scale-105 shadow-md hover:shadow-lg">
                        <Sparkles className="w-5 h-5" />
                        Take Photo
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Upload Section */}
            <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200/60 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                    <Mic className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Upload Your Voice</h3>
                    <p className="text-sm text-slate-600">Optional: Add your voice sample for personalized audio</p>
                  </div>
                </div>
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3,.mp3"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleVoiceUpload(file);
                    }}
                    className="hidden"
                  />
                  <div className="px-6 py-3 rounded-xl bg-white border-2 border-indigo-300 text-indigo-700 font-semibold hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-400 transition-all text-center shadow-md hover:shadow-lg">
                    {voiceFile ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span className="truncate max-w-xs">{voiceFile.name}</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Mic className="w-5 h-5" />
                        Choose MP3 File
                      </span>
                    )}
                  </div>
                </label>
                {voiceFile && (
                  <p className="text-xs text-indigo-600 mt-3 text-center font-medium flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3" />
                    Voice file ready for Fish Audio
                  </p>
                )}
              </div>
            </div>

            {showPreview && previewUrl && (
              <div className="mt-6 animate-fade-in">
                <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-200 shadow-xl group">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto transition-transform group-hover:scale-[1.02]"
                  />
                  <div className="absolute top-3 right-3 px-4 py-1.5 rounded-full bg-white/95 backdrop-blur-sm text-xs font-bold text-slate-700 shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-600" />
                    Preview
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleProcessImage}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Process Image
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelPreview}
                    disabled={isProcessing}
                    className="px-6 py-4 rounded-xl bg-white border-2 border-slate-300 text-slate-700 font-bold hover:bg-gradient-to-r hover:from-slate-50 hover:to-gray-50 hover:border-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="mt-6 p-6 bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 rounded-2xl border-2 border-cyan-200 animate-fade-in shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-cyan-200 border-t-cyan-600"></div>
                    <div className="absolute inset-0 animate-ping rounded-full border-2 border-cyan-400 opacity-20"></div>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-lg">Processing image...</p>
                    <p className="text-sm text-slate-600">Using advanced OCR with handwriting detection</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-6 bg-red-50 rounded-2xl border-2 border-red-200 animate-fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs">!</span>
                  </div>
                  <div>
                    <p className="font-semibold text-red-900 mb-1">Error</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200/60 text-center hover:shadow-xl hover:scale-105 transition-all group">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:rotate-6 transition-transform">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <p className="text-base font-bold text-slate-900 mb-1">OCR Extraction</p>
            <p className="text-xs text-slate-600">Handwriting & printed text</p>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/60 text-center hover:shadow-xl hover:scale-105 transition-all group">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:rotate-6 transition-transform">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <p className="text-base font-bold text-slate-900 mb-1">AI Assistant</p>
            <p className="text-xs text-slate-600">Claude AI powered</p>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200/60 text-center hover:shadow-xl hover:scale-105 transition-all group">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:rotate-6 transition-transform">
              <Wand2 className="w-7 h-7 text-white" />
            </div>
            <p className="text-base font-bold text-slate-900 mb-1">Smart Processing</p>
            <p className="text-xs text-slate-600">Spell check & corrections</p>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200/60 text-center hover:shadow-xl hover:scale-105 transition-all group">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:rotate-6 transition-transform">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <p className="text-base font-bold text-slate-900 mb-1">Voice Audio</p>
            <p className="text-xs text-slate-600">Text-to-speech ready</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

