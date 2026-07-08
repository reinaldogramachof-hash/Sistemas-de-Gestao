import React from 'react';
import { useApp } from '../store/AppContext';
import {
  LifeBuoy,
  MessageCircle,
  Mail,
  Phone,
  ExternalLink,
  Globe,
  Instagram,
  Facebook
} from 'lucide-react';
import { motion } from 'motion/react';

export const Support: React.FC = () => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const contactMethods = [
    {
      title: 'WhatsApp',
      value: '(12) 99219-1018',
      sub: 'Atendimento via chat',
      icon: MessageCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      link: 'https://wa.me/5512992191018'
    },
    {
      title: 'E-mail',
      value: 'tecnologia@plenainformatica.com.br',
      sub: 'Suporte técnico oficial',
      icon: Mail,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      link: 'mailto:tecnologia@plenainformatica.com.br'
    },
    {
      title: 'Horário',
      value: 'Seg a Sex',
      sub: 'Das 09h as 17h',
      icon: Phone,
      color: 'text-slate-500',
      bg: 'bg-slate-500/10',
      link: '#'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      {/* Header section */}
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 rounded-xl bg-[#475569]/10 text-[#475569] mb-4">
          <LifeBuoy className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter uppercase">Central de Suporte</h1>
        <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em] max-w-lg mx-auto">
          Estamos aqui para ajudar voce a tirar o máximo proveito do Gestão Gastro.
        </p>
      </div>

      {/* Contact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contactMethods.map((method, i) => (
          <motion.a
            key={i}
            href={method.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`group p-8 rounded-xl border transition-all  active:scale-95
              ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E] hover:border-[#475569]/40' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/20 hover:border-[#475569]/40'}`}
          >
            <div className={`w-14 h-14 rounded-lg ${method.bg} ${method.color} flex items-center justify-center mb-6 group- transition-transform`}>
              <method.icon className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest opacity-40 mb-1">{method.title}</h3>
            <p className={`${method.title === 'E-mail' ? 'text-sm' : 'text-xl'} font-black tracking-tight mb-2 break-all`}>{method.value}</p>
            <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{method.sub}</p>
          </motion.a>
        ))}
      </div>

      {/* Website Card */}
      <div className={`p-10 rounded-xl border overflow-hidden relative
        ${isDark ? 'bg-[#1C1C1E] border-[#2C2C2E]' : 'bg-white border-gray-100 shadow-sm shadow-gray-200/30'}`}>

        <div className="absolute top-0 right-0 w-64 h-64 bg-[#475569]/5  -mr-32 -mt-32" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
          <div className="space-y-6 flex-1 text-center md:text-left">
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase mb-2">Plena Informática</h2>
              <p className="text-sm font-bold opacity-60 leading-relaxed max-w-md uppercase tracking-tight">
                Acesse nosso site e conheça outras soluções.
              </p>
            </div>
          </div>

          <div className="flex-shrink-0">
            <a
              href="https://www.plenainformatica.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-10 py-6 bg-[#475569] text-white rounded-lg font-black uppercase tracking-widest text-[11px] shadow-sm shadow-[#475569]/40  active:scale-95 transition-all"
            >
              Visitar Nosso Site
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <div className="text-center opacity-30 py-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Gestão Gastro - Versão 1.0.0</p>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] mt-2">© 2026 Plena Informática. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}
