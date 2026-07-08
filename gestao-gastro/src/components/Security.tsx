import React from 'react';
import { useApp } from '../store/AppContext';
import {
  Shield, Lock, FileText, Database,
  AlertCircle, ShieldCheck, UserCheck,
  ArrowRight, HardDrive, Info
} from 'lucide-react';
import { motion } from 'motion/react';

export const Security: React.FC = () => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const sections = [
    {
      title: "Segurança do Sistema",
      icon: Lock,
      color: "text-blue-500",
      content: "O Gestão Gastro utiliza criptografia de ponta a ponta para armazenamento local. Seus dados de vendas, clientes e estoque são processados e mantidos no ambiente seguro do seu navegador, garantindo que informações sensíveis nunca saiam do seu controle sem Autorização."
    },
    {
      title: "Políticas Plena Informática",
      icon: ShieldCheck,
      color: "text-emerald-500",
      content: "Nossa compromisso é com a integridade do seu negócio. A Plena Informática não coleta, vende ou processa seus dados operacionais para fins externos. O sistema é projetado para ser uma ferramenta privada de gestão ERP dedicada exclusivamente à sua Operação."
    },
    {
      title: "Responsabilidade de Backup",
      icon: Database,
      color: "text-amber-500",
      content: "Como o sistema opera em modo 'Local-First' para maior velocidade, a responsabilidade pela integridade dos dados a longo prazo é do usuário. Recomendamos a exportacao semanal do backup em JSON (dispoNivel no módulo Configurações) para evitar perdas em caso de formatacao ou limpeza de cache."
    }
  ];

  const terms = [
    { title: "Uso de Dados", desc: "O usuário é proprietário absoluto de todos os dados inseridos." },
    { title: "Privacidade", desc: "Cumprimento total com as diretrizes da LGPD brasileira." },
    { title: "Suporte", desc: "Acesso direto à equipe técnica para questões de segurança." },
    { title: "Continuidade", desc: "O backup garante a portabilidade total dos seus dados." }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-200 pb-24">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row items-center gap-8 border-b border-dashed border-current/10 pb-12">
        <div className="w-24 h-24 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <Shield className="w-12 h-12 text-blue-500" />
        </div>
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter uppercase ">Central de Segurança</h1>
          <p className="text-sm font-bold opacity-40 uppercase tracking-wide">Transparência, Privacidade e Responsabilidade</p>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sections.map((section, idx) => (
          <div
            key={idx}
            className={`p-8 rounded-lg border space-y-6 relative overflow-hidden group transition-all
              ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}
          >
            <div className={`w-12 h-12 rounded-lg bg-current/10 ${section.color} flex items-center justify-center transition-transform group-hover:rotate-12`}>
              <section.icon className="w-6 h-6" />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide">{section.title}</h3>
              <p className="text-[11px] font-bold opacity-50 leading-relaxed uppercase tracking-tight">
                {section.content}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Terms and Details */}
      <div className={`rounded-xl border p-10 space-y-10 relative overflow-hidden
        ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm'}`}>

        <div className="flex flex-col md:flex-row gap-12 relative z-10">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#475569]" />
              <h2 className="text-xl font-bold uppercase tracking-tight">Termos de Uso & Políticas</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {terms.map((term, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-lg bg-current/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#475569] mt-1.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-wide">{term.title}</h4>
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">{term.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`md:w-72 p-8 rounded-lg space-y-6 border border-dashed flex flex-col justify-between
            ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <div className="space-y-4 text-center">
              <div className="inline-flex p-3 rounded-xl bg-amber-500/10 text-amber-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wide">Aviso Importante</h4>
              <p className="text-[9px] font-bold opacity-40 uppercase leading-relaxed">
                A limpeza de dados do navegador ou desinstalacao do mesmo pode resultar na perda permanente de informações não exportadas.
              </p>
            </div>
            <button
              className="w-full h-12 rounded-xl bg-current/10 font-bold text-[9px] uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-current/20 transition-all"
              onClick={() => window.location.href = '#'}
            >
              Baixar Termos em PDF <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Badge */}
      <div className="flex justify-center">
        <div className={`px-8 py-4 rounded-lg border flex items-center gap-4 ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-wide opacity-40">Sistema em conformidade com LGPD - Plena Informática 2026</span>
        </div>
      </div>
    </div>
  );
};
