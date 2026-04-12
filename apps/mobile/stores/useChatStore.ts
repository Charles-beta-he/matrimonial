import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: 'TEXT' | 'VOICE' | 'IMAGE' | 'VIDEO' | 'EPHEMERAL_IMAGE' | 'SYSTEM';
  content?: string;
  mediaUrl?: string;
  isEphemeral?: boolean;
  createdAt: string;
  tempId?: string;
  status?: 'sending' | 'sent' | 'read' | 'failed';
}

interface ChatState {
  messagesByConversation: Record<string, ChatMessage[]>;
  typingUsers: Record<string, Set<string>>; // conversationId -> userIds

  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessageStatus: (conversationId: string, tempId: string, update: Partial<ChatMessage>) => void;
  setMessages: (conversationId: string, messages: ChatMessage[]) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  clearConversation: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messagesByConversation: {},
  typingUsers: {},

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      // Dedupe by id
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: [...existing, message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          ),
        },
      };
    }),

  updateMessageStatus: (conversationId, tempId, update) =>
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.map((m) => (m.tempId === tempId ? { ...m, ...update } : m)),
        },
      };
    }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messagesByConversation: { ...state.messagesByConversation, [conversationId]: messages },
    })),

  setTyping: (conversationId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[conversationId] ?? new Set();
      const updated = new Set(current);
      if (isTyping) updated.add(userId);
      else updated.delete(userId);
      return {
        typingUsers: { ...state.typingUsers, [conversationId]: updated },
      };
    }),

  clearConversation: (conversationId) =>
    set((state) => {
      const { [conversationId]: _, ...rest } = state.messagesByConversation;
      return { messagesByConversation: rest };
    }),
}));
