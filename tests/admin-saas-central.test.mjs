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
  assert.match(source, /'gestao-assistencia'/);
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
  assert.match(source, /'user_metadata' => \$existingUserMetadata/);
  assert.doesNotMatch(source, /'user_metadata'\s*=>\s*\[[\s\S]*?'role'/);
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
  assert.match(html, /gestao-gastro[\s\S]*restaurante[\s\S]*bar[\s\S]*lanchonete/);
  assert.match(html, /gestao-assistencia[\s\S]*assistencia/);

  assert.match(php, /\$allowedSystems = /);
  assert.match(php, /gestao-assistencia/);
  assert.match(php, /\$allowedSegments = \[/);
  assert.match(php, /assistencia/);
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

test('SaaS licenses persist and verify device binding in Supabase', () => {
  const php = read('api_licenca_ml.php');
  const activationGate = read('gestao-gastro/src/components/ActivationGate.tsx');

  assert.match(php, /device_id,activated_at,last_verified_at/);
  assert.match(php, /function registerSaasLicenseDevice/);
  assert.match(php, /function touchSaasLicenseVerification/);
  assert.match(php, /function resetSaasLicenseDevice/);
  assert.match(php, /supabaseLicenseRequest\('PATCH', '\/rest\/v1\/licenses\?license_key=eq\.'/);
  assert.match(php, /'device_id' => \$device/);
  assert.match(php, /'last_verified_at' => \$now/);
  assert.match(php, /Licenca ja usada em outro aparelho/);
  assert.match(php, /\$deviceRegistration = registerSaasLicenseDevice\(\$saasLicense, \$device\)/);
  assert.match(php, /\$verification = touchSaasLicenseVerification\(\$saasLicense, \$device\)/);

  assert.match(activationGate, /getOrCreateDeviceId\(tenantSlug, resolvedTenant\)/);
  assert.match(activationGate, /gestao_gastro_device_id:/);
  assert.match(activationGate, /device_id: deviceId/);
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

test('SaaS provisioning can recover an orphan tenant without masking it as active', () => {
  const php = read('api_provisioning.php');
  const html = read('admin/index.html');

  assert.match(php, /function recoverExistingTenantProvisioning/);
  assert.match(php, /function cleanupOrphanTenantForProvisioning/);
  assert.match(php, /function tenantHasActiveLicense/);
  assert.match(php, /function findAuthUserByEmail/);
  assert.match(php, /admin\/users\?page=1&per_page=1000/);
  assert.match(php, /function authUserCanBeReusedForTenant/);
  assert.match(php, /tenant_members\?tenant_id=eq\./);
  assert.match(php, /supabase_request\('PUT', '\/auth\/v1\/admin\/users\/'/);
  assert.match(php, /supabase_request\('DELETE', '\/auth\/v1\/admin\/users\/'/);
  assert.match(php, /'status' => \$operationalStatus/);
  assert.match(php, /'tenant_status' => \$tenant\['status'\]/);
  assert.match(php, /sem_licenca/);
  assert.match(php, /Cliente recuperado e provisionado com sucesso/);
  assert.match(html, /statusLabel = !license \? 'sem licença' : status/);
  assert.match(html, /bg-red-100 text-red-700 border-red-200/);
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
  assert.match(html, /Online Essencial/);
  assert.match(html, /R\$ 89\/mês/);
  assert.match(html, /Mesas e garçom mobile/);
  assert.match(html, /Configuração/);
  assert.match(html, /Relatórios avançados/);
  assert.match(html, /Gestão Barbearia/);
  assert.match(html, /Serviços/);
  assert.match(html, /Profissionais/);
  assert.match(html, /Comissões/);
  assert.match(html, /Gestão Beleza/);
  assert.match(html, /Salões, estética e pacotes/);
  assert.doesNotMatch(combined, /GestÃ|BÃ|mÃ|AÃ|nÃ|Ã§|Ã£|Ã¡|Ã©|Ãª|Ã³|Ãº|Ã­|â€|ðŸ|\uFFFD/);
});


test('Fase 1: api_provisioning.php catalog contains gestao-assistencia and has 4 canonical systems', () => {
  const php = read('api_provisioning.php');
  const html = read('admin/index.html');

  assert.match(php, /'gestao-assistencia'\s*=>\s*\[/);
  assert.match(php, /'name'\s*=>\s*'Gestão Assistência'/);
  assert.match(php, /'path'\s*=>\s*'gestao-assistencia'/);
  assert.match(php, /'basic'\s*=>\s*\[/);
  assert.match(php, /'premium'\s*=>\s*\[/);
  assert.match(php, /'trial'\s*=>\s*\[/);

  assert.match(html, /<option value=\"gestao-assistencia\">Gestão Assistência<\/option>/);
});

test('Fase B.1.1: admin and PHP catalog validate 4 canonical systems, public names, and approved prices in HTML and PHP', () => {
  const html = read('admin/index.html');
  const php = read('api_provisioning.php');

  // 4 sistemas presentes no fallback do Admin
  assert.match(html, /'gestao-gastro':\s*\{/);
  assert.match(html, /'gestao-barbearia':\s*\{/);
  assert.match(html, /'gestao-beleza':\s*\{/);
  assert.match(html, /'gestao-assistencia':\s*\{/);

  // 4 sistemas presentes no catálogo PHP
  assert.match(php, /'gestao-gastro'\s*=>\s*\[/);
  assert.match(php, /'gestao-barbearia'\s*=>\s*\[/);
  assert.match(php, /'gestao-beleza'\s*=>\s*\[/);
  assert.match(php, /'gestao-assistencia'\s*=>\s*\[/);

  // Nomes públicos unificados (Online Essencial / Online Premium)
  assert.match(html, /name:\s*'Online Essencial'/);
  assert.match(html, /name:\s*'Online Premium'/);
  assert.match(php, /'name'\s*=>\s*'Online Essencial'/);
  assert.match(php, /'name'\s*=>\s*'Online Premium'/);

  // Preços canônicos aprovados no Admin HTML (priceCents)
  assert.match(html, /priceCents:\s*8900/);  // Gastro Essencial
  assert.match(html, /priceCents:\s*18900/); // Gastro Premium
  assert.match(html, /priceCents:\s*5990/);  // Barbearia / Beleza Essencial
  assert.match(html, /priceCents:\s*9900/);  // Barbearia / Beleza Premium
  assert.match(html, /priceCents:\s*9790/);  // Assistência Essencial
  assert.match(html, /priceCents:\s*14990/); // Assistência Premium

  // Preços canônicos aprovados no backend PHP (price_cents)
  assert.match(php, /'price_cents'\s*=>\s*8900/);  // Gastro Essencial
  assert.match(php, /'price_cents'\s*=>\s*18900/); // Gastro Premium
  assert.match(php, /'price_cents'\s*=>\s*5990/);  // Barbearia / Beleza Essencial
  assert.match(php, /'price_cents'\s*=>\s*9900/);  // Barbearia / Beleza Premium
  assert.match(php, /'price_cents'\s*=>\s*9790/);  // Assistência Essencial
  assert.match(php, /'price_cents'\s*=>\s*14990/); // Assistência Premium

  // Bloqueio de valores legados/antigos no HTML e no PHP
  assert.doesNotMatch(html, /priceCents:\s*6900/);  // Beleza antigo
  assert.doesNotMatch(html, /priceCents:\s*12900/); // Beleza antigo
  assert.doesNotMatch(html, /priceCents:\s*9700/);  // Gastro antigo
  assert.doesNotMatch(html, /priceCents:\s*19700/); // Gastro antigo

  assert.doesNotMatch(php, /'price_cents'\s*=>\s*6900/);  // Beleza antigo
  assert.doesNotMatch(php, /'price_cents'\s*=>\s*12900/); // Beleza antigo
  assert.doesNotMatch(php, /'price_cents'\s*=>\s*9700/);  // Gastro antigo
  assert.doesNotMatch(php, /'price_cents'\s*=>\s*19700/); // Gastro antigo

  // Módulos prometidos da Assistência Premium no PHP e Admin
  assert.match(php, /'portal_cliente'/);
  assert.match(php, /'whatsapp_auto'/);
  assert.match(php, /'relatorios_avancados'/);
  assert.match(php, /'gestao_garantias'/);
  assert.match(html, /\['portal_cliente',/);
  assert.match(html, /\['whatsapp_auto',/);
  assert.match(html, /\['relatorios_avancados',/);
  assert.match(html, /\['gestao_garantias',/);
});

test('Fase C.1: Dashboard Operacional Híbrido has honest labels, Evolution Leads statistics and local metrics preservation', () => {
  const html = read('admin/index.html');
  const php = read('api_licenca_ml.php');

  // 1. Separação de receita vitalícia vs recorrência
  assert.match(html, /Recorrência Estimada \(Local\):/);
  assert.match(html, /Receita Vitalícia Registrada:/);

  // 2. Ausência de rótulo enganoso "Receita Total" no HTML
  assert.doesNotMatch(html, /Receita Total:/);

  // 3. Presença de cards/labels dos Leads de Evolução no HTML
  assert.match(html, /Leads de Evolução/);
  assert.match(html, /id="stat-leads-total"/);
  assert.match(html, /id="stat-leads-new-today"/);
  assert.match(html, /id="stat-leads-new"/);
  assert.match(html, /id="stat-leads-contacted"/);
  assert.match(html, /id="stat-leads-proposta"/);
  assert.match(html, /id="stat-leads-converted"/);
  assert.match(html, /id="stat-leads-lost-discarded"/);

  // 4. Preservação dos cards críticos de licenças/trials
  assert.match(html, /Licenças Ativas \(Local\)/);
  assert.match(html, /Pendentes \/ Trials \(Local\)/);
  assert.match(html, /id="stat-active"/);
  assert.match(html, /id="stat-pending"/);
  assert.match(html, /id="stat-trial-active"/);
  assert.match(html, /id="stat-trial-expired"/);
  assert.match(html, /id="stat-blocked"/);

  // 5. Backend dashboard_stats inclui cálculo de leads de evolução e trata fallback
  assert.match(php, /\$stats\['evolution_leads'\]\s*=\s*\$leadsStats/);
  assert.match(php, /getDB\(\$fileEvolutionLeads\)/);
  assert.match(php, /'novos_hoje' => 0/);
});

test('Fase C.2: Clientes CRM consolidation returns enriched Customer 360 payload', () => {
  const php = read('api_licenca_ml.php');

  // 1. customers_summary existe e está protegido
  assert.match(php, /action === 'customers_summary'/);
  assert.match(php, /validateSecret\(\$jsonData,\s*\$ADMIN_SECRET\)/);

  // 2. Lê licenças locais e leads de evolução
  assert.match(php, /getDB\(\$fileLicenses\)/);
  assert.match(php, /getDB\(\$fileEvolutionLeads\)/);

  // 3. Cria novos campos de Customer 360
  assert.match(php, /'customer_key'/);
  assert.match(php, /'sources'/);
  assert.match(php, /'leads_count'/);
  assert.match(php, /'open_leads_count'/);
  assert.match(php, /'customer_whatsapp'/);
  assert.match(php, /'relationship_stage'/);
  assert.match(php, /'data_completeness'/);

  // 4. Une por e-mail e faz fallback por licença
  assert.match(php, /isset\(\$customers\[\$leadEmail\]\)/);
  assert.match(php, /\$c\['license_key'\]\s*===\s*\$leadLicense/);

  // 5. Calcula estágio de relacionamento (lead, trial, customer_local, customer_saas, mixed)
  assert.match(php, /'lead'/);
  assert.match(php, /'trial'/);
  assert.match(php, /'customer_local'/);
  assert.match(php, /'customer_saas'/);
  assert.match(php, /'mixed'/);

  // 6. Calcula completude (complete, partial, license_only, lead_only)
  assert.match(php, /'complete'/);
  assert.match(php, /'partial'/);
  assert.match(php, /'license_only'/);
  assert.match(php, /'lead_only'/);

  // 7. Não expõe senhas ou dados sensíveis do administrador
  assert.doesNotMatch(php, /'admin_password'/);
  assert.doesNotMatch(php, /'admin_token'/);
});

test('Fase C.3: Clientes SaaS operational transparency, catalog warnings and descriptive status mappings', () => {
  const html = read('admin/index.html');

  // 1. CRM vs SaaS Differentiator Text
  assert.match(html, /<b>Clientes \(CRM\):<\/b> Carteira Unificada/);
  assert.match(html, /<b>Clientes SaaS:<\/b> Gestão de Tenants Técnicos Online/);

  // 2. Catalog source warning banner/box in the HTML
  assert.match(html, /id="provision-catalog-status"/);

  // 3. Dynamic assignment of catalog when loaded from Supabase
  assert.match(html, /Object\.assign\(SAAS_CATALOG,\s*catalog\)/);

  // 4. Warning/Connection status update logic
  assert.match(html, /provStatusBox\.innerHTML = '⚡ <b>Catálogo Conectado:<\/b>/);
  assert.match(html, /provStatusBox\.innerHTML = '⚠️ <b>Catálogo Fallback\/Local em uso:<\/b>/);

  // 5. Descriptive status mappings
  assert.match(html, /displayStatus = 'TENANT ÓRFÃO \/ SEM LICENÇA'/);
  assert.match(html, /displayStatus = 'TRIAL ATIVO'/);
  assert.match(html, /displayStatus = 'TRIAL EXPIRADO'/);

  // 6. Modules count presentation explanation
  assert.match(html, /Módulos \(Qtd\.\)/);
  assert.match(html, /title="Quantidade de módulos habilitados/);
});

test('Fase C.4: Licenças Vitalícias UI operational clarity, Gastro notices and device binding details', () => {
  const html = read('admin/index.html');
  const php = read('api_licenca_ml.php');

  // 1. Backend matches actual JSON filenames
  assert.match(php, /database_licenses_secure\.json/);
  assert.match(php, /database_licenses_archived\.json/);
  assert.match(php, /receipts_log\.json/);

  // 2. Gastro SaaS notice in generate modal
  assert.match(html, /id="gen-gastro-warning-box"/);
  assert.match(html, /Gestão Gastro \(SaaS Recomendado\)/);
  assert.match(html, /Gestão Gastro \(Nuvem\/SaaS\)/);

  // 3. Descriptive status and device binding notes
  assert.match(html, /displaySubtext = l\.device_id \? 'Dispositivo Vinculado' : 'Sem Dispositivo \/ Livre'/);
  assert.match(html, /displaySubtext = 'Aguardando Ativação'/);
  assert.match(html, /title="Gestão Gastro é um sistema nativo em nuvem \(SaaS\)\. Licença vitalícia\/standalone é legada\/offline\."/);
  assert.match(html, /title="Resetar Dispositivo Vinculado \(Use se o cliente trocou de aparelho ou formatou\)"/);
});

test('Fase C.4.1: License generation modal reorganization, Gestão Assistência addition, Barbearia default and Live Summary', () => {
  const html = read('admin/index.html');

  // 1. Gestão Assistência included in selectors and JS maps
  assert.match(html, /<option value="gestao-assistencia">Gestão Assistência \(ML Standalone\)<\/option>/);
  assert.match(html, /'gestao-assistencia': \['assistencia', 'geral'\]/);
  assert.match(html, /'gestao-assistencia': 'Gestão Assistência'/);

  // 2. Gestão Barbearia as default system in modal and JS fallbacks
  assert.match(html, /<option value="gestao-barbearia" selected>Gestão Barbearia \(ML Standalone\)<\/option>/);
  assert.match(html, /document\.getElementById\('gen-system'\)\?\.\s*value \|\| 'gestao-barbearia'/);

  // 3. Renamed/complemented label for system plan
  assert.match(html, /Liberação \/ Pacote de Recursos \(Plano\)/);

  // 4. Commercial plan descriptions
  assert.match(html, /ML Vitalício - Venda Mercado Livre \(Chave Standalone\)/);
  assert.match(html, /Direto Vitalício - Venda Direta \(Site\/WhatsApp\)/);
  assert.match(html, /Pro Vitalício - Pacote local ampliado \(Multi-recursos\)/);

  // 5. Live Summary Box and JS updater function
  assert.match(html, /id="gen-live-summary"/);
  assert.match(html, /function updateGenerateSummary\(\)/);
});

test('Fase C.5.1 / C.5.1.1: Official local commercial catalog JSON structure, canonical prices, rules and documentation', () => {
  const jsonRaw = read('api_data/products_catalog.json');
  const docRaw = read('docs/CATALOGO_COMERCIAL_LOCAL_OFICIAL.md');

  // 1. JSON Is valid
  const catalog = JSON.parse(jsonRaw);
  assert.ok(catalog.systems, 'Catalog must contain a systems property');

  // 2. All 4 canonical systems present
  const requiredSystems = ['gestao-barbearia', 'gestao-beleza', 'gestao-assistencia', 'gestao-gastro'];
  for (const sysId of requiredSystems) {
    assert.ok(catalog.systems[sysId], `System ${sysId} must be present in products_catalog.json`);
  }

  // 3. gestao-barbearia rules and canonical SaaS prices (59.90 / 99.00)
  const barb = catalog.systems['gestao-barbearia'];
  assert.strictEqual(barb.standard_ml_allowed, true);
  assert.ok(barb.allowed_channels.includes('mercadolivre'));
  assert.ok(barb.allowed_commercial_models.includes('ml_lifetime'));
  assert.ok(barb.allowed_commercial_models.includes('direct_lifetime'));
  assert.ok(barb.allowed_commercial_models.includes('pro_lifetime'));
  assert.ok(barb.allowed_commercial_models.includes('trial'));
  assert.ok(barb.allowed_commercial_models.includes('online_essential'));
  assert.ok(barb.allowed_commercial_models.includes('online_premium'));
  assert.ok(barb.allowed_commercial_models.includes('project_custom_brand'));
  assert.strictEqual(barb.saas_plans.online_essential.monthly_price, 59.90);
  assert.strictEqual(barb.saas_plans.online_premium.monthly_price, 99.00);

  // 4. gestao-beleza rules and canonical SaaS prices (59.90 / 99.00)
  const bel = catalog.systems['gestao-beleza'];
  assert.strictEqual(bel.standard_ml_allowed, true);
  assert.ok(bel.allowed_channels.includes('mercadolivre'));
  assert.ok(bel.allowed_commercial_models.includes('ml_lifetime'));
  assert.strictEqual(bel.saas_plans.online_essential.monthly_price, 59.90);
  assert.strictEqual(bel.saas_plans.online_premium.monthly_price, 99.00);

  // 5. gestao-assistencia rules and canonical SaaS prices (97.90 / 149.90)
  const ast = catalog.systems['gestao-assistencia'];
  assert.strictEqual(ast.standard_ml_allowed, true);
  assert.ok(ast.allowed_channels.includes('mercadolivre'));
  assert.ok(ast.allowed_commercial_models.includes('ml_lifetime'));
  assert.strictEqual(ast.saas_plans.online_essential.monthly_price, 97.90);
  assert.strictEqual(ast.saas_plans.online_premium.monthly_price, 149.90);

  // 6. gestao-gastro rules (SaaS Recommended, Not Standard ML) and canonical SaaS prices (89.00 / 189.00)
  const gastro = catalog.systems['gestao-gastro'];
  assert.strictEqual(gastro.saas_recommended, true);
  assert.strictEqual(gastro.standard_ml_allowed, false);
  assert.strictEqual(gastro.allowed_channels.includes('mercadolivre'), false);
  assert.ok(gastro.offline_standalone_fallback, 'Gastro must register offline fallback configuration');
  assert.strictEqual(gastro.offline_standalone_fallback.permitted, true);
  assert.strictEqual(gastro.saas_plans.online_essential.monthly_price, 89.00);
  assert.strictEqual(gastro.saas_plans.online_premium.monthly_price, 189.00);

  // 7. Official Documentation validations
  assert.match(docRaw, /# Catálogo Comercial Local Oficial/);
  assert.match(docRaw, /gestao-barbearia/);
  assert.match(docRaw, /gestao-beleza/);
  assert.match(docRaw, /gestao-assistencia/);
  assert.match(docRaw, /gestao-gastro/);
  assert.match(docRaw, /saas_recommended/);
  assert.match(docRaw, /Supabase Cloud/);
  assert.match(docRaw, /59,90/);
  assert.match(docRaw, /99,00/);
  assert.match(docRaw, /97,90/);
  assert.match(docRaw, /149,90/);
});

test('Fase C.5.2 / C.5.2.1: PHP catalog_loader.php helper integration and contextual system permission rules in api_licenca_ml.php', () => {
  const catalogPhp = read('catalog_loader.php');
  const mlPhp = read('api_licenca_ml.php');

  // 1. catalog_loader.php defines required contextual helper functions and fallbacks
  assert.match(catalogPhp, /function loadCommercialCatalog\(\)/);
  assert.match(catalogPhp, /function getCommercialSystems\(\)/);
  assert.match(catalogPhp, /function getCommercialSystem\(/);
  assert.match(catalogPhp, /function isSystemStandardMLAllowed\(/);
  assert.match(catalogPhp, /function isOfflineFallbackPermitted\(/);
  assert.match(catalogPhp, /function isSystemAllowedForModel\(/);
  assert.match(catalogPhp, /function getAllowedSystemsForML\(\)/);
  assert.match(catalogPhp, /function getAllowedSystemsForLicenseGeneration\(\)/);
  assert.match(catalogPhp, /function getAllowedSystemsForLeads\(\)/);
  assert.match(catalogPhp, /function getDefaultSystemId\(\)/);
  assert.match(catalogPhp, /fallbackCatalog = \[/);

  // 2. api_licenca_ml.php requires catalog_loader.php and uses contextual functions
  assert.match(mlPhp, /require_once __DIR__ \. '\/catalog_loader\.php';/);
  assert.match(mlPhp, /\$allowedSystems = getAllowedSystemsForLicenseGeneration\(\);/);
  assert.match(mlPhp, /\$allowed_systems = getAllowedSystemsForLeads\(\);/);
  assert.match(mlPhp, /isSystemStandardMLAllowed\(\$systemId\)/);
  assert.match(mlPhp, /getDefaultSystemId\(\)/);

  // 3. Eliminates old conflicting hardcoded arrays in api_licenca_ml.php
  assert.doesNotMatch(mlPhp, /\$allowedSystems = \['gestao-gastro', 'gestao-barbearia', 'gestao-beleza'\];/);
  assert.doesNotMatch(mlPhp, /\$allowed_systems = \['gestao-assistencia', 'gestao-barbearia', 'gestao-beleza'\];/);
  assert.doesNotMatch(mlPhp, /\$systemId = \$jsonData\['system_id'\] \?\? 'gestao-gastro';/);
});

test('Fase C.5.3: Public api_catalog.php endpoint and Admin visual catalog fallback hierarchy', () => {
  const catalogEndpointPhp = read('api_catalog.php');
  const html = read('admin/index.html');

  // 1. api_catalog.php uses catalog_loader.php and returns safe JSON without secrets
  assert.match(catalogEndpointPhp, /require_once __DIR__ \. '\/catalog_loader\.php';/);
  assert.match(catalogEndpointPhp, /loadCommercialCatalog\(\)/);
  assert.match(catalogEndpointPhp, /'source' => 'local_official'/);
  assert.doesNotMatch(catalogEndpointPhp, /"admin_secret"\s*=>/);
  assert.doesNotMatch(catalogEndpointPhp, /SUPABASE_KEY/);

  // 2. admin/index.html integrates api_catalog.php and maintains 3-layer fallback
  assert.match(html, /fetch\('\.\.\/api_catalog\.php'\)/);
  assert.match(html, /function normalizeLocalCatalogPayload\(/);
  assert.match(html, /source === 'local_official'/);
  assert.match(html, /Catálogo Local Oficial em uso/);
  assert.match(html, /const SAAS_CATALOG_FALLBACK = \{/); // Fallback JS preserved
});

test('Fase C.5.4: Administrative Catalog CRUD operations, automatic backups, and Admin operational form modal', () => {
  const catalogEndpointPhp = read('api_catalog.php');
  const html = read('admin/index.html');
  const doc = read('docs/CATALOGO_COMERCIAL_LOCAL_OFICIAL.md');

  // 1. api_catalog.php requires ADMIN_SECRET for write actions and does not leak secret keys
  assert.match(catalogEndpointPhp, /validateAdminSecret\(\$jsonData\['admin_secret'\] \?\? '', \$ADMIN_SECRET\)/);
  assert.match(catalogEndpointPhp, /action === 'save_system'/);
  assert.match(catalogEndpointPhp, /action === 'toggle_status'/);
  assert.match(catalogEndpointPhp, /backupCatalogFile\(/);
  assert.match(catalogEndpointPhp, /products_catalog\.backup\./);
  assert.doesNotMatch(catalogEndpointPhp, /"admin_secret"\s*=>/);

  // 2. Gastro canonical rules enforced server-side
  assert.match(catalogEndpointPhp, /\$slug === 'gestao-gastro'/);
  assert.match(catalogEndpointPhp, /\$saasRecommended = true;/);
  assert.match(catalogEndpointPhp, /\$standardMlAllowed = false;/);

  // 3. Admin index.html replaces "ação em desenvolvimento" with real catalog form modal
  assert.match(html, /id="catalog-system-modal"/);
  assert.match(html, /id="form-catalog-system"/);
  assert.match(html, /function saveCatalogSystem\(/);
  assert.match(html, /id="cat-gastro-warning"/);
  assert.doesNotMatch(html, /Ação <b>\$\{escapeHtml\(action\)\}<\/b> está em desenvolvimento\./);

  // 4. Documentation covers C.5.4 CRUD and automatic backups
  assert.match(doc, /Fase C.5.4/);
  assert.match(doc, /products_catalog\.backup\./);
  assert.match(doc, /save_system/);
  assert.match(doc, /toggle_status/);
});

test('Fase C.5.4.1: Catalog CRUD persistence corrections, canonical base_price, complete lifetime plans, and channel/model allowlists', () => {
  const catalogEndpointPhp = read('api_catalog.php');
  const html = read('admin/index.html');
  const doc = read('docs/CATALOGO_COMERCIAL_LOCAL_OFICIAL.md');

  // 1. api_catalog.php uses base_price for lifetime plans and does not write legacy price field
  assert.match(catalogEndpointPhp, /\$lifetimePlans\['ml_lifetime'\]\['base_price'\] = \$priceMl/);
  assert.match(catalogEndpointPhp, /\$lifetimePlans\['direct_lifetime'\]\['base_price'\] = \$priceDirect/);
  assert.match(catalogEndpointPhp, /\$lifetimePlans\['pro_lifetime'\]\['base_price'\] = \$pricePro/);
  assert.doesNotMatch(catalogEndpointPhp, /\$lifetimePlans\['ml_lifetime'\]\['price'\] =/);

  // 2. New systems build complete lifetime_plans structure
  assert.match(catalogEndpointPhp, /'billing_model' => 'one_time'/);
  assert.match(catalogEndpointPhp, /'features' => \['pdv_local'/);

  // 3. Sanitizes channels and commercial models against allowlists
  assert.match(catalogEndpointPhp, /\$channelAllowlist = \['mercadolivre', 'direct', 'landing_page', 'admin_saas'\]/);
  assert.match(catalogEndpointPhp, /\$modelAllowlist = \['ml_lifetime', 'direct_lifetime', 'pro_lifetime', 'trial', 'online_essential', 'online_premium', 'project_custom_brand'\]/);
  assert.match(catalogEndpointPhp, /array_diff\(\$allowedChannels, \['mercadolivre'\]\)/);
  assert.match(catalogEndpointPhp, /array_diff\(\$allowedModels, \['ml_lifetime'\]\)/);

  // 4. admin/index.html includes channel and model checkboxes and populates/submits them
  assert.match(html, /name="cat_channel"/);
  assert.match(html, /name="cat_model"/);
  assert.match(html, /allowed_channels: allowedChannels/);
  assert.match(html, /allowed_commercial_models: allowedModels/);
  assert.match(html, /Sucesso:/);

  // 5. Documentation updated with C.5.4.1
  assert.match(doc, /Fase C.5.4.1/);
  assert.match(doc, /base_price/);
});

test('Fase C.5.4.2: Gestão Assistência catalog rendering fix, 4 canonical systems guarantee, duplicate slug protection, and QA cleanup validation', () => {
  const html = read('admin/index.html');
  const catalogJson = read('api_data/products_catalog.json');
  const catalogObj = JSON.parse(catalogJson);

  // 1. All 4 canonical systems exist in products_catalog.json
  assert.ok(catalogObj.systems['gestao-barbearia']);
  assert.ok(catalogObj.systems['gestao-beleza']);
  assert.ok(catalogObj.systems['gestao-assistencia']);
  assert.ok(catalogObj.systems['gestao-gastro']);

  // 2. Admin merges local catalog to prevent Gestão Assistência from being hidden if Supabase is partial
  assert.match(html, /const mergedCatalog = \{ \.\.\.localCatalog \};/);
  assert.match(html, /'gestao-assistencia'/);

  // 3. Admin renders visual badge for inactive systems
  assert.match(html, /isInactive \? '<span class="text-xs bg-red-600 text-white px-2 py-0\.5 rounded font-bold uppercase tracking-wider">Inativo<\/span>'/);

  // 4. Verification that products_catalog.json contains ZERO QA residue or temporary systems
  assert.doesNotMatch(catalogJson, /gestao-qa-catalogo/);
  assert.doesNotMatch(catalogJson, /gestao-teste/);
});

test('Fase C.5.4.3: Commercial Catalog Cards Standardization, Canonical Prices, and Group Layout', () => {
  const html = read('admin/index.html');
  const doc = read('docs/CATALOGO_COMERCIAL_LOCAL_OFICIAL.md');
  const catalogJson = read('api_data/products_catalog.json');
  const catalogObj = JSON.parse(catalogJson);

  // 1. Absence of legacy "Master Mensal" or R$ 0,00 mock artifacts in catalog
  assert.doesNotMatch(html, /Master Mensal/);
  assert.doesNotMatch(html, /R\$ 0,00\/mês/);

  // 2. Presence of 3 plan groups in admin card layout
  assert.match(html, /Planos Recorrentes Online \/ SaaS/);
  assert.match(html, /Licenças Vitalícias \/ Standalone/);
  assert.match(html, /Avaliação Gratuita \/ Trial/);

  // 3. System canonical prices in products_catalog.json
  const barb = catalogObj.systems['gestao-barbearia'];
  assert.strictEqual(barb.saas_plans.online_essential.monthly_price, 59.90);
  assert.strictEqual(barb.saas_plans.online_premium.monthly_price, 99.00);

  const bel = catalogObj.systems['gestao-beleza'];
  assert.strictEqual(bel.saas_plans.online_essential.monthly_price, 59.90);
  assert.strictEqual(bel.saas_plans.online_premium.monthly_price, 99.00);

  const ast = catalogObj.systems['gestao-assistencia'];
  assert.strictEqual(ast.saas_plans.online_essential.monthly_price, 97.90);
  assert.strictEqual(ast.saas_plans.online_premium.monthly_price, 149.90);

  const gas = catalogObj.systems['gestao-gastro'];
  assert.strictEqual(gas.saas_plans.online_essential.monthly_price, 89.00);
  assert.strictEqual(gas.saas_plans.online_premium.monthly_price, 189.00);

  // 4. Gastro highlights in Admin HTML
  assert.match(html, /SaaS Recomendado/);
  assert.match(html, /ML Padrão Indisponível/);
  assert.match(html, /Offline \/ Standalone Permitido/);

  // 5. Documentation updated with Phase C.5.4.3
  assert.match(doc, /Fase C.5.4.3/);
  assert.match(doc, /Padronização dos Cards de Prateleira no Admin/);
});

test('Fase C.5.4.4: Preservation of Canonical JSON Catalog Fields Post-CRUD', () => {
  const catalogPhp = read('api_catalog.php');
  const catalogJson = read('api_data/products_catalog.json');
  const catalogObj = JSON.parse(catalogJson);

  // 1. api_catalog.php performs safe merge preserving non-form canonical fields
  assert.match(catalogPhp, /\$updatedSystem = \$existingSys;/);
  assert.match(catalogPhp, /trial_config/);
  assert.match(catalogPhp, /project_custom_brand_config/);

  // 2. Exactly 4 canonical systems in products_catalog.json
  const systemKeys = Object.keys(catalogObj.systems);
  assert.strictEqual(systemKeys.length, 4);
  assert.deepStrictEqual(systemKeys.sort(), ['gestao-assistencia', 'gestao-barbearia', 'gestao-beleza', 'gestao-gastro']);
  assert.doesNotMatch(catalogJson, /gestao-qa-catalogo/);

  // 3. Gestão Beleza has trial_config and project_custom_brand_config
  const bel = catalogObj.systems['gestao-beleza'];
  assert.ok(bel.trial_config);
  assert.strictEqual(bel.trial_config.enabled, true);
  assert.strictEqual(bel.trial_config.days, 7);
  assert.ok(bel.project_custom_brand_config);
  assert.strictEqual(bel.project_custom_brand_config.enabled, true);

  // 4. Gestão Gastro lifetime_plans is an object {} and NOT an array []
  const gas = catalogObj.systems['gestao-gastro'];
  assert.strictEqual(typeof gas.lifetime_plans, 'object');
  assert.strictEqual(Array.isArray(gas.lifetime_plans), false);

  // 5. Gestão Gastro canonical rules intact
  assert.strictEqual(gas.saas_recommended, true);
  assert.strictEqual(gas.standard_ml_allowed, false);
  assert.strictEqual(gas.allowed_channels.includes('mercadolivre'), false);
  assert.strictEqual(gas.allowed_commercial_models.includes('ml_lifetime'), false);
});
