/**
 * @fileoverview Enhanced chat interface component
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChatWebSocket, ChatSession, ChatMessageData, ChatDepartment } from '../../hooks/useChatWebSocket';
import { useAuth } from '../../hooks/use-auth';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Send, MessageCircle, Users, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedChatInterfaceProps {
    initialDepartmentId?: number;
    onSessionStart?: (session: ChatSession) => void;
    onSessionEnd?: (sessionId: string) => void;
    onMessageSend?: (message: string, sessionId: string) => void;
    className?: string;
}

export function EnhancedChatInterface({
    initialDepartmentId,
    onSessionStart,
    onSessionEnd,
    onMessageSend,
    className = ''
}: EnhancedChatInterfaceProps) {
    const { user } = useAuth();
    const {
        isConnected,
        isConnecting,
        connectionError,
        currentSession,
        messages,
        typingUsers,
        departments,
        connect,
        disconnect,
        startSession,
        endSession,
        sendMessage,
        sendTypingIndicator,
        requestDepartments,
        clearMessages,
        clearError
    } = useChatWebSocket();

    const [messageInput, setMessageInput] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState<ChatDepartment | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [showDepartments, setShowDepartments] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();
    const messageInputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Connect to WebSocket on mount
    useEffect(() => {
        connect();
        requestDepartments();
        
        return () => {
            disconnect();
        };
    }, [connect, disconnect, requestDepartments]);

    // Set initial department
    useEffect(() => {
        if (initialDepartmentId && departments.length > 0) {
            const dept = departments.find(d => d.id === initialDepartmentId);
            if (dept) {
                setSelectedDepartment(dept);
            }
        }
    }, [initialDepartmentId, departments]);

    // Handle typing indicator
    useEffect(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        if (isTyping) {
            sendTypingIndicator(true, currentSession?.id?.toString() || '');
            
            typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
                sendTypingIndicator(false, currentSession?.id?.toString() || '');
            }, 3000);
        } else {
            sendTypingIndicator(false, currentSession?.id?.toString() || '');
        }

        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [isTyping, currentSession?.id, sendTypingIndicator]);

    const handleStartSession = useCallback(() => {
        if (!selectedDepartment) return;
        
        // Generate a unique session ID for this client
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        startSession(sessionId, selectedDepartment.id);
        setShowDepartments(false);
    }, [selectedDepartment, startSession]);

    const handleEndSession = useCallback(() => {
        if (currentSession) {
            endSession(currentSession.id.toString());
            onSessionEnd?.(currentSession.id.toString());
        }
    }, [currentSession, endSession, onSessionEnd]);

    const handleSendMessage = useCallback(() => {
        if (!messageInput.trim() || !currentSession) return;

        sendMessage(messageInput.trim(), currentSession.id.toString());
        onMessageSend?.(messageInput.trim(), currentSession.id.toString());
        setMessageInput('');
        setIsTyping(false);
    }, [messageInput, currentSession, sendMessage, onMessageSend]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageInput(e.target.value);
        setIsTyping(true);
    }, []);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [handleSendMessage]);

    const getConnectionStatusIcon = () => {
        if (isConnecting) return <Loader2 className="h-4 w-4 animate-spin" />;
        if (isConnected) return <CheckCircle className="h-4 w-4 text-green-500" />;
        return <XCircle className="h-4 w-4 text-red-500" />;
    };

    const getConnectionStatusText = () => {
        if (isConnecting) return 'Connecting...';
        if (isConnected) return 'Connected';
        return 'Disconnected';
    };

    const formatMessageTime = (timestamp: string) => {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    };

    const getSenderDisplayName = (message: ChatMessageData) => {
        if (message.isFromAdmin) return 'Support Agent';
        return user?.username || 'You';
    };

    const getSenderAvatar = (message: ChatMessageData) => {
        if (message.isFromAdmin) return '/admin-avatar.png';
        return user?.avatar || undefined;
    };

    return (
        <div className={`flex flex-col h-full ${className}`}>
            {/* Header */}
            <Card className="mb-4">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <MessageCircle className="h-5 w-5" />
                            <CardTitle className="text-lg">Live Chat</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                            {getConnectionStatusIcon()}
                            <span className="text-sm text-muted-foreground">
                                {getConnectionStatusText()}
                            </span>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Connection Error */}
            {connectionError && (
                <Alert className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {connectionError}
                        <Button
                            variant="link"
                            size="sm"
                            onClick={clearError}
                            className="ml-2 p-0 h-auto"
                        >
                            Dismiss
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Department Selection */}
            {!currentSession && !showDepartments && (
                <Card className="mb-4">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-semibold mb-2">Start a Chat Session</h3>
                            <p className="text-muted-foreground mb-4">
                                Choose a department to start chatting with our support team.
                            </p>
                            <Button onClick={() => setShowDepartments(true)}>
                                Select Department
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Department List */}
            {showDepartments && (
                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle>Select Department</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {departments.map((dept) => (
                                <Button
                                    key={dept.id}
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => {
                                        setSelectedDepartment(dept);
                                        handleStartSession();
                                    }}
                                >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    {dept.name}
                                    {dept.description && (
                                        <span className="text-muted-foreground ml-2">
                                            - {dept.description}
                                        </span>
                                    )}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Chat Session */}
            {currentSession && (
                <>
                    {/* Session Header */}
                    <Card className="mb-4">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Badge variant="secondary">
                                        {selectedDepartment?.name || 'General Support'}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        Session started {formatMessageTime(currentSession.startedAt)}
                                    </span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleEndSession}
                                >
                                    End Session
                                </Button>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Messages */}
                    <Card className="flex-1 mb-4">
                        <CardContent className="p-0">
                            <ScrollArea className="h-96">
                                <div className="p-4 space-y-4">
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex ${message.isFromAdmin ? 'justify-start' : 'justify-end'}`}
                                        >
                                            <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${message.isFromAdmin ? '' : 'flex-row-reverse space-x-reverse'}`}>
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={getSenderAvatar(message)} />
                                                    <AvatarFallback>
                                                        {getSenderDisplayName(message).charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className={`rounded-lg px-3 py-2 ${message.isFromAdmin ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                                                    <p className="text-sm">{message.message}</p>
                                                    <p className="text-xs opacity-70 mt-1">
                                                        {formatMessageTime(message.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Typing indicators */}
                                    {typingUsers.size > 0 && (
                                        <div className="flex justify-start">
                                            <div className="flex items-center space-x-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback>SA</AvatarFallback>
                                                </Avatar>
                                                <div className="bg-muted rounded-lg px-3 py-2">
                                                    <div className="flex space-x-1">
                                                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                                                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    {/* Message Input */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex space-x-2">
                                <Input
                                    ref={messageInputRef}
                                    placeholder="Type your message..."
                                    value={messageInput}
                                    onChange={handleInputChange}
                                    onKeyPress={handleKeyPress}
                                    disabled={!isConnected}
                                />
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim() || !isConnected}
                                    size="icon"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
} 