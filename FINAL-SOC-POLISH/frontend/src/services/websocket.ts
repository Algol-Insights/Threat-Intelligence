type Handler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<Handler>> = new Map();
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private maxReconnect = 50;
  private reconnectDelay = 2000;
  private _connected = false;
  private audioCtx: AudioContext | null = null;

  get connected() { return this._connected; }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname;
    const port = window.location.port || (proto === 'wss' ? '443' : '80');

    try {
      this.ws = new WebSocket(`${proto}://${host}:${port}/ws`);
    } catch { this.scheduleReconnect(); return; }

    this.ws.onopen = () => {
      this._connected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 2000;
      this.emit('_connection', { connected: true });
    };

    this.ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        this.emit(type, payload);
      } catch { /* ignore malformed */ }
    };

    this.ws.onclose = () => {
      this._connected = false;
      this.emit('_connection', { connected: false });
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnect) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, Math.min(this.reconnectDelay * Math.pow(1.3, this.reconnectAttempts), 30000));
  }

  private emit(type: string, data: any) {
    this.handlers.get(type)?.forEach(h => { try { h(data); } catch { /* */ } });
  }

  on(type: string, handler: Handler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => { this.handlers.get(type)?.delete(handler); };
  }

  // Critical alert sound — short beep using Web Audio API (no file needed)
  playAlertSound(severity: 'Critical' | 'High' = 'Critical') {
    try {
      if (!this.audioCtx) this.audioCtx = new AudioContext();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.frequency.value = severity === 'Critical' ? 880 : 660;
      gain.gain.value = 0.15;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);
      osc.stop(this.audioCtx.currentTime + 0.3);
    } catch { /* audio not available */ }
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this._connected = false;
  }
}

export const wsService = new WebSocketService();
