export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  phoneNumber?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface SourceCitation {
  title: string;
  url: string;
}

export type TriageUrgency = 'EMERGENCY' | 'URGENT' | 'ROUTINE' | 'SELF_CARE';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SourceCitation[];
  urgency?: TriageUrgency;
  timestamp?: string;
}

export interface ChatSession {
  _id?: string;
  sessionId: string;
  platform: 'web' | 'whatsapp';
  userId?: string;
  messages: ChatMessage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Hospital {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  is24Hours: boolean;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  source?: string;
  googleMapsUrl?: string;
  rating?: number;
  addedBy?: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Feedback {
  _id: string;
  userId?: {
    _id?: string;
    name?: string;
    email?: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}
