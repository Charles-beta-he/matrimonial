import { useCallback, useEffect, useRef } from 'react';
import { useSocketStore } from '../stores/useSocketStore';
import { useChatStore, type ChatMessage } from '../stores/useChatStore';
import { useAppStore } from '../stores/useAppStore';

export function useChat(conversationId: string) {
  const socket = useSocketStore((s) => s.socket);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessageStatus = useChatStore((s) => s.updateMessageStatus);
  const setTyping = useChatStore((s) => s.setTyping);
  const messages = useChatStore((s) => s.messagesByConversation[conversationId] ?? []);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId] ?? new Set<string>());
  const currentUser = useAppStore((s) => s.user);

  // Join conversation room on mount
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('conversation:join', { conversationId });

    const onNewMessage = (msg: ChatMessage) => {
      if (msg.conversationId === conversationId) {
        addMessage(conversationId, { ...msg, status: 'sent' });
      }
    };

    const onMessageSent = ({ tempId, message }: { tempId: string; message: ChatMessage }) => {
      updateMessageStatus(conversationId, tempId, { id: message.id, status: 'sent' });
    };

    const onTypingStart = ({ conversationId: cId, userId }: { conversationId: string; userId: string }) => {
      if (cId === conversationId) setTyping(conversationId, userId, true);
    };

    const onTypingStop = ({ conversationId: cId, userId }: { conversationId: string; userId: string }) => {
      if (cId === conversationId) setTyping(conversationId, userId, false);
    };

    socket.on('message:new', onNewMessage);
    socket.on('message:sent', onMessageSent);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    return () => {
      socket.emit('conversation:leave', { conversationId });
      socket.off('message:new', onNewMessage);
      socket.off('message:sent', onMessageSent);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
    };
  }, [socket, conversationId, addMessage, updateMessageStatus, setTyping]);

  const sendMessage = useCallback(
    (content: string, type: ChatMessage['type'] = 'TEXT', mediaUrl?: string) => {
      if (!socket || !currentUser) return;

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const optimisticMessage: ChatMessage = {
        id: tempId,
        tempId,
        conversationId,
        senderId: currentUser.id,
        type,
        content,
        mediaUrl,
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      // Optimistic add
      addMessage(conversationId, optimisticMessage);

      // Emit via socket
      socket.emit('message:send', {
        conversationId,
        type,
        content,
        mediaUrl,
        tempId,
      });
    },
    [socket, currentUser, conversationId, addMessage],
  );

  // Typing indicators with debounce
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emitTyping = useCallback(() => {
    if (!socket) return;
    socket.emit('typing:start', { conversationId });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
    }, 2000);
  }, [socket, conversationId]);

  const markAsRead = useCallback(
    (messageId: string) => {
      if (!socket) return;
      socket.emit('message:read', { conversationId, messageId });
    },
    [socket, conversationId],
  );

  return {
    messages,
    typingUsers: Array.from(typingUsers),
    sendMessage,
    emitTyping,
    markAsRead,
  };
}
