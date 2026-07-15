import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import {
  Settings as SettingsIcon, Store, Printer, Database, Save,
  Download, Upload, RefreshCw, Check, AlertTriangle, ShieldCheck,
  Globe, Phone, MapPin, FileText, Layout, QrCode, Copy,
  ExternalLink, Users, KeyRound, Smartphone, UserCheck, UserPlus, X as XIcon, Lock, Loader2, Table2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings, Collaborator } from '../types';
import { getComandaAccessUrl, getComandaQrImageUrl, validateLanOrigin } from '../utils/comandaAccess';
import { supabase } from '../lib/supabase';
import { HelpTooltip } from './HelpTooltip';
import { useModules } from '../hooks/useModules';

export const Settings: React.FC = () => {
  const { settings, updateSettings, exportData, importData, resetToMocks, theme, collaborators, tables, currentEmpresa, supabaseOnline, reloadCollaborators, initializeTables, currentUser } = useApp();
  const { checkAccess } = useModules();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'store' | 'tables' | 'access' | 'kitchen' | 'printer' | 'data'>('store');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedAccess, setCopiedAccess] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'waiter' | 'cashier' | 'admin'>('waiter');
  const [newMemberError, setNewMemberError] = useState('');
  const [newMemberLoading, setNewMemberLoading] = useState(false);

  const [initTablesCount, setInitTablesCount] = useState<number>(12);
  const [isInitializingTables, setIsInitializingTables] = useState<boolean>(false);
  const [lanValidationMsg, setLanValidationMsg] = useState<{ type: 'error' | 'warn' | 'ok'; text: string } | null>(null);

  React.useEffect(() => {
    if (tables.length > 0) {
      setInitTablesCount(tables.length);
    }
  }, [tables.length]);

  const handleToggleStatus = async (collabId: string, currentStatus: string) => {
    if (!supabaseOnline || !currentEmpresa.tenantId) {
      alert('Operação remota indisponível no momento.');
      return;
    }

    const { data: { session } } = await supabase!.auth.getSession();
    if (!session) {
      alert('Sessão expirada. Faça login novamente.');
      return;
    }

    const newActive = currentStatus !== 'active';

    try {
      const response = await fetch('/api_admin_users.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'toggle_member_status',
          tenant_id: currentEmpresa.tenantId,
          user_id: collabId,
          active: newActive
        })
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        await reloadCollaborators();
      } else {
        alert(data.message || 'Erro ao alterar status do colaborador.');
      }
    } catch (err) {
      alert('Erro de conexão ao servidor.');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewMemberError('');

    if (newUserPassword.length < 6) {
      setNewMemberError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!supabaseOnline || !currentEmpresa.tenantId) {
      setNewMemberError('Operação indisponível. Supabase offline.');
      return;
    }

    const { data: { session } } = await supabase!.auth.getSession();
    if (!session) {
      setNewMemberError('Sessão expirada. Faça login novamente.');
      return;
    }

    setNewMemberLoading(true);

    try {
      const response = await fetch('/api_admin_users.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'create_member',
          tenant_id: currentEmpresa.tenantId,
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole
        })
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        alert('Colaborador cadastrado com sucesso!');
        setModalOpen(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('waiter');
        await reloadCollaborators();
      } else {
        setNewMemberError(data.message || 'Erro ao criar colaborador.');
      }
    } catch (err) {
      setNewMemberError('Erro ao comunicar com o servidor.');
    } finally {
      setNewMemberLoading(false);
    }
  };

  const handleInitializeTables = async () => {
    const userRole = currentUser.role ? currentUser.role.toLowerCase() : '';
    if (userRole !== 'owner' && userRole !== 'admin' && userRole !== 'proprietário' && userRole !== 'administrador') {
      alert('Apenas o proprietário ou administrador podem gerenciar as mesas do salão.');
      return;
    }

    if (initTablesCount <= 0 || initTablesCount > 100) {
      alert('Quantidade inválida. Escolha entre 1 e 100 mesas.');
      return;
    }

    setIsInitializingTables(true);
    try {
      await initializeTables(initTablesCount);
      alert('Mesas inicializadas com sucesso no restaurante!');
    } catch (err: any) {
      alert(err.message || 'Erro ao inicializar mesas. Verifique sua conexão com o banco.');
    } finally {
      setIsInitializingTables(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    updateSettings(formData);
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_gestao_gastro_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        importData(event.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  const comandaAccessUrl = getComandaAccessUrl(window.location.origin, window.location.pathname, settings.localTestOrigin);
  const comandaQrUrl = getComandaQrImageUrl(comandaAccessUrl);
  const waiterMembers = collaborators.filter(member => member.permissions === 'waiter');
  const activeWaiterMembers = waiterMembers.filter(member => member.status === 'active');
  const freeTables = tables.filter(table => table.status === 'livre').length;

  const handleCopyAccessLink = async () => {
    await navigator.clipboard.writeText(comandaAccessUrl);
    setCopiedAccess(true);
    setTimeout(() => setCopiedAccess(false), 1200);
  };

  const handleOpenComanda = () => {
    window.open(comandaAccessUrl, '_blank', 'noopener,noreferrer');
  };

  const tabs = [
    { id: 'store', label: 'Estabelecimento', icon: Store },
    { id: 'tables', label: 'Mesas do salão', icon: Table2 },
    { id: 'access', label: 'Acessos e QR Code', icon: QrCode },
    ...(checkAccess('cozinha') ? [{ id: 'kitchen', label: 'Cozinha (KDS)', icon: Layout }] : []),
    { id: 'printer', label: 'Impressão', icon: Printer },
    { id: 'data', label: 'Dados & Backup', icon: Database },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-3xl font-bold tracking-tighter uppercase ">Configurações</h2>
            <HelpTooltip moduleKey="settings" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">Personalização e Gestão do Sistema</p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-8 h-12 rounded-xl font-bold text-[10px] uppercase tracking-wide transition-all shadow-sm flex items-center gap-2
            ${isSaving
              ? 'bg-emerald-500 text-white'
              : 'bg-[#475569] text-white'
            }
          `}
        >
          {isSaving ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Alterações Salvas' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-lg transition-all font-bold text-xs uppercase tracking-tight
                ${activeTab === tab.id
                  ? 'bg-[#475569] text-white shadow-sm'
                  : `${isDark ? 'bg-white/5 text-white/40 hover:bg-white/10' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100 shadow-sm'}`
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className={`flex-1 rounded-lg border p-8 md:p-10 ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>
          {activeTab === 'store' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-4 border-b border-dashed border-current/10 pb-6 mb-8">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Store className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase  tracking-tighter">Dados do Estabelecimento</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">Informacoes que saem nos cupons e relatórios</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Nome Fantasia</label>
                  <div className="relative group">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                    <input
                      value={formData.establishment.name}
                      onChange={e => setFormData({ ...formData, establishment: { ...formData.establishment, name: e.target.value } })}
                      className={`w-full h-14 pl-12 pr-6 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">CNPJ / Documento</label>
                  <div className="relative group">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                    <input
                      value={formData.establishment.document}
                      onChange={e => setFormData({ ...formData, establishment: { ...formData.establishment, document: e.target.value } })}
                      className={`w-full h-14 pl-12 pr-6 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Telefone de Contato</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                    <input
                      value={formData.establishment.phone}
                      onChange={e => setFormData({ ...formData, establishment: { ...formData.establishment, phone: e.target.value } })}
                      className={`w-full h-14 pl-12 pr-6 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Website / Redes Sociais</label>
                  <div className="relative group">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                    <input
                      value={formData.establishment.website}
                      onChange={e => setFormData({ ...formData, establishment: { ...formData.establishment, website: e.target.value } })}
                      className={`w-full h-14 pl-12 pr-6 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Taxa de serviço (%)</label>
                  <div className="relative group">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.serviceChargeRate !== undefined ? Math.round(formData.serviceChargeRate * 100) : 10}
                      onChange={e => {
                        const pct = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, serviceChargeRate: pct / 100 });
                      }}
                      className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Endereço Completo</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-5 w-4 h-4 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                    <textarea
                      rows={2}
                      value={formData.establishment.address}
                      onChange={e => setFormData({ ...formData, establishment: { ...formData.establishment, address: e.target.value } })}
                      className={`w-full p-5 pl-12 rounded-lg border outline-none font-bold text-sm resize-none transition-all ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tables' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-4 border-b border-dashed border-current/10 pb-6 mb-8">
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Table2 className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tighter">Mesas do salão</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">Gerenciamento e inicialização das mesas para atendimento</p>
                </div>
              </div>

              <div className={`p-6 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                <p className="text-xs font-bold uppercase tracking-wide mb-1 text-muted">Mesas Cadastradas</p>
                <p className="text-3xl font-extrabold tracking-tight">{tables.length} mesas</p>
              </div>

              {tables.length === 0 ? (
                <div className="text-center py-10 space-y-4">
                  <p className="text-sm text-muted">Nenhuma mesa operacional cadastrada para este restaurante.</p>

                  <div className="max-w-xs mx-auto space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wide opacity-40 text-left">Quantidade Inicial de Mesas</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={initTablesCount}
                      onChange={e => setInitTablesCount(parseInt(e.target.value) || 12)}
                      className={`w-full h-12 px-4 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-white border-gray-200'}`}
                    />
                    <button
                      type="button"
                      disabled={isInitializingTables}
                      onClick={handleInitializeTables}
                      className="w-full h-12 rounded-lg bg-accent text-white text-xs font-bold uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {isInitializingTables ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Inicializando...
                        </>
                      ) : (
                        'Criar mesas iniciais'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-semibold">
                    As mesas estão prontas e sincronizadas em tempo real com a comanda dos garçons e o PDV.
                  </div>

                  <div className="max-w-xs space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wide opacity-40">Redefinir quantidade de mesas (Quantidade Total)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={initTablesCount}
                      onChange={e => setInitTablesCount(parseInt(e.target.value) || tables.length)}
                      className={`w-full h-12 px-4 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-white border-gray-200'}`}
                    />
                    <button
                      type="button"
                      disabled={isInitializingTables}
                      onClick={handleInitializeTables}
                      className="w-full h-12 rounded-lg bg-[#475569] text-white text-xs font-bold uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {isInitializingTables ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Atualizando...
                        </>
                      ) : (
                        'Redefinir Quantidade de Mesas'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'access' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-4 border-b border-dashed border-current/10 pb-6 mb-8">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tighter">Acessos e QR Code</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">Garçons, mesas e acesso mobile</p>
                </div>
              </div>

              {/* IP local para testes em dev */}
              {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                <div className={`p-6 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2 text-amber-500">Endereço da rede local para testes (Apenas Localhost)</p>
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      value={formData.localTestOrigin || ''}
                      onChange={e => {
                        setFormData({ ...formData, localTestOrigin: e.target.value });
                        setLanValidationMsg(null);
                      }}
                      placeholder="http://192.168.0.10:3000"
                      className={`flex-1 h-10 px-3 rounded-lg border outline-none text-sm font-mono ${
                        isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-white border-gray-200'
                      } ${
                        lanValidationMsg?.type === 'error' ? 'border-red-400' :
                        lanValidationMsg?.type === 'ok' ? 'border-emerald-400' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const result = validateLanOrigin(formData.localTestOrigin || '');
                        if (!result.valid) {
                          setLanValidationMsg({ type: 'error', text: result.message || 'Endereço inválido.' });
                          return;
                        }
                        // Normaliza: salva somente protocolo://IP:porta
                        const normalized = result.origin!;
                        const updated = { ...formData, localTestOrigin: normalized };
                        setFormData(updated);
                        updateSettings(updated);
                        setLanValidationMsg({
                          type: result.message ? 'warn' : 'ok',
                          text: result.message || `Origem salva: ${normalized}`
                        });
                      }}
                      className="h-10 px-6 rounded-lg bg-[#475569] text-white text-xs font-bold uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all"
                    >
                      Aplicar IP
                    </button>
                  </div>
                  {lanValidationMsg && (
                    <p className={`text-[10px] font-semibold mt-2 ${
                      lanValidationMsg.type === 'error' ? 'text-red-500' :
                      lanValidationMsg.type === 'warn' ? 'text-amber-500' :
                      'text-emerald-500'
                    }`}>
                      {lanValidationMsg.text}
                    </p>
                  )}
                  {!lanValidationMsg && (
                    <p className="text-[10px] opacity-40 font-semibold mt-2">
                      Informe apenas o IP e a porta da sua máquina na rede Wi-Fi (ex: http://192.168.0.10:3000). Caminhos serão removidos automaticamente.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
                <div className="space-y-6">
                  <div className={`p-6 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide">
                            Link da comanda mobile
                            <HelpTooltip id="help-comanda-link" content="Este link permite que os garçons façam login e acessem o fluxo de comanda mobile pelo celular." anchorId="comanda-mobile" />
                          </p>
                          <p className="text-[11px] font-semibold opacity-50 break-all mt-1">{comandaAccessUrl}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleCopyAccessLink}
                          className="h-10 px-4 rounded-lg bg-[#475569] text-white text-[9px] font-bold uppercase tracking-wide flex items-center gap-2"
                        >
                          {copiedAccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedAccess ? 'Copiado' : 'Copiar'}
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenComanda}
                          className={`h-10 px-4 rounded-lg text-[9px] font-bold uppercase tracking-wide flex items-center gap-2 ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                      <Users className="w-5 h-5 text-emerald-500 mb-4" />
                      <p className="text-2xl font-black tracking-tighter">{activeWaiterMembers.length}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wide opacity-40">Garçons ativos</p>
                    </div>
                    <div className={`p-5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                      <Layout className="w-5 h-5 text-blue-500 mb-4" />
                      <p className="text-2xl font-black tracking-tighter">{freeTables}/{tables.length}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wide opacity-40">Mesas livres</p>
                    </div>
                    <div className={`p-5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                      <ShieldCheck className="w-5 h-5 text-amber-500 mb-4" />
                      <p className="text-2xl font-black tracking-tighter">{supabaseOnline ? 'Online' : 'Local'}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wide opacity-40">Modo de acesso</p>
                    </div>
                  </div>

                  {/* Tabela de Colaboradores e Cadastro */}
                  <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="p-5 border-b border-current/10 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide">Membros da Equipe</p>
                        <p className="text-[9px] font-bold uppercase tracking-wide opacity-40">Equipe gerenciada na nuvem para este restaurante</p>
                      </div>
                      {supabaseOnline && (
                        <button
                          type="button"
                          onClick={() => setModalOpen(true)}
                          className="px-4 h-9 rounded-lg bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wide flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Adicionar Usuário
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-current/10">
                      {collaborators.length === 0 ? (
                        <div className="p-6 text-xs font-semibold opacity-40 text-center">Nenhum colaborador cadastrado.</div>
                      ) : collaborators.map(member => (
                        <div key={member.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold">{member.name}</p>
                            <p className="text-[10px] font-semibold opacity-40">{member.role}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide ${member.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'}`}>
                              {member.status === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                            {supabaseOnline && member.id !== currentUser.id && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(member.id, member.status)}
                                className={`px-3 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wide transition-all active:scale-95
                                  ${member.status === 'active'
                                    ? 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                                  }
                                `}
                              >
                                {member.status === 'active' ? 'Desativar' : 'Ativar'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`p-6 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-start gap-4">
                      <KeyRound className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wide">Instruções de Acesso Local</p>
                        <p className="text-[10px] font-bold opacity-60 leading-relaxed">
                          Para testar e utilizar a comanda mobile nos celulares dos garçons durante o desenvolvimento:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className={`p-4 rounded-lg ${isDark ? 'bg-black/20' : 'bg-white'}`}>
                            <p className="text-[9px] font-black uppercase tracking-wide text-accent mb-2">Passo 1: Mesma Rede</p>
                            <p className="text-[10px] font-bold opacity-60 leading-relaxed">Certifique-se de que o computador servidor e os dispositivos celulares estejam conectados exatamente na mesma rede Wi-Fi local.</p>
                          </div>
                          <div className={`p-4 rounded-lg ${isDark ? 'bg-black/20' : 'bg-white'}`}>
                            <p className="text-[9px] font-black uppercase tracking-wide text-accent mb-2">Passo 2: QR Code / Link</p>
                            <p className="text-[10px] font-bold opacity-60 leading-relaxed">Aponte a câmera do celular para o QR Code ao lado ou compartilhe o link de acesso mobile para abrir a interface de login da comanda.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-xl border flex flex-col items-center text-center gap-5 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="w-full max-w-[240px] rounded-xl bg-white p-4 shadow-sm">
                    <img src={comandaQrUrl} alt="QR Code da comanda mobile" className="w-full aspect-square object-contain" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide">QR Code da comanda</p>
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-wide mt-1">Imprima ou fixe perto da operação interna.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(comandaQrUrl, '_blank', 'noopener,noreferrer')}
                    className="w-full h-11 rounded-lg bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    Abrir QR
                  </button>
                </div>
              </div>

              {/* Modal de Criação de Colaboradores */}
              <AnimatePresence>
                {modalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`w-full max-w-md rounded-2xl border p-8 space-y-6 shadow-2xl relative
                        ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}
                      `}
                    >
                      <button
                        onClick={() => setModalOpen(false)}
                        className="absolute right-4 top-4 p-2 rounded-lg hover:bg-current/10 text-muted"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>

                      <div className="space-y-1">
                        <h4 className="text-xl font-bold uppercase tracking-tight">Adicionar Colaborador</h4>
                        <p className="text-[9px] opacity-40 font-bold uppercase tracking-wide">Cria login remoto de garçom, atendente ou admin</p>
                      </div>

                      <form onSubmit={handleAddMember} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Nome do Colaborador</label>
                          <input
                            type="text"
                            value={newUserName}
                            onChange={e => setNewUserName(e.target.value)}
                            placeholder="Nome de exibição"
                            required
                            className={`w-full h-12 px-4 rounded-xl border outline-none text-sm ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">E-mail do Colaborador</label>
                          <input
                            type="email"
                            value={newUserEmail}
                            onChange={e => setNewUserEmail(e.target.value)}
                            placeholder="exemplo@email.com"
                            required
                            className={`w-full h-12 px-4 rounded-xl border outline-none text-sm ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Senha Inicial</label>
                          <input
                            type="password"
                            value={newUserPassword}
                            onChange={e => setNewUserPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            required
                            className={`w-full h-12 px-4 rounded-xl border outline-none text-sm ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Função / Nível de Acesso</label>
                          <select
                            value={newUserRole}
                            onChange={e => setNewUserRole(e.target.value as any)}
                            className={`w-full h-12 px-4 rounded-xl border outline-none text-sm ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`}
                          >
                            <option value="waiter">Garçom (Apenas Comanda Mobile)</option>
                            <option value="cashier">Atendente/Caixa (Acesso ao PDV/Caixa)</option>
                            <option value="admin">Administrador (Acesso Geral)</option>
                          </select>
                        </div>

                        {newMemberError && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-red-400 text-xs text-center font-semibold">{newMemberError}</p>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={newMemberLoading}
                          className="w-full h-12 bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all flex justify-center items-center gap-2"
                        >
                          {newMemberLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Colaborador'}
                        </button>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'kitchen' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-4 border-b border-dashed border-current/10 pb-6 mb-8">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Layout className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tighter">Cozinha (KDS)</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">Configuração do painel de monitoramento de pedidos</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide opacity-30 ml-2">Modo de Operação</label>
                  <select
                    value={formData.kitchenMode || 'display'}
                    onChange={e => setFormData({ ...formData, kitchenMode: e.target.value as any })}
                    className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-transparent border-[#2C2C2E] text-white' : 'bg-gray-50 border-gray-100'}`}
                  >
                    <option value="display">Modo Visualização (Apenas Leitura)</option>
                    <option value="interactive">Modo Interativo (Alterar status pelo painel)</option>
                  </select>
                  <p className="text-[9px] font-bold opacity-30 ml-2 uppercase tracking-wide">
                    O Modo Interativo permite que os operadores cliquem nos itens para alterar o status (Aguardando → Preparo → Pronto).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'printer' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-4 border-b border-dashed border-current/10 pb-6 mb-8">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Printer className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase  tracking-tighter">configuracao de Impressão</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">Impressoras térmicas e cupons de venda</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className={`p-6 rounded-xl flex items-center justify-between transition-all ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.thermalPrinter.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'}`}>
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-tight">Habilitar Impressora Térmica</h4>
                      <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">Ativar conexao com hardware de impressão</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, thermalPrinter: { ...formData.thermalPrinter, enabled: !formData.thermalPrinter.enabled } })}
                    className={`w-14 h-8 rounded-full transition-all relative ${formData.thermalPrinter.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${formData.thermalPrinter.enabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className={`p-6 rounded-xl flex items-center justify-between transition-all ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.thermalPrinter.autoPrint ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'}`}>
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-tight">Impressão Automática</h4>
                      <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">Imprimir cupom ao finalizar venda no PDV</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, thermalPrinter: { ...formData.thermalPrinter, autoPrint: !formData.thermalPrinter.autoPrint } })}
                    className={`w-14 h-8 rounded-full transition-all relative ${formData.thermalPrinter.autoPrint ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${formData.thermalPrinter.autoPrint ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Largura do Papel</label>
                      <select
                        value={formData.thermalPrinter.paperWidth}
                        onChange={e => setFormData({ ...formData, thermalPrinter: { ...formData.thermalPrinter, paperWidth: e.target.value as any } })}
                        className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm appearance-none ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`}
                      >
                        <option value="80mm">80mm (Padrão)</option>
                        <option value="58mm">58mm (Portátil)</option>
                      </select>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-4 border-b border-dashed border-current/10 pb-6 mb-8">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Database className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase  tracking-tighter">Dados & Segurança</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">Backups e Restauração de sistema</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-8 rounded-lg border space-y-6 flex flex-col justify-between ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
                      <Download className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold uppercase tracking-tight">Exportar Backup</h4>
                    <p className="text-[10px] font-bold opacity-30 uppercase leading-relaxed">Cria um arquivo JSON com todos os dados do sistema para segurança.</p>
                  </div>
                  <button
                    onClick={handleExport}
                    className="w-full h-12 rounded-xl bg-blue-500 text-white font-bold text-[9px] uppercase tracking-wide transition-all shadow-sm"
                  >
                    Baixar Backup (.json)
                  </button>
                </div>

                <div className={`p-8 rounded-lg border space-y-6 flex flex-col justify-between ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold uppercase tracking-tight">Importar Dados</h4>
                    <p className="text-[10px] font-bold opacity-30 uppercase leading-relaxed">Restaura o sistema a partir de um arquivo de backup anterior.</p>
                  </div>
                  <label className="w-full h-12 rounded-xl bg-amber-500 text-white font-bold text-[9px] uppercase tracking-wide transition-all shadow-sm flex items-center justify-center cursor-pointer">
                    Selecionar Arquivo
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                </div>

                <div className="md:col-span-2 p-8 rounded-lg border border-red-500/20 bg-red-500/5 space-y-4">
                  <div className="flex items-center gap-3 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    <h4 className="text-sm font-bold uppercase tracking-tight">Zona de Perigo</h4>
                  </div>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-wide text-center md:text-left">
                      Esta acao irá apagar todos os dados atuais e restaurar os dados de demonstracao (Mocks).
                    </p>
                    <button
                      onClick={resetToMocks}
                      className="px-8 h-12 rounded-xl bg-red-500 text-white font-bold text-[9px] uppercase tracking-wide transition-all shadow-sm whitespace-nowrap"
                    >
                      Reiniciar Sistema
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`p-6 rounded-xl border border-dashed flex items-center gap-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
        <ShieldCheck className="w-8 h-8 text-emerald-500 opacity-40" />
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide opacity-40">Segurança de Dados</p>
          <p className="text-[10px] font-bold opacity-30 uppercase leading-relaxed">
            Seus dados são armazenados localmente neste navegador. Recomendamos realizar backups semanais para evitar perda de informações em caso de limpeza de cache do navegador.
          </p>
        </div>
      </div>
    </div>
  );
};
