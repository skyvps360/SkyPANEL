import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { 
  ChatSession, 
  InsertChatSession, 
  ChatMessage, 
  InsertChatMessage,
  AdminChatStatus,
  InsertAdminChatStatus,
  ChatTypingIndicator,
  InsertChatTypingIndicator,
  User
} from '../shared/schema';

interface WebSocketWithUser extends WebSocket {
  userId?: number;
  sessionId?: number;
  isAdmin?: boolean;
}

interface ChatEvent {
  type: 'message' | 'typing' | 'session_update' | 'admin_status' | 'error' | 'session_assigned';
  data: any;
  sessionId?: number;
  userId?: number;
}

/**
 * Service for managing real-time chat functionality
 * Handles WebSocket connections, message routing, and chat session management
 */
export class ChatService {
  private static instance: ChatService;
  private wss: WebSocketServer | null = null;
  private clients: Map<number, WebSocketWithUser[]> = new Map(); // userId -> WebSocket connections
  private adminClients: Map<number, WebSocketWithUser[]> = new Map(); // adminId -> WebSocket connections
  private sessionClients: Map<number, WebSocketWithUser[]> = new Map(); // sessionId -> WebSocket connections
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map(); // userId:sessionId -> timeout

  private constructor() {}

  /**
   * Get the singleton instance of ChatService
   */
  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Initialize the WebSocket server for chat
   */
  public initialize(server: Server): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/chat-ws'
    });

    this.wss.on('connection', (ws: WebSocketWithUser, request) => {
      console.log('New chat WebSocket connection');
      
      // Handle authentication and setup
      this.handleConnection(ws, request);
    });

    console.log('Chat WebSocket server initialized on /chat-ws');
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocketWithUser, request: any): Promise<void> {
    try {
      console.log('New WebSocket connection established');

      // Extract user info from session or token
      // For now, we'll expect the client to send authentication info
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('Received WebSocket message:', message.type, message.data);
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error handling chat message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        console.error('Chat WebSocket error:', error);
        this.handleDisconnection(ws);
      });

    } catch (error) {
      console.error('Error handling chat connection:', error);
      ws.close();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(ws: WebSocketWithUser, message: any): Promise<void> {
    const { type, data } = message;

    switch (type) {
      case 'auth':
        await this.handleAuth(ws, data);
        break;
      case 'start_session':
        await this.handleStartSession(ws, data);
        break;
      case 'send_message':
        await this.handleSendMessage(ws, data);
        break;
      case 'typing':
        await this.handleTyping(ws, data);
        break;
      case 'join_session':
        await this.handleJoinSession(ws, data);
        break;
      case 'end_session':
        await this.handleEndSession(ws, data);
        break;
      case 'admin_status_update':
        await this.handleAdminStatusUpdate(ws, data);
        break;
      case 'ping':
        // Respond to ping with pong to keep connection alive
        this.sendEvent(ws, { type: 'pong', data: {} });
        break;
      case 'debug_state':
        // Debug command to log connection state
        if (ws.isAdmin) {
          this.debugConnectionState();
          this.sendEvent(ws, { type: 'debug_complete', data: { message: 'Connection state logged to console' } });
        } else {
          this.sendError(ws, 'Admin access required for debug commands');
        }
        break;
      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  /**
   * Handle user authentication
   */
  private async handleAuth(ws: WebSocketWithUser, data: { userId: number; isAdmin?: boolean }): Promise<void> {
    try {
      const user = await storage.getUser(data.userId);
      if (!user) {
        this.sendError(ws, 'Invalid user');
        return;
      }

      // Prevent re-authentication
      if (ws.userId) {
        console.log(`User ${ws.userId} already authenticated, ignoring re-auth attempt`);
        return;
      }

      ws.userId = data.userId;
      ws.isAdmin = data.isAdmin || user.role === 'admin';

      // Add to appropriate client maps
      if (ws.isAdmin) {
        if (!this.adminClients.has(data.userId)) {
          this.adminClients.set(data.userId, []);
        }
        const adminClients = this.adminClients.get(data.userId)!;

        // Check for duplicate connections
        if (!adminClients.includes(ws)) {
          adminClients.push(ws);
        }

        // Update admin status to online
        await this.updateAdminStatus(data.userId, 'online');
      } else {
        if (!this.clients.has(data.userId)) {
          this.clients.set(data.userId, []);
        }
        const clients = this.clients.get(data.userId)!;

        // Check for duplicate connections
        if (!clients.includes(ws)) {
          clients.push(ws);
        }
      }

      this.sendEvent(ws, {
        type: 'auth_success',
        data: { userId: data.userId, isAdmin: ws.isAdmin }
      });

      console.log(`Chat user authenticated: ${data.userId} (admin: ${ws.isAdmin}). Total connections: ${ws.isAdmin ? this.adminClients.get(data.userId)?.length : this.clients.get(data.userId)?.length}`);
    } catch (error) {
      console.error('Error handling auth:', error);
      this.sendError(ws, 'Authentication failed');
    }
  }

  /**
   * Handle starting a new chat session
   */
  private async handleStartSession(ws: WebSocketWithUser, data: { subject?: string; department?: string }): Promise<void> {
    if (!ws.userId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    try {
      // Check if user already has an active session
      const existingSession = await this.getActiveSessionForUser(ws.userId);
      if (existingSession) {
        ws.sessionId = existingSession.id;
        this.addToSessionClients(existingSession.id, ws);
        
        this.sendEvent(ws, {
          type: 'session_resumed',
          data: existingSession
        });
        return;
      }

      // Create new session
      const sessionData: InsertChatSession = {
        userId: ws.userId,
        subject: data.subject,
        department: data.department || 'general',
        status: 'waiting',
        metadata: {
          userAgent: 'WebSocket Client', // Could be extracted from headers
          startedFrom: 'dashboard'
        }
      };

      const session = await this.createChatSession(sessionData);
      ws.sessionId = session.id;
      this.addToSessionClients(session.id, ws);

      this.sendEvent(ws, {
        type: 'session_started',
        data: session
      });

      // Notify available admins about new session
      await this.notifyAdminsOfNewSession(session);

      console.log(`New chat session started: ${session.id} for user ${ws.userId}`);
    } catch (error) {
      console.error('Error starting chat session:', error);
      this.sendError(ws, 'Failed to start chat session');
    }
  }

  /**
   * Handle sending a chat message
   */
  private async handleSendMessage(ws: WebSocketWithUser, data: { message: string; sessionId: number }): Promise<void> {
    if (!ws.userId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    // Validate session ID
    if (!data.sessionId) {
      this.sendError(ws, 'Session ID is required');
      return;
    }

    // Ensure the WebSocket is associated with this session
    if (ws.sessionId !== data.sessionId) {
      console.log(`WebSocket session mismatch: ws.sessionId=${ws.sessionId}, data.sessionId=${data.sessionId}`);
      // Update the WebSocket session ID if it's not set
      if (!ws.sessionId) {
        ws.sessionId = data.sessionId;
        this.addToSessionClients(data.sessionId, ws);
      } else {
        this.sendError(ws, 'Session ID mismatch');
        return;
      }
    }

    try {
      // Verify session exists
      const session = await this.getChatSession(data.sessionId);
      if (!session) {
        this.sendError(ws, 'Session not found');
        return;
      }

      const messageData: InsertChatMessage = {
        sessionId: data.sessionId,
        userId: ws.userId,
        message: data.message,
        isFromAdmin: ws.isAdmin || false,
        messageType: 'text'
      };

      const chatMessage = await this.createChatMessage(messageData);

      // Update session last activity
      await this.updateSessionActivity(data.sessionId);

      // Get user info for the message
      const user = await storage.getUser(ws.userId);

      // Broadcast message to all clients in the session
      const messageEvent = {
        type: 'message' as const,
        data: {
          ...chatMessage,
          user
        }
      };

      console.log(`Broadcasting message in session ${data.sessionId} to ${this.sessionClients.get(data.sessionId)?.length || 0} clients`);
      this.broadcastToSession(data.sessionId, messageEvent);

      console.log(`Message sent in session ${data.sessionId} by user ${ws.userId} (admin: ${ws.isAdmin})`);
    } catch (error) {
      console.error('Error sending message:', error);
      this.sendError(ws, 'Failed to send message');
    }
  }

  /**
   * Handle typing indicators
   */
  private async handleTyping(ws: WebSocketWithUser, data: { sessionId: number; isTyping: boolean }): Promise<void> {
    if (!ws.userId || !ws.sessionId) {
      this.sendError(ws, 'Not authenticated or no active session');
      return;
    }

    try {
      const key = `${ws.userId}:${data.sessionId}`;
      
      // Clear existing timeout
      if (this.typingTimeouts.has(key)) {
        clearTimeout(this.typingTimeouts.get(key)!);
        this.typingTimeouts.delete(key);
      }

      if (data.isTyping) {
        // Set typing timeout (stop typing after 3 seconds of inactivity)
        const timeout = setTimeout(() => {
          this.broadcastToSession(data.sessionId, {
            type: 'typing',
            data: { userId: ws.userId, isTyping: false }
          }, ws.userId);
          this.typingTimeouts.delete(key);
        }, 3000);
        
        this.typingTimeouts.set(key, timeout);
      }

      // Broadcast typing status to other users in the session
      this.broadcastToSession(data.sessionId, {
        type: 'typing',
        data: { userId: ws.userId, isTyping: data.isTyping }
      }, ws.userId);

    } catch (error) {
      console.error('Error handling typing:', error);
    }
  }

  /**
   * Send event to a specific WebSocket
   */
  private sendEvent(ws: WebSocket, event: ChatEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  /**
   * Send error message to WebSocket
   */
  private sendError(ws: WebSocket, message: string): void {
    this.sendEvent(ws, {
      type: 'error',
      data: { message }
    });
  }

  /**
   * Broadcast event to all clients in a session
   */
  private broadcastToSession(sessionId: number, event: ChatEvent, excludeUserId?: number): void {
    const clients = this.sessionClients.get(sessionId) || [];

    if (clients.length === 0) {
      console.log(`No clients found for session ${sessionId} to broadcast ${event.type}`);
      return;
    }

    let sentCount = 0;
    let excludedCount = 0;
    let failedCount = 0;

    clients.forEach(client => {
      if (excludeUserId && client.userId === excludeUserId) {
        excludedCount++;
        return;
      }

      try {
        if (client.readyState === WebSocket.OPEN) {
          this.sendEvent(client, event);
          sentCount++;
        } else {
          console.log(`Client ${client.userId} has closed connection (state: ${client.readyState})`);
          failedCount++;
        }
      } catch (error) {
        console.error(`Failed to send event to client ${client.userId}:`, error);
        failedCount++;
      }
    });

    console.log(`Broadcast ${event.type} to session ${sessionId}: sent=${sentCount}, excluded=${excludedCount}, failed=${failedCount}, total=${clients.length}`);
  }

  /**
   * Handle admin joining a session
   */
  private async handleJoinSession(ws: WebSocketWithUser, data: { sessionId: number }): Promise<void> {
    if (!ws.userId || !ws.isAdmin) {
      this.sendError(ws, 'Admin access required');
      return;
    }

    try {
      const session = await this.getChatSession(data.sessionId);
      if (!session) {
        this.sendError(ws, 'Session not found');
        return;
      }

      // Assign admin to session if not already assigned
      if (!session.assignedAdminId) {
        await this.assignAdminToSession(data.sessionId, ws.userId);
      }

      ws.sessionId = data.sessionId;
      this.addToSessionClients(data.sessionId, ws);

      // Update session status to active
      await this.updateSessionStatus(data.sessionId, 'active');

      this.sendEvent(ws, {
        type: 'session_joined',
        data: session
      });

      // Notify client that admin joined
      this.broadcastToSession(data.sessionId, {
        type: 'admin_joined',
        data: { adminId: ws.userId }
      }, ws.userId);

      // Broadcast session status update to all clients in the session
      this.broadcastToSession(data.sessionId, {
        type: 'session_update',
        data: { sessionId: data.sessionId, status: 'active' }
      });

      console.log(`Admin ${ws.userId} joined session ${data.sessionId}`);
    } catch (error) {
      console.error('Error joining session:', error);
      this.sendError(ws, 'Failed to join session');
    }
  }

  /**
   * Handle ending a chat session
   */
  private async handleEndSession(ws: WebSocketWithUser, data: { sessionId: number }): Promise<void> {
    if (!ws.userId || !ws.sessionId) {
      this.sendError(ws, 'Not authenticated or no active session');
      return;
    }

    try {
      await this.updateSessionStatus(data.sessionId, 'closed');

      this.broadcastToSession(data.sessionId, {
        type: 'session_ended',
        data: { sessionId: data.sessionId, endedBy: ws.userId }
      });

      // Remove all clients from session
      this.sessionClients.delete(data.sessionId);

      console.log(`Session ${data.sessionId} ended by user ${ws.userId}`);
    } catch (error) {
      console.error('Error ending session:', error);
      this.sendError(ws, 'Failed to end session');
    }
  }

  /**
   * Handle admin status updates
   */
  private async handleAdminStatusUpdate(ws: WebSocketWithUser, data: { status: string; statusMessage?: string }): Promise<void> {
    if (!ws.userId || !ws.isAdmin) {
      this.sendError(ws, 'Admin access required');
      return;
    }

    try {
      await this.updateAdminStatus(ws.userId, data.status, data.statusMessage);

      this.sendEvent(ws, {
        type: 'status_updated',
        data: { status: data.status, statusMessage: data.statusMessage }
      });

      console.log(`Admin ${ws.userId} status updated to ${data.status}`);
    } catch (error) {
      console.error('Error updating admin status:', error);
      this.sendError(ws, 'Failed to update status');
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: WebSocketWithUser): void {
    if (!ws.userId) {
      console.log('Disconnecting unauthenticated client');
      return;
    }

    console.log(`Handling disconnection for user ${ws.userId} (admin: ${ws.isAdmin}, session: ${ws.sessionId})`);

    // Remove from client maps
    if (ws.isAdmin) {
      const adminClients = this.adminClients.get(ws.userId) || [];
      const index = adminClients.indexOf(ws);
      if (index > -1) {
        adminClients.splice(index, 1);
        console.log(`Removed admin ${ws.userId} from admin clients. Remaining: ${adminClients.length}`);

        if (adminClients.length === 0) {
          this.adminClients.delete(ws.userId);
          // Update admin status to offline if no more connections
          this.updateAdminStatus(ws.userId, 'offline').catch(console.error);
          console.log(`Admin ${ws.userId} set to offline (no more connections)`);
        }
      }
    } else {
      const clients = this.clients.get(ws.userId) || [];
      const index = clients.indexOf(ws);
      if (index > -1) {
        clients.splice(index, 1);
        console.log(`Removed user ${ws.userId} from clients. Remaining: ${clients.length}`);

        if (clients.length === 0) {
          this.clients.delete(ws.userId);
        }
      }
    }

    // Remove from session clients
    if (ws.sessionId) {
      const sessionClients = this.sessionClients.get(ws.sessionId) || [];
      const index = sessionClients.indexOf(ws);
      if (index > -1) {
        sessionClients.splice(index, 1);
        console.log(`Removed user ${ws.userId} from session ${ws.sessionId}. Remaining clients in session: ${sessionClients.length}`);

        // Clean up empty session client arrays
        if (sessionClients.length === 0) {
          this.sessionClients.delete(ws.sessionId);
          console.log(`Cleaned up empty session clients for session ${ws.sessionId}`);
        }
      }
    }

    console.log(`Chat client disconnected: ${ws.userId}`);
  }

  /**
   * Add WebSocket to session clients
   */
  private addToSessionClients(sessionId: number, ws: WebSocketWithUser): void {
    if (!this.sessionClients.has(sessionId)) {
      this.sessionClients.set(sessionId, []);
    }

    const clients = this.sessionClients.get(sessionId)!;

    // Check if this WebSocket is already in the session
    const existingIndex = clients.findIndex(client => client === ws);
    if (existingIndex !== -1) {
      console.log(`WebSocket for user ${ws.userId} already in session ${sessionId}`);
      return;
    }

    clients.push(ws);
    console.log(`Added user ${ws.userId} to session ${sessionId}. Total clients in session: ${clients.length}`);
  }

  /**
   * Notify available admins of new session
   */
  private async notifyAdminsOfNewSession(session: ChatSession): Promise<void> {
    const availableAdmins = await this.getAvailableAdmins();

    for (const admin of availableAdmins) {
      const adminClients = this.adminClients.get(admin.userId) || [];
      adminClients.forEach(client => {
        this.sendEvent(client, {
          type: 'new_session',
          data: session
        });
      });
    }
  }

  /**
   * Database operations for chat functionality
   */

  private async createChatSession(sessionData: InsertChatSession): Promise<ChatSession> {
    return await storage.createChatSession(sessionData);
  }

  private async getChatSession(sessionId: number): Promise<ChatSession | undefined> {
    return await storage.getChatSession(sessionId);
  }

  private async createChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    return await storage.createChatMessage(messageData);
  }

  private async updateSessionActivity(sessionId: number): Promise<void> {
    await storage.updateChatSession(sessionId, { lastActivityAt: new Date() });
  }

  private async updateSessionStatus(sessionId: number, status: string): Promise<void> {
    const updates: Partial<ChatSession> = { status };
    if (status === 'closed') {
      updates.endedAt = new Date();
    }
    await storage.updateChatSession(sessionId, updates);
  }

  private async assignAdminToSession(sessionId: number, adminId: number): Promise<void> {
    await storage.updateChatSession(sessionId, { assignedAdminId: adminId });
  }

  private async updateAdminStatus(userId: number, status: string, statusMessage?: string): Promise<void> {
    await storage.upsertAdminChatStatus(userId, {
      status,
      statusMessage,
      lastSeenAt: new Date()
    });
  }

  private async getActiveSessionForUser(userId: number): Promise<ChatSession | undefined> {
    return await storage.getUserActiveChatSession(userId);
  }

  private async getAvailableAdmins(): Promise<AdminChatStatus[]> {
    return await storage.getAvailableAdmins();
  }

  /**
   * Debug method to log current connection state
   */
  public debugConnectionState(): void {
    console.log('=== Chat Service Connection State ===');
    console.log(`Total client connections: ${this.clients.size}`);
    console.log(`Total admin connections: ${this.adminClients.size}`);
    console.log(`Total session connections: ${this.sessionClients.size}`);

    // Log client details
    this.clients.forEach((connections, userId) => {
      console.log(`Client ${userId}: ${connections.length} connections`);
    });

    // Log admin details
    this.adminClients.forEach((connections, userId) => {
      console.log(`Admin ${userId}: ${connections.length} connections`);
    });

    // Log session details
    this.sessionClients.forEach((connections, sessionId) => {
      console.log(`Session ${sessionId}: ${connections.length} clients`);
      connections.forEach(client => {
        console.log(`  - User ${client.userId} (admin: ${client.isAdmin}, state: ${client.readyState})`);
      });
    });
    console.log('=====================================');
  }

  /**
   * Public API methods for external use
   */

  public async getActiveSessions(): Promise<ChatSession[]> {
    return await storage.getActiveChatSessions();
  }

  public async getSessionMessages(sessionId: number): Promise<ChatMessage[]> {
    return await storage.getChatMessages(sessionId);
  }

  public async getSessionMessagesWithUsers(sessionId: number): Promise<(ChatMessage & { user: User })[]> {
    return await storage.getChatMessagesWithUsers(sessionId);
  }

  public async getChatSessionsWithUsers(): Promise<(ChatSession & { user: User; assignedAdmin?: User })[]> {
    return await storage.getChatSessionsWithUsers();
  }

  public async getAdminChatStats(adminId: number): Promise<{
    activeSessions: number;
    totalMessages: number;
    averageResponseTime: number;
  }> {
    const adminSessions = await storage.getAdminChatSessions(adminId);
    const activeSessions = adminSessions.filter(s => s.status === 'active').length;

    // Calculate total messages for this admin
    let totalMessages = 0;
    for (const session of adminSessions) {
      const messages = await storage.getChatMessages(session.id);
      totalMessages += messages.filter(m => m.isFromAdmin).length;
    }

    // For now, return 0 for average response time - this would require more complex calculation
    return {
      activeSessions,
      totalMessages,
      averageResponseTime: 0
    };
  }

  public async assignSessionToAdmin(sessionId: number, adminId: number): Promise<void> {
    await this.assignAdminToSession(sessionId, adminId);
    await this.updateSessionStatus(sessionId, 'active');
  }

  public async endChatSession(sessionId: number): Promise<void> {
    await this.updateSessionStatus(sessionId, 'closed');

    // Remove all clients from session
    this.sessionClients.delete(sessionId);

    // Broadcast session ended to any remaining clients
    this.broadcastToSession(sessionId, {
      type: 'session_ended',
      data: { sessionId }
    });
  }
}

export const chatService = ChatService.getInstance();
