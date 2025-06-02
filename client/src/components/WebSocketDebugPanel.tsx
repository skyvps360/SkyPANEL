import React, { useState, useEffect } from 'react';
import { chatWebSocketManager } from '../lib/chat-websocket-manager';

interface WebSocketDebugPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

export const WebSocketDebugPanel: React.FC<WebSocketDebugPanelProps> = ({ isVisible, onToggle }) => {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      const updateDebugInfo = () => {
        setDebugInfo(chatWebSocketManager.getDebugInfo());
      };

      // Update immediately
      updateDebugInfo();

      // Update every 2 seconds while panel is visible
      const interval = setInterval(updateDebugInfo, 2000);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const result = await chatWebSocketManager.testConnection();
      setTestResult(result ? '✅ Connection test successful' : '❌ Connection test failed');
    } catch (error) {
      setTestResult(`❌ Connection test error: ${error.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handlePrintDebugInfo = () => {
    chatWebSocketManager.printDebugInfo();
    console.log('📊 Debug info printed to console');
  };

  const getReadyStateText = (state: number | undefined) => {
    if (state === undefined) return 'N/A';
    switch (state) {
      case WebSocket.CONNECTING: return 'CONNECTING (0)';
      case WebSocket.OPEN: return 'OPEN (1)';
      case WebSocket.CLOSING: return 'CLOSING (2)';
      case WebSocket.CLOSED: return 'CLOSED (3)';
      default: return `UNKNOWN (${state})`;
    }
  };

  const getConnectionStatusColor = (isConnected: boolean, isConnecting: boolean) => {
    if (isConnected) return 'text-green-600';
    if (isConnecting) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Show WebSocket Debug Panel"
      >
        🔧 Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-md w-full max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800">WebSocket Debug Panel</h3>
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-700 text-xl"
          title="Hide Debug Panel"
        >
          ×
        </button>
      </div>

      {debugInfo && (
        <div className="space-y-3 text-sm">
          {/* Connection Status */}
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="font-semibold mb-2">Connection Status</h4>
            <div className="space-y-1">
              <div className={`font-medium ${getConnectionStatusColor(debugInfo.connectionState.isConnected, debugInfo.connectionState.isConnecting)}`}>
                Status: {debugInfo.connectionState.isConnected ? '🟢 Connected' : debugInfo.connectionState.isConnecting ? '🟡 Connecting' : '🔴 Disconnected'}
              </div>
              <div>Ready State: {getReadyStateText(debugInfo.connectionState.wsReadyState)}</div>
              <div>Reconnect Attempts: {debugInfo.connectionState.reconnectAttempts}</div>
              {debugInfo.connectionState.wsUrl && (
                <div className="text-xs text-gray-600 break-all">URL: {debugInfo.connectionState.wsUrl}</div>
              )}
            </div>
          </div>

          {/* Connection Metrics */}
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="font-semibold mb-2">Metrics</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Total Attempts: {debugInfo.metrics.totalAttempts}</div>
              <div>Successful: {debugInfo.metrics.successfulConnections}</div>
              <div>Failed: {debugInfo.metrics.failedConnections}</div>
              <div>Success Rate: {debugInfo.metrics.totalAttempts > 0 ? Math.round((debugInfo.metrics.successfulConnections / debugInfo.metrics.totalAttempts) * 100) : 0}%</div>
            </div>
            {debugInfo.metrics.lastSuccessfulConnection && (
              <div className="text-xs text-green-600 mt-1">
                Last Success: {new Date(debugInfo.metrics.lastSuccessfulConnection).toLocaleTimeString()}
              </div>
            )}
            {debugInfo.metrics.lastFailure && (
              <div className="text-xs text-red-600 mt-1">
                Last Failure: {new Date(debugInfo.metrics.lastFailure).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Recent Events */}
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="font-semibold mb-2">Recent Events</h4>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {debugInfo.recentHistory.length > 0 ? (
                debugInfo.recentHistory.map((event: any, index: number) => (
                  <div key={index} className="text-xs flex justify-between">
                    <span className={`font-medium ${
                      event.event === 'success' ? 'text-green-600' :
                      event.event === 'error' || event.event === 'failure' ? 'text-red-600' :
                      event.event === 'attempt' ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      {event.event.toUpperCase()}
                    </span>
                    <span className="text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500">No recent events</div>
              )}
            </div>
          </div>

          {/* Browser Info */}
          <div className="bg-gray-50 p-3 rounded">
            <h4 className="font-semibold mb-2">Browser Info</h4>
            <div className="space-y-1 text-xs">
              <div>WebSocket Support: {debugInfo.browserInfo.webSocketSupport ? '✅ Yes' : '❌ No'}</div>
              <div>Online: {debugInfo.browserInfo.online ? '✅ Yes' : '❌ No'}</div>
              <div className="text-gray-600 break-all">User Agent: {debugInfo.browserInfo.userAgent.substring(0, 50)}...</div>
            </div>
          </div>

          {/* Current User */}
          {debugInfo.currentUser && (
            <div className="bg-gray-50 p-3 rounded">
              <h4 className="font-semibold mb-2">Current User</h4>
              <div className="space-y-1 text-xs">
                <div>ID: {debugInfo.currentUser.id}</div>
                <div>Email: {debugInfo.currentUser.email}</div>
              </div>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm">{testResult}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isTestingConnection ? '🔄 Testing...' : '🧪 Test Connection'}
            </button>
            <button
              onClick={handlePrintDebugInfo}
              className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700"
            >
              📊 Print to Console
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
