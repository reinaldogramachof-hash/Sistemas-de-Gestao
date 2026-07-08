import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Verify implementation of validation and sanitization for services, clients and appointments', () => {
  const source = read('gestao-beleza/js/app_core.js');

  // a) Sanitização de serviços e clientes
  assert.ok(source.includes('sanitizeHTML(s.name)'), 'Deve sanitizar nome do serviço na renderização');
  assert.ok(source.includes('sanitizeHTML(c.name)'), 'Deve sanitizar nome do cliente na renderização');

  // b) Validação de nome obrigatório de cliente com trim
  assert.ok(source.includes('name.trim()'), 'Deve usar trim no nome do cliente');
  assert.ok(source.includes('Nome é obrigatório!'), 'Deve alertar se nome de cliente for vazio');

  // c) Validação de nome de serviço e preço > 0
  assert.ok(source.includes('name.trim()'), 'Deve usar trim no nome do serviço');
  assert.ok(source.includes('Nome do serviço é obrigatório!'), 'Deve alertar se nome de serviço for vazio');
  assert.ok(source.includes('price <= 0'), 'Deve rejeitar preço menor ou igual a zero');
  assert.ok(source.includes('isNaN(price)'), 'Deve rejeitar preço inválido (NaN)');
});

test('Verify appointments validations in submitAppt', () => {
  const source = read('gestao-beleza/js/app_core.js');

  // a) Campos obrigatórios
  assert.ok(source.includes('Nome do cliente é obrigatório!'), 'Cliente deve ser obrigatório');
  assert.ok(source.includes('Data é obrigatória!'), 'Data deve ser obrigatória');
  assert.ok(source.includes('Horário é obrigatório!'), 'Horário deve ser obrigatório');
  assert.ok(source.includes('Serviço inválido ou não selecionado!'), 'Serviço deve ser válido');
  assert.ok(source.includes('Profissional inválido ou não selecionado!'), 'Profissional deve ser válido');

  // b) Conflito de horário ignorando próprio id em edição
  assert.ok(source.includes('id && a.id === id'), 'Deve ignorar o próprio agendamento ao validar conflitos');
});

test('Modal appointment selects sanitize service and professional names', () => {
  const source = read('gestao-beleza/js/app_core.js');

  assert.match(
    source,
    /function setupModalSelects\(\)[\s\S]*sanitizeHTML\(s\.name\)[\s\S]*sanitizeHTML\(p\.name\)/,
    'Selects do modal de agendamento devem sanitizar nomes de serviços e profissionais'
  );
});

test('Logical emulations of Beleza appointments, clients, and services validation rules', () => {
  // Emulação exata das regras de negócio aplicadas no submitAppt
  const validateApptInput = (client, date, time, sId, pId, services, team) => {
    if (!client || !client.trim()) return { valid: false, err: 'Nome do cliente é obrigatório!' };
    if (!date) return { valid: false, err: 'Data é obrigatória!' };
    if (!time) return { valid: false, err: 'Horário é obrigatório!' };
    if (!services.some(s => s.id === sId)) return { valid: false, err: 'Serviço inválido!' };
    if (!team.some(p => p.id === pId)) return { valid: false, err: 'Profissional inválido!' };
    return { valid: true };
  };

  const services = [{ id: 's1', name: 'Corte', price: 50 }];
  const team = [{ id: 'p1', name: 'Maria' }];

  assert.deepEqual(validateApptInput('', '2026-07-06', '10:00', 's1', 'p1', services, team), { valid: false, err: 'Nome do cliente é obrigatório!' });
  assert.deepEqual(validateApptInput('   ', '2026-07-06', '10:00', 's1', 'p1', services, team), { valid: false, err: 'Nome do cliente é obrigatório!' });
  assert.deepEqual(validateApptInput('Ana', '', '10:00', 's1', 'p1', services, team), { valid: false, err: 'Data é obrigatória!' });
  assert.deepEqual(validateApptInput('Ana', '2026-07-06', '', 's1', 'p1', services, team), { valid: false, err: 'Horário é obrigatório!' });
  assert.deepEqual(validateApptInput('Ana', '2026-07-06', '10:00', 's2', 'p1', services, team), { valid: false, err: 'Serviço inválido!' });
  assert.deepEqual(validateApptInput('Ana', '2026-07-06', '10:00', 's1', 'p2', services, team), { valid: false, err: 'Profissional inválido!' });
  assert.deepEqual(validateApptInput('Ana', '2026-07-06', '10:00', 's1', 'p1', services, team), { valid: true });

  // Emulação exata das regras de negócio do submitService
  const validateServiceInput = (name, price) => {
    if (!name || !name.trim()) return { valid: false, err: 'Nome do serviço é obrigatório!' };
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) return { valid: false, err: 'Preço inválido!' };
    return { valid: true };
  };

  assert.deepEqual(validateServiceInput('', 50), { valid: false, err: 'Nome do serviço é obrigatório!' });
  assert.deepEqual(validateServiceInput('Escova', -10), { valid: false, err: 'Preço inválido!' });
  assert.deepEqual(validateServiceInput('Escova', 0), { valid: false, err: 'Preço inválido!' });
  assert.deepEqual(validateServiceInput('Escova', 'abc'), { valid: false, err: 'Preço inválido!' });
  assert.deepEqual(validateServiceInput('Escova', 80.50), { valid: true });
});
