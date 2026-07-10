import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('UI style helper exposes shared visual primitives', () => {
  const source = read('gestao-gastro/src/ui/styles.ts');

  for (const token of [
    'pageTitle',
    'pageSubtitle',
    'panel',
    'panelMuted',
    'input',
    'tabShell',
    'tab',
    'primaryButton',
  ]) {
    assert.ok(source.includes(token), `styles.ts deve expor ${token}`);
  }

  assert.ok(source.includes('bg-surface'), 'helpers devem usar tokens de superficie');
  assert.ok(source.includes('border-border'), 'helpers devem usar tokens de borda');
  assert.ok(source.includes('bg-accent'), 'helpers devem usar token de accent');
});

test('Layout binds the app theme to Tailwind dark variants', () => {
  const source = read('gestao-gastro/src/components/Layout.tsx');

  assert.ok(
    source.includes("isDark ? 'dark bg-app-base text-text'"),
    'Layout deve aplicar a classe dark quando o tema do app for dark'
  );
});

test('Base operational views use the shared UI helper', () => {
  for (const path of [
    'gestao-gastro/src/components/Dashboard.tsx',
    'gestao-gastro/src/components/Kitchen.tsx',
    'gestao-gastro/src/components/Tables.tsx',
  ]) {
    const source = read(path);
    assert.ok(source.includes("import { ui } from '../ui/styles'"), `${path} deve importar o helper ui`);
    assert.ok(source.includes('ui.pageTitle'), `${path} deve usar titulo padronizado`);
  }
});

test('Touched shell and base views do not contain mojibake markers', () => {
  const paths = [
    'gestao-gastro/src/App.tsx',
    'gestao-gastro/src/components/Layout.tsx',
    'gestao-gastro/src/components/Dashboard.tsx',
    'gestao-gastro/src/components/Kitchen.tsx',
    'gestao-gastro/src/components/Tables.tsx',
    'gestao-gastro/src/ui/styles.ts',
  ];

  for (const path of paths) {
    const source = read(path);
    assert.equal(/[\u00c3\u00c2\ufffd\u00f0]/.test(source), false, `${path} contem marcador de mojibake`);
  }
});
