/**
 * @fileoverview Admin chat management component
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useChatWebSocket, ChatSession, ChatMessageData, ChatDepartment } from '../../hooks/useChatWebSocket';
import { useAuth } from '../../hooks/use-auth';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MessageCircle, Users, Clock, AlertCircle, CheckCircle, XCircle, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '../ui/input';

export function AdminChatManagement() {
    const { user } = useAuth();
    const {
        isConnected,
        isConnecting,
        connectionError,
        currentSession,
        sessions,
        messages,
        typingUsers,
        departments,
        adminStatus,
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
    } = useChatWebSocket();

    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [isAvailable, setIsAvailable] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    // Connect to WebSocket on mount
    useEffect(() => {
        connect();
        requestDepartments();
        
        return () => {
            disconnect();
        };
    }, [connect, disconnect, requestDepartments]);

    // Set admin status
    useEffect(() => {
        if (user) {
            updateAdminStatus(true, isAvailable);
        }
    }, [user, isAvailable, updateAdminStatus]);

    // Handle typing indicator
    useEffect(() => {
        if (isTyping && selectedSession) {
            sendTypingIndicator(true, selectedSession.id.toString());
            
            const timeout = setTimeout(() => {
                setIsTyping(false);
                sendTypingIndicator(false, selectedSession.id.toString());
            }, 3000);

            return () => clearTimeout(timeout);
        } else if (selectedSession) {
            sendTypingIndicator(false, selectedSession.id.toString());
        }
    }, [isTyping, selectedSession, sendTypingIndicator]);

    const handleSendMessage = () => {
        if (!messageInput.trim() || !selectedSession) return;

        sendMessage(messageInput.trim(), selectedSession.id.toString());
        setMessageInput('');
        setIsTyping(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessageInput(e.target.value);
        setIsTyping(true);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleEndSession = (session: ChatSession) => {
        endSession(session.id.toString());
        if (selectedSession?.id === session.id) {
            setSelectedSession(null);
            clearMessages();
        }
    };

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
        if (message.isFromAdmin) return 'You';
        return `User ${message.userId}`;
    };

    const getSenderAvatar = (message: ChatMessageData) => {
        if (message.isFromAdmin) return user?.avatar;
        return undefined;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <MessageCircle className="h-6 w-6" />
                            <CardTitle>Chat Management</CardTitle>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                {getConnectionStatusIcon()}
                                <span className="text-sm text-muted-foreground">
                                    {getConnectionStatusText()}
                                </span>
                            </div>
                            <Button
                                variant={isAvailable ? "default" : "outline"}
                                size="sm"
                                onClick={() => setIsAvailable(!isAvailable)}
                            >
                                {isAvailable ? "Available" : "Unavailable"}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Connection Error */}
            {connectionError && (
                <Alert>
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

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Sessions */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Users className="h-5 w-5" />
                                <span>Active Sessions ({sessions.length})</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <div className="space-y-2">
                                    {sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                                selectedSession?.id === session.id
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted hover:bg-muted/80'
                                            }`}
                                            onClick={() => setSelectedSession(session)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">Session #{session.id}</p>
                                                    <p className="text-sm opacity-70">
                                                        User {session.userId}
                                                    </p>
                                                </div>
                                                <Badge variant="secondary">
                                                    {session.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center space-x-2 mt-2">
                                                <Clock className="h-3 w-3" />
                                                <span className="text-xs">
                                                    {formatMessageTime(session.lastActivityAt)}
                                                </span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-2 w-full"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEndSession(session);
                                                }}
                                            >
                                                End Session
                                            </Button>
                                        </div>
                                    ))}
                                    {sessions.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <MessageCircle className="h-12 w-12 mx-auto mb-4" />
                                            <p>No active sessions</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                {/* Chat Interface */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {selectedSession ? `Session #${selectedSession.id}` : 'Select a Session'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedSession ? (
                                <div className="space-y-4">
                                    {/* Messages */}
                                    <ScrollArea className="h-96">
                                        <div className="p-4 space-y-4">
                                            {messages.map((message) => (
                                                <div
                                                    key={message.id}
                                                    className={`flex ${message.isFromAdmin ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${message.isFromAdmin ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={getSenderAvatar(message)} />
                                                            <AvatarFallback>
                                                                {getSenderDisplayName(message).charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className={`rounded-lg px-3 py-2 ${message.isFromAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
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
                                                            <AvatarFallback>U</AvatarFallback>
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
                                        </div>
                                    </ScrollArea>

                                    {/* Message Input */}
                                    <div className="flex space-x-2">
                                        <Input
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
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <MessageCircle className="h-12 w-12 mx-auto mb-4" />
                                    <p>Select a session to start chatting</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
} 