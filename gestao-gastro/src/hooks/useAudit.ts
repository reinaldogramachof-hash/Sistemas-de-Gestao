import { useApp } from '../store/AppContext';
import { logEvent } from '../services/auditService';
import { AuditLogEntry } from '../types';

export function useAudit() {
  const { currentUser, currentEmpresa } = useApp();
  const log = (type: string, detail: string, extra?: Record<string, unknown>) => {
    if (!currentUser || !currentEmpresa) return;
    logEvent({
      type,
      userId: currentUser.id,
      userName: currentUser.name,
      empresaId: currentEmpresa.id,
      detail,
      extra
    }, currentEmpresa.id);
  };
  return { log };
}
