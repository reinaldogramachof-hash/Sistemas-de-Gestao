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
