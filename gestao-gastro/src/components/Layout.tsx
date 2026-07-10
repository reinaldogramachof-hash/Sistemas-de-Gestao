import React, { useState, useEffect } from 'react';
import { View } from '../hooks/useNavigation';
import { useApp } from '../store/AppContext';
import { useModules } from '../hooks/useModules';
import {
  LayoutDashboard,
  MonitorPlay,
  Table2,
  Package,
  Wallet,
  LineChart,
  Settings,
  Moon,
  Sun,
  ChevronLeft,
  Menu,
  BookOpen,
  Users,
  UserCheck,
  ChefHat,
  Shield,
  Truck,
  LifeBuoy,
  Monitor,
  Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  currentView: View;
  setCurrentView: (v: View) => void;
  children: React.ReactNode;
}

const DateTimeDisplay = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="flex items-center gap-3 animate-in fade-in duration-200">
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-40 mb-1">{dateStr}</span>
        <span className="text-sm font-bold tracking-tighter tabular-nums">{timeStr}</span>
      </div>
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ currentView, setCurrentView, children }) => {
  const { theme, setTheme, cashierSession } = useApp();
  const { checkAccess } = useModules();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const navGroups = [
    {
      title: 'Operacional',
      items: [
        { id: 'pdv',           icon: MonitorPlay,     label: 'PDV (Balcão)' },
        { id: 'mesas',         icon: Table2,          label: 'Mesas'        },
        { id: 'cozinha',       icon: ChefHat,         label: 'Cozinha'      },
        { id: 'caixa',         icon: Wallet,          label: 'Caixa'        },
      ]
    },
    {
      title: 'Gestão',
      items: [
        { id: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard'    },
        { id: 'clientes',      icon: Users,           label: 'Clientes'     },
        { id: 'colaboradores', icon: UserCheck,       label: 'Colaboradores'},
        { id: 'fornecedores',  icon: Truck,           label: 'Fornecedores' },
        { id: 'produtos',      icon: BookOpen,        label: 'Cardápio'     },
        { id: 'relatorios',    icon: LineChart,       label: 'Financeiro'   },
        { id: 'estoque',       icon: Package,         label: 'Estoque'      },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { id: 'manual',        icon: BookOpen,        label: 'Manual de Uso' },
        { id: 'seguranca',     icon: Shield,          label: 'Segurança'    },
        { id: 'configuracoes', icon: Settings,        label: 'Configurações'},
        { id: 'suporte',       icon: LifeBuoy,        label: 'Suporte'      },
        { id: 'evolucao',      icon: Rocket,          label: 'Evolução'     }
      ]
    }
  ];

  return (
    <div className={`flex flex-col h-screen overflow-hidden font-sans ${isDark ? 'dark bg-app-base text-text' : 'bg-app-base-light text-text-light'}`}>
      <div className="flex flex-1 overflow-hidden w-full mx-auto">
        {/* Sidebar */}
        <aside
          className={`flex flex-col transition-all duration-150 ease-in-out border-r ${
            isCollapsed ? 'w-20' : 'w-64'
          } ${isDark ? 'bg-surface border-border' : 'bg-surface-light border-border-light'}`}
        >
          <div className={`flex items-center border-b min-h-[60px] ${isDark ? 'border-border' : 'border-border-light'} ${isCollapsed ? 'justify-center p-0' : 'px-5 py-4 justify-between'}`}>
            <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-7 h-7 bg-accent rounded-panel flex-shrink-0 flex items-center justify-center text-white"><ChefHat className="w-3.5 h-3.5" /></div>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-bold text-base tracking-tight whitespace-nowrap"
                >
                  Gestão Gastro
                </motion.span>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className={`p-1.5 rounded-control hover:bg-gray-100 dark:hover:bg-white/5 transition-colors`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 scrollbar-none">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {!isCollapsed && (
                  <h3 className={`px-3 text-[9px] font-bold uppercase tracking-widest opacity-30 mb-1`}>{group.title}</h3>
                )}
                <div className="space-y-0.5">
                  {group.items.filter((item: any) => checkAccess(item.id)).map((item: any) => {
                    const active = currentView === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id as View)}
                        title={isCollapsed ? item.label : ''}
                        className={`w-full flex items-center gap-3 px-3 py-2 transition-all rounded-control group relative
                          ${active
                            ? 'bg-accent text-white'
                            : `${isDark ? 'text-muted hover:bg-white/5 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`
                          }
                          ${isCollapsed ? 'justify-center' : ''}
                        `}
                      >
                        <div className="relative">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'}`} />
                        </div>
                        {!isCollapsed && (
                          <div className="flex-1 flex items-center justify-between overflow-hidden">
                            <span className="font-medium text-xs transition-opacity duration-150 truncate">{item.label}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto px-4 py-4">
            {!isCollapsed && (
              <div className="space-y-0.5 text-center opacity-30 hover:opacity-70 transition-all duration-200">
                <p className={`text-[8px] uppercase tracking-wide ${isDark ? 'text-muted' : 'text-gray-400'}`}>Desenvolvido por</p>
                <a
                  href="https://www.plenainformatica.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-[9px] font-bold block hover:text-accent transition-colors ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                >
                  Plena Informática
                </a>
                <p className={`text-[8px] ${isDark ? 'text-[#636366]' : 'text-gray-400'}`}>V1.0 &copy; 2026</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <header className={`h-14 flex items-center justify-between px-6 shrink-0
            ${isDark ? 'bg-app-base/80 border-border' : 'bg-surface-light/80 border-border-light'} border-b backdrop-blur-md sticky top-0 z-10`}
          >
            <div className="flex items-center gap-4">
              {isCollapsed && (
                <button
                  onClick={() => setIsCollapsed(false)}
                  className={`p-2 rounded-control transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <DateTimeDisplay />
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-current/5">
                {cashierSession ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wide">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Caixa Aberto
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold uppercase tracking-wide">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Caixa Fechado
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {showInstallBtn && (
                  <button
                    onClick={handleInstallClick}
                    className={`hidden sm:flex items-center gap-2 px-3 h-8 rounded-control bg-accent text-white text-[10px] font-bold uppercase tracking-wide transition-all`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> Instalar
                  </button>
                )}
                <button
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className={`p-2 rounded-control transition-all ${isDark ? 'bg-white/5 text-yellow-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={theme}
                      initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                      animate={{ opacity: 1, rotate: 0, scale: 1 }}
                      exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </motion.div>
                  </AnimatePresence>
                </button>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-panel ${isDark ? 'bg-elevated border border-border' : 'bg-elevated-light border border-border-light'}`}>
                  <div className="w-7 h-7 rounded-control bg-accent flex items-center justify-center text-white font-bold text-xs">R</div>
                  <div className="hidden md:block leading-none">
                    <p className="text-[10px] font-bold uppercase tracking-wide">Reinaldo</p>
                    <p className="text-[8px] opacity-30 uppercase tracking-wide mt-0.5">Admin</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* View Content */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
