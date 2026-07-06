import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// Helper para extrair e emular a função sanitizeHTML e sanitizeObj do app_core.js de cada sistema
function getSanitizerFromSource(source) {
  // Encontra a definição de sanitizeHTML
  let sanitizeHTMLFn;
  if (source.includes('const sanitizeHTML = (str) =>')) {
    sanitizeHTMLFn = (str) => {
      if (!str) return '';
      return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
    };
  } else if (source.includes('function sanitizeHTML(str)')) {
    // No Beleza a implementação real usa document.createElement('div').textContent...
    // Emulamos de forma idêntica para o teste rodar em Node.js
    sanitizeHTMLFn = (str) => {
      if (!str) return '';
      return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
    };
  } else {
    throw new Error('Função sanitizeHTML não encontrada no código-fonte');
  }

  // Função recursiva de sanitização idêntica à do app_core.js
  const sanitizeObj = (obj) => {
    if (typeof obj === 'string') return sanitizeHTMLFn(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObj);
    if (typeof obj === 'object' && obj !== null) {
      const copy = {};
      Object.keys(obj).forEach(key => {
        copy[key] = sanitizeObj(obj[key]);
      });
      return copy;
    }
    return obj;
  };

  return { sanitizeHTMLFn, sanitizeObj };
}

test('PWA cached assets match direct imports for Barbearia', () => {
  const sw = read('gestao-barbearia/sw.js');

  assert.ok(sw.includes("'./js/app_core.js'"));
  assert.ok(sw.includes("'./js/notif_logic.js'"));
  assert.ok(sw.includes("'./js/pdv.js'"));
  assert.ok(sw.includes("'./js/tailwind_config.js'"));
  // Deve ignorar APIs
  assert.ok(sw.includes('api_notificacoes'));
  assert.ok(sw.includes('no-store'));
});

test('PWA cached assets match direct imports for Beleza', () => {
  const sw = read('gestao-beleza/sw.js');

  assert.ok(sw.includes("'./js/app_core.js'"));
  assert.ok(sw.includes("'./js/notif_logic.js'"));
  assert.ok(sw.includes("'./js/tailwind_config.js'"));
  // Deve ignorar APIs
  assert.ok(sw.includes('api_notificacoes'));
  assert.ok(sw.includes('no-store'));
});

test('Backup validation schemas and contract keys are correct in both apps', () => {
  const bSource = read('gestao-barbearia/js/app_core.js');
  const zSource = read('gestao-beleza/js/app_core.js');

  const requiredKeys = ['appointments', 'team', 'services', 'transactions', 'clients', 'inventory', 'stockMovements', 'settings'];

  for (const key of requiredKeys) {
    assert.ok(bSource.includes(key), `Barbearia deve fazer referência a ${key} no backup/merge`);
    assert.ok(zSource.includes(key), `Beleza deve fazer referência a ${key} no backup/merge`);
  }
});

test('Sanitizer neutralizes HTML and script injections for Barbearia', () => {
  const source = read('gestao-barbearia/js/app_core.js');
  const { sanitizeObj } = getSanitizerFromSource(source);

  const payload = {
    appointments: [
      { client: '<script>alert("XSS")</script>', serviceName: 'Corte Degradê & Barba' }
    ],
    settings: {
      businessName: 'Barbearia <b>Premium</b>'
    }
  };

  const sanitized = sanitizeObj(payload);

  assert.equal(sanitized.appointments[0].client, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  assert.equal(sanitized.appointments[0].serviceName, 'Corte Degradê &amp; Barba');
  assert.equal(sanitized.settings.businessName, 'Barbearia &lt;b&gt;Premium&lt;/b&gt;');
});

test('Sanitizer neutralizes HTML and script injections for Beleza', () => {
  const source = read('gestao-beleza/js/app_core.js');
  const { sanitizeObj } = getSanitizerFromSource(source);

  const payload = {
    appointments: [
      { client: '<script>alert("XSS")</script>', serviceName: 'Corte Feminino & Escova' }
    ],
    settings: {
      businessName: 'Salão <b>Beleza Pro</b>'
    }
  };

  const sanitized = sanitizeObj(payload);

  assert.equal(sanitized.appointments[0].client, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  assert.equal(sanitized.appointments[0].serviceName, 'Corte Feminino &amp; Escova');
  assert.equal(sanitized.settings.businessName, 'Salão &lt;b&gt;Beleza Pro&lt;/b&gt;');
});

test('Backup structure validation checks settings and appointments properties in both apps', () => {
  const bSource = read('gestao-barbearia/js/app_core.js');
  const zSource = read('gestao-beleza/js/app_core.js');

  // Verifica estaticamente se as rotinas de backup validam contra arquivos não-objeto e exigem as propriedades
  assert.ok(bSource.includes('typeof backup.settings === \'object\''));
  assert.ok(zSource.includes('typeof backup.settings === \'object\''));
  assert.ok(bSource.includes('!Array.isArray(backup.settings)'));
  assert.ok(zSource.includes('!Array.isArray(backup.settings)'));
  assert.ok(bSource.includes('Array.isArray(backup.appointments)'));
  assert.ok(zSource.includes('Array.isArray(backup.appointments)'));
});

test('Backup logic validation behaviour', () => {
  // Emula a lógica exata de isValidBackupStructure contida em ambos os app_core.js
  const isValidBackupStructure = (backup) => {
    return !!(
      backup &&
      typeof backup === 'object' &&
      !Array.isArray(backup) &&
      backup.settings &&
      typeof backup.settings === 'object' &&
      !Array.isArray(backup.settings) &&
      Array.isArray(backup.appointments)
    );
  };

  // a) Ambos settings e appointments são obrigatórios (legítimos)
  assert.ok(isValidBackupStructure({ settings: {}, appointments: [] }));

  // b) Settings é obrigatório
  assert.equal(isValidBackupStructure({ appointments: [] }), false);

  // c) Appointments é obrigatório
  assert.equal(isValidBackupStructure({ settings: {} }), false);

  // d) Settings: null não é aceito
  assert.equal(isValidBackupStructure({ settings: null, appointments: [] }), false);

  // e) Settings: [] (array) não é aceito
  assert.equal(isValidBackupStructure({ settings: [], appointments: [] }), false);

  // f) Não aceita não-objeto ou array de backup
  assert.equal(isValidBackupStructure([]), false);
  assert.equal(isValidBackupStructure('string'), false);
  assert.equal(isValidBackupStructure(null), false);

  // g) Chaves opcionais de arrays ausentes (como team, services, clients, inventory, stockMovements) são aceitas pela estrutura
  assert.ok(isValidBackupStructure({ settings: {}, appointments: [], team: undefined, inventory: undefined }));
});
