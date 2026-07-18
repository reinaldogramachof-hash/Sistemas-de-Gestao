import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSupportDiagnostic } from '../gestao-gastro/src/utils/supportDiagnostic';

const diagnostic = buildSupportDiagnostic({
  generatedAt: '2026-07-18T12:00:00.000Z',
  appVersion: '1.0.0',
  route: '/gestao-gastro/cantinho-da-resenha/suporte',
  tenantId: 'tenant-cantinho',
  tenantName: 'Cantinho da Resenha',
  userRole: 'cashier',
  plan: 'base',
  modules: ['PDV', 'Mesas/Comanda', 'Caixa'],
  browserOnline: true,
  supabaseOnline: false,
  pwaInstalled: true,
  serviceWorkerControlled: true,
});

test('gera diagnóstico operacional compreensível e copiável', () => {
  assert.match(diagnostic, /Gestão Gastro — Diagnóstico de suporte/);
  assert.match(diagnostic, /Cantinho da Resenha/);
  assert.match(diagnostic, /Módulos visíveis: PDV, Mesas\/Comanda, Caixa/);
  assert.match(diagnostic, /Navegador online: sim/);
  assert.match(diagnostic, /Sincronização remota: indisponível/);
  assert.match(diagnostic, /PWA instalado: sim/);
});

test('não inclui campos sensíveis nem conteúdo de sessão', () => {
  assert.doesNotMatch(diagnostic, /\b(password|senha|token|authorization|license_key|localStorage|sessionStorage)\b/i);
});

test('normaliza quebras de linha recebidas nos campos', () => {
  const normalized = buildSupportDiagnostic({
    generatedAt: 'agora',
    appVersion: '1.0.0',
    route: '/suporte\nAuthorization: Bearer indevido',
    tenantId: 'tenant',
    tenantName: 'Restaurante',
    userRole: 'admin',
    plan: 'base',
    modules: [],
    browserOnline: false,
    supabaseOnline: false,
    pwaInstalled: false,
    serviceWorkerControlled: false,
  });

  assert.doesNotMatch(normalized, /Bearer indevido/);
  assert.match(normalized, /Authorization: \[removido\]/);
  assert.match(normalized, /Módulos visíveis: nenhum/);
});
