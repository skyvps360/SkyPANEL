/**
 * @fileoverview React hook for chat WebSocket functionality
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatWebSocketManager, ChatMessage, ChatConnectionMetrics } from '../lib/chat-websocket-manager';
import { useAuth } from './use-auth';

export interface ChatSession {
    id: number;
    userId: number;
    assignedAdminId?: number;
    departmentId?: number;
    status: string;
    priority: string;
    subject?: string;
    department: string;
    convertedToTicketId?: number;
    convertedAt?: string;
    convertedByAdminId?: number;
    metadata?: any;
    startedAt: string;
    endedAt?: string;
    lastActivityAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface ChatMessageData {
    id: number;
    sessionId: number;
    userId: number;
    message: string;
    messageType: string;
    isFromAdmin: boolean;
    readAt?: string;
    metadata?: any;
    createdAt: string;
}

export interface ChatDepartment {
    id: number;
    name: string;
    description?: string;
    isDefault: boolean;
    isActive: boolean;
    displayOrder: number;
    color: string;
    icon: string;
    createdAt: string;
    updatedAt: string;
}

export interface AdminChatStatus {
    id: number;
    userId: number;
    isOnline: boolean;
    isAvailable: boolean;
    currentSessionId?: number;
    lastActivityAt: string;
    metadata?: any;
}

export interface UseChatWebSocketReturn {
    // Connection state
    isConnected: boolean;
    isConnecting: boolean;
    connectionError: string | null;
    
    // Session state
    currentSession: ChatSession | null;
    sessions: ChatSession[];
    
    // Message state
    messages: ChatMessageData[];
    typingUsers: Set<number>;
    
    // Department state
    departments: ChatDepartment[];
    
    // Admin state
    adminStatus: AdminChatStatus[];
    currentUserStatus: AdminChatStatus | null;
    
    // Connection metrics
    metrics: ChatConnectionMetrics;
    
    // Connection methods
    connect: () => Promise<void>;
    disconnect: () => void;
    
    // Session methods
    startSession: (sessionId?: string, departmentId?: number) => void;
    endSession: (sessionId: string) => void;
    
    // Message methods
    sendMessage: (message: string, sessionId: string) => void;
    sendTypingIndicator: (isTyping: boolean, sessionId: string) => void;
    
    // Admin methods
    updateAdminStatus: (isOnline: boolean, isAvailable: boolean, currentSessionId?: number) => void;
    
    // Department methods
    requestDepartments: () => void;
    
    // Utility methods
    clearMessages: () => void;
    clearError: () => void;
}

export function useChatWebSocket(): UseChatWebSocketReturn {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    
    const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [messages, setMessages] = useState<ChatMessageData[]>([]);
    const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
    const [departments, setDepartments] = useState<ChatDepartment[]>([]);
    const [adminStatus, setAdminStatus] = useState<AdminChatStatus[]>([]);
    const [currentUserStatus, setCurrentUserStatus] = useState<AdminChatStatus | null>(null);
    const [metrics, setMetrics] = useState<ChatConnectionMetrics>({
        messagesSent: 0,
        messagesReceived: 0,
        connectionTime: 0,
        lastActivity: new Date()
    });

    const managerRef = useRef<ChatWebSocketManager | null>(null);

    const connect = useCallback(async () => {
        if (!managerRef.current) {
            managerRef.current = new ChatWebSocketManager();
        }

        setIsConnecting(true);
        setConnectionError(null);

        try {
            await managerRef.current.connect();
            setIsConnected(true);
        } catch (error) {
            setConnectionError(error instanceof Error ? error.message : 'Connection failed');
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        if (managerRef.current) {
            managerRef.current.disconnect();
            setIsConnected(false);
        }
    }, []);

    const startSession = useCallback((sessionId?: string, departmentId?: number) => {
        if (managerRef.current) {
            managerRef.current.startSession(sessionId, departmentId);
        }
    }, []);

    const endSession = useCallback((sessionId: string) => {
        if (managerRef.current) {
            managerRef.current.endSession(sessionId);
        }
    }, []);

    const sendMessage = useCallback((message: string, sessionId: string) => {
        if (managerRef.current) {
            managerRef.current.sendChatMessage(message, sessionId);
        }
    }, []);

    const sendTypingIndicator = useCallback((isTyping: boolean, sessionId: string) => {
        if (managerRef.current) {
            managerRef.current.sendTypingIndicator(isTyping, sessionId);
        }
    }, []);

    const updateAdminStatus = useCallback((isOnline: boolean, isAvailable: boolean, currentSessionId?: number) => {
        if (managerRef.current) {
            managerRef.current.updateAdminStatus(isOnline, isAvailable, currentSessionId);
        }
    }, []);

    const requestDepartments = useCallback(() => {
        if (managerRef.current) {
            managerRef.current.requestDepartments();
        }
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    const clearError = useCallback(() => {
        setConnectionError(null);
    }, []);

    // Handle WebSocket messages
    useEffect(() => {
        if (!managerRef.current) return;

        const handleMessage = (message: ChatMessage) => {
            switch (message.type) {
                case 'connection_established':
                    setIsConnected(true);
                    setConnectionError(null);
                    break;

                case 'session_started':
                    if (message.session) {
                        setCurrentSession(message.session);
                    }
                    break;

                case 'session_end':
                    setCurrentSession(null);
                    break;

                case 'message':
                    setMessages(prev => [...prev, {
                        id: Date.now(),
                        sessionId: parseInt(message.sessionId || '0'),
                        userId: message.senderId || 0,
                        message: message.message || '',
                        messageType: 'text',
                        isFromAdmin: message.senderType === 'admin',
                        createdAt: message.timestamp || new Date().toISOString(),
                        metadata: message.metadata
                    }]);
                    break;

                case 'typing':
                    if (message.isTyping) {
                        setTypingUsers(prev => new Set([...prev, message.userId || 0]));
                    } else {
                        setTypingUsers(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(message.userId || 0);
                            return newSet;
                        });
                    }
                    break;

                case 'department_list':
                    if (message.departments) {
                        setDepartments(message.departments);
                    }
                    break;

                case 'admin_status_update':
                    setAdminStatus(prev => {
                        const existing = prev.find(status => status.userId === message.userId);
                        if (existing) {
                            return prev.map(status => 
                                status.userId === message.userId 
                                    ? { ...status, isOnline: message.isOnline || false, isAvailable: message.isAvailable || false }
                                    : status
                            );
                        } else {
                            return [...prev, {
                                id: Date.now(),
                                userId: message.userId || 0,
                                isOnline: message.isOnline || false,
                                isAvailable: message.isAvailable || false,
                                lastActivityAt: new Date().toISOString(),
                                metadata: message.metadata
                            }];
                        }
                    });
                    break;

                case 'error':
                    setConnectionError(message.error || 'Unknown error');
                    break;
            }
        };

        const handleConnect = () => {
            setIsConnected(true);
            setConnectionError(null);
        };

        const handleDisconnect = () => {
            setIsConnected(false);
        };

        const handleError = (error: string) => {
            setConnectionError(error);
        };

        managerRef.current.onMessage(handleMessage);
        managerRef.current.onConnect(handleConnect);
        managerRef.current.onDisconnect(handleDisconnect);
        managerRef.current.onError(handleError);

        // Update metrics periodically
        const metricsInterval = setInterval(() => {
            if (managerRef.current) {
                setMetrics(managerRef.current.getMetrics());
            }
        }, 1000);

        return () => {
            if (managerRef.current) {
                managerRef.current.removeMessageListener(handleMessage);
                managerRef.current.removeConnectListener(handleConnect);
                managerRef.current.removeDisconnectListener(handleDisconnect);
                managerRef.current.removeErrorListener(handleError);
            }
            clearInterval(metricsInterval);
        };
    }, []);

    // Auto-connect when user is available
    useEffect(() => {
        if (user && !isConnected && !isConnecting) {
            connect();
        }
    }, [user, isConnected, isConnecting, connect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        isConnected,
        isConnecting,
        connectionError,
        currentSession,
        sessions,
        messages,
        typingUsers,
        departments,
        adminStatus,
        currentUserStatus,
        metrics,
        connect,
        disconnect,
        startSession,
        endSession,
        sendMessage,
        sendTypingIndicator,
        updateAdminStatus,
        requestDepartments,
        clearMessages,
        clearError
    };
} 