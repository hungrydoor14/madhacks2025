import { useState } from 'react';
import { EntryScreen } from './EntryScreen';
import { FileText, Upload, Sparkles, Send, Mic } from 'lucide-react';
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
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Transform your notes into actionable insights with AI-powered OCR and intelligent assistance
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-cyan-100/50 p-8 md:p-12">
          <div className="space-y-6">
            {/* File Upload Area */}
            <div className="relative">
              <div className="border-2 border-dashed border-cyan-300 rounded-2xl p-8 md:p-12 text-center hover:border-cyan-400 hover:bg-cyan-50/30 transition-all group">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-cyan-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Upload Your Notes</h3>
                  <p className="text-slate-600 mb-6">Choose an image or take a photo to extract text</p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                    <label className="flex-1 cursor-pointer">
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
                      <div className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl text-center">
                        Choose File
                      </div>
                    </label>
                    
                    <label className="flex-1 cursor-pointer">
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
                      <div className="px-6 py-3 rounded-xl bg-white border-2 border-cyan-600 text-cyan-600 font-medium hover:bg-cyan-50 transition-all text-center">
                        Take Photo
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Voice Upload Section */}
            <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Upload Your Voice</h3>
                  <p className="text-xs text-slate-600">Optional: Add your voice sample for personalized audio</p>
                </div>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp3,.mp3"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleVoiceUpload(file);
                  }}
                  className="hidden"
                />
                <div className="px-6 py-3 rounded-xl bg-white border-2 border-indigo-300 text-indigo-700 font-medium hover:bg-indigo-50 hover:border-indigo-400 transition-all text-center">
                  {voiceFile ? `✓ ${voiceFile.name}` : 'Choose MP3 File'}
                </div>
              </label>
              {voiceFile && (
                <p className="text-xs text-slate-500 mt-2 text-center">Voice file ready for Fish Audio</p>
              )}
            </div>

            {showPreview && previewUrl && (
              <div className="mt-6 animate-fade-in">
                <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-200 shadow-lg">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto"
                  />
                  <div className="absolute top-2 right-2 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-slate-700">
                    Preview
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleProcessImage}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : 'Process Image'}
                  </button>
                  <button
                    onClick={handleCancelPreview}
                    disabled={isProcessing}
                    className="px-6 py-3 rounded-xl bg-white border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Change Image
                  </button>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="mt-6 p-6 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl border border-cyan-200 animate-fade-in">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-200 border-t-cyan-600"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Processing image...</p>
                    <p className="text-sm text-slate-600">Extracting text with OCR</p>
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
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-cyan-100 text-center">
            <FileText className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-900">OCR Extraction</p>
            <p className="text-xs text-slate-600 mt-1">Accurate text recognition</p>
          </div>
          <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-blue-100 text-center">
            <Sparkles className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-900">AI Assistant</p>
            <p className="text-xs text-slate-600 mt-1">Smart note organization</p>
          </div>
          <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-indigo-100 text-center">
            <Send className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-900">Quick Actions</p>
            <p className="text-xs text-slate-600 mt-1">Instant insights</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

