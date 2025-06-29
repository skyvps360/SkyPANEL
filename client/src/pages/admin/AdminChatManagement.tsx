import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  MessageCircle,
  Users,
  CheckCircle,
  Send,
  User,
  Bot,
  Settings,
  Activity,
  Zap,
  MessageSquare,
  Timer,
  X,
  ChevronLeft,
  ChevronRight,
  Ticket,
  ArrowRight,
  Maximize2,
  Minimize2,
  Save
} from 'lucide-react';
import { useChatWebSocket } from '@/hooks/useChatWebSocket';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getBrandColors } from '@/lib/brand-theme';
import DepartmentManagement from '@/components/admin/DepartmentManagement';

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
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Convert to ticket state (ENHANCED: Chat-to-ticket conversion feature)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertingSessionId, setConvertingSessionId] = useState<number | null>(null);
  const [convertSubject, setConvertSubject] = useState('');
  const [convertPriority, setConvertPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [convertDepartmentId, setConvertDepartmentId] = useState<number | null>(null);

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

  // Fetch departments for filtering
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ['/api/chat/admin/departments'],
    queryFn: async () => {
      const response = await fetch('/api/chat/admin/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
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

  // Convert chat to ticket mutation (ENHANCED: Chat-to-ticket conversion feature)
  const convertToTicketMutation = useMutation({
    mutationFn: async ({ sessionId, subject, priority, departmentId }: {
      sessionId: number;
      subject: string;
      priority: 'low' | 'medium' | 'high';
      departmentId?: number;
    }) => {
      const response = await fetch(`/api/chat/admin/${sessionId}/convert-to-ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, priority, departmentId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to convert chat to ticket');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Chat converted to ticket',
        description: `Successfully created ticket #${data.ticketId}. The client has been notified.`,
      });

      // Close the conversion dialog
      setConvertDialogOpen(false);
      setConvertingSessionId(null);
      setConvertSubject('');
      setConvertPriority('medium');
      setConvertDepartmentId(null);

      // Close the chat tab since it's now converted
      if (convertingSessionId) {
        closeTab(convertingSessionId, false);
      }

      // Refresh sessions to update status
      refetchSessions()
        .catch(error => {
          console.error('Failed to refresh sessions:', error);
          toast({
            title: 'Failed to refresh sessions',
            description: 'Could not update the sessions list',
            variant: 'destructive'
          });
        });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to convert chat',
        description: error.message || 'Could not convert the chat to a ticket. Please try again.',
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
        // New session notification with enhanced styling and click handler
        toast({
          title: 'New chat session',
          description: `${data.data.user?.fullName || 'A user'} started a new chat session. Click to view.`,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Open the new session in a tab
                openTab(data.data);
              }}
              className="ml-auto"
            >
              View Chat
            </Button>
          ),
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
        // Handle session status updates with real-time UI synchronization
        const { sessionId, status } = data.data;

        // Update active tabs in real-time
        setActiveTabs(prev => prev.map(tab =>
          tab.sessionId === sessionId
            ? { ...tab, session: { ...tab.session, status } }
            : tab
        ));

        // Update available sessions list
        setAvailableSessions(prev => prev.map(session =>
          session.id === sessionId
            ? { ...session, status }
            : session
        ));

        // Refetch sessions to ensure consistency with backend
        refetchSessions();

        // Show toast notification for status changes (only for significant transitions)
        if (status === 'active') {
          const session = activeTabs.find(tab => tab.sessionId === sessionId)?.session;
          if (session) {
            toast({
              title: 'Chat session activated',
              description: `Session with ${session.user?.fullName || 'user'} is now active`,
              duration: 3000,
            });
          }
        }

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
      // Fetch fresh session data and messages to ensure we have the latest status
      const response = await fetch(`/api/chat/admin/sessions/${session.id}`);
      if (!response.ok) throw new Error('Failed to fetch session messages');
      const data = await response.json();

      // Use the fresh session data from the API response to ensure current status
      const currentSession = data.session || session;

      // Create new tab with current session data
      const newTab: ChatTab = {
        sessionId: session.id,
        session: currentSession,
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

      // Assign session to current admin if not already assigned (use current session data)
      if (!currentSession.assignedAdminId) {
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

  // Convert to ticket handlers (ENHANCED: Chat-to-ticket conversion feature)
  const handleConvertToTicket = useCallback((sessionId: number) => {
    const session = activeTabs.find(tab => tab.sessionId === sessionId)?.session;
    if (!session) {
      toast({
        title: 'Session not found',
        description: 'Could not find the chat session to convert.',
        variant: 'destructive'
      });
      return;
    }

    // Pre-fill the subject with session info
    const defaultSubject = session.subject || `Chat Support - ${session.user.fullName || 'User'}`;

    setConvertingSessionId(sessionId);
    setConvertSubject(defaultSubject);
    setConvertPriority('medium');
    setConvertDepartmentId(session.departmentId || null);
    setConvertDialogOpen(true);
  }, [activeTabs, toast]);

  const handleConfirmConvert = useCallback(() => {
    if (!convertingSessionId || !convertSubject.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide a subject for the ticket.',
        variant: 'destructive'
      });
      return;
    }

    convertToTicketMutation.mutate({
      sessionId: convertingSessionId,
      subject: convertSubject.trim(),
      priority: convertPriority,
      departmentId: convertDepartmentId || undefined,
    });
  }, [convertingSessionId, convertSubject, convertPriority, convertDepartmentId, convertToTicketMutation, toast]);

  const handleCancelConvert = useCallback(() => {
    setConvertDialogOpen(false);
    setConvertingSessionId(null);
    setConvertSubject('');
    setConvertPriority('medium');
    setConvertDepartmentId(null);
  }, []);

  useEffect(() => {
    if (currentStatusData?.status) {

      // Set the values directly from the fetched data
      const newStatus = currentStatusData.status.status || 'offline';
      const newStatusMessage = currentStatusData.status.statusMessage || '';
      const newMaxConcurrentChats = currentStatusData.status.maxConcurrentChats || 5;
      const newAutoAssign = currentStatusData.status.autoAssign !== false;

      setAdminStatus(newStatus);
      setStatusMessage(newStatusMessage);
      setMaxConcurrentChats(newMaxConcurrentChats);
      setAutoAssign(newAutoAssign);

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
      // Validate form data before sending
      const formData = {
        status: adminStatus || 'offline',
        statusMessage: statusMessage || '',
        maxConcurrentChats: maxConcurrentChats || 5,
        autoAssign: autoAssign !== false
      };

      // Update via API
      await updateStatusMutation.mutateAsync(formData);

      // Also update via WebSocket for real-time status propagation
      if (updateAdminStatus) {
        try {
          await updateAdminStatus(formData.status, formData.statusMessage);
        } catch (wsError) {
          console.error('WebSocket status update failed:', wsError);
          // Continue as the API update was successful
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      // Error handling is already done in the mutation
    }
  };

  // Fullscreen functionality
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // ESC key handler for fullscreen mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Get current active tab
  const activeTab = activeTabs.find(tab => tab.sessionId === activeTabId);
  const activeTabState = activeTabId ? tabStates[activeTabId] : null;

  const stats = statsData?.stats ?? { activeSessions: 0, totalMessages: 0, averageResponseTime: 0 };

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



  // Fullscreen layout - ENTIRE admin chat management interface
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
                style={{ backgroundColor: brandColors.primary.full }}
              >
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Live Chat Management - Fullscreen
                </h1>
                <p className="text-muted-foreground">
                  Complete support team monitoring interface
                </p>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Exit Fullscreen (ESC)"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Fullscreen Content - Copy the entire normal layout content here */}
        <div className="flex-1 overflow-hidden p-6 space-y-6">
          {/* Stats Cards - Hidden in Fullscreen */}

          {/* Fullscreen Tabs */}
          <Tabs defaultValue="sessions" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger
                value="sessions"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat Sessions
              </TabsTrigger>
              {/* Departments tab hidden in fullscreen mode - we use the unified departments system in settings */}
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="flex-1 mt-6">
              {/* Fullscreen Sidebar Layout Chat Interface */}
              <div className="flex h-[calc(100vh-300px)] bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden chat-container">
                {/* Sidebar - Available Sessions */}
                <div className={cn(
                  "flex flex-col bg-background border-r border-border transition-all duration-300",
                  showSessionsList ? "w-80" : "w-16"
                )}>
                  {/* Sidebar Header */}
                  <div className="flex-shrink-0 p-4 border-b border-border bg-background">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {showSessionsList && (
                          <h3 className="text-sm font-semibold text-foreground">Available Sessions</h3>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {availableSessions.filter(session =>
                            !activeTabs.some(tab => tab.sessionId === session.id) &&
                            (!selectedDepartmentFilter || session.departmentId === selectedDepartmentFilter)
                          ).length}
                        </Badge>
                      </div>
                      {showSessionsList && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSessionsList(false)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          title="Collapse sidebar"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {showSessionsList && (
                      <>
                        {/* Department Filter */}
                        <div className="mb-3">
                          <Select
                            value={selectedDepartmentFilter?.toString() || 'all'}
                            onValueChange={(value) => setSelectedDepartmentFilter(value === 'all' ? null : parseInt(value))}
                          >
                            <SelectTrigger className={cn(
                              "h-8 text-xs",
                              selectedDepartmentFilter && "border-blue-300"
                            )}>
                              <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                                  <span>All Departments</span>
                                </div>
                              </SelectItem>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id.toString()}>
                                  <div className="flex items-center space-x-2">
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: dept.color }}
                                    />
                                    <span className="truncate">{dept.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedDepartmentFilter && (
                            <div className="flex items-center justify-between mt-2 p-2 rounded-md border border-border bg-muted">
                              <span className="text-xs font-medium text-foreground">
                                Filtering by: {departments.find(d => d.id === selectedDepartmentFilter)?.name}
                              </span>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-5 w-5 p-0 text-foreground hover:bg-red-500 hover:text-white"
                                onClick={() => setSelectedDepartmentFilter(null)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Sessions List */}
                  <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="p-2 space-y-1">
                        {availableSessions.filter(session =>
                          !activeTabs.some(tab => tab.sessionId === session.id) &&
                          (!selectedDepartmentFilter || session.departmentId === selectedDepartmentFilter)
                        ).length === 0 ? (
                          <div className="text-center py-8">
                            {showSessionsList ? (
                              <>
                                <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-muted-foreground text-xs">No available sessions</p>
                              </>
                            ) : (
                              <MessageCircle className="h-6 w-6 text-muted-foreground mx-auto" />
                            )}
                          </div>
                        ) : (
                          availableSessions
                            .filter(session =>
                              !activeTabs.some(tab => tab.sessionId === session.id) &&
                              (!selectedDepartmentFilter || session.departmentId === selectedDepartmentFilter)
                            )
                            .map((session) => {
                              const department = departments.find(d => d.id === session.departmentId);

                              return (
                                <div
                                  key={session.id}
                                  className={cn(
                                    "p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted bg-background border border-border",
                                    !showSessionsList && "p-2"
                                  )}
                                  onClick={() => openTab(session)}
                                >
                                  <div className="flex items-start space-x-3">
                                    {/* Avatar */}
                                    <div className="flex-shrink-0">
                                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    </div>

                                    {showSessionsList && (
                                      <div className="flex-1 min-w-0">
                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-1">
                                          <h4 className="text-sm font-medium text-foreground truncate">
                                            {session.user?.fullName || 'Anonymous'}
                                          </h4>
                                          <div className="flex items-center space-x-1">
                                            <div className={cn("w-2 h-2 rounded-full", getStatusColor(session.status))} />
                                            <span className="text-xs text-muted-foreground">
                                              {new Date(session.startedAt).toLocaleTimeString()}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Subject */}
                                        <p className="text-xs text-muted-foreground truncate mb-2">
                                          {session.subject || 'General Support'}
                                        </p>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            {department ? (
                                              <Badge
                                                variant="outline"
                                                className="text-xs px-2 py-0.5 border font-medium"
                                                style={{
                                                  borderColor: department.color,
                                                  color: department.color,
                                                  backgroundColor: `${department.color}15`
                                                }}
                                              >
                                                {department.name}
                                              </Badge>
                                            ) : (
                                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                                General
                                              </Badge>
                                            )}
                                          </div>
                                          <span className="text-xs text-muted-foreground">#{session.id}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden">
                  {/* Tab Headers */}
                  {activeTabs.length > 0 && (
                    <div className="border-b border-border">
                      <div className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="h-5 w-5" style={{ color: brandColors.secondary.full }} />
                          <span className="font-semibold text-foreground">Active Chats</span>
                          <Badge variant="secondary" className="text-xs">
                            {activeTabs.length}/{MAX_TABS}
                          </Badge>
                        </div>
                      </div>

                      {/* Tab Navigation */}
                      <div className="flex items-center overflow-hidden">
                        <div
                          ref={tabsContainerRef}
                          className="flex overflow-x-auto scrollbar-hide"
                          style={{ scrollBehavior: 'smooth' }}
                        >
                          {activeTabs.map((tab) => {
                            const department = departments.find(d => d.id === tab.session.departmentId);
                            return (
                              <div
                                key={tab.sessionId}
                                className={cn(
                                  "flex items-center space-x-2 px-4 py-3 border-b-2 cursor-pointer transition-all duration-200 min-w-[200px] max-w-[250px]",
                                  activeTabId === tab.sessionId
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-transparent hover:bg-muted text-muted-foreground"
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
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground truncate">
                                    <span>#{tab.sessionId}</span>
                                    <span>•</span>
                                    <span>{tab.session.priority}</span>
                                    {department && (
                                      <>
                                        <span>•</span>
                                        <div className="flex items-center space-x-1">
                                          <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: department.color }}
                                          />
                                          <span className="truncate max-w-16">{department.name}</span>
                                        </div>
                                      </>
                                    )}
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
                            );
                          })}
                        </div>

                        {/* Tab Overflow Controls */}
                        {activeTabs.length > 4 && (
                          <div className="flex items-center border-l border-border px-2">
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
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {activeTab && activeTabState ? (
                      <>
                        {/* Chat Header */}
                        <div className="border-b border-border px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">
                                  {activeTab.session.user?.fullName || 'Anonymous User'}
                                </h3>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <span>{activeTab.session.user?.email}</span>
                                  <span>•</span>
                                  <span>#{activeTab.session.id}</span>
                                  <span>•</span>
                                  <div className="flex items-center space-x-1">
                                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(activeTab.session.status))} />
                                    <span className="capitalize">{activeTab.session.status}</span>
                                  </div>
                                  {(() => {
                                    const department = departments.find(d => d.id === activeTab.session.departmentId);
                                    return department && (
                                      <>
                                        <span>•</span>
                                        <div className="flex items-center space-x-1">
                                          <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: department.color }}
                                          />
                                          <span>{department.name}</span>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {(() => {
                                const department = departments.find(d => d.id === activeTab.session.departmentId);
                                return department ? (
                                  <Badge
                                    variant="outline"
                                    className="text-xs px-2 py-0.5 border font-medium"
                                    style={{
                                      borderColor: department.color,
                                      color: department.color,
                                      backgroundColor: `${department.color}15`
                                    }}
                                  >
                                    {department.name}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                    General
                                  </Badge>
                                );
                              })()}

                              <Badge variant={getStatusBadgeVariant(activeTab.session.status)} className="text-xs">
                                {activeTab.session.status}
                              </Badge>

                              {/* Convert to Ticket Button */}
                              {activeTab.session.status === 'active' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleConvertToTicket(activeTab.sessionId)}
                                  className="text-xs px-3 py-1 h-7 border-blue-200 text-blue-600 hover:bg-blue-900 hover:border-blue-700 hover:text-blue-300"
                                  disabled={convertToTicketMutation.isPending}
                                >
                                  <Ticket className="h-3 w-3 mr-1" />
                                  Convert to Ticket
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-hidden min-h-0 max-h-full chat-messages-area">
                          <ScrollArea className="h-full w-full max-h-full">
                            <div className="p-6 space-y-4 w-full min-h-0">
                              {activeTabState.messages.length === 0 ? (
                                <div className="text-center py-12">
                                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                  <h3 className="text-lg font-medium text-foreground mb-2">Start the conversation</h3>
                                  <p className="text-muted-foreground">
                                    Send a message to begin chatting with {activeTab.session.user?.fullName || 'the customer'}
                                  </p>
                                </div>
                              ) : (
                                activeTabState.messages.map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={cn(
                                      "flex chat-message-container",
                                      msg.isFromAdmin ? "justify-end" : "justify-start"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "chat-message-bubble rounded-2xl px-4 py-3 text-sm shadow-sm",
                                        msg.isFromAdmin
                                          ? "bg-primary text-primary-foreground rounded-br-md"
                                          : "bg-muted text-foreground rounded-bl-md"
                                      )}
                                    >
                                      <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                        {msg.isFromAdmin ? (
                                          <Bot className="h-3 w-3 opacity-70 flex-shrink-0" />
                                        ) : (
                                          <User className="h-3 w-3 opacity-70 flex-shrink-0" />
                                        )}
                                        <span className="text-xs opacity-70 font-medium truncate">
                                          {msg.user?.fullName || 'User'}
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
                              <div ref={(el) => messagesEndRefs.current[activeTab.sessionId] = el} />
                            </div>
                          </ScrollArea>
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-border p-6">
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
                              className="flex-1 border-input focus:border-primary focus:ring-primary"
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

                          {/* Connection Status */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                isConnected ? "bg-green-500" : "bg-red-500"
                              )} />
                              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Press Enter to send
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* No Session Selected */
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">Select a Chat</h3>
                          <p className="text-muted-foreground max-w-sm">
                            Choose a chat session from the sidebar to start messaging with customers
                          </p>
                          {!showSessionsList && (
                            <Button
                              onClick={() => setShowSessionsList(true)}
                              className="mt-4"
                              variant="outline"
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Show Sessions
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Departments tab content hidden in fullscreen mode - we use the unified departments system in settings */}
            <TabsContent value="departments" className="hidden flex-1 mt-6">
              <DepartmentManagement />
            </TabsContent>

            <TabsContent value="settings" className="flex-1 mt-6">
              <Card className="rounded-lg border shadow-lg bg-card">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl font-semibold text-foreground flex items-center">
                    <Settings className="h-5 w-5 mr-2" style={{ color: brandColors.accent.full }} />
                    Admin Chat Settings
                  </CardTitle>
                  <p className="text-muted-foreground mt-2">
                    Configure your chat availability and preferences
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="status" className="text-sm font-medium text-foreground">
                        Availability Status
                      </Label>
                      <Select
                        key={`status-${adminStatus}`}
                        value={adminStatus}
                        onValueChange={(value) => {
                          setAdminStatus(value);
                        }}
                      >
                        <SelectTrigger className="border-input focus:border-primary focus:ring-primary">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span>Online</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="offline">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                              <span>Offline</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Your availability status for new chat requests
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="maxChats" className="text-sm font-medium text-foreground">
                        Max Concurrent Chats
                      </Label>
                      <Input
                        id="maxChats"
                        type="number"
                        min="1"
                        max="20"
                        value={maxConcurrentChats}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          setMaxConcurrentChats(value);
                        }}
                        className="border-input focus:border-primary focus:ring-primary"
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum number of simultaneous chat sessions
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="statusMessage" className="text-sm font-medium text-foreground">
                      Status Message
                    </Label>
                    <Input
                      id="statusMessage"
                      value={statusMessage}
                      onChange={(e) => {
                        setStatusMessage(e.target.value);
                      }}
                      placeholder="Optional status message for customers"
                      className="border-input focus:border-primary focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      This message will be visible to customers when they start a chat
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="autoAssign"
                        checked={autoAssign}
                        onChange={(e) => {
                          setAutoAssign(e.target.checked);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="autoAssign" className="text-sm font-medium text-foreground">
                        Auto-assign new chats
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      Automatically assign new chat sessions to available admins
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button
                      onClick={handleUpdateStatus}
                      disabled={updateStatusMutation.isPending}
                      className="w-full"
                      style={{ backgroundColor: brandColors.primary.full }}
                    >
                      {updateStatusMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Modern Header with Glassmorphism */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border bg-card backdrop-blur-sm shadow-xl"
        >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-transparent" />
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
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                      Live Chat Management
                    </h1>
                    <p className="text-muted-foreground">
                      Manage real-time support sessions and respond to customer inquiries
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge
                  variant="outline"
                  className={cn("px-3 py-1 text-sm font-medium", isConnected ? "border-green-500 text-green-500" : "border-red-500 text-red-500")}
                >
                  <div className={cn("mr-2 h-2 w-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")} />
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  title="Enter Fullscreen Mode"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border shadow-lg bg-card hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Sessions</CardTitle>
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
              <div className="text-3xl font-bold text-foreground">{stats.activeSessions}</div>
              <p className="text-sm text-muted-foreground mt-1">
                Currently active chat sessions
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-lg bg-card hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
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
              <div className="text-3xl font-bold text-foreground">{stats.totalMessages}</div>
              <p className="text-sm text-muted-foreground mt-1">
                Messages sent total
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-muted">
            <TabsTrigger
              value="sessions"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat Sessions
            </TabsTrigger>
            {/* Departments tab hidden - we use the unified departments system in settings */}
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-6">
            {/* Sidebar Layout Chat Interface */}
            <div className="flex h-[calc(100vh-200px)] bg-muted rounded-lg overflow-hidden chat-container border border-border">
              {/* Sidebar - Available Sessions */}
              <div className={cn(
                "flex flex-col bg-background border-r border-border transition-all duration-300",
                showSessionsList ? "w-80" : "w-16"
              )}>
                {/* Sidebar Header */}
                <div className="flex-shrink-0 p-4 border-b border-border bg-background">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {showSessionsList && (
                        <h3 className="text-sm font-semibold text-foreground">Available Sessions</h3>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {availableSessions.filter(session =>
                          !activeTabs.some(tab => tab.sessionId === session.id) &&
                          (!selectedDepartmentFilter || session.departmentId === selectedDepartmentFilter)
                        ).length}
                      </Badge>
                    </div>
                    {showSessionsList && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSessionsList(false)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        title="Collapse sidebar"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {showSessionsList && (
                    <>
                      {/* Department Filter */}
                      <div className="mb-3">
                        <Select
                          value={selectedDepartmentFilter?.toString() || 'all'}
                          onValueChange={(value) => setSelectedDepartmentFilter(value === 'all' ? null : parseInt(value))}
                        >
                          <SelectTrigger className={cn(
                            "h-8 text-xs",
                            selectedDepartmentFilter && "border-blue-300"
                          )}>
                            <SelectValue placeholder="All Departments" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                                <span>All Departments</span>
                              </div>
                            </SelectItem>
                            {departments.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id.toString()}>
                                <div className="flex items-center space-x-2">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: dept.color }}
                                  />
                                  <span className="truncate">{dept.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedDepartmentFilter && (
                          <div className="flex items-center justify-between mt-2 p-2 rounded-md border border-border bg-muted">
                            <span className="text-xs font-medium text-foreground">
                              Filtering by: {departments.find(d => d.id === selectedDepartmentFilter)?.name}
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-5 w-5 p-0 text-foreground hover:bg-red-500 hover:text-white"
                              onClick={() => setSelectedDepartmentFilter(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Sessions List */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-2 space-y-1">
                      {availableSessions.filter(session =>
                        !activeTabs.some(tab => tab.sessionId === session.id) &&
                        (!selectedDepartmentFilter || session.departmentId === selectedDepartmentFilter)
                      ).length === 0 ? (
                        <div className="text-center py-8">
                          {showSessionsList ? (
                            <>
                              <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                              <p className="text-muted-foreground text-xs">No available sessions</p>
                            </>
                          ) : (
                            <MessageCircle className="h-6 w-6 text-muted-foreground mx-auto" />
                          )}
                        </div>
                      ) : (
                        availableSessions
                          .filter(session =>
                            !activeTabs.some(tab => tab.sessionId === session.id) &&
                            (!selectedDepartmentFilter || session.departmentId === selectedDepartmentFilter)
                          )
                          .map((session) => {
                            const department = departments.find(d => d.id === session.departmentId);

                            return (
                              <div
                                key={session.id}
                                className={cn(
                                  "p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-muted bg-background border border-border",
                                  !showSessionsList && "p-2"
                                )}
                                onClick={() => openTab(session)}
                              >
                                <div className="flex items-start space-x-3">
                                  {/* Avatar */}
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </div>

                                  {showSessionsList && (
                                    <div className="flex-1 min-w-0">
                                      {/* Header */}
                                      <div className="flex items-center justify-between mb-1">
                                        <h4 className="text-sm font-medium text-foreground truncate">
                                          {session.user?.fullName || 'Anonymous'}
                                        </h4>
                                        <div className="flex items-center space-x-1">
                                          <div className={cn("w-2 h-2 rounded-full", getStatusColor(session.status))} />
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(session.startedAt).toLocaleTimeString()}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Subject */}
                                      <p className="text-xs text-muted-foreground truncate mb-2">
                                        {session.subject || 'General Support'}
                                      </p>

                                      {/* Footer */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          {department ? (
                                            <Badge
                                              variant="outline"
                                              className="text-xs px-2 py-0.5 border font-medium"
                                              style={{
                                                borderColor: department.color,
                                                color: department.color,
                                                backgroundColor: `${department.color}15`
                                              }}
                                            >
                                              {department.name}
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                              General
                                            </Badge>
                                          )}

                                        </div>
                                        <span className="text-xs text-muted-foreground">#{session.id}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* Main Chat Area */}
              <div className="flex-1 flex flex-col bg-background min-w-0 overflow-hidden">
                {/* Tab Headers */}
                {activeTabs.length > 0 && (
                  <div className="border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-5 w-5" style={{ color: brandColors.secondary.full }} />
                        <span className="font-semibold text-foreground">Active Chats</span>
                        <Badge variant="secondary" className="text-xs">
                          {activeTabs.length}/{MAX_TABS}
                        </Badge>
                      </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex items-center overflow-hidden">
                      <div
                        ref={tabsContainerRef}
                        className="flex overflow-x-auto scrollbar-hide"
                        style={{ scrollBehavior: 'smooth' }}
                      >
                        {activeTabs.map((tab) => {
                          const department = departments.find(d => d.id === tab.session.departmentId);
                          return (
                            <div
                              key={tab.sessionId}
                              className={cn(
                                "flex items-center space-x-2 px-4 py-3 border-b-2 cursor-pointer transition-all duration-200 min-w-[200px] max-w-[250px]",
                                activeTabId === tab.sessionId
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-transparent hover:bg-muted text-muted-foreground"
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
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground truncate">
                                  <span>#{tab.sessionId}</span>
                                  <span>•</span>
                                  <span>{tab.session.priority}</span>
                                  {department && (
                                    <>
                                      <span>•</span>
                                      <div className="flex items-center space-x-1">
                                        <div
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: department.color }}
                                        />
                                        <span className="truncate max-w-16">{department.name}</span>
                                      </div>
                                    </>
                                  )}
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
                          );
                        })}
                      </div>

                      {/* Tab Overflow Controls */}
                      {activeTabs.length > 4 && (
                        <div className="flex items-center border-l border-border px-2">
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
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {activeTab && activeTabState ? (
                    <>
                      {/* Chat Header */}
                      <div className="border-b border-border px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {activeTab.session.user?.fullName || 'Anonymous User'}
                              </h3>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <span>{activeTab.session.user?.email}</span>
                                <span>•</span>
                                <span>#{activeTab.session.id}</span>
                                <span>•</span>
                                <div className="flex items-center space-x-1">
                                  <div className={cn("w-2 h-2 rounded-full", getStatusColor(activeTab.session.status))} />
                                  <span className="capitalize">{activeTab.session.status}</span>
                                </div>
                                {(() => {
                                  const department = departments.find(d => d.id === activeTab.session.departmentId);
                                  return department && (
                                    <>
                                      <span>•</span>
                                      <div className="flex items-center space-x-1">
                                        <div
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: department.color }}
                                        />
                                        <span>{department.name}</span>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {(() => {
                              const department = departments.find(d => d.id === activeTab.session.departmentId);
                              return department ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-0.5 border font-medium"
                                  style={{
                                    borderColor: department.color,
                                    color: department.color,
                                    backgroundColor: `${department.color}15`
                                  }}
                                >
                                  {department.name}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                  General
                                </Badge>
                              );
                            })()}

                            <Badge variant={getStatusBadgeVariant(activeTab.session.status)} className="text-xs">
                              {activeTab.session.status}
                            </Badge>

                            {/* Convert to Ticket Button */}
                            {activeTab.session.status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConvertToTicket(activeTab.sessionId)}
                                className="text-xs px-3 py-1 h-7 border-blue-200 text-blue-600 hover:bg-blue-900 hover:border-blue-700 hover:text-blue-300"
                                disabled={convertToTicketMutation.isPending}
                              >
                                <Ticket className="h-3 w-3 mr-1" />
                                Convert to Ticket
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Messages Area */}
                      <div className="flex-1 overflow-hidden min-h-0 chat-messages-area">
                        <ScrollArea className="h-full w-full">
                          <div className="p-6 space-y-4 w-full">
                            {activeTabState.messages.length === 0 ? (
                              <div className="text-center py-12">
                                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-foreground mb-2">Start the conversation</h3>
                                <p className="text-muted-foreground">
                                  Send a message to begin chatting with {activeTab.session.user?.fullName || 'the customer'}
                                </p>
                              </div>
                            ) : (
                              activeTabState.messages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={cn(
                                    "flex chat-message-container",
                                    msg.isFromAdmin ? "justify-end" : "justify-start"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "chat-message-bubble rounded-2xl px-4 py-3 text-sm shadow-sm",
                                      msg.isFromAdmin
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : "bg-muted text-foreground rounded-bl-md"
                                    )}
                                  >
                                    <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                      {msg.isFromAdmin ? (
                                        <Bot className="h-3 w-3 opacity-70 flex-shrink-0" />
                                      ) : (
                                        <User className="h-3 w-3 opacity-70 flex-shrink-0" />
                                      )}
                                      <span className="text-xs opacity-70 font-medium truncate">
                                        {msg.user?.fullName || 'User'}
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
                            <div ref={(el) => messagesEndRefs.current[activeTab.sessionId] = el} />
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Input Area */}
                      <div className="border-t border-border p-6">
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
                            className="flex-1 border-input focus:border-primary focus:ring-primary"
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

                        {/* Connection Status */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              isConnected ? "bg-green-500" : "bg-red-500"
                            )} />
                            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Press Enter to send
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* No Session Selected */
                    <div className="flex-1 flex items-center justify-center">
                      <Card className="rounded-lg border shadow-lg bg-background w-full max-w-md mx-auto">
                        <CardContent className="text-center py-16">
                          <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">Select a Chat</h3>
                          <p className="text-muted-foreground max-w-sm mx-auto">
                            Choose a chat session from the sidebar to start messaging with customers
                          </p>
                          {!showSessionsList && (
                            <Button
                              onClick={() => setShowSessionsList(true)}
                              className="mt-4"
                              variant="outline"
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Show Sessions
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </div>
        </TabsContent>

          {/* Departments tab content hidden - we use the unified departments system in settings */}
          <TabsContent value="departments" className="hidden space-y-6">
            <DepartmentManagement />
          </TabsContent>

          <TabsContent value="settings" className="flex-1 mt-6">
            <Card className="rounded-lg border shadow-lg bg-card">
              <CardHeader className="pb-6">
                <CardTitle className="text-xl font-semibold text-foreground flex items-center">
                  <Settings className="h-5 w-5 mr-2" style={{ color: brandColors.accent.full }} />
                  Admin Chat Settings
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  Configure your chat availability and preferences
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="status" className="text-sm font-medium text-foreground">
                      Availability Status
                    </Label>
                    <Select
                      key={`status-${adminStatus}`}
                      value={adminStatus}
                      onValueChange={(value) => {
                        setAdminStatus(value);
                      }}
                    >
                      <SelectTrigger className="border-input focus:border-primary focus:ring-primary">
                        <SelectValue placeholder="Select availability status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span>Online</span>
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
                    <Label htmlFor="maxChats" className="text-sm font-medium text-foreground">
                      Max Concurrent Chats
                    </Label>
                    <Input
                      id="maxChats"
                      type="number"
                      value={maxConcurrentChats}
                      onChange={(e) => setMaxConcurrentChats(parseInt(e.target.value) || 5)}
                      min="1"
                      max="20"
                      className="border-input focus:border-primary focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of simultaneous chat sessions
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="statusMessage" className="text-sm font-medium text-foreground">
                    Status Message
                  </Label>
                  <Input
                    id="statusMessage"
                    value={statusMessage}
                    onChange={(e) => {
                      setStatusMessage(e.target.value);
                    }}
                    placeholder="Optional status message for customers"
                    className="border-input focus:border-primary focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    This message will be visible to customers when they start a chat
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="autoAssign"
                      checked={autoAssign}
                      onChange={(e) => {
                        setAutoAssign(e.target.checked);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="autoAssign" className="text-sm font-medium text-foreground">
                      Auto-assign new chats
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Automatically assign new chat sessions to available admins
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
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

      {/* Convert to Ticket Dialog (ENHANCED: Chat-to-ticket conversion feature) */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Ticket className="h-5 w-5 text-blue-600" />
              <span>Convert Chat to Ticket</span>
            </DialogTitle>
            <DialogDescription>
              This will convert the current chat session into a support ticket. The entire conversation history will be preserved, and the client will be notified via email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-subject" className="text-foreground">Ticket Subject *</Label>
              <Input
                id="ticket-subject"
                value={convertSubject}
                onChange={(e) => setConvertSubject(e.target.value)}
                placeholder="Enter a descriptive subject for the ticket"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                This will be the main subject line for the support ticket
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticket-priority" className="text-foreground">Priority</Label>
                <Select value={convertPriority} onValueChange={(value: 'low' | 'medium' | 'high') => setConvertPriority(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span>Low</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span>Medium</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span>High</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-department" className="text-foreground">Department</Label>
                <Select
                  value={convertDepartmentId?.toString() || 'none'}
                  onValueChange={(value) => setConvertDepartmentId(value === 'none' ? null : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">No department</span>
                    </SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: dept.color }}
                          />
                          <span>{dept.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ArrowRight className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-blue-900">What happens next?</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• The entire chat history will be imported into the ticket</li>
                    <li>• The client will receive an email notification with the ticket details</li>
                    <li>• The chat session will be marked as converted and closed</li>
                    <li>• You can continue the conversation through the ticket system</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelConvert}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmConvert}
              disabled={!convertSubject.trim() || convertToTicketMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {convertToTicketMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Converting...
                </>
              ) : (
                <>
                  <Ticket className="h-4 w-4 mr-2" />
                  Convert to Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
