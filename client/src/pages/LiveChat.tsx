import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Send, User, Bot, ArrowLeft, History, Clock, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';


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
  departmentId?: number;
  status: string;
  priority: string;
  subject?: string;
  department: string;
  startedAt: string;
  lastActivityAt: string;
  endedAt?: string;
}

interface ChatDepartment {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isDefault: boolean;
  isActive: boolean;
}

interface ChatHistorySession extends ChatSession {
  department?: ChatDepartment;
  messageCount?: number;
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

  // Department selection state
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [chatSubject, setChatSubject] = useState('');

  // Chat history state
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [historySearch, setHistorySearch] = useState('');
  const [selectedHistorySession, setSelectedHistorySession] = useState<ChatHistorySession | null>(null);
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);

  const [adminStatus, setAdminStatus] = useState<{
    available: boolean;
    adminCount: number;
    statusMessage: string;
    lastUpdated: string;
  }>({
    available: false,
    adminCount: 0,
    statusMessage: '',
    lastUpdated: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch chat departments
  const { data: departments = [] } = useQuery<ChatDepartment[]>({
    queryKey: ['/api/chat/departments'],
    queryFn: async () => {
      const response = await fetch('/api/chat/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
      return response.json();
    },
  });

  // Fetch chat history
  const { data: chatHistory = [], refetch: refetchHistory } = useQuery<ChatHistorySession[]>({
    queryKey: ['/api/chat/history'],
    queryFn: async () => {
      const response = await fetch('/api/chat/history?limit=50');
      if (!response.ok) throw new Error('Failed to fetch chat history');
      const data = await response.json();
      return data.history || [];
    },
    enabled: !!user,
  });

  const {
    sendMessage: sendWebSocketMessage,
    startSession,
    endSession,
    sendTyping,
    isConnected,
    connect,
    disconnect
  } = useChatWebSocket({
    onMessage: (data) => {
      if (data.type === 'message') {
        // Update regular session messages
        if (session && data.data.sessionId === session.id) {
          setMessages(prev => [...prev, data.data]);
          scrollToBottom();
        }

        // Update history messages if viewing the same session
        if (selectedHistorySession && data.data.sessionId === selectedHistorySession.id) {
          setHistoryMessages(prev => [...prev, data.data]);
        }
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
        // Also update history session if viewing it
        if (data.data.sessionId === selectedHistorySession?.id) {
          setSelectedHistorySession(prev => prev ? { ...prev, status: data.data.status } : prev);
        }
      } else if (data.type === 'admin_status_update') {
        // Handle real-time admin availability updates
        console.log('Received admin status update:', data.data);
        setAdminStatus(data.data);
      } else if (data.type === 'session_converted_to_ticket') {
        // Handle chat-to-ticket conversion
        const { ticketId, ticketSubject, message } = data.data;

        // Update session status to converted
        if (session && data.data.sessionId === session.id) {
          setSession(prev => prev ? { ...prev, status: 'converted_to_ticket' } : prev);
        }

        // Show conversion notification with ticket information
        toast({
          title: "Chat Converted to Ticket",
          description: `Your chat has been converted to support ticket #${ticketId}. You'll receive an email with details.`,
          duration: 8000,
        });

        // Add system message about conversion
        setMessages(prev => [...prev, {
          id: Date.now(),
          message: `This chat session has been converted to support ticket #${ticketId}: "${ticketSubject}". You will receive an email notification with instructions on how to continue the conversation through our ticket system.`,
          isFromAdmin: true,
          createdAt: new Date().toISOString(),
          user: { id: 0, fullName: 'System', role: 'system' },
          messageType: 'system'
        }]);

        // Auto-scroll to show the conversion message
        setTimeout(scrollToBottom, 100);

        console.log(`Chat session converted to ticket #${ticketId}: ${ticketSubject}`);
      }
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial admin status and set up polling
  useEffect(() => {
    const fetchAdminStatus = async () => {
      try {
        const response = await fetch('/api/chat/availability');
        if (response.ok) {
          const data = await response.json();
          setAdminStatus(data);
          console.log('Fetched admin status:', data);
        }
      } catch (error) {
        console.error('Failed to fetch admin status:', error);
      }
    };

    // Fetch initial status
    fetchAdminStatus();

    // Set up polling as fallback (every 30 seconds)
    const pollInterval = setInterval(fetchAdminStatus, 30000);

    return () => clearInterval(pollInterval);
  }, []);



  const handleStartChat = async () => {
    if (!user) return;

    try {
      // If WebSocket is not connected, show a connecting message
      if (!isConnected) {
        toast({
          title: "Connecting...",
          description: "Establishing connection to start your chat session.",
        });
      }

      // Use selected department or default
      const departmentToUse = selectedDepartment || departments.find(d => d.isDefault)?.id;

      console.log('Starting chat session with:', {
        selectedDepartment,
        departmentToUse,
        subject: chatSubject || 'General Support'
      });

      await startSession({
        subject: chatSubject || 'General Support',
        department: 'general', // Legacy field
        departmentId: departmentToUse
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
    if (!message.trim()) return;

    try {
      // If we're in a history session that's still active, send to that session
      if (selectedHistorySession && selectedHistorySession.status !== 'closed' && selectedHistorySession.status !== 'converted_to_ticket') {
        await sendWebSocketMessage({
          message: message.trim(),
          sessionId: selectedHistorySession.id
        });

        // Add message to local state immediately for better UX
        const newMessage = {
          id: Date.now(), // Temporary ID
          sessionId: selectedHistorySession.id,
          userId: user?.id || 0,
          message: message.trim(),
          isFromAdmin: false,
          createdAt: new Date().toISOString(),
          user: {
            id: user?.id || 0,
            fullName: user?.fullName || 'User',
            email: user?.email || ''
          }
        };
        setHistoryMessages(prev => [...prev, newMessage]);
      } else if (session) {
        // Regular session message sending
        await sendWebSocketMessage({
          message: message.trim(),
          sessionId: session.id
        });
        setIsTyping(false);
      } else {
        return; // No active session
      }

      setMessage('');
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

  // Handle viewing chat history session
  const handleViewHistorySession = async (historySession: ChatHistorySession) => {
    try {
      const response = await fetch(`/api/chat/history/${historySession.id}`);
      if (!response.ok) throw new Error('Failed to fetch session messages');

      const data = await response.json();
      setSelectedHistorySession(historySession);
      setHistoryMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Filter chat history based on search
  const filteredHistory = chatHistory.filter(session => {
    if (!historySearch) return true;
    const searchLower = historySearch.toLowerCase();
    return (
      session.subject?.toLowerCase().includes(searchLower) ||
      session.department?.name?.toLowerCase().includes(searchLower) ||
      session.id.toString().includes(searchLower)
    );
  });

  // Set default department on load
  useEffect(() => {
    if (departments.length > 0 && !selectedDepartment) {
      const defaultDept = departments.find(d => d.isDefault);
      if (defaultDept) {
        setSelectedDepartment(defaultDept.id);
      }
    }
  }, [departments, selectedDepartment]);



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
            <div className="ml-auto flex items-center space-x-2">
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? 'Connected' : 'Connecting...'}
              </Badge>
              <Badge variant={adminStatus.available ? 'default' : 'secondary'}>
                {adminStatus.available ? `${adminStatus.adminCount} Admin${adminStatus.adminCount !== 1 ? 's' : ''} Available` : 'No Admins Available'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'chat' | 'history')} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200">
            <TabsTrigger
              value="chat"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Live Chat
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200"
            >
              <History className="h-4 w-4 mr-2" />
              Chat History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-0">
            <Card className="h-[calc(100vh-250px)] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center justify-between">
                  <span>Support Chat</span>
                  {session && (
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          session.status === 'converted_to_ticket' ? 'secondary' :
                          session.status === 'closed' ? 'secondary' :
                          session.status === 'active' ? 'default' : 'outline'
                        }
                        className="text-xs"
                      >
                        {session.status === 'waiting' ? 'Waiting for admin' :
                         session.status === 'converted_to_ticket' ? 'Converted to Ticket' :
                         session.status === 'closed' ? 'Closed' : 'Active'}
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
                <div className="text-center max-w-lg w-full">
                  <MessageCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Start a Support Chat</h3>
                  <p className="text-gray-500 mb-6">
                    Connect with our support team for immediate assistance with your account, services, or any questions you may have.
                  </p>

                  {/* Department Selection */}
                  <div className="space-y-4 mb-6">
                    <div className="text-left">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Support Department
                      </label>
                      <Select
                        value={selectedDepartment?.toString() || ''}
                        onValueChange={(value) => setSelectedDepartment(parseInt(value))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id.toString()}>
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: dept.color }}
                                />
                                <span>{dept.name}</span>
                                {dept.isDefault && (
                                  <Badge variant="secondary" className="text-xs">Default</Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedDepartment && (
                        <p className="text-xs text-gray-500 mt-1">
                          {departments.find(d => d.id === selectedDepartment)?.description}
                        </p>
                      )}
                    </div>

                    <div className="text-left">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject (Optional)
                      </label>
                      <Input
                        value={chatSubject}
                        onChange={(e) => setChatSubject(e.target.value)}
                        placeholder="Brief description of your issue"
                        className="w-full"
                      />
                    </div>
                  </div>

                  {adminStatus.statusMessage && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Support Status:</strong> {adminStatus.statusMessage}
                      </p>
                    </div>
                  )}
                  {!adminStatus.available && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800">
                        <strong>Notice:</strong> No support agents are currently available. You can still start a chat session and an agent will respond when available.
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={handleStartChat}
                    disabled={!user || !selectedDepartment}
                    size="lg"
                    className="w-full"
                  >
                    {adminStatus.available ? 'Start Chat Session' : 'Start Chat Session (Queue)'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-hidden min-h-0 chat-messages-area">
                  <ScrollArea className="h-full w-full">
                    <div className="p-6 space-y-4 w-full">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex chat-message-container",
                            msg.isFromAdmin ? "justify-start" : "justify-end"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] min-w-0 rounded-lg px-4 py-3 text-sm chat-message-bubble",
                              msg.user?.role === 'system'
                                ? "bg-amber-50 border border-amber-200 text-amber-800"
                                : msg.isFromAdmin
                                ? "bg-gray-100 text-gray-900"
                                : "bg-blue-600 text-white"
                            )}
                          >
                            <div className="flex items-center space-x-2 mb-1 flex-wrap">
                              {msg.user?.role === 'system' ? (
                                <div className="h-3 w-3 rounded-full bg-amber-500 flex-shrink-0" />
                              ) : msg.isFromAdmin ? (
                                <Bot className="h-3 w-3 flex-shrink-0" />
                              ) : (
                                <User className="h-3 w-3 flex-shrink-0" />
                              )}
                              <span className="text-xs opacity-70 truncate">
                                {msg.user.fullName}
                              </span>
                              <span className="text-xs opacity-50 flex-shrink-0">
                                {new Date(msg.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="leading-relaxed break-words whitespace-pre-wrap overflow-wrap-anywhere">{msg.message}</p>
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
                  {session && (session.status === 'converted_to_ticket' || session.status === 'closed') ? (
                    <div className="text-center py-4">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600">
                          {session.status === 'converted_to_ticket'
                            ? 'This chat session has been converted to a support ticket. You will receive an email with instructions to continue the conversation.'
                            : 'This chat session has ended.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex space-x-3">
                      <Input
                        value={message}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        placeholder={isConnected ? "Type your message..." : "Connecting..."}
                        disabled={!isConnected}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!message.trim() || !isConnected}
                        size="sm"
                        className="px-6"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {isTyping && (
                    <p className="text-xs text-gray-500 mt-2">You are typing...</p>
                  )}
                  {!isConnected && (
                    <p className="text-xs text-amber-600 mt-2">Establishing connection...</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
              {/* History List */}
              <div className="lg:col-span-1">
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex-shrink-0 pb-4">
                    <CardTitle className="text-lg font-semibold flex items-center">
                      <History className="h-5 w-5 mr-2 text-blue-600" />
                      Chat History
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Search chat history..."
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden p-0 min-h-0">
                    <ScrollArea className="h-full">
                      <div className="p-6 pt-0 space-y-3">
                        {filteredHistory.length === 0 ? (
                          <div className="text-center py-8">
                            <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No chat history found</p>
                          </div>
                        ) : (
                          filteredHistory.map((historySession) => (
                            <div
                              key={historySession.id}
                              className={cn(
                                "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md",
                                selectedHistorySession?.id === historySession.id
                                  ? "border-blue-300 bg-blue-50"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              )}
                              onClick={() => handleViewHistorySession(historySession)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: historySession.department?.color || '#6b7280'
                                    }}
                                  />
                                  <span className="font-medium text-sm text-gray-900">
                                    #{historySession.id}
                                  </span>
                                </div>
                                <Badge
                                  variant={
                                    historySession.status === 'closed' ? 'secondary' :
                                    historySession.status === 'converted_to_ticket' ? 'secondary' :
                                    historySession.status === 'active' ? 'default' :
                                    'outline'
                                  }
                                  className="text-xs"
                                >
                                  {historySession.status === 'waiting' ? 'Awaiting Response' :
                                   historySession.status === 'converted_to_ticket' ? 'Converted to Ticket' :
                                   historySession.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700 truncate mb-2">
                                {historySession.subject || 'General Support'}
                              </p>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{historySession.department?.name || 'General'}</span>
                                <div className="flex items-center space-x-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {new Date(historySession.startedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* History Messages */}
              <div className="lg:col-span-2">
                <Card className="h-full flex flex-col chat-container">
                  {selectedHistorySession ? (
                    <>
                      <CardHeader className="flex-shrink-0 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg font-semibold">
                              Chat Session #{selectedHistorySession.id}
                            </CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedHistorySession.subject || 'General Support'} •
                              Started {new Date(selectedHistorySession.startedAt).toLocaleString()}
                              {selectedHistorySession.endedAt && (
                                <> • Ended {new Date(selectedHistorySession.endedAt).toLocaleString()}</>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: selectedHistorySession.department?.color,
                                color: selectedHistorySession.department?.color
                              }}
                            >
                              {selectedHistorySession.department?.name || 'General'}
                            </Badge>
                            <Badge
                              variant={
                                selectedHistorySession.status === 'closed' ? 'secondary' :
                                selectedHistorySession.status === 'converted_to_ticket' ? 'secondary' :
                                selectedHistorySession.status === 'active' ? 'default' :
                                'outline'
                              }
                              className="text-xs"
                            >
                              {selectedHistorySession.status === 'waiting' ? 'Awaiting Response' :
                               selectedHistorySession.status === 'converted_to_ticket' ? 'Converted to Ticket' :
                               selectedHistorySession.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col min-h-0">
                        <ScrollArea className="flex-1 w-full chat-messages-area">
                          <div className="p-6 space-y-4 w-full">
                            {historyMessages.length === 0 ? (
                              <div className="text-center py-12">
                                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No messages</h3>
                                <p className="text-gray-500">
                                  This chat session has no messages.
                                </p>
                              </div>
                            ) : (
                              historyMessages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={cn(
                                    "flex chat-message-container",
                                    msg.isFromAdmin ? "justify-start" : "justify-end"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "max-w-[70%] min-w-0 rounded-lg px-4 py-3 text-sm chat-message-bubble",
                                      msg.user?.role === 'system'
                                        ? "bg-amber-50 border border-amber-200 text-amber-800"
                                        : msg.isFromAdmin
                                        ? "bg-gray-100 text-gray-900"
                                        : "bg-blue-600 text-white"
                                    )}
                                  >
                                    <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                      {msg.user?.role === 'system' ? (
                                        <div className="h-3 w-3 rounded-full bg-amber-500 flex-shrink-0" />
                                      ) : msg.isFromAdmin ? (
                                        <Bot className="h-3 w-3 flex-shrink-0" />
                                      ) : (
                                        <User className="h-3 w-3 flex-shrink-0" />
                                      )}
                                      <span className="text-xs opacity-70 truncate">
                                        {msg.user.fullName}
                                      </span>
                                      <span className="text-xs opacity-50 flex-shrink-0">
                                        {new Date(msg.createdAt).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <p className="leading-relaxed break-words whitespace-pre-wrap overflow-wrap-anywhere">{msg.message}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>

                        {/* Message Input for Active Sessions */}
                        {selectedHistorySession && selectedHistorySession.status !== 'closed' && selectedHistorySession.status !== 'converted_to_ticket' && (
                          <div className="border-t border-gray-100 p-4 bg-white">
                            <div className="flex space-x-3">
                              <Input
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                  }
                                }}
                                placeholder="Type your message..."
                                className="flex-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                disabled={!isConnected}
                              />
                              <Button
                                onClick={handleSendMessage}
                                disabled={!message.trim() || !isConnected}
                                className="px-6"
                                style={{ backgroundColor: '#3b82f6' }}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  isConnected ? "bg-green-500" : "bg-red-500"
                                )} />
                                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                              </div>
                              <div className="text-xs text-gray-400">
                                Press Enter to send
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </>
                  ) : (
                    <CardContent className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Chat Session</h3>
                        <p className="text-gray-500">
                          Choose a chat session from the history to view its messages.
                        </p>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
