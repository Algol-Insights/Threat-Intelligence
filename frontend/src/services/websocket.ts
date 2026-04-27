import { WSMessage, WSMessageType } from '../types';

type Handler = (payload: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers = new Map<WSMessageType, Set<Handler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxDelay = 30000;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/ws`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => { console.log('[WS] Connected'); this.reconnectDelay = 1000; };
    this.ws.onclose = () => { console.log('[WS] Disconnected'); this.scheduleReconnect(); };
    this.ws.onerror = () => { this.ws?.close(); };
    this.ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        this.handlers.get(msg.type)?.forEach(fn => fn(msg.payload));
      } catch { /* ignore parse errors */ }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  on(type: WSMessageType, handler: Handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => { this.handlers.get(type)?.delete(handler); };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  get connected() { return this.ws?.readyState === WebSocket.OPEN; }
}

export const wsService = new WebSocketService();
