/**
 * Thin client for the Superdesk notification websocket (config.server.ws).
 *
 * Unlike services/websocket.js (which speaks the Publisher PWA's array-indexed
 * protocol) the Superdesk server pushes plain-JSON messages of the shape
 * `{ event, extra, _created, _process }` on /ws and requires no auth to
 * connect. This wrapper connects, auto-reconnects, and lets callers subscribe
 * to events by name (e.g. "content:update", "item:publish").
 */
class SuperdeskWebsocket {
  constructor(config) {
    this.config = config || {};
    this.ws = null;
    this.reconnectTimer = null;
    this.closedByUser = false;
    // event name -> Set of handlers
    this.listeners = {};
  }

  getUrl() {
    const server = this.config.server || {};
    return server.ws || null;
  }

  open() {
    const url = this.getUrl();
    if (!url) return;

    this.closedByUser = false;

    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }

    this.bindEvents();
  }

  bindEvents() {
    this.ws.onopen = () => {
      clearTimeout(this.reconnectTimer);
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (!this.closedByUser) this.scheduleReconnect();
    };

    this.ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      if (!msg || !msg.event) return;

      const handlers = this.listeners[msg.event];
      if (handlers) handlers.forEach((handler) => handler(msg));
    };
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.closedByUser) this.open();
    }, 5000);
  }

  /**
   * Subscribe to a websocket event. Returns an unsubscribe function.
   */
  on(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this.listeners[event]) this.listeners[event].delete(handler);
  }

  close() {
    this.closedByUser = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default SuperdeskWebsocket;
