import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Send, X, Minimize2, Maximize2, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { useAuth } from '@/hooks/use-auth';

interface ChatMessage {
  id: number;
  message: string;
  isFromAdmin: boolean;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    role: string;
  };
}

interface ChatSession {
  id: number;
  status: string;
  subject?: string;
  department: string;
  startedAt: string;
  assignedAdminId?: number;
}

interface ChatWidgetProps {
  className?: string;
}

export function ChatWidget({ className }: ChatWidgetProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    sendMessage: sendWebSocketMessage,
    startSession,
    endSession,
    sendTyping,
    isConnected
  } = useChatWebSocket({
    onMessage: (data) => {
      if (data.type === 'message') {
        setMessages(prev => [...prev, data.data]);
        scrollToBottom();
      } else if (data.type === 'session_started' || data.type === 'session_resumed') {
        setSession(data.data);
      } else if (data.type === 'session_ended') {
        setSession(null);
        setMessages([]);
      } else if (data.type === 'typing') {
        if (data.data.userId !== user?.id) {
          setAdminTyping(data.data.isTyping);
        }
      } else if (data.type === 'admin_joined') {
        // Admin joined the session
        setMessages(prev => [...prev, {
          id: Date.now(),
          message: 'An admin has joined the chat',
          isFromAdmin: false,
          createdAt: new Date().toISOString(),
          user: { id: 0, fullName: 'System', role: 'system' }
        }]);
      }
    },
    onConnectionChange: (connected) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Connection is now handled automatically by the hook

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartChat = async () => {
    if (!user) return;
    
    try {
      await startSession({
        subject: 'General Support',
        department: 'general'
      });
    } catch (error) {
      console.error('Failed to start chat session:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !session) return;

    try {
      await sendWebSocketMessage({
        message: message.trim(),
        sessionId: session.id
      });
      setMessage('');
      setIsTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleEndChat = async () => {
    if (!session) return;

    try {
      await endSession({ sessionId: session.id });
      setSession(null);
      setMessages([]);
    } catch (error) {
      console.error('Failed to end chat session:', error);
    }
  };

  const handleTyping = () => {
    if (!session) return;

    setIsTyping(true);
    sendTyping({ sessionId: session.id, isTyping: true });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping({ sessionId: session.id, isTyping: false });
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else {
      handleTyping();
    }
  };

  if (!user) {
    return null; // Don't show chat widget for unauthenticated users
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-50", className)}>
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      ) : (
        <Card className={cn(
          "w-80 shadow-xl transition-all duration-200",
          isMinimized ? "h-14" : "h-96"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Live Support Chat
            </CardTitle>
            <div className="flex items-center space-x-1">
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'} className="text-xs">
                {connectionStatus === 'connected' ? 'Online' : 'Offline'}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0"
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>

          {!isMinimized && (
            <CardContent className="p-0">
              {!session ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Start a chat session to get help from our support team.
                  </p>
                  <Button onClick={handleStartChat} disabled={connectionStatus !== 'connected'}>
                    Start Chat
                  </Button>
                </div>
              ) : (
                <>
                  <div className="px-4 py-2 bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {session.status === 'waiting' ? 'Waiting for admin' : 'Active'}
                        </Badge>
                        {session.subject && (
                          <span className="text-xs text-muted-foreground">{session.subject}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEndChat}
                        className="text-xs h-6"
                      >
                        End Chat
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-64 p-4">
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            msg.isFromAdmin ? "justify-start" : "justify-end"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                              msg.isFromAdmin
                                ? "bg-muted text-foreground"
                                : "bg-primary text-primary-foreground"
                            )}
                          >
                            <div className="flex items-center space-x-1 mb-1">
                              {msg.isFromAdmin ? (
                                <Bot className="h-3 w-3" />
                              ) : (
                                <User className="h-3 w-3" />
                              )}
                              <span className="text-xs opacity-70">
                                {msg.user.fullName}
                              </span>
                            </div>
                            <p>{msg.message}</p>
                          </div>
                        </div>
                      ))}
                      {adminTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                            <div className="flex items-center space-x-2">
                              <Bot className="h-3 w-3" />
                              <span className="text-xs">Admin is typing...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div ref={messagesEndRef} />
                  </ScrollArea>

                  <Separator />

                  <div className="p-4">
                    <div className="flex space-x-2">
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message..."
                        disabled={connectionStatus !== 'connected'}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!message.trim() || connectionStatus !== 'connected'}
                        size="sm"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    {isTyping && (
                      <p className="text-xs text-muted-foreground mt-1">You are typing...</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
