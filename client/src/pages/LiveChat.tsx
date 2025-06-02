import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Send, User, Bot, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: number;
  message: string;
  isFromAdmin: boolean;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    role?: string;
  };
}

interface ChatSession {
  id: number;
  userId: number;
  assignedAdminId?: number;
  status: string;
  priority: string;
  subject?: string;
  department: string;
  startedAt: string;
  lastActivityAt: string;
}

export default function LiveChat() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
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
        toast({
          title: "Chat Ended",
          description: "The chat session has been ended.",
        });
      } else if (data.type === 'typing') {
        if (data.data.userId !== user?.id) {
          setAdminTyping(data.data.isTyping);
        }
      } else if (data.type === 'admin_joined') {
        // Admin joined the session - update session status
        if (session) {
          setSession(prev => prev ? { ...prev, status: 'active' } : prev);
        }
        setMessages(prev => [...prev, {
          id: Date.now(),
          message: 'An admin has joined the chat',
          isFromAdmin: false,
          createdAt: new Date().toISOString(),
          user: { id: 0, fullName: 'System', role: 'system' }
        }]);
        toast({
          title: "Admin Joined",
          description: "A support agent has joined your chat.",
        });
      } else if (data.type === 'session_update') {
        // Handle session status updates
        if (data.data.sessionId === session?.id) {
          setSession(prev => prev ? { ...prev, status: data.data.status } : prev);
        }
      }
    },
    onConnectionChange: (connected) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      toast({
        title: "Chat Started",
        description: "Your chat session has been started. Please wait for an admin to join.",
      });
    } catch (error) {
      console.error('Failed to start chat session:', error);
      toast({
        title: "Error",
        description: "Failed to start chat session. Please try again.",
        variant: "destructive"
      });
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
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEndChat = async () => {
    if (!session) return;

    try {
      await endSession({ sessionId: session.id });
      setSession(null);
      setMessages([]);
      toast({
        title: "Chat Ended",
        description: "Your chat session has been ended.",
      });
    } catch (error) {
      console.error('Failed to end chat session:', error);
      toast({
        title: "Error",
        description: "Failed to end chat session.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    if (!isTyping && session) {
      setIsTyping(true);
      sendTyping({ sessionId: session.id, isTyping: true });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (session) {
        sendTyping({ sessionId: session.id, isTyping: false });
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div className="flex items-center space-x-3">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Live Support Chat</h1>
                <p className="text-sm text-gray-500">Get instant help from our support team</p>
              </div>
            </div>
            <div className="ml-auto">
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
                {connectionStatus === 'connected' ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="h-[calc(100vh-200px)] flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center justify-between">
              <span>Support Chat</span>
              {session && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {session.status === 'waiting' ? 'Waiting for admin' : 'Active'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEndChat}
                    className="text-xs"
                  >
                    End Chat
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
            {!session ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Start a Support Chat</h3>
                  <p className="text-gray-500 mb-6">
                    Connect with our support team for immediate assistance with your account, services, or any questions you may have.
                  </p>
                  <Button 
                    onClick={handleStartChat} 
                    disabled={connectionStatus !== 'connected'}
                    size="lg"
                    className="w-full"
                  >
                    Start Chat Session
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full p-6">
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
                              "max-w-[70%] rounded-lg px-4 py-3 text-sm",
                              msg.isFromAdmin
                                ? "bg-gray-100 text-gray-900"
                                : "bg-blue-600 text-white"
                            )}
                          >
                            <div className="flex items-center space-x-2 mb-1">
                              {msg.isFromAdmin ? (
                                <Bot className="h-3 w-3" />
                              ) : (
                                <User className="h-3 w-3" />
                              )}
                              <span className="text-xs opacity-70">
                                {msg.user.fullName}
                              </span>
                            </div>
                            <p className="leading-relaxed">{msg.message}</p>
                          </div>
                        </div>
                      ))}

                      {adminTyping && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 rounded-lg px-4 py-3 text-sm">
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
                </div>

                <Separator className="flex-shrink-0" />

                {/* Input Area */}
                <div className="p-6 flex-shrink-0">
                  <div className="flex space-x-3">
                    <Input
                      value={message}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyPress}
                      placeholder="Type your message..."
                      disabled={connectionStatus !== 'connected'}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || connectionStatus !== 'connected'}
                      size="sm"
                      className="px-6"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {isTyping && (
                    <p className="text-xs text-gray-500 mt-2">You are typing...</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
