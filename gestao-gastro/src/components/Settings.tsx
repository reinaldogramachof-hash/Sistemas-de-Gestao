import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import {
  Settings as SettingsIcon, Store, Printer, Database, Save,
  Download, Upload, RefreshCw, Check, AlertTriangle, ShieldCheck,
  Globe, Phone, MapPin, FileText, Layout, QrCode, Copy,
  ExternalLink, Users, KeyRound, Smartphone, UserCheck, UserPlus, X as XIcon, Lock, Loader2, Table2, Image as ImageIcon, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings, Collaborator } from '../types';
import { getComandaAccessUrl, validateLanOrigin } from '../utils/comandaAccess';
import { supabase } from '../lib/supabase';
import { HelpTooltip } from './HelpTooltip';
import { OperationFeedback, type OperationFeedbackMessage } from './OperationFeedback';
import { useModules } from '../hooks/useModules';
import { LocalQrCode } from './LocalQrCode';

type EditableMemberRole = 'waiter' | 'cashier' | 'admin';
type WaiterSettingsStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'pending' | 'error';

export const Settings: React.FC = () => {
  const { settings, updateSettings, exportData, importData, resetToMocks, theme, collaborators, tables, currentEmpresa, supabaseOnline, reloadCollaborators, initializeTables, currentUser, requestConfirm } = useApp();
  const { checkAccess } = useModules();
  const isDark = theme === 'dark';
  const isAdminOrOwner = ['admin', 'owner', 'administrador', 'proprietário'].includes(currentUser.role?.toLowerCase() || '');

  const [formData, setFormData] = useState<AppSettings>(settings);
  const [feedback, setFeedback] = useState<OperationFeedbackMessage | null>(null);
  const [activeTab, setActiveTab] = useState<'store' | 'access' | 'network' | 'tables' | 'kitchen' | 'printer' | 'data'>('store');

  const tabs = [
    { id: 'store', label: 'Estabelecimento', icon: Store },
    { id: 'access', label: 'Equipe & Acessos', icon: Users },
    { id: 'network', label: 'Rede & QR Code', icon: QrCode },
    ...(isAdminOrOwner ? [{ id: 'tables', label: 'Mesas do salão', icon: Table2 }] : []),
    ...(checkAccess('cozinha') ? [{ id: 'kitchen', label: 'Cozinha (KDS)', icon: Layout }] : []),
    { id: 'printer', label: 'Impressão', icon: Printer },
    { id: 'data', label: 'Dados & Backup', icon: Database },
  ];
  const [isSaving, setIsSaving] = useState(false);
  const [copiedAccess, setCopiedAccess] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [waiterSettingsStatus, setWaiterSettingsStatus] = useState<WaiterSettingsStatus>('idle');
  const savingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<EditableMemberRole>('waiter');
  const [newMemberError, setNewMemberError] = useState('');
  const [newMemberLoading, setNewMemberLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<Collaborator | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState<EditableMemberRole>('waiter');
  const [editMemberActive, setEditMemberActive] = useState(true);
  const [editMemberPassword, setEditMemberPassword] = useState('');
  const [editMemberError, setEditMemberError] = useState('');
  const [editMemberLoading, setEditMemberLoading] = useState(false);
  const [adminProfileName, setAdminProfileName] = useState(currentUser.name || '');
  const [adminProfileEmail, setAdminProfileEmail] = useState('');
  const [adminProfilePhone, setAdminProfilePhone] = useState('');
  const [adminProfileMessage, setAdminProfileMessage] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);
  const [adminProfileLoading, setAdminProfileLoading] = useState(false);

  const [initTablesCount, setInitTablesCount] = useState<number>(12);
  const [isInitializingTables, setIsInitializingTables] = useState<boolean>(false);
  const [lanValidationMsg, setLanValidationMsg] = useState<{ type: 'error' | 'warn' | 'ok'; text: string } | null>(null);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(message)), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  React.useEffect(() => {
    if (tables.length > 0) {
      setInitTablesCount(tables.length);
    }
  }, [tables.length]);

  React.useEffect(() => {
    let isActive = true;
    const loadAdminProfile = async () => {
      if (!supabaseOnline || !supabase) {
        setAdminProfileName(currentUser.name || '');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!isActive || !session?.user) return;

      setAdminProfileEmail(session.user.email || '');
      setAdminProfileName(
        localStorage.getItem('gestao_gastro_user_name') ||
        session.user.user_metadata?.display_name ||
        currentUser.name ||
        ''
      );
      setAdminProfilePhone(session.user.user_metadata?.phone || '');
    };

    void loadAdminProfile();
    return () => {
      isActive = false;
    };
  }, [currentUser.name, supabaseOnline]);

  React.useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const loadWaiterAccess = async () => {
      if (!supabaseOnline || !currentEmpresa.tenantId || !supabase) return;
      setWaiterSettingsStatus('loading');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Sessão expirada');
        const pendingKey = `gestao_gastro_waiter_access_pending_${currentEmpresa.tenantId}`;
        const pendingSettings = localStorage.getItem(pendingKey);

        if (pendingSettings) {
          const response = await fetch('/api_admin_users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ action: 'save_waiter_access_settings', tenant_id: currentEmpresa.tenantId, settings: JSON.parse(pendingSettings) }),
            signal: controller.signal,
          });
          if (!response.ok) throw new Error('Sincronização pendente');
          localStorage.removeItem(pendingKey);
          if (active) setWaiterSettingsStatus('saved');
          return;
        }

        const response = await fetch('/api_admin_users.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'get_waiter_access_settings', tenant_id: currentEmpresa.tenantId }),
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message || 'Configuração indisponível');
        if (active && data?.settings) {
          setFormData(previous => ({ ...previous, ...data.settings }));
          setWaiterSettingsStatus('saved');
        }
      } catch {
        if (active && !controller.signal.aborted) {
          const pendingKey = `gestao_gastro_waiter_access_pending_${currentEmpresa.tenantId}`;
          setWaiterSettingsStatus(localStorage.getItem(pendingKey) ? 'pending' : 'error');
        }
      }
    };
    void loadWaiterAccess();
    return () => {
      active = false;
      controller.abort();
    };
  }, [currentEmpresa.tenantId, supabaseOnline]);

  React.useEffect(() => () => {
    if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
  }, []);

  const getEditableRoleFromMember = (member: Collaborator): EditableMemberRole => {
    const normalizedRole = `${member.role || ''} ${member.permissions || ''}`.toLowerCase();
    if (normalizedRole.includes('admin') || normalizedRole.includes('propriet')) return 'admin';
    if (normalizedRole.includes('caixa') || normalizedRole.includes('cashier') || normalizedRole.includes('atendente') || member.permissions === 'staff') return 'cashier';
    return 'waiter';
  };

  const openEditMemberModal = (member: Collaborator) => {
    setEditingMember(member);
    setEditMemberName(member.name || '');
    setEditMemberRole(getEditableRoleFromMember(member));
    setEditMemberActive(member.status === 'active');
    setEditMemberPassword('');
    setEditMemberError('');
  };

  const closeEditMemberModal = (force = false) => {
    if (editMemberLoading && !force) return;
    setEditingMember(null);
    setEditMemberName('');
    setEditMemberRole('waiter');
    setEditMemberActive(true);
    setEditMemberPassword('');
    setEditMemberError('');
  };

  const handleToggleStatus = async (collabId: string, currentStatus: string) => {
    if (!supabaseOnline || !currentEmpresa.tenantId) {
      setFeedback({ tone: 'error', title: 'Ação não permitida', description: 'Operação remota indisponível no momento.' });
      return;
    }

    const { data: { session } } = await supabase!.auth.getSession();
    if (!session) {
      setFeedback({ tone: 'error', title: 'Sessão expirada', description: 'Faça login novamente.' });
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
        setFeedback({ tone: 'error', title: 'Erro', description: data.message || 'Erro ao alterar status do colaborador.' });
      }
    } catch (err) {
      setFeedback({ tone: 'error', title: 'Erro de conexão', description: 'Não foi possível conectar ao servidor.' });
    }
  };

  const handleDeleteMember = async (collabId: string) => {
    requestConfirm({
      title: 'Excluir Colaborador',
      description: 'ATENÇÃO: Deseja realmente excluir este colaborador? Esta ação não pode ser desfeita e removerá o login do usuário permanentemente.',
      confirmText: 'Excluir',
      onConfirm: async () => {
        if (!supabaseOnline || !currentEmpresa.tenantId) {
          setFeedback({ tone: 'error', title: 'Ação não permitida', description: 'Operação remota indisponível no momento.' });
          return;
        }

        const { data: { session } } = await supabase!.auth.getSession();
        if (!session) {
          setFeedback({ tone: 'error', title: 'Sessão expirada', description: 'Faça login novamente.' });
          return;
        }

        setEditMemberLoading(true);

        try {
          const response = await fetch('/api_admin_users.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              action: 'delete_member',
              tenant_id: currentEmpresa.tenantId,
              user_id: collabId
            })
          });

          const data = await response.json();
          if (response.ok && data.status === 'success') {
            await reloadCollaborators();
            setFeedback({ tone: 'success', title: 'Sucesso', description: 'Colaborador excluído com sucesso.' });
            closeEditMemberModal(true);
          } else {
            setEditMemberError(data.message || 'Erro ao excluir colaborador.');
            setFeedback({ tone: 'error', title: 'Erro', description: data.message || 'Erro ao excluir colaborador.' });
          }
        } catch (err) {
          setEditMemberError('Não foi possível conectar ao servidor.');
          setFeedback({ tone: 'error', title: 'Erro de conexão', description: 'Não foi possível conectar ao servidor.' });
        } finally {
          setEditMemberLoading(false);
        }
      }
    });
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditMemberError('');

    if (!editingMember) return;

    const trimmedName = editMemberName.trim();
    const trimmedPassword = editMemberPassword.trim();

    if (!trimmedName) {
      setEditMemberError('Informe o nome do colaborador.');
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 6) {
      setEditMemberError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!supabaseOnline || !currentEmpresa.tenantId || !supabase) {
      setEditMemberError('Operacao remota indisponivel no momento.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setEditMemberError('Sessao expirada. Faca login novamente.');
      return;
    }

    setEditMemberLoading(true);

    try {
      const response = await fetch('/api_admin_users.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'update_member',
          tenant_id: currentEmpresa.tenantId,
          user_id: editingMember.id,
          name: trimmedName,
          role: editMemberRole,
          active: editMemberActive,
          password: trimmedPassword || undefined
        })
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        closeEditMemberModal(true);
        await reloadCollaborators();
      } else {
        setEditMemberError(data.message || 'Erro ao atualizar colaborador.');
      }
    } catch (err) {
      setEditMemberError('Erro ao comunicar com o servidor.');
    } finally {
      setEditMemberLoading(false);
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
        setFeedback({ tone: 'success', title: 'Sucesso', description: 'Colaborador cadastrado com sucesso!' });
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

  const handleUpdateAdminProfile = async () => {
    setAdminProfileMessage(null);

    if (!adminProfileName.trim()) {
      setAdminProfileMessage({ type: 'error', text: 'Informe o nome do administrador.' });
      return;
    }

    if (!supabaseOnline || !currentEmpresa.tenantId || !supabase) {
      setAdminProfileMessage({ type: 'error', text: 'Operacao remota indisponivel no momento.' });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAdminProfileMessage({ type: 'error', text: 'Sessao expirada. Faca login novamente.' });
      return;
    }

    setAdminProfileLoading(true);
    try {
      const response = await fetch('/api_admin_users.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'update_my_profile',
          tenant_id: currentEmpresa.tenantId,
          name: adminProfileName.trim(),
          phone: adminProfilePhone.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.status === 'success') {
        localStorage.setItem('gestao_gastro_user_name', adminProfileName.trim());
        setAdminProfileMessage({ type: 'ok', text: 'Dados do administrador atualizados.' });
        await reloadCollaborators();
      } else {
        setAdminProfileMessage({ type: 'error', text: data.message || 'Erro ao atualizar administrador.' });
      }
    } catch {
      setAdminProfileMessage({ type: 'error', text: 'Erro de conexao ao servidor.' });
    } finally {
      setAdminProfileLoading(false);
    }
  };

  const handleInitializeTables = async () => {
    const userRole = currentUser.role ? currentUser.role.toLowerCase() : '';
    if (userRole !== 'owner' && userRole !== 'admin' && userRole !== 'proprietário' && userRole !== 'administrador') {
      setFeedback({ tone: 'error', title: 'Acesso Negado', description: 'Apenas o proprietário ou administrador podem gerenciar as mesas do salão.' });
      return;
    }

    if (initTablesCount <= 0 || initTablesCount > 100) {
      setFeedback({ tone: 'warning', title: 'Atenção', description: 'Quantidade inválida. Escolha entre 1 e 100 mesas.' });
      return;
    }

    const confirmMsg = "Atenção: Redefinir mesas irá adicionar novas ou remover mesas extras. Mesas com pedidos em aberto ou ocupadas NÃO poderão ser apagadas.\nDeseja continuar?";
    
    requestConfirm({
      title: 'Redefinir Mesas',
      description: confirmMsg,
      confirmText: 'Redefinir',
      onConfirm: async () => {
        setIsInitializingTables(true);
        try {
          await withTimeout(
            initializeTables(initTablesCount),
            20000,
            'A sincronização com o Supabase demorou mais que o esperado. Recarregue a tela e confira sua conexão antes de tentar novamente.'
          );
          setFeedback({ tone: 'success', title: 'Sucesso', description: 'Mesas inicializadas com sucesso no restaurante!' });
        } catch (err: any) {
          setFeedback({ tone: 'error', title: 'Erro', description: err.message || 'Erro ao inicializar mesas. Verifique sua conexão com o banco.' });
        } finally {
          setIsInitializingTables(false);
        }
      }
    });
  };

  const persistSettings = (nextSettings: AppSettings) => {
    setIsSaving(true);
    updateSettings({
      ...nextSettings,
      metadata: {
        updatedAt: new Date().toISOString(),
        source: 'settings-panel'
      }
    });
    if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
    savingTimerRef.current = setTimeout(() => setIsSaving(false), 800);
  };

  const persistWaiterAccessSettings = async (nextSettings: AppSettings) => {
    persistSettings(nextSettings);
    if (!supabaseOnline || !currentEmpresa.tenantId || !supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const response = await fetch('/api_admin_users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'save_waiter_access_settings', tenant_id: currentEmpresa.tenantId, settings: {
        waiterAccessMode: nextSettings.waiterAccessMode || 'local',
        waiterLocalOrigin: nextSettings.waiterLocalOrigin || '',
      } }),
    });
    if (!response.ok) setLanValidationMsg({ type: 'error', text: 'Não foi possível salvar o acesso dos garçons na nuvem.' });
  };

  const handleSave = () => {
    persistSettings(formData);
  };

  const handleWaiterAccessModeChange = (mode: 'local' | 'external') => {
    const updated = mode === 'external'
      ? { ...formData, waiterAccessMode: mode }
      : { ...formData, waiterAccessMode: mode };
    setFormData(updated);
    void persistWaiterAccessSettings(updated);
    setLanValidationMsg(
      mode === 'external'
        ? { type: 'warn', text: 'Acesso externo salvo. O QR Code abrira a comanda pela internet para garcons autenticados.' }
        : null
    );
  };

  const handleLanOriginInput = (value: string) => {
    const updated = { ...formData, waiterAccessMode: 'local' as const, waiterLocalOrigin: value, localTestOrigin: '' };
    setFormData(updated);

    if (!value.trim()) {
      setLanValidationMsg(null);
      return;
    }

    const result = validateLanOrigin(value, window.location.origin);
    setLanValidationMsg({
      type: result.valid ? 'ok' : 'error',
      text: result.message || (result.valid ? 'Endereco de rede local valido.' : 'Endereco de rede local invalido.')
    });
  };

  const handleLanOriginBlur = () => {
    const result = validateLanOrigin(formData.waiterLocalOrigin || formData.localTestOrigin || '', window.location.origin);
    if (!result.valid || !result.origin) return;

    const updated = { ...formData, waiterAccessMode: 'local' as const, waiterLocalOrigin: result.origin, localTestOrigin: '' };
    setFormData(updated);
    void persistWaiterAccessSettings(updated);
    setLanValidationMsg({ type: 'ok', text: result.message || 'Endereco de rede local salvo.' });
  };

  const handleUseCurrentLanOrigin = () => {
    const hostname = window.location.hostname;
    const isLoopbackOrigin = hostname === 'localhost' || hostname.startsWith('127.');
    const result = validateLanOrigin(window.location.origin, window.location.origin);

    if (result.valid && result.origin) {
      const updated = { ...formData, waiterAccessMode: 'local' as const, waiterLocalOrigin: result.origin, localTestOrigin: '' };
      setFormData(updated);
      void persistWaiterAccessSettings(updated);
      setLanValidationMsg({ type: 'ok', text: `Rede local detectada e salva: ${result.origin}.` });
    } else if (!isLoopbackOrigin) {
      setLanValidationMsg({
        type: 'warn',
        text: 'Deteccao automatica indisponivel neste endereco online. Para QR local, abra o painel pelo IP do computador servidor na rede Wi-Fi ou use acesso externo.'
      });
    } else {
      setLanValidationMsg({ type: 'error', text: 'Abra este painel pelo IP da maquina na rede Wi-Fi ou digite o IPv4 do Windows, como 192.168.1.105. A porta sera preenchida automaticamente quando possivel.' });
    }
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

  const currentPort = window.location.port || '3000';
  const lanExample = `192.168.1.105:${currentPort}`;
  const currentLanDetection = validateLanOrigin(window.location.origin, window.location.origin);
  const canAutoDetectLan = currentLanDetection.valid && Boolean(currentLanDetection.origin);
  const isCurrentOriginLocal =
    window.location.origin.includes('localhost') ||
    window.location.origin.includes('127.0.0.1') ||
    canAutoDetectLan;
  const configuredLanOrigin = formData.waiterLocalOrigin || formData.localTestOrigin || '';
  const configuredLanValidation = configuredLanOrigin ? validateLanOrigin(configuredLanOrigin, window.location.origin) : null;
  const isLocalAccessMode = (formData.waiterAccessMode || 'local') !== 'external';
  const canGenerateLocalAccess = !isLocalAccessMode || Boolean(configuredLanValidation?.valid) || isCurrentOriginLocal;
  const comandaAccessUrl = canGenerateLocalAccess
    ? getComandaAccessUrl(window.location.origin, window.location.pathname, formData.waiterAccessMode || 'local', formData.waiterLocalOrigin, formData.localTestOrigin)
    : '';
  const waiterMembers = collaborators.filter(member => member.permissions === 'waiter');
  const activeWaiterMembers = waiterMembers.filter(member => member.status === 'active');
  const freeTables = tables.filter(table => table.status === 'livre').length;

  const handleCopyAccessLink = async () => {
    if (!comandaAccessUrl) {
      setLanValidationMsg({ type: 'error', text: 'Informe um IP local valido antes de copiar o link da comanda.' });
      return;
    }
    await navigator.clipboard.writeText(comandaAccessUrl);
    setCopiedAccess(true);
    setTimeout(() => setCopiedAccess(false), 1200);
  };

  const handleOpenComanda = () => {
    if (!comandaAccessUrl) {
      setLanValidationMsg({ type: 'error', text: 'Informe um IP local valido antes de abrir a comanda pelo QR local.' });
      return;
    }
    window.open(comandaAccessUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-24">
      <OperationFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
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

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Horário de Funcionamento</label>
                  <div className="relative group">
                    <input
                      value={formData.establishment.operatingHours || ''}
                      onChange={e => setFormData({ ...formData, establishment: { ...formData.establishment, operatingHours: e.target.value } })}
                      placeholder="Ex: Seg a Sab das 18h as 23h"
                      className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Observações do Rodapé (Cupom)</label>
                  <div className="relative group">
                    <input
                      value={formData.establishment.footerNotes || ''}
                      onChange={e => setFormData({ ...formData, establishment: { ...formData.establishment, footerNotes: e.target.value } })}
                      placeholder="Ex: Agradecemos a preferência!"
                      className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm transition-all ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <div className={`p-4 rounded-xl border border-dashed flex flex-col md:flex-row md:items-center gap-4 ${isDark ? 'border-[#2C2C2E]' : 'border-gray-200'}`}>
                    <div className="w-12 h-12 rounded-lg bg-gray-500/10 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-6 h-6 opacity-40" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide">Logo do Estabelecimento</p>
                      <p className="text-[10px] font-semibold opacity-40 mt-1">A imagem do estabelecimento será gerenciada via galeria na nuvem em atualizações futuras.</p>
                    </div>
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
                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide opacity-40">Redefinir quantidade de mesas (Quantidade Total) <HelpTooltip content="Atenção: Redefinir a quantidade recria a grade de mesas. Mesas atualmente ocupadas ou reservadas podem ser apagadas." /></label>
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
                  <Users className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tighter">Equipe & Acessos Operacionais</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">Perfil do administrador principal e gerenciamento dos membros da equipe</p>
                </div>
              </div>

              {isAdminOrOwner && (
                <div className={`p-6 rounded-xl border mb-6 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 mb-5">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-[#475569]/10 text-[#475569] flex items-center justify-center shrink-0">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide">Administrador principal</p>
                        <p className="text-[9px] font-bold uppercase tracking-wide opacity-40">Dados usados no acesso, equipe e identificacao interna</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleUpdateAdminProfile}
                      disabled={adminProfileLoading}
                      className="h-10 px-5 rounded-lg bg-[#475569] text-white text-[9px] font-bold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {adminProfileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar admin
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wide opacity-40 ml-1">Nome do administrador</label>
                      <input
                        type="text"
                        value={adminProfileName}
                        onChange={e => setAdminProfileName(e.target.value)}
                        className={`w-full h-12 px-4 rounded-xl border outline-none text-sm font-semibold ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-white border-gray-100 focus:border-[#475569]'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wide opacity-40 ml-1">E-mail de login</label>
                      <input
                        type="email"
                        value={adminProfileEmail}
                        readOnly
                        className={`w-full h-12 px-4 rounded-xl border outline-none text-sm font-semibold opacity-70 ${isDark ? 'bg-black/20 border-[#2C2C2E]' : 'bg-white border-gray-100'}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wide opacity-40 ml-1">Telefone</label>
                      <input
                        type="tel"
                        value={adminProfilePhone}
                        onChange={e => setAdminProfilePhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className={`w-full h-12 px-4 rounded-xl border outline-none text-sm font-semibold ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-white border-gray-100 focus:border-[#475569]'}`}
                      />
                    </div>
                  </div>

                  {adminProfileMessage && (
                    <p className={`mt-3 text-[10px] font-bold uppercase tracking-wide ${adminProfileMessage.type === 'ok' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {adminProfileMessage.text}
                    </p>
                  )}
                </div>
              )}

              {/* Grade de Colaboradores e Cadastro */}
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-2 text-base font-bold tracking-tighter uppercase">Membros da Equipe <HelpTooltip content="Atenção: Administradores têm acesso irrestrito ao sistema. Atendentes operam Caixa e Mesas. Garçons usam acesso móvel para comandas." /></p>
                    <p className="text-[9px] font-bold uppercase tracking-wide opacity-40">Equipe gerenciada na nuvem para este restaurante</p>
                  </div>
                  {supabaseOnline && isAdminOrOwner && (
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="px-6 h-10 rounded-xl bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm"
                    >
                      <UserPlus className="w-4 h-4" />
                      Adicionar Novo
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {collaborators.length === 0 ? (
                    <div className={`col-span-full p-8 rounded-xl border text-center ${isDark ? 'bg-white/5 border-white/5 text-white/40' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                      <p className="text-xs font-bold uppercase tracking-wide">Nenhum colaborador cadastrado</p>
                    </div>
                  ) : collaborators.map(member => {
                    const isAtivo = member.status === 'active';
                    const initials = member.name?.substring(0, 2).toUpperCase() || 'US';
                    return (
                      <div key={member.id} className={`p-5 rounded-xl border flex flex-col justify-between gap-4 transition-all hover:shadow-md ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black tracking-tighter shrink-0 ${isAtivo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'}`}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold truncate">{member.name}</p>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 ${isAtivo ? 'bg-emerald-500 text-white' : 'bg-gray-500 text-white'}`}>
                                {isAtivo ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-wide opacity-50 mt-1">{member.role}</p>
                          </div>
                        </div>

                        {supabaseOnline && isAdminOrOwner && member.id !== currentUser.id && (
                          <div className="grid grid-cols-2 gap-2 mt-2 border-t border-current/5 pt-4">
                            <button
                              type="button"
                              onClick={() => openEditMemberModal(member)}
                              className="h-9 rounded-lg bg-[#475569]/10 text-[#475569] dark:bg-white/5 dark:text-white dark:hover:bg-white/10 hover:bg-[#475569]/20 text-[9px] font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member.id)}
                              className="h-9 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[9px] font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
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

              {/* Modal de Edição de Colaboradores */}
              <AnimatePresence>
                {editingMember && (
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
                        type="button"
                        onClick={() => closeEditMemberModal()}
                        className="absolute right-4 top-4 p-2 rounded-lg hover:bg-current/10 text-muted"
                      >
                        <XIcon className="w-5 h-5" />
                      </button>

                      <div className="space-y-1">
                        <h4 className="text-xl font-bold uppercase tracking-tight">Editar Colaborador</h4>
                        <p className="text-[9px] opacity-40 font-bold uppercase tracking-wide">Atualize acesso, funcao, status ou senha</p>
                      </div>

                      <form onSubmit={handleUpdateMember} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Nome do Colaborador</label>
                          <input
                            type="text"
                            value={editMemberName}
                            onChange={e => setEditMemberName(e.target.value)}
                            placeholder="Nome de exibicao"
                            required
                            className={`w-full h-12 px-4 rounded-xl border outline-none text-sm ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Funcao / Nivel de Acesso</label>
                          <select
                            value={editMemberRole}
                            onChange={e => setEditMemberRole(e.target.value as EditableMemberRole)}
                            className={`w-full h-12 px-4 rounded-xl border outline-none text-sm ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`}
                          >
                            <option value="waiter">Garcom (Apenas Comanda Mobile)</option>
                            <option value="cashier">Atendente/Caixa (Acesso ao PDV/Caixa)</option>
                            <option value="admin">Administrador (Acesso Geral)</option>
                          </select>
                        </div>

                        <label className={`flex items-center justify-between gap-4 p-4 rounded-xl border cursor-pointer ${isDark ? 'border-[#2C2C2E] bg-black/20' : 'border-gray-100 bg-gray-50'}`}>
                          <span>
                            <span className="block text-[10px] font-bold uppercase tracking-wide">Acesso ativo</span>
                            <span className="block text-[9px] font-semibold opacity-50 mt-1">Desative temporariamente sem excluir o login.</span>
                          </span>
                          <input
                            type="checkbox"
                            checked={editMemberActive}
                            onChange={e => setEditMemberActive(e.target.checked)}
                            className="w-5 h-5 accent-emerald-500"
                          />
                        </label>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">Nova senha</label>
                          <input
                            type="password"
                            value={editMemberPassword}
                            onChange={e => setEditMemberPassword(e.target.value)}
                            placeholder="Deixe em branco para manter"
                            className={`w-full h-12 px-4 rounded-xl border outline-none text-sm ${isDark ? 'bg-transparent border-[#2C2C2E] focus:border-[#475569]' : 'bg-gray-50 border-gray-100 focus:border-[#475569]'}`}
                          />
                        </div>

                        {editMemberError && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-red-400 text-xs text-center font-semibold">{editMemberError}</p>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={editMemberLoading}
                          className="w-full h-12 bg-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all flex justify-center items-center gap-2"
                        >
                          {editMemberLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Alteracoes'}
                        </button>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-4 border-b border-dashed border-current/10 pb-6 mb-8">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tighter">Rede Local & Comanda Mobile</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-40">Modo de acesso da comanda, endereço IP local e geração do QR Code</p>
                </div>
              </div>

              {/* Controle de Modo de Acesso */}
              <div className={`p-6 rounded-xl border mb-6 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                <p className="text-xs font-bold uppercase tracking-wide mb-4">Modo de acesso da comanda</p>
                <div className="flex flex-col md:flex-row gap-6 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="waiterAccessMode"
                      value="local"
                      checked={formData.waiterAccessMode !== 'external'}
                      onChange={() => handleWaiterAccessModeChange('local')}
                      className="accent-emerald-500 w-4 h-4"
                    />
                    <span className="text-sm font-semibold">Rede local do restaurante (mais seguro)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="waiterAccessMode"
                      value="external"
                      checked={formData.waiterAccessMode === 'external'}
                      onChange={() => handleWaiterAccessModeChange('external')}
                      className="accent-emerald-500 w-4 h-4"
                    />
                    <span className="text-sm font-semibold">Internet / acesso externo</span>
                  </label>
                </div>

                {formData.waiterAccessMode !== 'external' && (
                  <div className="mt-4 p-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-3">Informe o IPv4 deste computador na rede Wi-Fi do restaurante.</p>
                    {!canAutoDetectLan && !window.location.hostname.includes('localhost') && !window.location.hostname.startsWith('127.') && (
                      <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[10px] font-bold leading-relaxed text-amber-600 dark:text-amber-400">
                        A deteccao automatica da rede local so funciona quando este painel e aberto pelo IP local do servidor.
                        No dominio online, o navegador nao permite descobrir o IPv4 da sua maquina automaticamente.
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={formData.waiterLocalOrigin || formData.localTestOrigin || ''}
                        onChange={e => handleLanOriginInput(e.target.value)}
                        onBlur={handleLanOriginBlur}
                        placeholder={lanExample}
                        className={`flex-1 h-11 px-4 rounded-lg border outline-none text-sm font-mono opacity-70 ${
                          isDark ? 'bg-black/20 border-[#2C2C2E]' : 'bg-white border-gray-200'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleUseCurrentLanOrigin}
                        className="h-11 px-6 rounded-lg bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wide hover:opacity-90 active:scale-95 transition-all"
                      >
                        Detectar endereco atual
                      </button>
                    </div>
                    {lanValidationMsg && (
                      <p className={`text-[10px] font-semibold mt-3 ${lanValidationMsg.type === 'error' ? 'text-red-500' : lanValidationMsg.type === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {lanValidationMsg.text}
                      </p>
                    )}
                    {(!formData.waiterLocalOrigin && !formData.localTestOrigin && !lanValidationMsg) && (
                      <p className="text-[10px] font-semibold opacity-80 mt-3 text-emerald-600 dark:text-emerald-400">
                         Abra o painel pelo IP local para detectar automaticamente, ou digite o IPv4 exibido no Windows. Exemplo: {lanExample}.
                      </p>
                    )}
                    {isLocalAccessMode && configuredLanValidation?.valid && configuredLanValidation.origin && (
                      <p className="text-[10px] font-bold mt-3 text-emerald-600 dark:text-emerald-400">
                        QR local pronto para a rede: {configuredLanValidation.origin}
                      </p>
                    )}
                  </div>
                )}
                {formData.waiterAccessMode === 'external' && (
                  <div className="mt-4 p-5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      Use esta opção apenas se os garçons puderem acessar a comanda fora do restaurante.
                    </p>
                  </div>
                )}
              </div>

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
                          <p className="text-[11px] font-semibold opacity-50 break-all mt-1">
                            {comandaAccessUrl || `Informe o IPv4 local, como ${lanExample}, para gerar o link e o QR Code da comanda.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleCopyAccessLink}
                          disabled={!comandaAccessUrl}
                          className="h-10 px-4 rounded-lg bg-[#475569] text-white text-[9px] font-bold uppercase tracking-wide flex items-center gap-2"
                        >
                          {copiedAccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copiedAccess ? 'Copiado' : 'Copiar'}
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenComanda}
                          disabled={!comandaAccessUrl}
                          className={`h-10 px-4 rounded-lg text-[9px] font-bold uppercase tracking-wide flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
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
                    {comandaAccessUrl ? (
                      <LocalQrCode value={comandaAccessUrl} label="QR Code da comanda mobile" />
                    ) : (
                      <div className="w-full aspect-square rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-500 flex items-center justify-center p-5 text-center text-xs font-bold leading-relaxed">
                        Informe o IPv4 local para gerar o QR.
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide">QR Code da comanda</p>
                    <p className="text-[10px] font-bold opacity-60 mt-1">
                      {formData.waiterAccessMode !== 'external'
                        ? 'Mostre este QR para o garçom acessar a comanda pelo celular conectado ao Wi-Fi do restaurante.'
                        : 'Imprima ou fixe perto da operação.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    disabled={!comandaAccessUrl}
                    className="w-full h-11 rounded-lg bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <QrCode className="w-4 h-4" />
                    Gerar QR da comanda
                  </button>
                </div>
              </div>
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
                    className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-[#121214] border-[#2C2C2E] text-white' : 'bg-gray-50 border-gray-100'}`}
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
                        className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm appearance-none ${isDark ? 'bg-[#121214] border-[#2C2C2E] text-white' : 'bg-gray-50 border-gray-100'}`}
                      >
                        <option value="80mm">80mm (Padrão)</option>
                        <option value="58mm">58mm (Portátil)</option>
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wide opacity-40 ml-2">Impressora / Dispositivo (Futuro)</label>
                      <input
                        value={formData.thermalPrinter.device || ''}
                        onChange={e => setFormData({ ...formData, thermalPrinter: { ...formData.thermalPrinter, device: e.target.value } })}
                        placeholder="Nome da impressora na rede ou bluetooth"
                        className={`w-full h-14 px-6 rounded-lg border outline-none font-bold text-sm ${isDark ? 'bg-transparent border-[#2C2C2E]' : 'bg-gray-50 border-gray-100'}`}
                        disabled
                      />
                   </div>
                </div>

                <div className={`p-6 rounded-xl flex items-center justify-between transition-all ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.thermalPrinter.testPrint ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-tight">Testar Impressão</h4>
                      <p className="text-[9px] font-bold opacity-30 uppercase tracking-wide">Imprimir um cupom de teste para verificar a comunicação</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFormData({ ...formData, thermalPrinter: { ...formData.thermalPrinter, testPrint: true } });
                      setFeedback({ tone: 'info', title: 'Em breve', description: 'Testando comunicação... Em breve esta função imprimirá o cupom diretamente.' });
                      setTimeout(() => setFormData({ ...formData, thermalPrinter: { ...formData.thermalPrinter, testPrint: false } }), 1000);
                    }}
                    className={`px-4 h-8 rounded-lg font-bold text-[9px] uppercase tracking-wide transition-all bg-[#475569] text-white`}
                  >
                    Testar
                  </button>
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
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide opacity-40">Backups e Restauração de sistema <HelpTooltip content="O backup local (JSON) baixa um extrato completo do momento atual. O Gestão Gastro também sincroniza ativamente com o Supabase na nuvem se a licença estiver ativa." /></p>
                </div>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`p-8 rounded-lg border space-y-6 flex flex-col justify-between ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-2">
                        <Download className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-bold uppercase tracking-tight">Exportar Backup Local</h4>
                      <p className="text-[10px] font-bold opacity-30 uppercase leading-relaxed">Gera um arquivo JSON contendo os dados locais armazenados neste dispositivo (Navegador). Atenção: Dados da nuvem não são salvos aqui.</p>
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
                      <h4 className="text-sm font-bold uppercase tracking-tight">Importação Legada</h4>
                      <p className="text-[10px] font-bold opacity-30 uppercase leading-relaxed">Restaura o ambiente a partir de um backup local anterior. Em um sistema online (Supabase), isso afeta apenas os itens locais do dispositivo.</p>
                    </div>
                    <label className="w-full h-12 rounded-xl bg-amber-500 text-white font-bold text-[9px] uppercase tracking-wide transition-all shadow-sm flex items-center justify-center cursor-pointer hover:opacity-90 active:scale-95">
                      Selecionar Arquivo
                      <input type="file" accept=".json" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          requestConfirm({
                            title: 'Importar Dados',
                            description: "Atenção: A importação irá sobrescrever todos os seus dados locais. Isso pode causar conflito se você estiver online.\nDeseja continuar?",
                            confirmText: 'Importar',
                            onConfirm: () => {
                              handleImport(e);
                            },
                            onCancel: () => {
                              e.target.value = '';
                            }
                          });
                        }
                      }} className="hidden" />
                    </label>
                  </div>

                  {isAdminOrOwner && (
                    <div className="md:col-span-2 p-8 rounded-lg border border-red-500/20 bg-red-500/5 space-y-4">
                      <div className="flex items-center gap-3 text-red-500">
                        <AlertTriangle className="w-5 h-5" />
                        <h4 className="text-sm font-bold uppercase tracking-tight">Zona de Perigo</h4>
                      </div>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-wide text-center md:text-left">
                          Esta ação irá limpar os dados operacionais <strong>locais</strong> deste caixa (restaurar as configurações Mocks de teste).<br/>Dados centralizados na nuvem não serão apagados.
                        </p>
                        <button
                          onClick={resetToMocks}
                          className="px-8 h-12 rounded-xl bg-red-500 text-white font-bold text-[9px] uppercase tracking-wide transition-all shadow-sm whitespace-nowrap hover:opacity-90 active:scale-95"
                        >
                          Reiniciar Ambiente Local
                        </button>
                      </div>
                    </div>
                  )}
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
