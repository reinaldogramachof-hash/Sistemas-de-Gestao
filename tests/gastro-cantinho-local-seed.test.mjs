import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Cantinho da Resenha has a faithful local fallback menu for homologation', () => {
  const seed = read('gestao-gastro/src/store/cantinhoDaResenhaSeed.ts');

  assert.match(seed, /cantinhoDaResenhaProducts/);
  assert.match(seed, /\['Torresmo', 48\.90\]/);
  assert.match(seed, /\['Gin Dobro \(promoção\)', 20, true/);
  assert.match(seed, /\['Combo Chivas', 0, false, 'Consultar valor\.'/);
  assert.equal((seed.match(/\['Porções'|\['Espetinhos'|\['Acompanhamentos'|\['Bebidas'|\['Cervejas'|\['Drinks'|\['Doses'|\['Combos de Destilados'/g) ?? []).length, 8);
});

test('AppContext selects the client menu only for the Cantinho route and preserves saved data', () => {
  const context = read('gestao-gastro/src/store/AppContext.tsx');

  assert.match(context, /getClientSlugFromPath\(window\.location\.pathname\) === CANTINHO_DA_RESENHA_SLUG/);
  assert.match(context, /\? cantinhoDaResenhaProducts/);
  assert.match(context, /parseJSON\('products', initialProductsFallback\)/);
  assert.match(context, /isSaaS && !isCantinhoRoute \? \[\] : defaultProducts/);
  assert.match(context, /\[supabaseOnline\]/);
  assert.match(context, /activeProducts\.length === 0/);
});
