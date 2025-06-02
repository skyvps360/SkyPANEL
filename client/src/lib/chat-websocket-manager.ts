// Singleton WebSocket manager to prevent multiple connections
class ChatWebSocketManager {
  private static instance: ChatWebSocketManager;
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimeout: NodeJS.Timeout | undefined;
  private messageHandlers = new Set<(message: any) => void>();
  private connectionHandlers = new Set<(connected: boolean) => void>();
  private errorHandlers = new Set<(error: any) => void>();
  private currentUser: any = null;
  private lastConnectionAttempt = 0;

  private constructor() {}

  public static getInstance(): ChatWebSocketManager {
    if (!ChatWebSocketManager.instance) {
      ChatWebSocketManager.instance = new ChatWebSocketManager();
    }
    return ChatWebSocketManager.instance;
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/chat-ws`;
    console.log('Generated WebSocket URL:', url);
    return url;
  }

  public connect(user: any): void {
    console.log('ChatWebSocketManager.connect called with user:', user?.id);

    // Don't create multiple connections
    if (this.isConnecting || this.isConnected || !user) {
      console.log('Skipping connection - already connecting/connected or no user', {
        isConnecting: this.isConnecting,
        isConnected: this.isConnected,
        hasUser: !!user
      });
      return;
    }

    // Debounce connection attempts (prevent rapid successive calls)
    const now = Date.now();
    if (now - this.lastConnectionAttempt < 1000) {
      console.log('Debouncing connection attempt, last attempt was', now - this.lastConnectionAttempt, 'ms ago');
      return;
    }
    this.lastConnectionAttempt = now;

    // Store current user and mark as connecting
    this.currentUser = user;
    this.isConnecting = true;
    console.log('Starting WebSocket connection...');

    // Clean up any existing connection
    if (this.ws) {
      console.log('Cleaning up existing WebSocket before creating new connection');
      this.ws.close();
      this.ws = null;
    }

    try {
      const wsUrl = this.getWebSocketUrl();
      console.log('Connecting to chat WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Chat WebSocket connected');
        this.isConnecting = false;
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Notify all connection handlers
        this.connectionHandlers.forEach(handler => handler(true));

        // Authenticate with the server
        if (this.currentUser) {
          setTimeout(() => {
            this.authenticate();
          }, 200);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Chat WebSocket message received:', message);
          
          // Notify all message handlers
          this.messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('Chat WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.isConnected = false;
        this.ws = null;
        
        // Notify all connection handlers
        this.connectionHandlers.forEach(handler => handler(false));

        // Attempt to reconnect if it wasn't a manual close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts && this.currentUser) {
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
          
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(this.currentUser);
          }, delay);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Chat WebSocket error:', error);
        this.isConnecting = false;
        
        // Notify all error handlers
        this.errorHandlers.forEach(handler => handler(error));
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
    }
  }

  private authenticate(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.currentUser) {
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'auth',
        data: {
          userId: this.currentUser.id,
          isAdmin: this.currentUser.role === 'admin'
        }
      }));
      console.log('Authentication message sent');
    } catch (error) {
      console.error('Failed to send authentication:', error);
    }
  }

  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }

    this.isConnecting = false;
    this.isConnected = false;
    this.currentUser = null;
    this.lastConnectionAttempt = 0; // Reset debounce timer

    // Notify all connection handlers
    this.connectionHandlers.forEach(handler => handler(false));
  }

  public sendMessage(message: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket is not initialized'));
        return;
      }

      if (this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify(message));
          resolve();
        } catch (error) {
          console.error('Failed to send WebSocket message:', error);
          reject(error);
        }
      } else if (this.ws.readyState === WebSocket.CONNECTING) {
        // Wait for connection to open
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

        const onOpen = () => {
          clearTimeout(timeout);
          this.ws?.removeEventListener('open', onOpen);
          this.ws?.removeEventListener('error', onError);
          try {
            this.ws?.send(JSON.stringify(message));
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        const onError = () => {
          clearTimeout(timeout);
          this.ws?.removeEventListener('open', onOpen);
          this.ws?.removeEventListener('error', onError);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.addEventListener('open', onOpen);
        this.ws.addEventListener('error', onError);
      } else {
        reject(new Error(`WebSocket is not connected (state: ${this.ws.readyState})`));
      }
    });
  }

  public addMessageHandler(handler: (message: any) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public addConnectionHandler(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  public addErrorHandler(handler: (error: any) => void): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  public getConnectionState(): { isConnected: boolean; isConnecting: boolean } {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting
    };
  }

  // Health check ping
  public startHealthCheck(): void {
    if (!this.isConnected) return;

    const healthCheck = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Failed to send ping:', error);
        }
      } else {
        clearInterval(healthCheck);
      }
    }, 30000); // Ping every 30 seconds
  }
}

export const chatWebSocketManager = ChatWebSocketManager.getInstance();
