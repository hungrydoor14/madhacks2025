export interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

export interface Entry {
  id: string;
  topic: string;
  extractedText: string;
  messages: Message[];
  imageUrl: string | null;
  voiceFile: File | null;
  voiceFileUrl: string | null;
  voiceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

