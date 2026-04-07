export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  subject: Subject;
  messages: Message[];
  createdAt: Date;
}

export type Subject = {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  shadowColor: string;
  description: string;
};
