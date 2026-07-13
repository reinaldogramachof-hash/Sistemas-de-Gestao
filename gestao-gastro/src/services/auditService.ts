import { AuditLogEntry } from '../types';

export function buildScopedStorageKey(collection: string, empresaId: string) {
  return `${collection}_${empresaId}`;
}

export function logEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>, empresaId: string): void {
  try {
    const key = buildScopedStorageKey('auditLogs', empresaId);
    const existing = localStorage.getItem(key);
    const logs: AuditLogEntry[] = existing ? JSON.parse(existing) : [];
    
    const newLog: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      timestamp: new Date().toISOString(),
      empresaId
    };
    
    logs.push(newLog);
    localStorage.setItem(key, JSON.stringify(logs));
  } catch (error) {
    // Fire and forget, do not throw
  }
}

export function queryLogs(empresaId: string, filters?: {
  type?: string;
  userId?: string;
  from?: string; // ISO date
  to?: string;   // ISO date
  page?: number; // default 1
  pageSize?: number; // default 50
}): { logs: AuditLogEntry[]; total: number; pages: number } {
  try {
    const key = buildScopedStorageKey('auditLogs', empresaId);
    const existing = localStorage.getItem(key);
    let logs: AuditLogEntry[] = existing ? JSON.parse(existing) : [];

    // Filter
    if (filters) {
      if (filters.type) {
        logs = logs.filter(l => l.type === filters.type);
      }
      if (filters.userId) {
        logs = logs.filter(l => l.userId === filters.userId);
      }
      if (filters.from) {
        const fromTime = new Date(filters.from).getTime();
        logs = logs.filter(l => new Date(l.timestamp).getTime() >= fromTime);
      }
      if (filters.to) {
        const toTime = new Date(filters.to).getTime() + 86400000; 
        logs = logs.filter(l => new Date(l.timestamp).getTime() < toTime);
      }
    }

    // Sort descending by timestamp
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = logs.length;
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const pages = Math.ceil(total / pageSize) || 1;

    const start = (page - 1) * pageSize;
    const paginatedLogs = logs.slice(start, start + pageSize);

    return { logs: paginatedLogs, total, pages };
  } catch (error) {
    return { logs: [], total: 0, pages: 1 };
  }
}

export function exportCSV(logs: AuditLogEntry[]): string {
  if (logs.length === 0) return 'Data/Hora,Tipo,Usuário,Detalhe,Extras';

  const headers = ['Data/Hora', 'Tipo', 'Usuário', 'Detalhe', 'Extras'];
  
  const rows = logs.map(l => {
    const date = new Date(l.timestamp).toLocaleString('pt-BR');
    const extra = l.extra ? JSON.stringify(l.extra).replace(/"/g, '""') : '';
    const detail = (l.detail || '').replace(/"/g, '""');
    const userName = (l.userName || '').replace(/"/g, '""');
    
    return `"${date}","${l.type}","${userName}","${detail}","${extra}"`;
  });

  return [headers.join(','), ...rows].join('\n');
}

export function purgeOldLogs(empresaId: string): void {
  try {
    const key = buildScopedStorageKey('auditLogs', empresaId);
    const existing = localStorage.getItem(key);
    if (!existing) return;

    const logs: AuditLogEntry[] = JSON.parse(existing);
    
    // 90 dias atrás
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000);
    
    const filtered = logs.filter(l => new Date(l.timestamp).getTime() >= cutoff);
    
    if (filtered.length !== logs.length) {
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  } catch (error) {
  }
}
