import React from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useApp } from '../store/AppContext';

export const OfflineStatusBanner: React.FC = () => {
  const { pdvOfflineQueue, isSyncingPdvQueue, syncPdvOfflineQueue, supabaseOnline } = useApp();

  if (pdvOfflineQueue.length === 0 && supabaseOnline) {
    return null;
  }

  const isOffline = !supabaseOnline;
  const pendingCount = pdvOfflineQueue.length;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-between text-yellow-200 text-sm">
      <div className="flex items-center gap-2">
        <CloudOff size={16} />
        <span>
          {isOffline 
            ? 'Você está offline. As alterações estão sendo salvas no dispositivo.' 
            : 'Conexão restabelecida.'}
        </span>
        {pendingCount > 0 && (
          <span className="ml-2 font-medium">
            ({pendingCount} {pendingCount === 1 ? 'ação pendente' : 'ações pendentes'})
          </span>
        )}
      </div>

      {pendingCount > 0 && (
        <button
          onClick={() => syncPdvOfflineQueue()}
          disabled={isOffline || isSyncingPdvQueue}
          className={`flex items-center gap-2 px-3 py-1 rounded transition-colors ${
            isOffline 
              ? 'opacity-50 cursor-not-allowed bg-yellow-500/20' 
              : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-100'
          }`}
        >
          <RefreshCw size={14} className={isSyncingPdvQueue ? 'animate-spin' : ''} />
          {isSyncingPdvQueue ? 'Sincronizando...' : 'Sincronizar Agora'}
        </button>
      )}
    </div>
  );
};
