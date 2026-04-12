export type MessageType =
  | 'TEXT'
  | 'VOICE'
  | 'IMAGE'
  | 'VIDEO'
  | 'EPHEMERAL_IMAGE'
  | 'SYSTEM';

export interface ConversationSummary {
  id: string;
  participant: {
    id: string;
    nickname: string;
    avatarUrl?: string;
    isOnline: boolean;
  };
  lastMessage?: {
    content: string;
    type: MessageType;
    createdAt: string;
  };
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  type: MessageType;
  content?: string;
  mediaUrl?: string;
  isEphemeral: boolean;
  createdAt: string;
}
