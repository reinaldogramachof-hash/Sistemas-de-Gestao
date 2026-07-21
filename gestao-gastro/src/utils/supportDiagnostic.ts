export interface SupportDiagnosticInput {
  generatedAt: string;
  appVersion: string;
  route: string;
  tenantId: string;
  tenantName: string;
  userRole: string;
  plan: string;
  modules: string[];
  browserOnline: boolean;
  supabaseOnline: boolean;
  pwaInstalled: boolean;
  serviceWorkerControlled: boolean;
  pendingOfflineQueueCount: number;
}

const safeText = (value: string, fallback = 'não informado') => {
  const normalized = value
    .trim()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(
      /\b(authorization|access[_-]?token|refresh[_-]?token|password|senha|license[_-]?key|api[_-]?key)\s*[:=]\s*\S+/gi,
      '$1: [removido]',
    );
  return normalized || fallback;
};

const yesOrNo = (value: boolean) => value ? 'sim' : 'não';

export const buildSupportDiagnostic = (input: SupportDiagnosticInput): string => {
  const visibleModules = input.modules
    .map(module => safeText(module, ''))
    .filter(Boolean)
    .join(', ');

  return [
    'Gestão Gastro — Diagnóstico de suporte',
    `Gerado em: ${safeText(input.generatedAt)}`,
    `Versão: ${safeText(input.appVersion)}`,
    `Rota: ${safeText(input.route)}`,
    `Estabelecimento: ${safeText(input.tenantName)}`,
    `Tenant: ${safeText(input.tenantId)}`,
    `Perfil: ${safeText(input.userRole)}`,
    `Plano: ${safeText(input.plan)}`,
    `Módulos visíveis: ${visibleModules || 'nenhum'}`,
    `Navegador online: ${yesOrNo(input.browserOnline)}`,
    `Sincronização remota: ${input.supabaseOnline ? 'conectada' : 'indisponível'}`,
    `Fila offline pendente: ${input.pendingOfflineQueueCount} item(ns)`,
    `PWA instalado: ${yesOrNo(input.pwaInstalled)}`,
    `Service worker controlando a página: ${yesOrNo(input.serviceWorkerControlled)}`,
  ].join('\n');
};
