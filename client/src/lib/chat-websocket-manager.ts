/**
 * @fileoverview WebSocket manager for chat functionality
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

export interface ChatMessage {
    type: 'message' | 'typing' | 'session_start' | 'session_end' | 'admin_status' | 'department_list' | 'connection_established' | 'error' | 'new_session' | 'admin_status_update';
    sessionId?: string;
    message?: string;
    senderId?: number;
    senderType?: 'user' | 'admin' | 'system';
    isTyping?: boolean;
    departmentId?: number;
    metadata?: any;
    timestamp?: string;
    error?: string;
    clientId?: string;
    session?: any;
    departments?: any[];
    userId?: number;
    isOnline?: boolean;
    isAvailable?: boolean;
}

export interface ChatConnectionMetrics {
    messagesSent: number;
    messagesReceived: number;
    connectionTime: number;
    lastActivity: Date;
}

export class ChatWebSocketManager {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private messageQueue: ChatMessage[] = [];
    private isConnecting = false;
    private connectionStartTime: Date | null = null;
    private metrics: ChatConnectionMetrics = {
        messagesSent: 0,
        messagesReceived: 0,
        connectionTime: 0,
        lastActivity: new Date()
    };

    private onMessageCallbacks: ((message: ChatMessage) => void)[] = [];
    private onConnectCallbacks: (() => void)[] = [];
    private onDisconnectCallbacks: (() => void)[] = [];
    private onErrorCallbacks: ((error: string) => void)[] = [];

    constructor(private baseUrl: string = '') {
        this.baseUrl = baseUrl || window.location.origin.replace('http', 'ws');
    }

    public connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                resolve();
                return;
            }

            if (this.isConnecting) {
                reject(new Error('Connection already in progress'));
                return;
            }

            this.isConnecting = true;
            const wsUrl = `${this.baseUrl}/chat-ws`;
            
            try {
                this.ws = new WebSocket(wsUrl);
                this.connectionStartTime = new Date();

                this.ws.onopen = () => {
                    console.log('Chat WebSocket connected');
                    this.isConnecting = false;
                    this.reconnectAttempts = 0;
                    this.metrics.connectionTime = Date.now() - (this.connectionStartTime?.getTime() || 0);
                    
                    // Send queued messages
                    while (this.messageQueue.length > 0) {
                        const message = this.messageQueue.shift();
                        if (message) {
                            this.sendMessage(message);
                        }
                    }

                    this.onConnectCallbacks.forEach(callback => callback());
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message: ChatMessage = JSON.parse(event.data);
                        this.metrics.messagesReceived++;
                        this.metrics.lastActivity = new Date();
                        
                        this.onMessageCallbacks.forEach(callback => callback(message));
                    } catch (error) {
                        console.error('Error parsing chat message:', error);
                        this.onErrorCallbacks.forEach(callback => callback('Invalid message format'));
                    }
                };

                this.ws.onclose = (event) => {
                    console.log('Chat WebSocket disconnected:', event.code, event.reason);
                    this.isConnecting = false;
                    
                    if (event.code !== 1000) {
                        this.scheduleReconnect();
                    }
                    
                    this.onDisconnectCallbacks.forEach(callback => callback());
                };

                this.ws.onerror = (error) => {
                    console.error('Chat WebSocket error:', error);
                    this.isConnecting = false;
                    this.onErrorCallbacks.forEach(callback => callback('WebSocket error'));
                    reject(new Error('WebSocket connection failed'));
                };
            } catch (error) {
                this.isConnecting = false;
                reject(error);
            }
        });
    }

    public disconnect(): void {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.reconnectAttempts = 0;
    }

    public sendMessage(message: ChatMessage): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            this.metrics.messagesSent++;
            this.metrics.lastActivity = new Date();
        } else {
            this.messageQueue.push(message);
        }
    }

    public startSession(sessionId?: string, departmentId?: number): void {
        this.sendMessage({
            type: 'session_start',
            sessionId,
            departmentId
        });
    }

    public sendChatMessage(message: string, sessionId: string): void {
        this.sendMessage({
            type: 'message',
            message,
            sessionId
        });
    }

    public sendTypingIndicator(isTyping: boolean, sessionId: string): void {
        this.sendMessage({
            type: 'typing',
            isTyping,
            sessionId
        });
    }

    public endSession(sessionId: string): void {
        this.sendMessage({
            type: 'session_end',
            sessionId
        });
    }

    public updateAdminStatus(isOnline: boolean, isAvailable: boolean, currentSessionId?: number): void {
        this.sendMessage({
            type: 'admin_status',
            metadata: {
                isOnline,
                isAvailable,
                currentSessionId
            }
        });
    }

    public requestDepartments(): void {
        this.sendMessage({
            type: 'department_list'
        });
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    public getConnectionState(): number {
        return this.ws?.readyState || WebSocket.CLOSED;
    }

    public getMetrics(): ChatConnectionMetrics {
        return { ...this.metrics };
    }

    public onMessage(callback: (message: ChatMessage) => void): void {
        this.onMessageCallbacks.push(callback);
    }

    public onConnect(callback: () => void): void {
        this.onConnectCallbacks.push(callback);
    }

    public onDisconnect(callback: () => void): void {
        this.onDisconnectCallbacks.push(callback);
    }

    public onError(callback: (error: string) => void): void {
        this.onErrorCallbacks.push(callback);
    }

    public removeMessageListener(callback: (message: ChatMessage) => void): void {
        this.onMessageCallbacks = this.onMessageCallbacks.filter(cb => cb !== callback);
    }

    public removeConnectListener(callback: () => void): void {
        this.onConnectCallbacks = this.onConnectCallbacks.filter(cb => cb !== callback);
    }

    public removeDisconnectListener(callback: () => void): void {
        this.onDisconnectCallbacks = this.onDisconnectCallbacks.filter(cb => cb !== callback);
    }

    public removeErrorListener(callback: (error: string) => void): void {
        this.onErrorCallbacks = this.onErrorCallbacks.filter(cb => cb !== callback);
    }

    private scheduleReconnect(): void {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`Scheduling chat reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (this.reconnectAttempts <= this.maxReconnectAttempts) {
                this.connect().catch(error => {
                    console.error('Chat reconnection failed:', error);
                });
            } else {
                console.error('Max chat reconnection attempts reached');
                this.onErrorCallbacks.forEach(callback => callback('Max reconnection attempts reached'));
            }
        }, delay);
    }
} 