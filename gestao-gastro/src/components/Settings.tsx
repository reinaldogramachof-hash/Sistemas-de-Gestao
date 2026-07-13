import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import {
  Settings as SettingsIcon, Store, Printer, Database, Save,
  Download, Upload, RefreshCw, Check, AlertTriangle, ShieldCheck,
  Globe, Phone, MapPin, FileText, Layout
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppSettings } from '../types';

export const Settings: React.FC = () => {
  const { settings, updateSettings, exportData, importData, resetToMocks, theme } = useApp();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'store' | 'kitchen' | 'printer' | 'data'>('store');
  const [isSaving, setIsSaving] = useState(false);

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

  const tabs = [
    { id: 'store', label: 'Estabelecimento', icon: Store },
    { id: 'kitchen', label: 'Cozinha (KDS)', icon: Layout },
    { id: 'printer', label: 'Impressão', icon: Printer },
    { id: 'data', label: 'Dados & Backup', icon: Database },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tighter uppercase ">Configurações</h2>
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
