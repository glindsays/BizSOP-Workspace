// src/lib/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ page: number; text: string }>;
}

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
}