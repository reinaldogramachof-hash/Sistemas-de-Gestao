import React, { useState, useEffect } from 'react';
import { Shield, Key, Mail, Loader, CheckCircle, Clipboard, X } from 'lucide-react';
import { ReceiptConfirmation } from './ReceiptConfirmation';
import { getClientSlugFromPath, persistTenantRoute, resolveTenant } from '../config/clientRoutes';
import { getLicenseApiUrl } from '../services/licenseApi';

interface ActivationGateProps {
  children: React.ReactNode;
}

const getDeviceStorageKey = (tenantSlug: string | null, tenantId: string | null) => {
  const tenantKey = tenantSlug || tenantId || 'default';
  return `gestao_gastro_device_id:${tenantKey}`;
};

const getOrCreateDeviceId = (tenantSlug: string | null, tenantId: string | null) => {
  const storageKey = getDeviceStorageKey(tenantSlug, tenantId);
  let deviceId = localStorage.getItem(storageKey);

  if (!deviceId) {
    deviceId = localStorage.getItem('device_id');
  }

  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 9);
  }

  localStorage.setItem(storageKey, deviceId);
  return deviceId;
};

const normalizeLicenseKeyInput = (value: string) => {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  return cleaned.match(/.{1,4}/g)?.join('-') ?? '';
};

const normalizeEmailInput = (value: string) => value.trim().toLowerCase();

export const ActivationGate: React.FC<ActivationGateProps> = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsReceipt, setNeedsReceipt] = useState(false);

  const clearStoredLicense = () => {
    const tenantSlug = getClientSlugFromPath(window.location.pathname);
    localStorage.removeItem('plena_license');
    localStorage.removeItem('ml_license_email');
    localStorage.removeItem('gestao_gastro_verified_plan');
    localStorage.removeItem('gestao_gastro_tenant_id');
    localStorage.removeItem('gestao_gastro_tenant_slug');
    if (tenantSlug) {
      localStorage.removeItem(`gestao_gastro_tenant_id:${tenantSlug}`);
    }
  };

  const checkLicense = async () => {
    const savedKey = localStorage.getItem('plena_license');
    const savedEmail = localStorage.getItem('ml_license_email');
    const receiptConfirmed = localStorage.getItem('ml_receipt_confirmed');
    const resolvedTenant = resolveTenant(window.location.pathname);
    const tenantSlug = getClientSlugFromPath(window.location.pathname);
    const deviceId = getOrCreateDeviceId(tenantSlug, resolvedTenant);

    if (!savedKey || !savedEmail) {
      setIsAuthorized(false);
      return;
    }

    if (!navigator.onLine) {
      // Offline fallback
      setIsAuthorized(true);
      if (receiptConfirmed !== 'true') setNeedsReceipt(true);
      return;
    }

    try {
      const response = await fetch(getLicenseApiUrl('verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: savedKey, email: savedEmail, device_id: deviceId, tenant_id: resolvedTenant, tenant_slug: tenantSlug })
      });

      if (!response.ok) {
        throw new Error('Network error');
      }

      const data = await response.json();

      if (data.status === 'success' && data.license_status === 'active') {
        if (resolvedTenant && !data.is_master && (!data.tenant_id || data.tenant_id !== resolvedTenant)) {
          clearStoredLicense();
          setIsAuthorized(false);
          setError('Licenca nao pertence a este restaurante.');
          return;
        }
        setIsAuthorized(true);
        if (data.plan) {
          localStorage.setItem('gestao_gastro_verified_plan', data.plan);
        } else {
          localStorage.setItem('gestao_gastro_verified_plan', 'base');
        }
        if (data.tenant_id) {
          persistTenantRoute(tenantSlug, data.tenant_id);
        }
        if (!resolvedTenant && data.tenant_id) {
          window.location.reload();
          return;
        }
        if (receiptConfirmed !== 'true') setNeedsReceipt(true);
      } else if (data.status === 'success' && (data.license_status === 'blocked' || data.license_status === 'expired')) {
        clearStoredLicense();
        setIsAuthorized(false);
        setError(data.message || 'Sua licença esta bloqueada ou expirada.');
      } else {
        clearStoredLicense();
        setIsAuthorized(false);
        setError(data.message || 'Licenca invalida ou nao encontrada. Ative novamente com a chave correta deste restaurante.');
      }
    } catch (err) {
      // Offline fallback if server is down
      setIsAuthorized(true);
      if (receiptConfirmed !== 'true') setNeedsReceipt(true);
    }
  };

  useEffect(() => {
    checkLicense();
  }, []);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resolvedTenant = resolveTenant(window.location.pathname);
      const tenantSlug = getClientSlugFromPath(window.location.pathname);
      const deviceId = getOrCreateDeviceId(tenantSlug, resolvedTenant);

      const response = await fetch(getLicenseApiUrl('activate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: licenseKey, email: normalizeEmailInput(email), device_id: deviceId, tenant_id: resolvedTenant, tenant_slug: tenantSlug })
      });

      const data = await response.json();

      if (data.status === 'success') {
        if (resolvedTenant && !data.is_master && (!data.tenant_id || data.tenant_id !== resolvedTenant)) {
          setError('Licenca nao pertence a este restaurante.');
          return;
        }
        localStorage.setItem('plena_license', licenseKey);
        localStorage.setItem('ml_license_email', normalizeEmailInput(email));
        if (data.plan) {
          localStorage.setItem('gestao_gastro_verified_plan', data.plan);
        } else {
          localStorage.setItem('gestao_gastro_verified_plan', 'base');
        }
        if (data.tenant_id) {
          persistTenantRoute(tenantSlug, data.tenant_id);
        } else if (resolvedTenant) {
          persistTenantRoute(tenantSlug, resolvedTenant);
        }

        if (!resolvedTenant && data.tenant_id) {
          window.location.reload();
          return;
        }

        setIsAuthorized(true);
        setNeedsReceipt(true);
      } else {
        setError(data.message || 'Licenca invalida ou ja utilizada.');
      }
    } catch (err) {
      setError('Erro de conexao ao servidor de licenças. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteLicense = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setLicenseKey(normalizeLicenseKeyInput(text));
      setError('');
    } catch {
      setError('Nao foi possivel ler a area de transferencia. Cole a chave manualmente.');
    }
  };

  const clearActivationForm = () => {
    setEmail('');
    setLicenseKey('');
    setError('');
  };

  if (isAuthorized === null) {
    return (
      <div className="h-screen w-full bg-[#121214] flex items-center justify-center">
        <Loader className="w-12 h-12 text-[#475569] animate-spin" />
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center p-4">
        <div className="bg-[#1A1A1D] p-8 rounded-lg shadow-sm max-w-md w-full border border-white/5">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[#475569]/20 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-[#475569]" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-2">Ativacao do Sistema</h2>
          <p className="text-gray-400 text-center mb-8">Insira a chave recebida apos a compra para liberar seu sistema vitalicio.</p>

          <form onSubmit={handleActivation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">E-mail da Compra</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={(e) => setEmail(normalizeEmailInput(e.target.value))}
                  className="w-full bg-[#2A2A2D] border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#475569]"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Chave de Licenca</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(normalizeLicenseKeyInput(e.target.value))}
                  onPaste={(e) => {
                    e.preventDefault();
                    setLicenseKey(normalizeLicenseKeyInput(e.clipboardData.getData('text')));
                  }}
                  className="w-full bg-[#2A2A2D] border border-white/10 rounded-lg pl-10 pr-24 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#475569] font-mono tracking-wide"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  required
                />
                <button
                  type="button"
                  onClick={handlePasteLicense}
                  className="absolute right-11 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
                  title="Colar chave"
                  aria-label="Colar chave"
                >
                  <Clipboard className="w-4 h-4" />
                </button>
                {licenseKey && (
                  <button
                    type="button"
                    onClick={() => setLicenseKey('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors"
                    title="Limpar chave"
                    aria-label="Limpar chave"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#475569] hover:bg-[#d6455d] text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Ativar Sistema'}
            </button>
            {(email || licenseKey || error) && (
              <button
                type="button"
                onClick={clearActivationForm}
                className="w-full text-sm text-gray-400 hover:text-white transition-colors"
              >
                Limpar dados informados
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  if (needsReceipt) {
    return <ReceiptConfirmation onConfirmed={() => setNeedsReceipt(false)} />;
  }

  return <>{children}</>;
};
