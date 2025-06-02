import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  MessageCircle,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  User,
  Bot,
  Settings,
  Activity
} from 'lucide-react';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  user: {
    id: number;
    fullName: string;
    email: string;
  };
  assignedAdmin?: {
    id: number;
    fullName: string;
  };
}

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

interface AdminChatStats {
  activeSessions: number;
  totalMessages: number;
  averageResponseTime: number;
}

export default function AdminChatManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [adminStatus, setAdminStatus] = useState('online');
  const [statusMessage, setStatusMessage] = useState('');
  const [maxConcurrentChats, setMaxConcurrentChats] = useState(5);
  const [autoAssign, setAutoAssign] = useState(true);

  // Fetch chat sessions
  const { data: sessionsData, refetch: refetchSessions } = useQuery<{ sessions: ChatSession[] }>({
    queryKey: ['/api/chat/admin/sessions'],
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Fetch admin stats
  const { data: statsData } = useQuery<{ stats: AdminChatStats }>({
    queryKey: ['/api/chat/admin/stats'],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch admin status
  const { data: currentStatusData } = useQuery<{ status: any }>({
    queryKey: ['/api/chat/admin/status'],
  });

  // Update admin status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (statusData: any) => {
      const response = await fetch('/api/chat/admin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusData),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Status updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/admin/status'] });
    },
    onError: () => {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    },
  });

  // Assign session mutation
  const assignSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await fetch(`/api/chat/admin/sessions/${sessionId}/assign`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to assign session');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Session assigned successfully' });
      refetchSessions();
    },
    onError: () => {
      toast({ title: 'Failed to assign session', variant: 'destructive' });
    },
  });

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await fetch(`/api/chat/admin/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to end session');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Session ended successfully' });
      setSelectedSession(null);
      setMessages([]);
      refetchSessions();
    },
    onError: () => {
      toast({ title: 'Failed to end session', variant: 'destructive' });
    },
  });

  const {
    sendMessage: sendWebSocketMessage,
    joinSession,
    updateAdminStatus,
    isConnected
  } = useChatWebSocket({
    onMessage: (data) => {
      if (data.type === 'message') {
        setMessages(prev => [...prev, data.data]);
      } else if (data.type === 'new_session') {
        // New session notification
        toast({
          title: 'New chat session',
          description: `${data.data.user?.fullName || 'A user'} started a new chat session`,
        });
        refetchSessions();
      } else if (data.type === 'session_ended') {
        if (selectedSession?.id === data.data.sessionId) {
          setSelectedSession(null);
          setMessages([]);
        }
        refetchSessions();
      }
    },
    onConnectionChange: (connected) => {
      if (connected) {
        toast({ title: 'Connected to chat system' });
      } else {
        toast({ title: 'Disconnected from chat system', variant: 'destructive' });
      }
    }
  });

  useEffect(() => {
    if (currentStatusData?.status) {
      setAdminStatus(currentStatusData.status.status || 'online');
      setStatusMessage(currentStatusData.status.statusMessage || '');
      setMaxConcurrentChats(currentStatusData.status.maxConcurrentChats || 5);
      setAutoAssign(currentStatusData.status.autoAssign !== false);
    }
  }, [currentStatusData]);

  const handleJoinSession = async (session: ChatSession) => {
    try {
      setSelectedSession(session);
      
      // Fetch messages for this session
      const response = await fetch(`/api/chat/admin/sessions/${session.id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }

      // Join the session via WebSocket
      await joinSession(session.id);

      // Assign session to current admin if not already assigned
      if (!session.assignedAdminId) {
        assignSessionMutation.mutate(session.id);
      }
    } catch (error) {
      console.error('Failed to join session:', error);
      toast({ title: 'Failed to join session', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedSession) return;

    try {
      await sendWebSocketMessage({
        message: message.trim(),
        sessionId: selectedSession.id
      });
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({ title: 'Failed to send message', variant: 'destructive' });
    }
  };

  const handleUpdateStatus = () => {
    updateStatusMutation.mutate({
      status: adminStatus,
      statusMessage,
      maxConcurrentChats,
      autoAssign
    });
  };

  const sessions = sessionsData?.sessions || [];
  const stats = statsData?.stats || { activeSessions: 0, totalMessages: 0, averageResponseTime: 0 };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500';
      case 'active': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'normal': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Live Chat Management</h1>
            <p className="text-muted-foreground">
              Manage real-time chat support sessions and respond to customer inquiries
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSessions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageResponseTime}s</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Chat Sessions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sessions List */}
            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {sessions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No active sessions</p>
                    ) : (
                      sessions.map((session) => (
                        <div
                          key={session.id}
                          className={cn(
                            "p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                            selectedSession?.id === session.id && "bg-muted"
                          )}
                          onClick={() => handleJoinSession(session)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={cn("w-2 h-2 rounded-full", getStatusColor(session.status))} />
                              <span className="font-medium">{session.user.fullName}</span>
                              <Badge variant={getPriorityColor(session.priority)} className="text-xs">
                                {session.priority}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(session.lastActivityAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {session.subject || 'No subject'}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {session.department}
                            </span>
                            {session.assignedAdmin && (
                              <span className="text-xs text-muted-foreground">
                                Assigned to: {session.assignedAdmin.fullName}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Interface */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {selectedSession ? `Chat with ${selectedSession.user.fullName}` : 'Select a session'}
                  </CardTitle>
                  {selectedSession && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => endSessionMutation.mutate(selectedSession.id)}
                    >
                      End Session
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedSession ? (
                  <div className="space-y-4">
                    <ScrollArea className="h-64 border rounded-lg p-4">
                      <div className="space-y-4">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex",
                              msg.isFromAdmin ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                                msg.isFromAdmin
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
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
                      </div>
                    </ScrollArea>

                    <div className="flex space-x-2">
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type your message..."
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} disabled={!message.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Select a chat session to start messaging
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Chat Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={adminStatus} onValueChange={setAdminStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="away">Away</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxChats">Max Concurrent Chats</Label>
                  <Input
                    id="maxChats"
                    type="number"
                    value={maxConcurrentChats}
                    onChange={(e) => setMaxConcurrentChats(parseInt(e.target.value) || 5)}
                    min="1"
                    max="20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="statusMessage">Status Message</Label>
                <Input
                  id="statusMessage"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder="Optional status message"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="autoAssign"
                  checked={autoAssign}
                  onCheckedChange={setAutoAssign}
                />
                <Label htmlFor="autoAssign">Auto-assign new sessions</Label>
              </div>

              <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending}>
                {updateStatusMutation.isPending ? 'Updating...' : 'Update Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AdminLayout>
  );
}
