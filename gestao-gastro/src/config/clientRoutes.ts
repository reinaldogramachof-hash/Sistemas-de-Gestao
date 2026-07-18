export const CANTINHO_DA_RESENHA_SLUG = 'cantinhodaresenha';
export const CANTINHO_DA_RESENHA_SLUG_ALIAS = 'cantinho-da-resenha';
export const CANTINHO_DA_RESENHA_TENANT_ID = '4c628b1b-a1ce-498e-b302-0344a81de4cb';
const TENANT_SLUG_KEY_PREFIX = 'gestao_gastro_tenant_id:';
const RETIRED_TENANT_IDS = new Set([
  'cd8f21f4-73a1-4c87-a385-9b6deacaeae7',
]);

export interface ClientRouteConfig {
  slug: string;
  displayName: string;
  basePath: string;
  comandaPath: string;
  tenantId: string;
}

export const clientRoutes: Record<string, ClientRouteConfig> = {
  [CANTINHO_DA_RESENHA_SLUG]: {
    slug: CANTINHO_DA_RESENHA_SLUG,
    displayName: 'Cantinho da Resenha',
    basePath: `/gestao-gastro/${CANTINHO_DA_RESENHA_SLUG}`,
    comandaPath: `/gestao-gastro/${CANTINHO_DA_RESENHA_SLUG}/comanda`,
    tenantId: CANTINHO_DA_RESENHA_TENANT_ID,
  },
  [CANTINHO_DA_RESENHA_SLUG_ALIAS]: {
    slug: CANTINHO_DA_RESENHA_SLUG_ALIAS,
    displayName: 'Cantinho da Resenha',
    basePath: `/gestao-gastro/${CANTINHO_DA_RESENHA_SLUG_ALIAS}`,
    comandaPath: `/gestao-gastro/${CANTINHO_DA_RESENHA_SLUG_ALIAS}/comanda`,
    tenantId: CANTINHO_DA_RESENHA_TENANT_ID,
  },
};

/**
 * Extracts the client slug from the pathname, e.g. /gestao-gastro/cantinhodaresenha
 */
export const getClientSlugFromPath = (path: string): string | null => {
  const match = path.match(/^\/gestao-gastro\/([^/]+)/);
  if (match) {
    return match[1];
  }
  return null;
};

const formatDynamicClientName = (slug: string): string =>
  slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Gestao Gastro';

export const getStoredTenantIdForSlug = (slug: string | null): string | null => {
  if (!slug || typeof window === 'undefined') return null;
  const key = `${TENANT_SLUG_KEY_PREFIX}${slug}`;
  const storedTenantId = localStorage.getItem(key);
  if (storedTenantId && RETIRED_TENANT_IDS.has(storedTenantId)) {
    localStorage.removeItem(key);
    if (localStorage.getItem('gestao_gastro_tenant_id') === storedTenantId) {
      localStorage.removeItem('gestao_gastro_tenant_id');
    }
    return null;
  }
  return storedTenantId;
};

export const persistTenantRoute = (slug: string | null, tenantId: string | null): void => {
  if (!slug || !tenantId || typeof window === 'undefined') return;
  localStorage.setItem(`${TENANT_SLUG_KEY_PREFIX}${slug}`, tenantId);
  localStorage.setItem('gestao_gastro_tenant_slug', slug);
  localStorage.setItem('gestao_gastro_tenant_id', tenantId);
};

export const getStoredClientSlug = (): string | null => {
  if (typeof window === 'undefined') return null;
  const storedSlug = localStorage.getItem('gestao_gastro_tenant_slug')?.trim().toLowerCase() ?? '';
  return /^[a-z0-9-]+$/.test(storedSlug) ? storedSlug : null;
};

export const getClientRouteFromPath = (path: string): ClientRouteConfig | null => {
  const slug = getClientSlugFromPath(path);
  if (!slug) return null;
  const knownRoute = clientRoutes[slug];
  if (knownRoute) return knownRoute;

  return {
    slug,
    displayName: formatDynamicClientName(slug),
    basePath: `/gestao-gastro/${slug}`,
    comandaPath: `/gestao-gastro/${slug}/comanda`,
    tenantId: getStoredTenantIdForSlug(slug) ?? '',
  };
};

/**
 * Resolves the tenant ID based on the URL slug, with a fallback to the environment variable.
 */
export const resolveTenant = (pathname: string): string | null => {
  const slug = getClientSlugFromPath(pathname);
  const clientRoute = getClientRouteFromPath(pathname);
  if (clientRoute?.tenantId) {
    return clientRoute.tenantId;
  }

  const storedForSlug = getStoredTenantIdForSlug(slug);
  if (storedForSlug) return storedForSlug;

  if (import.meta.env.DEV) {
    const localConfigured = localStorage.getItem('gestao_gastro_tenant_id');
    if (localConfigured) return localConfigured;
  }

  if (slug) {
    return null;
  }

  return (import.meta.env.VITE_GASTRO_TENANT_ID as string) || null;
};
