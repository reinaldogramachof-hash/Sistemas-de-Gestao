export const CANTINHO_DA_RESENHA_SLUG = 'cantinhodaresenha';
export const CANTINHO_DA_RESENHA_TENANT_ID = 'cd8f21f4-73a1-4c87-a385-9b6deacaeae7';

export interface ClientRouteConfig {
  slug: string;
  basePath: string;
  comandaPath: string;
  tenantId: string;
}

export const clientRoutes: Record<string, ClientRouteConfig> = {
  [CANTINHO_DA_RESENHA_SLUG]: {
    slug: CANTINHO_DA_RESENHA_SLUG,
    basePath: `/gestao-gastro/${CANTINHO_DA_RESENHA_SLUG}`,
    comandaPath: `/gestao-gastro/${CANTINHO_DA_RESENHA_SLUG}/comanda`,
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

export const getClientRouteFromPath = (path: string): ClientRouteConfig | null => {
  const slug = getClientSlugFromPath(path);
  if (!slug) return null;
  return clientRoutes[slug] ?? null;
};

/**
 * Resolves the tenant ID based on the URL slug, with a fallback to the environment variable.
 */
export const resolveTenant = (pathname: string): string | null => {
  const clientRoute = getClientRouteFromPath(pathname);
  if (clientRoute) {
    return clientRoute.tenantId;
  }

  if (import.meta.env.DEV) {
    const localConfigured = localStorage.getItem('gestao_gastro_tenant_id');
    if (localConfigured) return localConfigured;
  }

  return (import.meta.env.VITE_GASTRO_TENANT_ID as string) || null;
};
