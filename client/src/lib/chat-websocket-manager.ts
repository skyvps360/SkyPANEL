// Singleton WebSocket manager to prevent multiple connections with comprehensive debugging
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
  private forceClientMode = false;
  private lastConnectionAttempt = 0;

  // Enhanced debugging properties
  private connectionHistory: Array<{
    timestamp: Date;
    event: 'attempt' | 'success' | 'failure' | 'close' | 'error';
    details?: any;
  }> = [];
  private debugMode = process.env.NODE_ENV === 'development';
  private connectionMetrics = {
    totalAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    lastSuccessfulConnection: null as Date | null,
    lastFailure: null as Date | null,
    averageConnectionTime: 0
  };

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

  public connect(user: any, forceClientMode = false): void {
    const connectionStartTime = Date.now();
    this.logDebug('🔌 ChatWebSocketManager.connect called', {
      userId: user?.id,
      userEmail: user?.email,
      forceClientMode,
      currentState: {
        isConnecting: this.isConnecting,
        isConnected: this.isConnected,
        reconnectAttempts: this.reconnectAttempts
      },
      browserInfo: {
        userAgent: navigator.userAgent,
        webSocketSupport: 'WebSocket' in window,
        location: window.location.href
      }
    });

    // Enhanced connection validation
    if (!user) {
      this.logError('❌ Connection failed: No user provided');
      this.addConnectionEvent('failure', { reason: 'No user provided' });
      return;
    }

    if (!('WebSocket' in window)) {
      this.logError('❌ Connection failed: WebSocket not supported in this browser');
      this.addConnectionEvent('failure', { reason: 'WebSocket not supported' });
      return;
    }

    // Don't create multiple connections
    if (this.isConnecting || this.isConnected) {
      this.logDebug('⏭️ Skipping connection - already connecting/connected', {
        isConnecting: this.isConnecting,
        isConnected: this.isConnected,
        wsReadyState: this.ws?.readyState
      });
      return;
    }

    // Debounce connection attempts (prevent rapid successive calls)
    const now = Date.now();
    if (now - this.lastConnectionAttempt < 1000) {
      this.logDebug('⏳ Debouncing connection attempt', {
        timeSinceLastAttempt: now - this.lastConnectionAttempt,
        debounceThreshold: 1000
      });
      return;
    }
    this.lastConnectionAttempt = now;

    // Store current user and mark as connecting
    this.currentUser = user;
    this.forceClientMode = forceClientMode;
    this.isConnecting = true;
    console.log('Starting WebSocket connection...');

    // Clean up any existing connection
    if (this.ws) {
      console.log('Cleaning up existing WebSocket before creating new connection');
      this.ws.close();
      this.ws = null;
    }

    // Record connection attempt
    this.addConnectionEvent('attempt', {
      userId: user.id,
      forceClientMode,
      reconnectAttempt: this.reconnectAttempts
    });

    try {
      const wsUrl = this.getWebSocketUrl();
      this.logDebug('🚀 Attempting WebSocket connection', { url: wsUrl });

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        const connectionTime = Date.now() - connectionStartTime;
        this.logDebug('✅ Chat WebSocket connected successfully', {
          connectionTime: `${connectionTime}ms`,
          readyState: this.ws?.readyState
        });

        this.isConnecting = false;
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Record successful connection
        this.addConnectionEvent('success', { connectionTime });

        // Notify all connection handlers
        this.connectionHandlers.forEach(handler => handler(true));

        // Authenticate with the server
        if (this.currentUser) {
          this.logDebug('🔐 Scheduling authentication...');
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
        this.logDebug('🔌 Chat WebSocket closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          reconnectAttempts: this.reconnectAttempts
        });

        this.isConnecting = false;
        this.isConnected = false;
        this.ws = null;

        // Record close event
        this.addConnectionEvent('close', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });

        // Notify all connection handlers
        this.connectionHandlers.forEach(handler => handler(false));

        // Attempt to reconnect if it wasn't a manual close and network is available
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts && this.currentUser) {
          if (this.checkNetworkConnectivity()) {
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
            this.logDebug('🔄 Scheduling reconnection attempt', {
              attempt: this.reconnectAttempts + 1,
              maxAttempts: this.maxReconnectAttempts,
              delay: `${delay}ms`
            });

            this.reconnectTimeout = setTimeout(() => {
              this.reconnectAttempts++;
              this.connect(this.currentUser, this.forceClientMode);
            }, delay);
          } else {
            this.logError('❌ Not reconnecting - no network connectivity');
          }
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.logError('❌ Max reconnection attempts reached, giving up');
        }
      };

      this.ws.onerror = (error) => {
        this.logError('❌ Chat WebSocket error occurred', {
          error,
          readyState: this.ws?.readyState,
          url: this.ws?.url,
          reconnectAttempts: this.reconnectAttempts
        });

        this.isConnecting = false;

        // Record error event
        this.addConnectionEvent('error', {
          error: error.toString(),
          readyState: this.ws?.readyState
        });

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
      const isAdmin = this.forceClientMode ? false : (this.currentUser.role === 'admin');
      this.ws.send(JSON.stringify({
        type: 'auth',
        data: {
          userId: this.currentUser.id,
          isAdmin
        }
      }));
      console.log('Authentication message sent - isAdmin:', isAdmin, 'forceClientMode:', this.forceClientMode);
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
    this.forceClientMode = false;
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

  // Health check ping with enhanced monitoring
  public startHealthCheck(): void {
    if (!this.isConnected) return;

    this.logDebug('💓 Starting health check monitoring');

    const healthCheck = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
          this.logDebug('💓 Health check ping sent');
        } catch (error) {
          this.logError('❌ Failed to send health check ping:', error);
          clearInterval(healthCheck);
        }
      } else {
        this.logDebug('💓 Health check stopped - WebSocket not open');
        clearInterval(healthCheck);
      }
    }, 30000); // Ping every 30 seconds
  }

  // Enhanced debugging methods
  private logDebug(message: string, data?: any): void {
    if (this.debugMode) {
      console.log(`[ChatWebSocket] ${message}`, data || '');
    }
  }

  private logError(message: string, error?: any): void {
    console.error(`[ChatWebSocket] ${message}`, error || '');
  }

  private addConnectionEvent(event: 'attempt' | 'success' | 'failure' | 'close' | 'error', details?: any): void {
    const eventRecord = {
      timestamp: new Date(),
      event,
      details
    };

    this.connectionHistory.push(eventRecord);

    // Keep only last 50 events
    if (this.connectionHistory.length > 50) {
      this.connectionHistory = this.connectionHistory.slice(-50);
    }

    // Update metrics
    if (event === 'attempt') {
      this.connectionMetrics.totalAttempts++;
    } else if (event === 'success') {
      this.connectionMetrics.successfulConnections++;
      this.connectionMetrics.lastSuccessfulConnection = new Date();
    } else if (event === 'failure' || event === 'error') {
      this.connectionMetrics.failedConnections++;
      this.connectionMetrics.lastFailure = new Date();
    }

    this.logDebug(`📊 Connection event: ${event}`, details);
  }

  // Public debugging methods for development
  public getDebugInfo(): any {
    return {
      connectionState: {
        isConnected: this.isConnected,
        isConnecting: this.isConnecting,
        reconnectAttempts: this.reconnectAttempts,
        wsReadyState: this.ws?.readyState,
        wsUrl: this.ws?.url
      },
      metrics: this.connectionMetrics,
      recentHistory: this.connectionHistory.slice(-10),
      currentUser: this.currentUser ? {
        id: this.currentUser.id,
        email: this.currentUser.email
      } : null,
      browserInfo: {
        userAgent: navigator.userAgent,
        webSocketSupport: 'WebSocket' in window,
        location: window.location.href,
        online: navigator.onLine
      }
    };
  }

  public printDebugInfo(): void {
    console.table(this.getDebugInfo());
  }

  // Network connectivity check
  private checkNetworkConnectivity(): boolean {
    const isOnline = navigator.onLine;
    this.logDebug('🌐 Network connectivity check', { online: isOnline });
    return isOnline;
  }

  // Manual connection test for debugging
  public testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.checkNetworkConnectivity()) {
        this.logError('❌ Connection test failed: No network connectivity');
        resolve(false);
        return;
      }

      const testWs = new WebSocket(this.getWebSocketUrl());
      const timeout = setTimeout(() => {
        testWs.close();
        this.logError('❌ Connection test failed: Timeout');
        resolve(false);
      }, 5000);

      testWs.onopen = () => {
        clearTimeout(timeout);
        testWs.close();
        this.logDebug('✅ Connection test successful');
        resolve(true);
      };

      testWs.onerror = (error) => {
        clearTimeout(timeout);
        this.logError('❌ Connection test failed:', error);
        resolve(false);
      };
    });
  }
}

export const chatWebSocketManager = ChatWebSocketManager.getInstance();
