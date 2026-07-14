import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('admin SaaS console exposes canonical multi-system catalog', () => {
  const source = read('admin/index.html');

  assert.match(source, /const SAAS_CATALOG_FALLBACK = \{/);
  assert.match(source, /const SAAS_CATALOG = SAAS_CATALOG_FALLBACK/);
  assert.match(source, /'gestao-gastro'/);
  assert.match(source, /'gestao-barbearia'/);
  assert.match(source, /'gestao-beleza'/);
  assert.match(source, /function renderSaasCustomers\(\)/);
  assert.match(source, /function renderSaasSystems\(\)/);
  assert.match(source, /function populateProvisionCatalog\(\)/);
});

test('gastro basic plan includes Cantinho da Resenha required modules', () => {
  const source = read('admin/index.html');
  const requiredModules = [
    'pdv',
    'mesas_garcom_mobile',
    'caixa',
    'dashboard',
    'cardapio',
    'financeiro',
    'estoque',
    'manual',
    'configuracao',
    'suporte',
  ];

  for (const moduleKey of requiredModules) {
    assert.match(source, new RegExp(`\\['${moduleKey}',`), `${moduleKey} must be in the admin plan catalog`);
  }
});

test('provisioning link follows public system and tenant slug path', () => {
  const html = read('admin/index.html');
  const php = read('api_provisioning.php');

  assert.match(html, /sistemasdegestao\.tech\/<span id="preview-system-path"/);
  assert.match(html, /getClientAccessLink\(systemSlug, clientSlug\)/);
  assert.match(php, /\$catalog\[\$system\]\['path'\]/);
  assert.doesNotMatch(html, /sistemasdegestao\.tech\/app\//);
});

test('provisioning backend validates catalog and avoids user_metadata authorization', () => {
  const source = read('api_provisioning.php');

  assert.match(source, /function getSaasCatalog\(\)/);
  assert.match(source, /function validateAdminSecret\(/);
  assert.match(source, /hash_equals/);
  assert.match(source, /random_int/);
  assert.match(source, /'app_metadata' =>/);
  assert.doesNotMatch(source, /'user_metadata' =>/);
  assert.match(source, /p_modules/);
  assert.match(source, /p_license_type/);
});

test('central SaaS migration is platform-scoped and restricts privileged RPC', () => {
  const source = read('supabase/migrations/20260713_saas_central.sql');

  assert.match(source, /CREATE TABLE IF NOT EXISTS public\.systems/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS public\.plans/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS public\.plan_modules/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS public\.tenant_modules/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS public\.saas_audit_logs/);
  assert.match(source, /SECURITY DEFINER/);
  assert.match(source, /REVOKE ALL ON FUNCTION public\.provision_saas_tenant/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION public\.provision_saas_tenant[\s\S]*TO service_role/);
  assert.match(source, /mesas_garcom_mobile/);
});

test('commercial licensing policy is documented and exposes four official paths', () => {
  const source = read('docs/POLITICA_COMERCIAL_PLANOS_E_LICENCAS.md');

  assert.match(source, /ml_lifetime/);
  assert.match(source, /direct_lifetime/);
  assert.match(source, /pro_lifetime/);
  assert.match(source, /premium_monthly/);
  assert.match(source, /R\$ 97,00/);
  assert.match(source, /R\$ 299,90/);
  assert.match(source, /R\$ 599,90/);
  assert.match(source, /API PHP \+ Supabase/);
});

test('admin and PHP license generation keep canonical commercial prices', () => {
  const html = read('admin/index.html');
  const php = read('api_licenca_ml.php');

  assert.match(html, /const COMMERCIAL_PLAN_METADATA = \{/);
  assert.match(html, /ml_lifetime:[\s\S]*basePrice: 97\.00/);
  assert.match(html, /direct_lifetime:[\s\S]*basePrice: 299\.90/);
  assert.match(html, /pro_lifetime:[\s\S]*basePrice: 599\.90/);
  assert.match(html, /function syncGeneratePlanPrice\(\)/);
  assert.match(php, /\$canonicalPlans = \[/);
});

test('admin license generation captures system segment modules and tenant context', () => {
  const html = read('admin/index.html');
  const php = read('api_licenca_ml.php');

  assert.match(html, /id="gen-system"/);
  assert.match(html, /id="gen-segment"/);
  assert.match(html, /id="gen-system-plan"/);
  assert.match(html, /id="gen-tenant-slug"/);
  assert.match(html, /function resolveLicenseGenerationContext\(\)/);
  assert.match(html, /function updateGenerateSystemPlanOptions\(\)/);
  assert.match(html, /system_id: context\.systemId/);
  assert.match(html, /segment: context\.segment/);
  assert.match(html, /plan_slug: context\.systemPlanSlug/);
  assert.match(html, /modules: context\.modules/);
  assert.match(html, /max_users: context\.maxUsers/);
  assert.match(html, /max_devices: context\.maxDevices/);
  assert.match(html, /tenant_slug: context\.tenantSlug/);
  assert.match(html, /operation_mode: context\.operationMode/);
  assert.match(html, /gestao-gastro[\s\S]*restaurante[\s\S]*bar[\s\S]*lanchonete/);

  assert.match(php, /\$allowedSystems = \[/);
  assert.match(php, /\$allowedSegments = \[/);
  assert.match(php, /\$systemId = \$jsonData\['system_id'\]/);
  assert.match(php, /\$segment = \$jsonData\['segment'\]/);
  assert.match(php, /\$planSlug = \$jsonData\['plan_slug'\]/);
  assert.match(php, /'system_id' => \$systemId/);
  assert.match(php, /'segment' => \$segment/);
  assert.match(php, /'plan_slug' => \$planSlug/);
  assert.match(php, /'modules' => \$modules/);
  assert.match(php, /'max_users' => \$maxUsers/);
  assert.match(php, /'max_devices' => \$maxDevices/);
  assert.match(php, /'tenant_slug' => \$tenantSlug/);
  assert.match(php, /'operation_mode' => \$operationMode/);
});

test('README and roadmap point to the official commercial policy', () => {
  const readme = read('README.md');
  const roadmap = read('ROADMAP_SISTEMAS_DE_GESTAO.md');

  assert.match(readme, /docs\/POLITICA_COMERCIAL_PLANOS_E_LICENCAS\.md/);
  assert.match(readme, /ml_lifetime/);
  assert.match(readme, /direct_lifetime/);
  assert.match(readme, /pro_lifetime/);
  assert.match(readme, /premium_monthly/);
  assert.match(roadmap, /docs\/POLITICA_COMERCIAL_PLANOS_E_LICENCAS\.md/);
  assert.match(roadmap, /Pro Vitalício R\$599,90/);
  assert.match(roadmap, /Preço oficial atual: \*\*R\$599,90\*\*/);
  assert.doesNotMatch(roadmap, /R\$497-R\$697/);
});

test('dashboard stats calculates enriched metrics without needing list payload', () => {
  const php = read('api_licenca_ml.php');
  const html = read('admin/index.html');

  assert.match(php, /'total_licenses'/);
  assert.match(php, /'active_licenses'/);
  assert.match(php, /'pending_licenses'/);
  assert.match(php, /'trial_active'/);
  assert.match(php, /'trial_expired'/);
  assert.match(php, /'revenue_total'/);
  assert.match(php, /'recurring_revenue'/);
  
  assert.doesNotMatch(html, /const licenses = await apiCall\('list'\);/);
  assert.match(html, /apiCall\('dashboard_stats'\)/);
});

test('CRM Customers tab integration: backend and frontend features', () => {
  const php = read('api_licenca_ml.php');
  const html = read('admin/index.html');

  // 1. customers_summary exists in api_licenca_ml.php and validates secret
  assert.match(php, /action === 'customers_summary'/);
  assert.match(php, /if \(!validateSecret\(\$jsonData, \$ADMIN_SECRET\)\)/);

  // 2. customers-table in admin/index.html does not contain static mock rows
  assert.match(html, /id="customers-table"/);
  assert.match(html, /<tbody id="customers-table"[^>]*?>\s*<\/tbody>/);

  // 3. customers-search field exists in admin/index.html
  assert.match(html, /id="customers-search"/);

  // 4. Novo Cliente button switches tab to provision
  assert.match(html, /onclick="switchTab\('provision'\)"[^>]*>[\s\S]*?Novo Cliente/);

  // 5. escapeHtml is used for rendering client, email, system, plan details
  assert.match(html, /escapeHtml\(name\)/);
  assert.match(html, /escapeHtml\(email\)/);
  assert.match(html, /escapeHtml\(sys\)/);
  assert.match(html, /escapeHtml\(planText\)/);

  // 6. SaaS fallback function exists and is called
  assert.match(html, /function getFallbackSaasCustomers\(\)/);
  assert.match(html, /getFallbackSaasCustomers\(\)/);
});

test('provisioning UI keeps one catalog-driven preview and accurate operational copy', () => {
  const html = read('admin/index.html');
  const previewMatches = html.match(/function updatePlanPreview\(\)/g) || [];

  assert.equal(previewMatches.length, 1);
  assert.doesNotMatch(html, /mesas de 1 a 10/i);
  assert.match(html, /slugManuallyEdited/);
  assert.match(html, /normalizeProvisionSlug/);
  assert.match(html, /Senha temporária - troca obrigatória/i);
});

test('provisioning backend separates public URL, preflights slug, and times out Supabase calls', () => {
  const source = read('api_provisioning.php');
  const linkPosition = source.indexOf("'link' =>");
  const authCreatePosition = source.indexOf("'/auth/v1/admin/users'");
  const slugPreflightPosition = source.indexOf("checkTenantSlugAvailable");

  assert.match(source, /\$PUBLIC_BASE_URL\s*=\s*env\('PUBLIC_BASE_URL'/);
  assert.match(source, /CURLOPT_CONNECTTIMEOUT/);
  assert.match(source, /CURLOPT_TIMEOUT/);
  assert.match(source, /function checkTenantSlugAvailable\(/);
  assert.ok(slugPreflightPosition > -1 && authCreatePosition > -1 && slugPreflightPosition < authCreatePosition);
  assert.ok(linkPosition > -1);
  assert.doesNotMatch(source.slice(linkPosition, linkPosition + 180), /ALLOWED_ORIGIN_ENV/);
  assert.match(source.slice(linkPosition, linkPosition + 180), /PUBLIC_BASE_URL/);
});

test('provisioning migration records trial expiration in licenses', () => {
  const source = read('supabase/migrations/20260713_saas_central.sql');

  assert.match(source, /p_expires_at TIMESTAMPTZ DEFAULT NULL/);
  assert.match(source, /IF p_license_type = 'trial' AND p_expires_at IS NULL THEN/);
  assert.match(source, /expires_at[\s\S]*\)[\s\S]*VALUES[\s\S]*p_expires_at/);
  assert.match(source, /REVOKE ALL ON FUNCTION public\.provision_saas_tenant\(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT\[\], TIMESTAMPTZ\)/);
  assert.match(source, /GRANT EXECUTE ON FUNCTION public\.provision_saas_tenant\(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT\[\], TIMESTAMPTZ\) TO service_role/);
});

test('systems and plans tab is catalog-driven, not static mock markup', () => {
  const html = read('admin/index.html');
  const php = read('api_provisioning.php');
  const systemsTabStart = html.indexOf('id="tab-systems"');
  const provisionTabStart = html.indexOf('id="tab-provision"');
  const systemsTab = html.slice(systemsTabStart, provisionTabStart);

  assert.ok(systemsTabStart > -1 && provisionTabStart > systemsTabStart);
  assert.match(systemsTab, /id="systems-grid"/);
  assert.doesNotMatch(systemsTab, /<!-- Sistema 1 -->/);
  assert.doesNotMatch(systemsTab, /PDV, Mesas \(limite 10\), Dashboard Simplificado/);
  assert.match(systemsTab, /onclick="openSystemCatalogAction\('new'\)"/);
  assert.match(html, /function renderSaasSystems\(\)/);
  assert.match(html, /loadSystemsCatalog\(\)/);
  assert.match(html, /SAAS_CATALOG_FALLBACK/);
  assert.match(html, /Catálogo local\/fallback/);
  assert.match(html, /alteração de plano padrão afeta novos provisionamentos/i);
  assert.match(php, /\$action === 'systems_catalog'/);
  assert.match(php, /validateAdminSecret\(\$jsonData\['admin_secret'\]/);
});

test('systems catalog keeps Portuguese labels and has no mojibake markers', () => {
  const html = read('admin/index.html');
  const php = read('api_provisioning.php');
  const combined = `${html}\n${php}`;

  assert.match(html, /Gestão Gastro/);
  assert.match(html, /Básico/);
  assert.match(html, /R\$ 97\/mês/);
  assert.match(html, /Mesas e garçom mobile/);
  assert.match(html, /Configuração/);
  assert.match(html, /Relatórios avançados/);
  assert.match(html, /Gestão Barbearia/);
  assert.match(html, /Serviços/);
  assert.match(html, /Profissionais/);
  assert.match(html, /Comissões/);
  assert.match(html, /Gestão Beleza/);
  assert.match(html, /Salões, estética e pacotes/);
  assert.doesNotMatch(combined, /GestÃ|BÃ|mÃ|AÃ|nÃ|Ã§|Ã£|Ã¡|Ã©|Ãª|Ã³|Ãº|Ã­|â€|ðŸ|�/);
});
