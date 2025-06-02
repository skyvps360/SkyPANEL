import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MessageSquare,
  Send,
  User,
  Bot,
  Clock,
  Filter,
  Search,
  MoreVertical,
  Phone,
  Video,
  Archive,
  Star,
  AlertCircle,
  CheckCircle,
  XCircle,
  Minimize2,
  Maximize2,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBrandColors } from '@/lib/brand-theme';

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
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface ChatMessage {
  id: number;
  sessionId: number;
  userId: number;
  message: string;
  isFromAdmin: boolean;
  createdAt: string;
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
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

interface EnhancedChatInterfaceProps {
  sessions: ChatSession[];
  onSessionSelect: (session: ChatSession) => void;
  selectedSession: ChatSession | null;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isConnected: boolean;
}

export default function EnhancedChatInterface({
  sessions,
  onSessionSelect,
  selectedSession,
  messages,
  onSendMessage,
  isConnected,
}: EnhancedChatInterfaceProps) {
  const brandColors = getBrandColors();
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<number | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch departments for filtering
  const { data: departments = [] } = useQuery<ChatDepartment[]>({
    queryKey: ['/api/chat/admin/departments'],
    queryFn: async () => {
      const response = await fetch('/api/chat/admin/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
      return response.json();
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter sessions based on search and filters
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = !searchQuery || 
      session.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.id.toString().includes(searchQuery);
    
    const matchesDepartment = !selectedDepartmentFilter || session.departmentId === selectedDepartmentFilter;
    const matchesStatus = selectedStatusFilter === 'all' || session.status === selectedStatusFilter;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedSession) {
      onSendMessage(messageInput.trim());
      setMessageInput('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500';
      case 'active': return 'bg-green-500';
      case 'closed': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="flex h-[calc(100vh-200px)] bg-gray-50 rounded-lg overflow-hidden">
      {/* Sidebar - Sessions List */}
      <div className={cn(
        "flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-80"
      )}>
        {/* Sidebar Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {!sidebarCollapsed && (
                <h3 className="text-sm font-semibold text-gray-900">Chat Queue</h3>
              )}
              <Badge variant="secondary" className="text-xs">
                {filteredSessions.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-6 w-6 p-0"
            >
              {sidebarCollapsed ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
          </div>
          
          {!sidebarCollapsed && (
            <>
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="pl-10 h-8 text-xs"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={selectedDepartmentFilter?.toString() || 'all'}
                  onValueChange={(value) => setSelectedDepartmentFilter(value === 'all' ? null : parseInt(value))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Depts</SelectItem>
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

                <Select
                  value={selectedStatusFilter}
                  onValueChange={setSelectedStatusFilter}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {filteredSessions.length === 0 ? (
                <div className="text-center py-8">
                  {sidebarCollapsed ? (
                    <MessageSquare className="h-6 w-6 text-gray-300 mx-auto" />
                  ) : (
                    <>
                      <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-xs">No chats found</p>
                    </>
                  )}
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const department = departments.find(d => d.id === session.departmentId);
                  const isSelected = selectedSession?.id === session.id;
                  
                  return (
                    <div
                      key={session.id}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50",
                        isSelected ? "bg-blue-50 border border-blue-200" : "bg-white border border-gray-100",
                        sidebarCollapsed && "p-2"
                      )}
                      onClick={() => onSessionSelect(session)}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                        </div>

                        {!sidebarCollapsed && (
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {session.user?.fullName || 'Anonymous'}
                              </h4>
                              <div className="flex items-center space-x-1">
                                <div className={cn("w-2 h-2 rounded-full", getStatusColor(session.status))} />
                                <span className="text-xs text-gray-500">
                                  {getTimeAgo(session.lastActivityAt)}
                                </span>
                              </div>
                            </div>

                            {/* Subject */}
                            <p className="text-xs text-gray-600 truncate mb-2">
                              {session.subject || 'General Support'}
                            </p>

                            {/* Footer */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Badge variant={getPriorityColor(session.priority)} className="text-xs px-1.5 py-0.5">
                                  {session.priority}
                                </Badge>
                                {department && (
                                  <div className="flex items-center space-x-1">
                                    <div 
                                      className="w-2 h-2 rounded-full" 
                                      style={{ backgroundColor: department.color }}
                                    />
                                    <span className="text-xs text-gray-500 truncate max-w-16">
                                      {department.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-gray-400">#{session.id}</span>
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
      <div className="flex-1 flex flex-col bg-white">
        {selectedSession ? (
          <>
            {/* Chat Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedSession.user?.fullName || 'Anonymous User'}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{selectedSession.user?.email}</span>
                      <span>•</span>
                      <span>#{selectedSession.id}</span>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <div className={cn("w-2 h-2 rounded-full", getStatusColor(selectedSession.status))} />
                        <span className="capitalize">{selectedSession.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant={getPriorityColor(selectedSession.priority)} className="text-xs">
                    {selectedSession.priority} priority
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Start the conversation</h3>
                      <p className="text-gray-500">
                        Send a message to begin chatting with {selectedSession.user?.fullName || 'the customer'}
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
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
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
              <div className="flex space-x-3">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
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
                  disabled={!messageInput.trim() || !isConnected}
                  className="px-6"
                  style={{ backgroundColor: brandColors.primary.full }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Connection Status */}
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
          </>
        ) : (
          /* No Session Selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Chat</h3>
              <p className="text-gray-500 max-w-sm">
                Choose a chat session from the sidebar to start messaging with customers
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
