import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './use-auth';
import { chatWebSocketManager } from '@/lib/chat-websocket-manager';

interface ChatMessage {
  type: string;
  data: any;
  sessionId?: number;
  userId?: number;
}

interface ChatWebSocketOptions {
  onMessage?: (message: ChatMessage) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Event) => void;
}

interface StartSessionData {
  subject?: string;
  department?: string;
  departmentId?: number;
}

interface SendMessageData {
  message: string;
  sessionId: number;
}

interface TypingData {
  sessionId: number;
  isTyping: boolean;
}

interface EndSessionData {
  sessionId: number;
}

export function useChatWebSocket(options: ChatWebSocketOptions = {}) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const removeMessageHandlerRef = useRef<(() => void) | null>(null);
  const removeConnectionHandlerRef = useRef<(() => void) | null>(null);
  const removeErrorHandlerRef = useRef<(() => void) | null>(null);

  const { onMessage, onConnectionChange, onError } = options;

  const connect = useCallback((forceClientMode = false) => {
    if (!user) {
      // No user available for WebSocket connection
      // No user available for WebSocket connection
      return;
    }

    // Get current connection state
    const { isConnected: managerConnected, isConnecting } = chatWebSocketManager.getConnectionState();

    if (isConnecting || managerConnected) {
      // WebSocket already connecting/connected via manager
      // WebSocket already connecting/connected via manager
      setIsConnected(managerConnected);
      return;
    }

          // Connecting via WebSocket manager with forceClientMode
    // Connecting via WebSocket manager with forceClientMode
    chatWebSocketManager.connect(user, forceClientMode);
  }, [user]);

  const disconnect = useCallback(() => {
    // Disconnecting via WebSocket manager
    chatWebSocketManager.disconnect();
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    return chatWebSocketManager.sendMessage(message);
  }, []);

  const startSession = useCallback(async (data: StartSessionData) => {
    return sendMessage({
      type: 'start_session',
      data
    });
  }, [sendMessage]);

  const sendChatMessage = useCallback(async (data: SendMessageData) => {
    return sendMessage({
      type: 'send_message',
      data
    });
  }, [sendMessage]);

  const sendTyping = useCallback(async (data: TypingData) => {
    return sendMessage({
      type: 'typing',
      data
    });
  }, [sendMessage]);

  const endSession = useCallback(async (data: EndSessionData) => {
    return sendMessage({
      type: 'end_session',
      data
    });
  }, [sendMessage]);

  const joinSession = useCallback(async (sessionId: number) => {
    return sendMessage({
      type: 'join_session',
      data: { sessionId }
    });
  }, [sendMessage]);

  const updateAdminStatus = useCallback(async (status: string, statusMessage?: string) => {
    return sendMessage({
      type: 'admin_status_update',
      data: { status, statusMessage }
    });
  }, [sendMessage]);

  // Set up event handlers
  useEffect(() => {
    // Set up message handler
    if (onMessage) {
      removeMessageHandlerRef.current = chatWebSocketManager.addMessageHandler(onMessage);
    }

    // Set up connection handler - always set up to sync local state
    removeConnectionHandlerRef.current = chatWebSocketManager.addConnectionHandler((connected) => {
      setIsConnected(connected);
      if (onConnectionChange) {
        onConnectionChange(connected);
      }
    });

    // Set up error handler
    if (onError) {
      removeErrorHandlerRef.current = chatWebSocketManager.addErrorHandler(onError);
    }

    return () => {
      // Clean up handlers
      removeMessageHandlerRef.current?.();
      removeConnectionHandlerRef.current?.();
      removeErrorHandlerRef.current?.();
    };
  }, [onMessage, onConnectionChange, onError]);

  // Auto-connect when user is available
  useEffect(() => {
    if (user) {
      const { isConnected: managerConnected } = chatWebSocketManager.getConnectionState();
      if (!managerConnected) {
        // Auto-connecting to chat WebSocket
        // Check if we're on the live chat page to force client mode (but only for non-admin users)
        const isLiveChatPage = window.location.pathname === '/live-chat';
        const shouldForceClientMode = isLiveChatPage && user.role !== 'admin';
        connect(shouldForceClientMode);
      } else {
        setIsConnected(managerConnected);
      }
    }
  }, [user, connect]);

  // Start health check when connected
  useEffect(() => {
    if (isConnected) {
      chatWebSocketManager.startHealthCheck();
    }
  }, [isConnected]);

  return {
    isConnected,
    connect,
    disconnect,
    sendMessage: sendChatMessage,
    startSession,
    endSession,
    sendTyping,
    joinSession,
    updateAdminStatus
  };
}
