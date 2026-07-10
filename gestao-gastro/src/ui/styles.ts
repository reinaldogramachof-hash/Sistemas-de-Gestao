export const ui = {
  pageTitle: 'text-3xl font-bold tracking-tight uppercase leading-none',
  pageSubtitle: 'text-xs font-semibold uppercase tracking-wide opacity-50',
  sectionTitle: 'text-sm font-bold uppercase tracking-wide opacity-60',
  eyebrow: 'text-[10px] font-semibold uppercase tracking-wide opacity-50',
  panel: (isDark: boolean) =>
    `rounded-panel border shadow-sm ${isDark ? 'bg-surface border-border' : 'bg-surface-light border-border-light'}`,
  panelMuted: (isDark: boolean) =>
    `rounded-panel border ${isDark ? 'bg-app-base border-border' : 'bg-elevated-light border-border-light'}`,
  input: (isDark: boolean) =>
    `rounded-control border outline-none font-semibold transition-all focus:ring-4 focus:ring-accent/10 ${
      isDark ? 'bg-app-base border-border focus:border-accent text-text' : 'bg-surface-light border-border-light focus:border-accent text-text-light'
    }`,
  tabShell: (isDark: boolean) =>
    `flex p-1 gap-1 rounded-control border ${isDark ? 'bg-white/5 border-white/10' : 'bg-elevated-light border-border-light'}`,
  tab: (active: boolean, isDark: boolean) =>
    `rounded-control text-[10px] font-semibold uppercase tracking-wide transition-all ${
      active
        ? 'bg-accent text-white shadow-sm'
        : isDark
          ? 'text-muted hover:bg-white/5 hover:text-text'
          : 'text-muted-light hover:bg-surface-light hover:text-text-light'
    }`,
  primaryButton:
    'rounded-control bg-accent text-white font-semibold uppercase tracking-wide shadow-sm transition-all hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed',
  ghostButton: (isDark: boolean) =>
    `rounded-control font-semibold transition-all ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-elevated-light hover:bg-border-light'}`,
  tableHead: (isDark: boolean) =>
    `text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'bg-white/5 text-muted' : 'bg-elevated-light text-muted-light'}`,
};
