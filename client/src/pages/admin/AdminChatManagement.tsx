import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Activity,
  AlertCircle,
  Zap,
  MessageSquare,
  UserCheck,
  Timer,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getBrandColors } from '@/lib/brand-theme';

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

interface ChatTab {
  sessionId: number;
  session: ChatSession;
  messages: ChatMessage[];
  unreadCount: number;
  isActive: boolean;
  lastMessageAt?: string;
}

interface TabState {
  [sessionId: number]: {
    messages: ChatMessage[];
    unreadCount: number;
    messageInput: string;
    isTyping: boolean;
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

  // Tabbed chat state management
  const [activeTabs, setActiveTabs] = useState<ChatTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [tabStates, setTabStates] = useState<TabState>({});
  const [availableSessions, setAvailableSessions] = useState<ChatSession[]>([]);

  // Admin settings state
  const [adminStatus, setAdminStatus] = useState('online');
  const [statusMessage, setStatusMessage] = useState('');
  const [maxConcurrentChats, setMaxConcurrentChats] = useState(5);
  const [autoAssign, setAutoAssign] = useState(true);

  // UI state
  const [showSessionsList, setShowSessionsList] = useState(true);
  const [tabScrollPosition, setTabScrollPosition] = useState(0);

  // Refs
  const messagesEndRefs = useRef<{ [sessionId: number]: HTMLDivElement | null }>({});
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Constants
  const MAX_TABS = 8;
  const TAB_WIDTH = 200;

  // Get brand colors for consistent theming
  const brandColors = getBrandColors();

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
    queryFn: async () => {
      const response = await fetch('/api/chat/admin/status');
      if (!response.ok) throw new Error('Failed to fetch admin status');
      return response.json();
    },
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

  // End session mutation - enhanced with WebSocket termination
  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      // First send WebSocket termination event for real-time updates
      try {
        await endSession({ sessionId });
      } catch (wsError) {
        console.warn('WebSocket termination failed, proceeding with API call:', wsError);
      }

      // Then call API to ensure database consistency
      const response = await fetch(`/api/chat/admin/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to end session');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Chat session ended',
        description: 'The chat session has been terminated successfully.'
      });
      refetchSessions();
    },
    onError: () => {
      toast({
        title: 'Failed to end session',
        description: 'Could not terminate the chat session. Please try again.',
        variant: 'destructive'
      });
    },
  });

  // Initialize WebSocket hook first (before functions that depend on it)
  const {
    sendMessage: sendWebSocketMessage,
    joinSession,
    endSession,
    updateAdminStatus,
    isConnected
  } = useChatWebSocket({
    onMessage: (data) => {
      if (data.type === 'message') {
        const sessionId = data.data.sessionId;

        // Update tab state with new message
        setTabStates(prev => ({
          ...prev,
          [sessionId]: {
            ...prev[sessionId],
            messages: [...(prev[sessionId]?.messages || []), data.data],
            unreadCount: activeTabId === sessionId ? 0 : (prev[sessionId]?.unreadCount || 0) + 1
          }
        }));

        // Update active tabs with unread count
        setActiveTabs(prev => prev.map(tab =>
          tab.sessionId === sessionId
            ? {
                ...tab,
                messages: [...tab.messages, data.data],
                unreadCount: activeTabId === sessionId ? 0 : tab.unreadCount + 1,
                lastMessageAt: data.data.createdAt
              }
            : tab
        ));

        // Auto-scroll to bottom if this is the active tab
        if (activeTabId === sessionId) {
          setTimeout(() => {
            const messagesEnd = messagesEndRefs.current[sessionId];
            if (messagesEnd) {
              messagesEnd.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      } else if (data.type === 'new_session') {
        // New session notification with enhanced styling
        toast({
          title: 'New chat session',
          description: `${data.data.user?.fullName || 'A user'} started a new chat session`,
        });
        refetchSessions();
        setAvailableSessions(prev => [...prev, data.data]);
      } else if (data.type === 'session_ended') {
        // Handle session termination from any source
        const sessionId = data.data.sessionId;

        // Close the tab if it's open
        setActiveTabs(prev => prev.filter(tab => tab.sessionId !== sessionId));
        setTabStates(prev => {
          const newState = { ...prev };
          delete newState[sessionId];
          return newState;
        });

        // Switch to another tab if this was the active one
        if (activeTabId === sessionId) {
          const remainingTabs = activeTabs.filter(tab => tab.sessionId !== sessionId);
          if (remainingTabs.length > 0) {
            setActiveTabId(remainingTabs[remainingTabs.length - 1].sessionId);
          } else {
            setActiveTabId(null);
          }
        }

        toast({
          title: 'Chat session ended',
          description: data.data.endedBy === user?.id
            ? 'You ended the chat session'
            : 'The chat session was ended by the client',
        });
        refetchSessions();
      } else if (data.type === 'session_update') {
        // Handle session status updates
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

  // Tab management functions (now after WebSocket hook)
  const openTab = useCallback(async (session: ChatSession) => {
    // Check if tab already exists
    const existingTab = activeTabs.find(tab => tab.sessionId === session.id);
    if (existingTab) {
      setActiveTabId(session.id);
      return;
    }

    // Check max tabs limit
    if (activeTabs.length >= MAX_TABS) {
      toast({
        title: 'Maximum tabs reached',
        description: `You can only have ${MAX_TABS} chat sessions open at once. Please close a tab first.`,
        variant: 'destructive'
      });
      return;
    }

    try {
      // Fetch messages for this session
      const response = await fetch(`/api/chat/admin/sessions/${session.id}`);
      if (!response.ok) throw new Error('Failed to fetch session messages');
      const data = await response.json();

      // Create new tab
      const newTab: ChatTab = {
        sessionId: session.id,
        session,
        messages: data.messages || [],
        unreadCount: 0,
        isActive: true,
        lastMessageAt: data.messages?.length > 0 ? data.messages[data.messages.length - 1].createdAt : undefined
      };

      // Initialize tab state
      setTabStates(prev => ({
        ...prev,
        [session.id]: {
          messages: data.messages || [],
          unreadCount: 0,
          messageInput: '',
          isTyping: false
        }
      }));

      // Add tab and set as active
      setActiveTabs(prev => [...prev, newTab]);
      setActiveTabId(session.id);

      // Join the session via WebSocket
      await joinSession(session.id);

      // Assign session to current admin if not already assigned
      if (!session.assignedAdminId) {
        assignSessionMutation.mutate(session.id);
      }

      // Auto-scroll to new messages
      setTimeout(() => {
        const messagesEnd = messagesEndRefs.current[session.id];
        if (messagesEnd) {
          messagesEnd.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

    } catch (error) {
      console.error('Failed to open chat tab:', error);
      toast({
        title: 'Failed to open chat',
        description: 'Could not load the chat session. Please try again.',
        variant: 'destructive'
      });
    }
  }, [activeTabs, joinSession, assignSessionMutation, toast]);

  const closeTab = useCallback(async (sessionId: number, endSession = false) => {
    try {
      if (endSession) {
        // End the session
        await endSessionMutation.mutateAsync(sessionId);
      }

      // Remove tab
      setActiveTabs(prev => prev.filter(tab => tab.sessionId !== sessionId));

      // Remove tab state
      setTabStates(prev => {
        const newState = { ...prev };
        delete newState[sessionId];
        return newState;
      });

      // Clear messages ref
      delete messagesEndRefs.current[sessionId];

      // Switch to another tab if this was the active one
      if (activeTabId === sessionId) {
        const remainingTabs = activeTabs.filter(tab => tab.sessionId !== sessionId);
        if (remainingTabs.length > 0) {
          setActiveTabId(remainingTabs[remainingTabs.length - 1].sessionId);
        } else {
          setActiveTabId(null);
        }
      }

    } catch (error) {
      console.error('Failed to close tab:', error);
      toast({
        title: 'Failed to close tab',
        description: 'Could not close the chat session. Please try again.',
        variant: 'destructive'
      });
    }
  }, [activeTabId, activeTabs, endSessionMutation, toast]);

  const switchTab = useCallback((sessionId: number) => {
    setActiveTabId(sessionId);

    // Mark tab as read
    setTabStates(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        unreadCount: 0
      }
    }));

    // Update tab unread count
    setActiveTabs(prev => prev.map(tab =>
      tab.sessionId === sessionId
        ? { ...tab, unreadCount: 0 }
        : tab
    ));

    // Auto-scroll to bottom
    setTimeout(() => {
      const messagesEnd = messagesEndRefs.current[sessionId];
      if (messagesEnd) {
        messagesEnd.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (currentStatusData?.status) {
      setAdminStatus(currentStatusData.status.status || 'online');
      setStatusMessage(currentStatusData.status.statusMessage || '');
      setMaxConcurrentChats(currentStatusData.status.maxConcurrentChats || 5);
      setAutoAssign(currentStatusData.status.autoAssign !== false);
    }
  }, [currentStatusData]);

  // Update available sessions when sessions data changes
  useEffect(() => {
    if (sessionsData?.sessions) {
      setAvailableSessions(sessionsData.sessions);
    }
  }, [sessionsData]);

  // Message sending function for tabbed interface
  const sendMessage = useCallback(async (sessionId: number, messageText: string) => {
    if (!messageText.trim()) return;

    try {
      await sendWebSocketMessage({
        message: messageText.trim(),
        sessionId
      });

      // Clear the input for this tab
      setTabStates(prev => ({
        ...prev,
        [sessionId]: {
          ...prev[sessionId],
          messageInput: ''
        }
      }));

    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Failed to send message',
        description: 'Could not send the message. Please try again.',
        variant: 'destructive'
      });
    }
  }, [sendWebSocketMessage, toast]);

  // Update message input for a specific tab
  const updateMessageInput = useCallback((sessionId: number, value: string) => {
    setTabStates(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        messageInput: value
      }
    }));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Tab or Ctrl+Shift+Tab for tab navigation
      if (event.ctrlKey && event.key === 'Tab') {
        event.preventDefault();
        if (activeTabs.length > 1) {
          const currentIndex = activeTabs.findIndex(tab => tab.sessionId === activeTabId);
          if (currentIndex !== -1) {
            const nextIndex = event.shiftKey
              ? (currentIndex - 1 + activeTabs.length) % activeTabs.length
              : (currentIndex + 1) % activeTabs.length;
            switchTab(activeTabs[nextIndex].sessionId);
          }
        }
      }

      // Ctrl+W to close current tab
      if (event.ctrlKey && event.key === 'w' && activeTabId) {
        event.preventDefault();
        closeTab(activeTabId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabs, activeTabId, switchTab, closeTab]);

  const handleUpdateStatus = async () => {
    try {
      // Update via API
      await updateStatusMutation.mutateAsync({
        status: adminStatus,
        statusMessage,
        maxConcurrentChats,
        autoAssign
      });

      // Also update via WebSocket for real-time status propagation
      if (updateAdminStatus) {
        await updateAdminStatus({
          status: adminStatus,
          statusMessage,
          maxConcurrentChats,
          autoAssign
        });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      // Error handling is already done in the mutation
    }
  };

  // Get current active tab
  const activeTab = activeTabs.find(tab => tab.sessionId === activeTabId);
  const activeTabState = activeTabId ? tabStates[activeTabId] : null;

  const sessions = sessionsData?.sessions || [];
  const stats = statsData?.stats || { activeSessions: 0, totalMessages: 0, averageResponseTime: 0 };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-amber-500';
      case 'active': return 'bg-emerald-500';
      case 'closed': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'waiting': return 'secondary';
      case 'active': return 'default';
      case 'closed': return 'outline';
      default: return 'outline';
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
      <div className="space-y-8">
        {/* Modern Header with Glassmorphism */}
        <div
          className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/80 backdrop-blur-sm shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${brandColors.primary.extraLight}, ${brandColors.secondary.extraLight})`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-transparent" />
          <div className="relative px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl shadow-lg"
                    style={{ backgroundColor: brandColors.primary.full }}
                  >
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                      Live Chat Management
                    </h1>
                    <p className="text-gray-600">
                      Manage real-time support sessions and respond to customer inquiries
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge
                  variant={isConnected ? 'default' : 'destructive'}
                  className="px-3 py-1 text-sm font-medium"
                >
                  <div className={cn("mr-2 h-2 w-2 rounded-full", isConnected ? "bg-green-400" : "bg-red-400")} />
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Active Sessions</CardTitle>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: brandColors.primary.extraLight }}
              >
                <MessageCircle
                  className="h-5 w-5"
                  style={{ color: brandColors.primary.full }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.activeSessions}</div>
              <p className="text-sm text-gray-500 mt-1">
                Currently active chat sessions
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Messages</CardTitle>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: brandColors.secondary.extraLight }}
              >
                <Activity
                  className="h-5 w-5"
                  style={{ color: brandColors.secondary.full }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalMessages}</div>
              <p className="text-sm text-gray-500 mt-1">
                Messages sent today
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Avg Response Time</CardTitle>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: brandColors.accent.extraLight }}
              >
                <Timer
                  className="h-5 w-5"
                  style={{ color: brandColors.accent.full }}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.averageResponseTime}s</div>
              <p className="text-sm text-gray-500 mt-1">
                Average response time
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100">
            <TabsTrigger
              value="sessions"
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat Sessions
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-6">
            {/* Tabbed Chat Interface */}
            <div className="space-y-4">
              {/* Available Sessions Panel */}
              {showSessionsList && (
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                        <Users className="h-5 w-5 mr-2" style={{ color: brandColors.primary.full }} />
                        Available Sessions
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="px-3 py-1">
                          {availableSessions.length} available
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSessionsList(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-48">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-6 pt-0">
                        {availableSessions.length === 0 ? (
                          <div className="col-span-full text-center py-8">
                            <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No available chat sessions</p>
                          </div>
                        ) : (
                          availableSessions
                            .filter(session => !activeTabs.some(tab => tab.sessionId === session.id))
                            .map((session) => (
                              <div
                                key={session.id}
                                className="p-3 rounded-lg border border-gray-200 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-300 bg-white"
                                onClick={() => openTab(session)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(session.status))} />
                                    <span className="font-medium text-sm text-gray-900">
                                      {session.user?.fullName || 'Anonymous'}
                                    </span>
                                  </div>
                                  <Badge variant={getPriorityColor(session.priority)} className="text-xs">
                                    {session.priority}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 truncate">
                                  {session.subject || 'General Support'}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-500">
                                    #{session.id}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(session.startedAt).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Show Sessions Button when panel is hidden */}
              {!showSessionsList && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowSessionsList(true)}
                    className="flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Show Available Sessions ({availableSessions.filter(s => !activeTabs.some(t => t.sessionId === s.id)).length})</span>
                  </Button>
                </div>
              )}

              {/* Tabbed Chat Interface */}
              <Card className="border-0 shadow-lg bg-white">
                {/* Tab Headers */}
                {activeTabs.length > 0 && (
                  <div className="border-b border-gray-200">
                    <div className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-5 w-5" style={{ color: brandColors.secondary.full }} />
                        <span className="font-semibold text-gray-900">Active Chats</span>
                        <Badge variant="secondary" className="text-xs">
                          {activeTabs.length}/{MAX_TABS}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        Ctrl+Tab to switch • Ctrl+W to close
                      </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex items-center overflow-hidden">
                      <div
                        ref={tabsContainerRef}
                        className="flex overflow-x-auto scrollbar-hide"
                        style={{ scrollBehavior: 'smooth' }}
                      >
                        {activeTabs.map((tab) => (
                          <div
                            key={tab.sessionId}
                            className={cn(
                              "flex items-center space-x-2 px-4 py-3 border-b-2 cursor-pointer transition-all duration-200 min-w-[200px] max-w-[250px]",
                              activeTabId === tab.sessionId
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-transparent hover:bg-gray-50 text-gray-600"
                            )}
                            onClick={() => switchTab(tab.sessionId)}
                          >
                            <div className={cn("w-2 h-2 rounded-full", getStatusColor(tab.session.status))} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm truncate">
                                  {tab.session.user?.fullName || 'Anonymous'}
                                </span>
                                {tab.unreadCount > 0 && (
                                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                                    {tab.unreadCount > 99 ? '99+' : tab.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                #{tab.sessionId} • {tab.session.priority}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                closeTab(tab.sessionId, true);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Tab Overflow Controls */}
                      {activeTabs.length > 4 && (
                        <div className="flex items-center border-l border-gray-200 px-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              if (tabsContainerRef.current) {
                                tabsContainerRef.current.scrollLeft -= TAB_WIDTH;
                              }
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              if (tabsContainerRef.current) {
                                tabsContainerRef.current.scrollLeft += TAB_WIDTH;
                              }
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Chat Content */}
                <CardContent className="p-0">
                  {activeTab && activeTabState ? (
                    <div className="flex flex-col h-[600px]">
                      {/* Chat Header */}
                      <div className="border-b border-gray-100 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={cn("w-3 h-3 rounded-full", getStatusColor(activeTab.session.status))} />
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {activeTab.session.user?.fullName || 'Anonymous User'}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {activeTab.session.subject || 'General Support'} • Started {new Date(activeTab.session.startedAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={getPriorityColor(activeTab.session.priority)} className="text-xs">
                              {activeTab.session.priority}
                            </Badge>
                            <Badge variant={getStatusBadgeVariant(activeTab.session.status)} className="text-xs">
                              {activeTab.session.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Messages Area */}
                      <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full p-6">
                          <div className="space-y-4">
                            {activeTabState.messages.length === 0 ? (
                              <div className="text-center py-12">
                                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Start the conversation</h3>
                                <p className="text-gray-500">
                                  Send a message to begin chatting with {activeTab.session.user?.fullName || 'the customer'}
                                </p>
                              </div>
                            ) : (
                              activeTabState.messages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={cn(
                                    "flex",
                                    msg.isFromAdmin ? "justify-end" : "justify-start"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                                      msg.isFromAdmin
                                        ? "bg-blue-600 text-white rounded-br-md"
                                        : "bg-gray-100 text-gray-900 rounded-bl-md"
                                    )}
                                  >
                                    <div className="flex items-center space-x-2 mb-1">
                                      {msg.isFromAdmin ? (
                                        <Bot className="h-3 w-3 opacity-70" />
                                      ) : (
                                        <User className="h-3 w-3 opacity-70" />
                                      )}
                                      <span className="text-xs opacity-70 font-medium">
                                        {msg.user?.fullName || 'User'}
                                      </span>
                                      <span className="text-xs opacity-50">
                                        {new Date(msg.createdAt).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <p className="leading-relaxed">{msg.message}</p>
                                  </div>
                                </div>
                              ))
                            )}
                            <div ref={(el) => messagesEndRefs.current[activeTab.sessionId] = el} />
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Input Area */}
                      <div className="border-t border-gray-100 p-6">
                        <div className="flex space-x-3">
                          <Input
                            value={activeTabState.messageInput || ''}
                            onChange={(e) => updateMessageInput(activeTab.sessionId, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage(activeTab.sessionId, activeTabState.messageInput || '');
                              }
                            }}
                            placeholder="Type your message..."
                            className="flex-1 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            disabled={!isConnected}
                          />
                          <Button
                            onClick={() => sendMessage(activeTab.sessionId, activeTabState.messageInput || '')}
                            disabled={!activeTabState.messageInput?.trim() || !isConnected}
                            className="px-6"
                            style={{ backgroundColor: brandColors.primary.full }}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20">
                      <MessageSquare className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                      <h3 className="text-xl font-medium text-gray-900 mb-3">No Active Chats</h3>
                      <p className="text-gray-500 mb-6">
                        Open a chat session from the available sessions above to start messaging with customers
                      </p>
                      {!showSessionsList && (
                        <Button
                          onClick={() => setShowSessionsList(true)}
                          className="flex items-center space-x-2"
                          style={{ backgroundColor: brandColors.primary.full }}
                        >
                          <Plus className="h-4 w-4" />
                          <span>Browse Available Sessions</span>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
        </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
                  <Settings className="h-5 w-5 mr-2" style={{ color: brandColors.accent.full }} />
                  Admin Chat Settings
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Configure your chat availability and preferences
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                      Availability Status
                    </Label>
                    <Select value={adminStatus} onValueChange={setAdminStatus}>
                      <SelectTrigger className="border-gray-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span>Online</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="away">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                            <span>Away</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="busy">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span>Busy</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="offline">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full" />
                            <span>Offline</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="maxChats" className="text-sm font-medium text-gray-700">
                      Max Concurrent Chats
                    </Label>
                    <Input
                      id="maxChats"
                      type="number"
                      value={maxConcurrentChats}
                      onChange={(e) => setMaxConcurrentChats(parseInt(e.target.value) || 5)}
                      min="1"
                      max="20"
                      className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      Maximum number of simultaneous chat sessions
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="statusMessage" className="text-sm font-medium text-gray-700">
                    Status Message
                  </Label>
                  <Input
                    id="statusMessage"
                    value={statusMessage}
                    onChange={(e) => setStatusMessage(e.target.value)}
                    placeholder="Optional status message for customers"
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    This message will be visible to customers when they start a chat
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="autoAssign" className="text-sm font-medium text-gray-700">
                      Auto-assign new sessions
                    </Label>
                    <p className="text-xs text-gray-500">
                      Automatically assign new chat sessions to available admins
                    </p>
                  </div>
                  <Switch
                    id="autoAssign"
                    checked={autoAssign}
                    onCheckedChange={setAutoAssign}
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={updateStatusMutation.isPending}
                    className="w-full md:w-auto px-8"
                    style={{ backgroundColor: brandColors.primary.full }}
                  >
                    {updateStatusMutation.isPending ? (
                      <>
                        <Zap className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Update Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
      </div>
    </AdminLayout>
  );
}
