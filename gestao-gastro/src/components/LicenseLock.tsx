import React from 'react';
import { ShieldAlert, Lock, Phone, Mail, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export const LicenseLock: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A0A0B] flex items-center justify-center p-6 overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#475569]/10  rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10  rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-[#1C1C1E] border border-white/10 rounded-xl p-10 relative z-10 shadow-sm shadow-black/50 text-center space-y-8"
      >
        {/* Lock Icon */}
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-lg bg-[#475569]/10 flex items-center justify-center text-[#475569]">
            <Lock className="w-10 h-10" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#475569] flex items-center justify-center text-white border-4 border-[#1C1C1E]"
          >
            <ShieldAlert className="w-4 h-4" />
          </motion.div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white leading-tight">
            Acesso <span className="text-[#475569]">Bloqueado</span>
          </h1>
          <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] leading-relaxed">
            O período de licenciamento para este terminal expirou ou foi suspenso pela administracao.
          </p>
        </div>

        {/* Info Card */}
        <div className="p-6 rounded-lg bg-white/5 border border-white/5 space-y-4 text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Entre em contato para liberar:</p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Phone className="w-4 h-4 text-[#475569]" /></div>
              <span className="text-xs font-bold">(12) 99219-1018</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Mail className="w-4 h-4 text-[#475569]" /></div>
              <span className="text-xs font-bold">tecnologia@plenainformatica.com.br</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-center gap-3 opacity-30">
             <div className="w-2 h-2 rounded-full bg-[#475569]" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Plena Informática</span>
          </div>
          <a
            href="https://www.plenainformatica.com.br"
            target="_blank"
            className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[#475569] hover:underline"
          >
            <Globe className="w-3 h-3" /> Visitar site oficial
          </a>
        </div>
      </motion.div>
    </div>
  );
};
