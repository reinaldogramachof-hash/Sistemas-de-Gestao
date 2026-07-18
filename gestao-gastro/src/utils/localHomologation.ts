/**
 * A local-only mock import must never be overwritten by, or write to, the
 * tenant's remote operational data. The marker is scoped by tenant and lives
 * only in this browser.
 */
export const localHomologationStorageKey = (tenantId: string) =>
  `gestao_gastro:${tenantId}:localHomologationMode`;

export const isLocalHomologationMode = (tenantId: string) =>
  Boolean(tenantId) && localStorage.getItem(localHomologationStorageKey(tenantId)) === 'true';
