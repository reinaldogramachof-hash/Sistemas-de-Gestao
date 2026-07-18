import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const source = readFileSync(
  join(process.cwd(), 'gestao-gastro', 'src', 'components', 'UserManual.tsx'),
  'utf8',
);

test('Manual oferece as cinco rotinas curtas previstas no roadmap', () => {
  for (const routine of [
    'Abrir a operação',
    'Atender uma mesa',
    'Vender no balcão',
    'Fechar o caixa',
    'Corrigir falha de sincronização',
  ]) {
    assert.ok(source.includes(routine), `manual deve incluir a rotina ${routine}`);
  }
});

test('rotinas são filtradas simultaneamente por perfil e módulo contratado', () => {
  assert.match(source, /routine\.roles\.includes\(currentRole\) && checkAccess\(routine\.module\)/);
  assert.match(source, /Passos curtos disponíveis para \{roleLabels\[currentRole\]\}/);
});

test('procedimentos detalhados respeitam o acesso do perfil', () => {
  assert.match(source, /checkAccess\('configuracoes'\) && <div id="comanda-mobile"/);
  assert.match(source, /checkAccess\('caixa'\) && <div id="fechamento-caixa"/);
  assert.match(source, /checkAccess\('estoque'\) && <div id="estoque-receitas"/);
});
