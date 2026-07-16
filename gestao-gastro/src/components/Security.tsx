import React, { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { useModules } from '../hooks/useModules';
import { queryLogs } from '../services/auditService';
import { AuditLogEntry } from '../types';
import { AppModule } from '../config/modulesConfig';
import { HelpTooltip } from './HelpTooltip';
import {
  Shield, FileText, Database,
  AlertCircle, ShieldCheck, UserCheck,
  Cloud, AlertTriangle, Server,
  Activity, Users, TerminalSquare, ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';

export const Security: React.FC = () => {
  const { theme, currentEmpresa, currentUser, supabaseOnline, collaborators } = useApp();
  const { currentPlan, checkAccess } = useModules();
  const isDark = theme === 'dark';

  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    if (currentEmpresa) {
      const { logs } = queryLogs(currentEmpresa.id, { pageSize: 5 });
      setRecentLogs(logs);
    }
  }, [currentEmpresa]);

  const tenantId = currentEmpresa?.tenantId || '';
  const maskedTenant = tenantId ? `${tenantId.substring(0, 8)}...` : 'NÃO DEFINIDO';

  const activeCollabs = collaborators?.filter(c => c.active).length || 0;
  const totalCollabs = collaborators?.length || 0;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-200 pb-24">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row items-center gap-8 border-b border-dashed border-current/10 pb-12">
        <div className="w-24 h-24 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <Shield className="w-12 h-12 text-blue-500" />
        </div>
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter uppercase flex items-center gap-2">
            Central de Segurança <HelpTooltip moduleKey="security" />
          </h1>
          <p className="text-sm font-bold opacity-40 uppercase tracking-wide">
            Transparência, Privacidade e Operação
          </p>
          <div className="inline-block mt-2 px-3 py-1 rounded bg-current/5 border border-current/10 text-[10px] font-bold uppercase tracking-widest text-[#475569]">
            Plano atual: {currentPlan === 'base' ? 'Base' : currentPlan === 'premium' ? 'Premium' : 'Master'}
          </div>
        </div>
      </div>

      {/* Alertas Preventivos */}
      {(!supabaseOnline || !tenantId || currentUser?.role === 'local') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!supabaseOnline && (
            <div className="flex gap-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold uppercase">Conexão com a nuvem indisponível</h4>
                <p className="text-xs opacity-80 mt-1">
                  O sistema está operando localmente. Os dados serão sincronizados quando a conexão retornar.
                </p>
              </div>
            </div>
          )}
          {!tenantId && (
            <div className="flex gap-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold uppercase">Identificação do restaurante não encontrada</h4>
                <p className="text-xs opacity-80 mt-1">
                  Atenção: A publicação oficial do sistema exige identificação configurada para garantir o isolamento dos dados.
                </p>
              </div>
            </div>
          )}
          {currentUser?.role === 'local' && (
            <div className="flex gap-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold uppercase">Acesso local de teste</h4>
                <p className="text-xs opacity-80 mt-1">
                  Você está operando como um usuário local genérico. Logins reais devem ser validados na publicação oficial do sistema.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Operational Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`p-6 rounded-lg border space-y-4 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-3 text-blue-500">
            <UserCheck className="w-5 h-5" />
            <h3 className="text-xs font-bold uppercase tracking-wide">Sessão e Acesso</h3>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold truncate">{currentUser?.name || 'N/A'}</p>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
              Perfil de acesso: {currentUser?.role || 'Desconhecido'}
            </p>
          </div>
        </div>

        <div className={`p-6 rounded-lg border space-y-4 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-3 text-emerald-500">
            <Server className="w-5 h-5" />
            <h3 className="text-xs font-bold uppercase tracking-wide">Separação dos dados do restaurante</h3>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold truncate">{currentEmpresa?.name || 'Local'}</p>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest font-mono">
              ID: {maskedTenant}
            </p>
          </div>
        </div>

        <div className={`p-6 rounded-lg border space-y-4 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-3 text-amber-500">
            <Cloud className="w-5 h-5" />
            <h3 className="text-xs font-bold uppercase tracking-wide">Sincronização</h3>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold truncate">
              {supabaseOnline ? 'Nuvem Conectada' : 'Modo Offline'}
            </p>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest leading-relaxed">
              Sincronização em nuvem quando autenticado e backup local exportável.
            </p>
          </div>
        </div>

        <div className={`p-6 rounded-lg border space-y-4 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-3 text-rose-500">
            <Users className="w-5 h-5" />
            <h3 className="text-xs font-bold uppercase tracking-wide">Permissões da Equipe</h3>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold truncate">{activeCollabs} Ativos</p>
            <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
              De um total de {totalCollabs} colaboradores.
            </p>
          </div>
        </div>
      </div>

      {/* Plan Modules */}
      <div className={`p-8 rounded-lg border space-y-6 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-indigo-500" />
          <h2 className="text-sm font-bold uppercase tracking-wide">Módulos de Controle Contratados</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'configuracoes' as AppModule, label: 'Configurações' },
            { id: 'seguranca' as AppModule, label: 'Segurança' },
            { id: 'colaboradores' as AppModule, label: 'Colaboradores' },
            { id: 'caixa' as AppModule, label: 'Caixa' },
            { id: 'relatorios' as AppModule, label: 'Relatórios' }
          ].map((mod) => {
            const hasAccess = checkAccess(mod.id);
            return (
              <span key={mod.id} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                hasAccess
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-gray-500/10 text-gray-500 opacity-50 border border-gray-500/20'
              }`}>
                {mod.label} {hasAccess ? '(Ativo)' : '(Bloqueado)'}
              </span>
            );
          })}
        </div>
      </div>

      {/* Local Audit Log */}
      <div className={`p-8 rounded-lg border space-y-6 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <TerminalSquare className="w-5 h-5 text-slate-500" />
          <h2 className="text-sm font-bold uppercase tracking-wide">Últimos Eventos de Auditoria Local</h2>
        </div>

        {recentLogs.length > 0 ? (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-3 rounded bg-current/5">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold opacity-50 uppercase">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                  <span className="text-[11px] font-bold">{log.type}</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <span className="text-[10px] opacity-70 truncate max-w-xs">{log.detail}</span>
                  <span className="px-2 py-0.5 rounded bg-current/10 text-[9px] font-bold uppercase">{log.userName || 'Sistema'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-lg border border-dashed text-center space-y-2">
            <Database className="w-8 h-8 opacity-20 mx-auto" />
            <p className="text-xs font-bold uppercase tracking-wide opacity-50">Nenhum evento registrado na auditoria local</p>
          </div>
        )}
      </div>

      {/* Terms and Policies */}
      <div className={`p-8 rounded-lg border space-y-8 flex flex-col md:flex-row gap-8 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#475569]" />
            <h2 className="text-sm font-bold uppercase tracking-tight">Termos e Políticas de Segurança</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex gap-3 p-4 rounded-lg bg-current/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#475569] mt-1.5 flex-shrink-0" />
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wide">Uso de Dados</h4>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">O usuário é proprietário absoluto de todos os dados inseridos.</p>
              </div>
            </div>
            <div className="flex gap-3 p-4 rounded-lg bg-current/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#475569] mt-1.5 flex-shrink-0" />
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wide">Privacidade Garantida</h4>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">Nenhum de seus dados financeiros ou configurações do cardápio são compartilhados com terceiros.</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`md:w-64 p-6 rounded-lg space-y-4 border border-dashed flex flex-col items-center justify-center text-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
          <div className="inline-flex p-3 rounded-xl bg-slate-500/10 text-slate-500">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wide">Termos de Uso em PDF</h4>
          <p className="text-[9px] font-bold opacity-40 uppercase leading-relaxed">
            Documentação formal em processo de elaboração.
          </p>
          <div className="w-full h-10 rounded-lg bg-current/5 border border-current/10 font-bold text-[9px] uppercase tracking-wide flex items-center justify-center opacity-50 cursor-not-allowed">
            PDF em preparação
          </div>
        </div>
      </div>

    </div>
  );
};
