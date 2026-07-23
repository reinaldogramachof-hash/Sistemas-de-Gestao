import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Fase 2: api_licenca_ml.php contains register_evolution_lead and list_evolution_leads', () => {
  const apiSource = read('api_licenca_ml.php');

  // Verify route register_evolution_lead
  assert.match(apiSource, /action === 'register_evolution_lead'/);
  assert.match(apiSource, /evolution_leads\.json/);

  // Verify route list_evolution_leads and update_evolution_lead_status are secret-protected
  assert.match(apiSource, /action === 'list_evolution_leads'/);
  assert.match(apiSource, /action === 'update_evolution_lead_status'/);
  assert.match(apiSource, /validateSecret\(\$jsonData, \$ADMIN_SECRET\)/);
});

test('Fase 2: All three systems call register_evolution_lead in their evolution toast/click trigger', () => {
  const barbeariaCore = read('gestao-barbearia/js/app_core.js');
  const belezaCore = read('gestao-beleza/js/app_core.js');
  const assistenciaEvolution = read('gestao-assistencia/assets/js/modules/evolution.js');

  assert.match(barbeariaCore, /register_evolution_lead/);
  assert.match(belezaCore, /register_evolution_lead/);
  assert.match(assistenciaEvolution, /register_evolution_lead/);

  assert.match(barbeariaCore, /system_id:\s*['"]gestao-barbearia['"]/);
  assert.match(belezaCore, /system_id:\s*['"]gestao-beleza['"]/);
  assert.match(assistenciaEvolution, /system_id:\s*['"]gestao-assistencia['"]/);
});

test('Fase 2: gestao-assistencia has evolution menu and view', () => {
  const assistenciaHtml = read('gestao-assistencia/index.html');
  const assistenciaRouter = read('gestao-assistencia/assets/js/router.js');

  assert.match(assistenciaHtml, /id="nav-evolution"/);
  assert.match(assistenciaHtml, /id="view-evolution"/);
  assert.match(assistenciaHtml, /evolution\.js/);
  assert.match(assistenciaRouter, /case 'evolution':/);
});

test('Fase 2: admin has leads tab and leads table', () => {
  const adminHtml = read('admin/index.html');

  assert.match(adminHtml, /id="tab-leads"/);
  assert.match(adminHtml, /id="leads-table"/);
  assert.match(adminHtml, /loadEvolutionLeads/);
  assert.match(adminHtml, /updateEvolutionLeadStatus/);
});

test('Fase 2: Leads registration does not write to the secure licenses database', () => {
  const apiSource = read('api_licenca_ml.php');

  // Find where register_evolution_lead action is handled
  const startIdx = apiSource.indexOf("action === 'register_evolution_lead'");
  const endIdx = apiSource.indexOf("action === 'list_evolution_leads'");

  assert.ok(startIdx > -1);
  assert.ok(endIdx > -1);

  const actionBlock = apiSource.slice(startIdx, endIdx);
  // It should NOT save using $fileLicenses
  assert.equal(actionBlock.includes('saveDB($fileLicenses'), false);
  // It should save using $fileEvolutionLeads
  assert.match(actionBlock, /saveDB\(\$fileEvolutionLeads/);
});

test('Fase 2.1: admin does not use onchange inline handler for leads status select dropdown', () => {
  const adminHtml = read('admin/index.html');

  // Verify there is no onchange="updateEvolutionLeadStatus(...)" inline attribute on selects
  assert.equal(adminHtml.includes('onchange="updateEvolutionLeadStatus'), false);

  // Verify it uses event listeners instead
  assert.match(adminHtml, /lead-status-select/);
  assert.match(adminHtml, /\.querySelectorAll\('\.lead-status-select'\)/);
  assert.match(adminHtml, /\.addEventListener\('change'/);
});

test('Fase 2.1: showEvolutionToast does not use alert() in all three systems', () => {
  const barbeariaCore = read('gestao-barbearia/js/app_core.js');
  const belezaCore = read('gestao-beleza/js/app_core.js');
  const assistenciaEvolution = read('gestao-assistencia/assets/js/modules/evolution.js');

  const extractToastFunc = (source) => {
    const idx = source.indexOf('function showEvolutionToast');
    if (idx === -1) return '';
    return source.slice(idx, idx + 1500);
  };

  const bToast = extractToastFunc(barbeariaCore);
  const lToast = extractToastFunc(belezaCore);
  const aToast = extractToastFunc(assistenciaEvolution);

  // Verificações de existência
  assert.ok(bToast.length > 0, 'showEvolutionToast should exist in barbearia');
  assert.ok(lToast.length > 0, 'showEvolutionToast should exist in beleza');
  assert.ok(aToast.length > 0, 'showEvolutionToast should exist in assistencia');
  // NENHUMA delas deve conter chamada a alert()
  assert.equal(bToast.includes('alert('), false, 'barbearia should not use alert() in evolution flow');
  assert.equal(lToast.includes('alert('), false, 'beleza should not use alert() in evolution flow');
  assert.equal(aToast.includes('alert('), false, 'assistencia should not use alert() in evolution flow');
});

test('Fase 3: api_licenca_ml.php update_evolution_lead_status accepts 6 funnel statuses', () => {
  const apiSource = read('api_licenca_ml.php');

  // Verify $allowedStatuses contains all 6 statuses
  assert.match(apiSource, /'novo',\s*'contatado',\s*'proposta_enviada',\s*'convertido',\s*'perdido',\s*'descartado'/);
});

test('Fase 3: api_licenca_ml.php has update_evolution_lead_fields protected by ADMIN_SECRET', () => {
  const apiSource = read('api_licenca_ml.php');

  // Verify update_evolution_lead_fields exists
  assert.match(apiSource, /action === 'update_evolution_lead_fields'/);

  // Find where update_evolution_lead_fields is defined and verify validateSecret is used
  const startIdx = apiSource.indexOf("action === 'update_evolution_lead_fields'");
  assert.ok(startIdx > -1);
  const block = apiSource.slice(startIdx, startIdx + 500);
  assert.match(block, /validateSecret\(\$jsonData,\s*\$ADMIN_SECRET\)/);
});

test('Fase 3: register_evolution_lead does not accept notes, owner, next_contact_at or contact_channel in payload', () => {
  const apiSource = read('api_licenca_ml.php');

  const startIdx = apiSource.indexOf("action === 'register_evolution_lead'");
  const endIdx = apiSource.indexOf("action === 'list_evolution_leads'");
  assert.ok(startIdx > -1);
  assert.ok(endIdx > -1);

  const block = apiSource.slice(startIdx, endIdx);

  // It should NOT try to bind these fields from $jsonData
  assert.equal(block.includes("['notes']"), false, 'register_evolution_lead must not parse notes');
  assert.equal(block.includes("['owner']"), false, 'register_evolution_lead must not parse owner');
  assert.equal(block.includes("['next_contact_at']"), false, 'register_evolution_lead must not parse next_contact_at');
  assert.equal(block.includes("['contact_channel']"), false, 'register_evolution_lead must not parse contact_channel');
});

test('Fase 3.1: update_evolution_lead_fields rejects invalid status in payload', () => {
  const apiSource = read('api_licenca_ml.php');

  const startIdx = apiSource.indexOf("action === 'update_evolution_lead_fields'");
  assert.ok(startIdx > -1);
  const block = apiSource.slice(startIdx, startIdx + 1500);

  // Deve validar status e retornar 'Status inválido'
  assert.match(block, /'Status inválido'/);
});

test('Fase B.2: evolution centers in all three systems exhibit commercial plans, CTAs and compatible payload', () => {
  const barbearia = read('gestao-barbearia/js/app_core.js');
  const beleza = read('gestao-beleza/js/app_core.js');
  const assistencia = read('gestao-assistencia/assets/js/modules/evolution.js');

  const systems = [
    { name: 'Barbearia', code: barbearia, priceEss: '59,90', pricePrem: '99,00' },
    { name: 'Beleza', code: beleza, priceEss: '59,90', pricePrem: '99,00' },
    { name: 'Assistência', code: assistencia, priceEss: '97,90', pricePrem: '149,90' },
  ];

  for (const sys of systems) {
    // Validação da vitrine comercial
    assert.match(sys.code, /Licença Vitalícia Local/, `${sys.name} deve conter 'Licença Vitalícia Local'`);
    assert.match(sys.code, /Online Essencial/, `${sys.name} deve conter 'Online Essencial'`);
    assert.match(sys.code, /Online Premium/, `${sys.name} deve conter 'Online Premium'`);
    assert.match(sys.code, /Solicitar Evolução do Sistema/, `${sys.name} deve conter CTA 'Solicitar Evolução do Sistema'`);
    assert.match(sys.code, /Tenho interesse/, `${sys.name} deve conter botão 'Tenho interesse'`);

    // Validação dos preços aprovados
    assert.match(sys.code, new RegExp(sys.priceEss.replace(',', '\\,')), `${sys.name} deve conter preço essencial R$ ${sys.priceEss}`);
    assert.match(sys.code, new RegExp(sys.pricePrem.replace(',', '\\,')), `${sys.name} deve conter preço premium R$ ${sys.pricePrem}`);

    // Chamada à API register_evolution_lead
    assert.match(sys.code, /register_evolution_lead/, `${sys.name} deve chamar register_evolution_lead`);

    // Payload compatível
    assert.match(sys.code, /license_key:/, `${sys.name} payload deve incluir license_key`);
    assert.match(sys.code, /email:/, `${sys.name} payload deve incluir email`);
    assert.match(sys.code, /system_id:/, `${sys.name} payload deve incluir system_id`);
    assert.match(sys.code, /feature_key:/, `${sys.name} payload deve incluir feature_key`);
    assert.match(sys.code, /feature_title:/, `${sys.name} payload deve incluir feature_title`);
    assert.match(sys.code, /source:/, `${sys.name} payload deve incluir source`);

    // Bloqueio de alert()
    const toastIdx = sys.code.indexOf('function showEvolutionToast');
    assert.ok(toastIdx > -1, `${sys.name} deve possuir showEvolutionToast`);
    const toastFunc = sys.code.slice(toastIdx, toastIdx + 1600);
    assert.equal(toastFunc.includes('alert('), false, `${sys.name} não deve usar alert() no fluxo de evolução`);
  }
});

test('Fase B.3: register_evolution_lead sanitizes commercial metadata and blocks admin fields', () => {
  const apiSource = read('api_licenca_ml.php');

  const startIdx = apiSource.indexOf("if ($action === 'register_evolution_lead') {");
  const endIdx = apiSource.indexOf("if ($action === 'list_evolution_leads') {");
  assert.ok(startIdx > -1);
  assert.ok(endIdx > -1);

  const block = apiSource.slice(startIdx, endIdx);

  // Deve sanitizar campos comerciais
  assert.match(block, /interest_type/, 'deve processar interest_type');
  assert.match(block, /current_plan_code/, 'deve processar current_plan_code');
  assert.match(block, /target_plan_code/, 'deve processar target_plan_code');

  // Deve validar contra whitelists
  assert.match(block, /plan_upgrade/, 'deve incluir whitelist plan_upgrade');
  assert.match(block, /feature_interest/, 'deve incluir whitelist feature_interest');
  assert.match(block, /ml_lifetime/, 'deve incluir whitelist ml_lifetime');

  // NÃO deve ler nem permitir escrita de campos administrativos pelo endpoint público
  assert.equal(block.includes("$jsonData['notes']"), false, 'register_evolution_lead não deve ler notes do payload público');
  assert.equal(block.includes("$jsonData['owner']"), false, 'register_evolution_lead não deve ler owner do payload público');
  assert.equal(block.includes("$jsonData['next_contact_at']"), false, 'register_evolution_lead não deve ler next_contact_at do payload público');
  assert.equal(block.includes("$jsonData['contact_channel']"), false, 'register_evolution_lead não deve ler contact_channel do payload público');
  assert.equal(block.includes("$jsonData['status']"), false, 'register_evolution_lead não deve permitir status via payload público');
});

test('Fase B.3: client systems include interest_type, current_plan_code, and target_plan_code in payload', () => {
  const barbearia = read('gestao-barbearia/js/app_core.js');
  const beleza = read('gestao-beleza/js/app_core.js');
  const assistencia = read('gestao-assistencia/assets/js/modules/evolution.js');

  const systems = [
    { name: 'Barbearia', code: barbearia },
    { name: 'Beleza', code: beleza },
    { name: 'Assistência', code: assistencia },
  ];

  for (const sys of systems) {
    assert.match(sys.code, /interest_type:/, `${sys.name} payload deve enviar interest_type`);
    assert.match(sys.code, /current_plan_code:/, `${sys.name} payload deve enviar current_plan_code`);
    assert.match(sys.code, /target_plan_code:/, `${sys.name} payload deve enviar target_plan_code`);
  }
});

test('Fase B.6: public payload captures customer_name, customer_whatsapp and contact_consent safely', () => {
  const apiSource = read('api_licenca_ml.php');
  const barbearia = read('gestao-barbearia/js/app_core.js');
  const beleza = read('gestao-beleza/js/app_core.js');
  const assistencia = read('gestao-assistencia/assets/js/modules/evolution.js');

  const startIdx = apiSource.indexOf("if ($action === 'register_evolution_lead') {");
  const endIdx = apiSource.indexOf("if ($action === 'list_evolution_leads') {");
  assert.ok(startIdx > -1);
  assert.ok(endIdx > -1);

  const block = apiSource.slice(startIdx, endIdx);

  // Sanitização e processamento dos novos campos
  assert.match(block, /customer_name/, 'deve processar customer_name');
  assert.match(block, /customer_whatsapp/, 'deve processar customer_whatsapp');
  assert.match(block, /contact_consent/, 'deve processar contact_consent');

  // Sanitização de WhatsApp (apenas dígitos e +)
  assert.match(block, /preg_replace\('\/\[\^\\d\+\]\/', '',/, 'deve sanitizar telefone mantendo apenas digitos e +');

  // Os sistemas clientes devem enviar os novos campos
  const systems = [
    { name: 'Barbearia', code: barbearia },
    { name: 'Beleza', code: beleza },
    { name: 'Assistência', code: assistencia },
  ];

  for (const sys of systems) {
    assert.match(sys.code, /customer_name:/, `${sys.name} deve enviar customer_name`);
    assert.match(sys.code, /customer_whatsapp:/, `${sys.name} deve enviar customer_whatsapp`);
    assert.match(sys.code, /contact_consent:/, `${sys.name} deve enviar contact_consent`);
  }
});
