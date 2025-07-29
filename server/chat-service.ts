/**
 * @fileoverview Chat service for real-time chat functionality
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { Request } from 'express';
import { db } from './db';
import { 
    chatSessions, 
    chatMessages, 
    chatDepartments, 
    adminChatStatus, 
    typingIndicators,
    type ChatSession,
    type ChatMessage,
    type ChatDepartment,
    type AdminChatStatus,
    type InsertChatSession,
    type InsertChatMessage,
    type InsertAdminChatStatus,
    type InsertTypingIndicator
} from '@shared/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface ChatClient {
    ws: WebSocket;
    userId?: number;
    sessionId?: string;
    isAdmin: boolean;
    departmentId?: number;
}

interface ChatMessage {
    type: 'message' | 'typing' | 'session_start' | 'session_end' | 'admin_status' | 'department_list';
    sessionId?: string;
    message?: string;
    senderId?: number;
    senderType?: 'user' | 'admin' | 'system';
    isTyping?: boolean;
    departmentId?: number;
    metadata?: any;
}

export class ChatService {
    private wss: WebSocketServer;
    private clients: Map<string, ChatClient> = new Map();
    private sessions: Map<string, Set<string>> = new Map(); // sessionId -> Set of clientIds

    constructor(server: Server) {
        this.wss = new WebSocketServer({ 
            noServer: true
        });

        this.setupWebSocketServer();
    }

    public handleUpgrade(request: any, socket: any, head: any) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
        });
    }

    private setupWebSocketServer() {
        this.wss.on('connection', (ws: WebSocket, request: Request) => {
            const clientId = uuidv4();
            const client: ChatClient = {
                ws,
                isAdmin: false
            };

            this.clients.set(clientId, client);

            ws.on('message', (data: Buffer) => {
                try {
                    const message: ChatMessage = JSON.parse(data.toString());
                    this.handleMessage(clientId, message);
                } catch (error) {
                    console.error('Error parsing chat message:', error);
                    this.sendError(clientId, 'Invalid message format');
                }
            });

            ws.on('close', () => {
                this.handleClientDisconnect(clientId);
            });

            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.handleClientDisconnect(clientId);
            });

            // Send initial connection confirmation
            this.sendToClient(clientId, {
                type: 'connection_established',
                clientId
            });
        });
    }

    private async handleMessage(clientId: string, message: ChatMessage) {
        const client = this.clients.get(clientId);
        if (!client) return;

        try {
            switch (message.type) {
                case 'session_start':
                    await this.handleSessionStart(clientId, message);
                    break;
                case 'message':
                    await this.handleChatMessage(clientId, message);
                    break;
                case 'typing':
                    await this.handleTypingIndicator(clientId, message);
                    break;
                case 'session_end':
                    await this.handleSessionEnd(clientId, message);
                    break;
                case 'admin_status':
                    await this.handleAdminStatusUpdate(clientId, message);
                    break;
                case 'department_list':
                    await this.handleDepartmentListRequest(clientId);
                    break;
                default:
                    this.sendError(clientId, 'Unknown message type');
            }
        } catch (error) {
            console.error('Error handling chat message:', error);
            this.sendError(clientId, 'Internal server error');
        }
    }

    private async handleSessionStart(clientId: string, message: ChatMessage) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const sessionId = message.sessionId || uuidv4();
        const departmentId = message.departmentId;

        // Create or get existing session
        let session = await this.getOrCreateSession(sessionId, client.userId, departmentId);
        
        client.sessionId = sessionId;
        
        // Add client to session
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, new Set());
        }
        this.sessions.get(sessionId)!.add(clientId);

        // Send session confirmation
        this.sendToClient(clientId, {
            type: 'session_started',
            sessionId,
            session
        });

        // Notify admins of new session
        await this.notifyAdminsOfNewSession(sessionId, session);
    }

    private async handleChatMessage(clientId: string, message: ChatMessage) {
        const client = this.clients.get(clientId);
        if (!client || !client.sessionId) return;

        const sessionId = client.sessionId;
        const senderType = client.isAdmin ? 'admin' : 'user';

        // Find the session in the database
        const sessions = await db.select()
            .from(chatSessions)
            .where(eq(chatSessions.id, parseInt(sessionId)))
            .limit(1);

        if (sessions.length === 0) {
            this.sendError(clientId, 'Session not found');
            return;
        }

        const session = sessions[0];

        // Save message to database
        const chatMessage: InsertChatMessage = {
            sessionId: session.id,
            userId: client.userId || 0,
            message: message.message || '',
            messageType: 'text',
            isFromAdmin: client.isAdmin,
            metadata: message.metadata || {}
        };

        const savedMessage = await db.insert(chatMessages).values(chatMessage).returning();
        
        // Update session last activity
        await db.update(chatSessions)
            .set({ lastActivityAt: new Date() })
            .where(eq(chatSessions.id, session.id));

        // Broadcast message to all clients in session
        const messageToBroadcast = {
            type: 'message',
            sessionId,
            message: message.message,
            senderId: client.userId,
            senderType,
            timestamp: new Date().toISOString(),
            metadata: message.metadata
        };

        this.broadcastToSession(sessionId, messageToBroadcast);
    }

    private async handleTypingIndicator(clientId: string, message: ChatMessage) {
        const client = this.clients.get(clientId);
        if (!client || !client.sessionId) return;

        const sessionId = client.sessionId;
        const isTyping = message.isTyping || false;

        // Find the session in the database
        const sessions = await db.select()
            .from(chatSessions)
            .where(eq(chatSessions.id, parseInt(sessionId)))
            .limit(1);

        if (sessions.length === 0) {
            this.sendError(clientId, 'Session not found');
            return;
        }

        const session = sessions[0];

        // Update typing indicator in database
        await db.insert(typingIndicators).values({
            sessionId: session.id,
            userId: client.userId || 0,
            isTyping,
            lastTypingAt: new Date()
        }).onConflictDoUpdate({
            target: [typingIndicators.sessionId, typingIndicators.userId],
            set: {
                isTyping,
                lastTypingAt: new Date()
            }
        });

        // Broadcast typing indicator
        const typingMessage = {
            type: 'typing',
            sessionId,
            userId: client.userId,
            isTyping,
            timestamp: new Date().toISOString()
        };

        this.broadcastToSession(sessionId, typingMessage);
    }

    private async handleSessionEnd(clientId: string, message: ChatMessage) {
        const client = this.clients.get(clientId);
        if (!client || !client.sessionId) return;

        const sessionId = client.sessionId;

        // Update session status in database
        await db.update(chatSessions)
            .set({ 
                status: 'ended',
                endedAt: new Date(),
                lastActivityAt: new Date()
            })
            .where(eq(chatSessions.id, parseInt(sessionId)));

        // Remove client from session
        const sessionClients = this.sessions.get(sessionId);
        if (sessionClients) {
            sessionClients.delete(clientId);
            if (sessionClients.size === 0) {
                this.sessions.delete(sessionId);
            }
        }

        // Broadcast session end
        this.broadcastToSession(sessionId, {
            type: 'session_end',
            sessionId,
            timestamp: new Date().toISOString()
        });

        client.sessionId = undefined;
    }

    private async handleAdminStatusUpdate(clientId: string, message: ChatMessage) {
        const client = this.clients.get(clientId);
        if (!client || !client.userId) return;

        const { isOnline, isAvailable, currentSessionId } = message.metadata || {};

        // Update admin status in database
        await db.insert(adminChatStatus).values({
            userId: client.userId,
            isOnline: isOnline || false,
            isAvailable: isAvailable || false,
            currentSessionId: currentSessionId ? parseInt(currentSessionId) : undefined,
            lastActivityAt: new Date(),
            metadata: message.metadata || {}
        }).onConflictDoUpdate({
            target: [adminChatStatus.userId],
            set: {
                isOnline: isOnline || false,
                isAvailable: isAvailable || false,
                currentSessionId: currentSessionId ? parseInt(currentSessionId) : undefined,
                lastActivityAt: new Date(),
                metadata: message.metadata || {}
            }
        });

        // Broadcast admin status update
        this.broadcastToAll({
            type: 'admin_status_update',
            userId: client.userId,
            isOnline,
            isAvailable,
            currentSessionId,
            timestamp: new Date().toISOString()
        });
    }

    private async handleDepartmentListRequest(clientId: string) {
        try {
            const departments = await db.select()
                .from(chatDepartments)
                .where(eq(chatDepartments.isActive, true))
                .orderBy(asc(chatDepartments.displayOrder), asc(chatDepartments.name));

            this.sendToClient(clientId, {
                type: 'department_list',
                departments
            });
        } catch (error) {
            console.error('Error fetching departments:', error);
            this.sendError(clientId, 'Failed to fetch departments');
        }
    }

    private async getOrCreateSession(sessionId: string, userId?: number, departmentId?: number): Promise<ChatSession> {
        // For now, always create a new session since we're using client-generated session IDs
        const newSession: InsertChatSession = {
            userId: userId || 0,
            departmentId,
            status: 'active',
            priority: 'normal',
            department: 'general',
            startedAt: new Date(),
            lastActivityAt: new Date(),
            metadata: {}
        };

        const createdSession = await db.insert(chatSessions).values(newSession).returning();
        return createdSession[0];
    }

    private async notifyAdminsOfNewSession(sessionId: string, session: ChatSession) {
        const adminMessage = {
            type: 'new_session',
            sessionId,
            session,
            timestamp: new Date().toISOString()
        };

        // Send to all admin clients
        for (const [clientId, client] of this.clients) {
            if (client.isAdmin) {
                this.sendToClient(clientId, adminMessage);
            }
        }
    }

    private broadcastToSession(sessionId: string, message: any) {
        const sessionClients = this.sessions.get(sessionId);
        if (!sessionClients) return;

        for (const clientId of sessionClients) {
            this.sendToClient(clientId, message);
        }
    }

    private broadcastToAll(message: any) {
        for (const clientId of this.clients.keys()) {
            this.sendToClient(clientId, message);
        }
    }

    private sendToClient(clientId: string, message: any) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== WebSocket.OPEN) return;

        try {
            client.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Error sending message to client:', error);
        }
    }

    private sendError(clientId: string, error: string) {
        this.sendToClient(clientId, {
            type: 'error',
            error,
            timestamp: new Date().toISOString()
        });
    }

    private handleClientDisconnect(clientId: string) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Remove from session
        if (client.sessionId) {
            const sessionClients = this.sessions.get(client.sessionId);
            if (sessionClients) {
                sessionClients.delete(clientId);
                if (sessionClients.size === 0) {
                    this.sessions.delete(client.sessionId);
                }
            }
        }

        // Update admin status if applicable
        if (client.isAdmin && client.userId) {
            db.update(adminChatStatus)
                .set({ 
                    isOnline: false,
                    isAvailable: false,
                    lastActivityAt: new Date()
                })
                .where(eq(adminChatStatus.userId, client.userId));
        }

        // Remove client
        this.clients.delete(clientId);
    }

    // Public API methods
    public async getActiveSessions(): Promise<ChatSession[]> {
        return await db.select()
            .from(chatSessions)
            .where(eq(chatSessions.status, 'active'))
            .orderBy(desc(chatSessions.lastActivityAt));
    }

    public async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
        return await db.select()
            .from(chatMessages)
            .where(eq(chatMessages.sessionId, parseInt(sessionId)))
            .orderBy(asc(chatMessages.createdAt));
    }

    public async getActiveAdmins(): Promise<AdminChatStatus[]> {
        return await db.select()
            .from(adminChatStatus)
            .where(eq(adminChatStatus.isOnline, true))
            .orderBy(desc(adminChatStatus.lastActivityAt));
    }

    public async convertSessionToTicket(sessionId: string, ticketId: number): Promise<void> {
        await db.update(chatSessions)
            .set({
                status: 'converted_to_ticket',
                convertedToTicketId: ticketId,
                convertedAt: new Date(),
                lastActivityAt: new Date()
            })
            .where(eq(chatSessions.id, parseInt(sessionId)));
    }
} 