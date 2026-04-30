const BASE = '/api/v1';

function getToken(): string | null { return localStorage.getItem('chengeto_token'); }

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...opts.headers as Record<string, string> };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (res.status === 401) { localStorage.removeItem('chengeto_token'); window.location.href = '/login'; throw new Error('Unauthorized'); }
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || res.statusText); }
  return res.json();
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body: any) => request<T>(path, { method: 'POST', body: JSON.stringify(body) });
const patch = <T>(path: string, body: any) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export const api = {
  // Auth
  login: (username: string, password: string) => post<{ token: string; user: any }>('/auth/login', { username, password }),
  me: () => get<{ user: any }>('/auth/me'),
  getUsers: () => get<{ users: any[] }>('/auth/users'),
  createUser: (data: any) => post<{ user: any }>('/auth/register', data),
  deleteUser: (id: string) => del<{ success: boolean }>(`/auth/users/${id}`),

  // Analysis
  analyzeThreat: (log: any, context?: any) => post<{ analysis: any; meta: any }>('/analyze/threat', { log, context }),
  getRemediation: (service: any) => post<{ remediation: string; meta: any }>('/analyze/remediation', { service }),

  // Events (persisted)
  getEvents: (params?: Record<string, string>) => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return get<{ events: any[]; total: number }>(`/events${qs}`); },
  getEventStats: () => get<any>('/events/stats'),

  // Alerts (persisted)
  getAlerts: (params?: Record<string, string>) => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return get<{ alerts: any[]; total: number }>(`/events/alerts${qs}`); },

  // Incidents
  getIncidents: (params?: Record<string, string>) => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return get<{ incidents: any[]; total: number }>(`/incidents${qs}`); },
  getIncident: (id: string) => get<{ incident: any; timeline: any[] }>(`/incidents/${id}`),
  createIncident: (data: any) => post<{ id: string }>('/incidents', data),
  updateIncidentStatus: (id: string, status: string) => patch<{ success: boolean }>(`/incidents/${id}/status`, { status }),
  updateIncident: (id: string, data: any) => patch<{ success: boolean }>(`/incidents/${id}`, data),

  // Compliance
  getComplianceMetrics: (days = 30) => get<any>(`/compliance/metrics?days=${days}`),
  getComplianceReport: (start?: string, end?: string) => { const qs = new URLSearchParams(); if (start) qs.set('start', start); if (end) qs.set('end', end); return get<any>(`/compliance/report?${qs}`); },
  sendNotification: (id: string) => post<{ success: boolean }>(`/compliance/${id}/notify`, {}),

  // IOC
  getIOCs: (params?: Record<string, string>) => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return get<{ iocs: any[] }>(`/ioc${qs}`); },
  addIOC: (data: any) => post<{ id: string }>('/ioc', data),
  deleteIOC: (id: string) => del<{ success: boolean }>(`/ioc/${id}`),
  bulkAddIOCs: (iocs: any[]) => post<{ added: number; total: number }>('/ioc/bulk', { iocs }),

  // Feeds
  getFeeds: () => get<{ feeds: any[] }>('/feeds'),
  syncFeed: (id: string) => post<{ success: boolean; iocCount: number }>(`/feeds/${id}/sync`, {}),

  // Admin
  getAuditLog: (params?: Record<string, string>) => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return get<{ entries: any[] }>(`/admin/audit${qs}`); },
  getConfig: () => get<{ config: Record<string, string> }>('/admin/config'),
  setConfig: (key: string, value: string) => request<{ success: boolean }>('/admin/config', { method: 'PUT', body: JSON.stringify({ key, value }) }),
  getCorrelationRules: () => get<{ rules: any[] }>('/admin/correlation/rules'),
  updateCorrelationRule: (id: string, data: any) => patch<{ success: boolean }>(`/admin/correlation/rules/${id}`, data),

  // Metrics
  getMetrics: () => get<any>('/metrics'),
  getCorrelationStats: () => get<any>('/correlation/stats'),
  getRegionalThreat: () => get<any>('/regional'),

  // Playbooks
  getPlaybooks: () => get<{ playbooks: any[] }>('/playbooks'),
  getPlaybook: (id: string) => get<{ playbook: any; executions: any[] }>(`/playbooks/${id}`),
  createPlaybook: (data: any) => post<{ id: string }>('/playbooks', data),
  executePlaybook: (id: string, triggerEvent?: any) => post<any>(`/playbooks/${id}/execute`, { triggerEvent }),
  updatePlaybook: (id: string, data: any) => patch<{ success: boolean }>(`/playbooks/${id}`, data),

  // Alert config
  getAlertConfig: () => get<any>('/alerts/config'),
  setAlertConfig: (key: string, value: string) => request<{ success: boolean }>('/alerts/config', { method: 'PUT', body: JSON.stringify({ key, value }) }),
  testAlert: () => post<any>('/alerts/test', {}),

  // Health
  health: () => get<any>('/health'),
};
