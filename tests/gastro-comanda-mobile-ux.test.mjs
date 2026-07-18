import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('UX & Accessibility - index.css Comanda Mobile isolated classes', () => {
  const css = read('gestao-gastro/src/index.css');
  const app = read('gestao-gastro/src/components/ComandaMobileApp.tsx');
  const login = read('gestao-gastro/src/components/GarcomLogin.tsx');

  // 1. Deve possuir a classe .comanda-mobile isolando as regras dos inputs
  assert.ok(css.includes('.comanda-mobile input') && css.includes('.comanda-mobile textarea'), 'index.css deve isolar estilos de formulários móveis sob a classe comanda-mobile');
  assert.ok(app.includes('<div className="comanda-mobile">'), 'fluxo autenticado deve permanecer sob o escopo comanda-mobile');
  assert.ok(login.includes('className="comanda-mobile '), 'login do garçom deve permanecer sob o escopo comanda-mobile');

  // 2. Deve conter a regra de mídia para forçar 16px no mobile prevenindo zoom automático no iOS
  assert.ok(
    css.includes('@media (max-width: 767px)') && css.includes('font-size: 16px !important'),
    'index.css deve forçar fontes de 16px para inputs e textareas em resoluções mobile (< 768px)'
  );

  // 3. Deve conter as regras de prevenção de seleção acidental e double-tap zoom
  assert.ok(
    css.includes('touch-action: manipulation') && css.includes('user-select: none'),
    'index.css deve configurar touch-action: manipulation e user-select: none sob a comanda-mobile'
  );

  // 4. Deve conter a classe de rolagem horizontal inercial (.scroll-x-touch)
  assert.ok(
    css.includes('.scroll-x-touch') && css.includes('-webkit-overflow-scrolling: touch'),
    'index.css deve possuir a classe .scroll-x-touch com rolagem inercial webkit'
  );
});

test('UX & Accessibility - ComandaLancamento.tsx target sizes and ARIA rules', () => {
  const code = read('gestao-gastro/src/components/ComandaLancamento.tsx');

  // 1. Deve usar a classe .scroll-x-touch para as categorias de produtos
  assert.ok(
    code.includes('scroll-x-touch'),
    'ComandaLancamento.tsx deve utilizar a classe scroll-x-touch para rolagem fluida'
  );

  // 2. Os botões de quantidade de produtos devem ter tamanho mínimo confortável de 44px (w-11 h-11)
  assert.ok(
    code.includes('w-11 h-11 rounded-lg bg-slate-700') && code.includes('w-11 h-11 rounded-lg border border-gray-200'),
    'ComandaLancamento.tsx deve possuir botões de quantidade redimensionados para w-11 h-11 (44px)'
  );

  // 3. Deve possuir atributos de acessibilidade semântica (aria-label)
  assert.ok(
    code.includes('aria-label={`Aumentar quantidade de ${product.name}`}') &&
    code.includes('aria-label={`Diminuir quantidade de ${product.name}`}'),
    'ComandaLancamento.tsx deve aplicar aria-label descritivo aos botões de incremento/decremento'
  );

  // 4. Deve desativar o botão de decremento quando a quantidade for zero
  assert.ok(
    code.includes('disabled={!draftItem || draftItem.quantity === 0}'),
    'ComandaLancamento.tsx deve desativar semanticamente o botão de decremento se a quantidade for 0'
  );
});

test('UX & Accessibility - ComandaConfirmacao.tsx CounterInput button sizes', () => {
  const code = read('gestao-gastro/src/components/ComandaConfirmacao.tsx');

  // 1. Botões de CounterInput (pessoas) devem ter tamanho de 44px (h-11 w-11)
  assert.ok(
    code.includes('h-11 w-11 rounded-lg border border-gray-200') &&
    code.includes('h-11 w-11 rounded-lg bg-slate-700'),
    'ComandaConfirmacao.tsx deve ter botões de quantidade de pessoas redimensionados para 44px (w-11 h-11)'
  );

  // 2. Deve possuir aria-label explicativo nos botões de pessoas
  assert.ok(
    code.includes('aria-label={`Aumentar quantidade de ${label}`}') &&
    code.includes('aria-label={`Diminuir quantidade de ${label}`}'),
    'ComandaConfirmacao.tsx deve aplicar aria-label de acessibilidade descritiva'
  );
});

test('UX & Accessibility - ComandaMesaGrid.tsx filters layout and ARIA rules', () => {
  const code = read('gestao-gastro/src/components/ComandaMesaGrid.tsx');

  // 1. Deve usar o carrossel horizontal de rolagem (.scroll-x-touch) em vez de grid cols
  assert.ok(
    code.includes('flex') && code.includes('overflow-x-auto') && code.includes('scroll-x-touch'),
    'ComandaMesaGrid.tsx deve converter filtros de mesas de grid para carrossel horizontal contínuo'
  );

  // 2. Os botões de filtros devem possuir largura mínima e não-recuo de tamanho
  assert.ok(
    code.includes('shrink-0 min-w-[8rem]'),
    'ComandaMesaGrid.tsx deve fixar shrink-0 e min-w-[8rem] nos botões do filtro'
  );

  // 3. Deve declarar o grupo e label para leitores de tela
  assert.ok(
    code.includes('role="group"') && code.includes('aria-label="Filtrar mesas por situação"'),
    'ComandaMesaGrid.tsx deve conter atributos role="group" e aria-label no container de filtros'
  );

  // 4. Cada botão de filtro deve refletir seu estado pressionado
  assert.ok(
    code.includes('aria-pressed={statusFilter === filter}'),
    'ComandaMesaGrid.tsx deve declarar aria-pressed para indicar o filtro ativo'
  );
});
