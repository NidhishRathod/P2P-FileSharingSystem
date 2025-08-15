class WebSocketService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; // 3 seconds
    this.peerId = null;
  }

  getWebSocketUrl() {
    // In development, use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `ws://localhost:8080/ws?peer_id=${this.peerId}`;
    }
    
    // In production, use the backend URL from environment or default to Render
    const backendUrl = window.BACKEND_URL || 'https://p2p-filesharingsystem.onrender.com';
    const wsUrl = backendUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    return `${wsUrl}/ws?peer_id=${this.peerId}`;
  }

  connect(peerId) {
    this.peerId = peerId;
    this.reconnectAttempts = 0;
    this.connectWebSocket();
  }

  connectWebSocket() {
    try {
      const wsUrl = this.getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handleReconnect();
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.handleReconnect();
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.handleReconnect();
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connectWebSocket(), this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  addMessageHandler(handler) {
    this.messageHandlers.add(handler);
  }

  removeMessageHandler(handler) {
    this.messageHandlers.delete(handler);
  }

  sendBroadcast(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'broadcast',
        message: message
      }));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  sendDirectMessage(targetPeerId, message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: 'direct',
        target: String(targetPeerId),
        message: message
      }));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.messageHandlers.clear();
    this.reconnectAttempts = 0;
  }
}

const instance = new WebSocketService();
export default instance; 