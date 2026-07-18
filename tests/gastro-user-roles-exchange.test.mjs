import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Backend Auth - api_admin_users.php validates access scope', () => {
  const code = read('api_admin_users.php');

  // 1. Deve declarar a action validate_member_access e suportar required_role 'team'
  assert.ok(
    code.includes("action === 'validate_member_access'"),
    'api_admin_users.php deve implementar a action validate_member_access'
  );

  // 2. Deve aceitar explicitamente owner, admin, cashier e waiter
  assert.ok(
    code.includes("allowedRoles = ['owner', 'admin', 'cashier', 'waiter']") ||
    (code.includes('owner') && code.includes('admin') && code.includes('cashier') && code.includes('waiter')),
    'api_admin_users.php deve possuir a lista de cargos permitidos'
  );

});

test('Frontend Auth - AdminAuthGate.tsx uses PHP endpoint and sessionStorage', () => {
  const code = read('gestao-gastro/src/components/AdminAuthGate.tsx');

  // 1. Deve chamar a action validate_member_access com required_role 'team'
  assert.ok(
    code.includes('validate_member_access') && code.includes("'team'"),
    'AdminAuthGate.tsx deve autenticar chamando o endpoint PHP com required_role team'
  );

  // 2. Deve salvar as credenciais no sessionStorage
  assert.ok(
    code.includes("sessionStorage.setItem('gestao_gastro_user_role'") &&
    code.includes("sessionStorage.setItem('gestao_gastro_user_name'"),
    'AdminAuthGate.tsx deve persistir role e name no sessionStorage para segurança de abas'
  );

  // 3. Deve atualizar de forma reativa o currentUser do contexto React no login
  assert.ok(
    code.includes('setCurrentUser({') &&
    code.includes('role: member.role'),
    'AdminAuthGate.tsx deve propagar reativamente o novo papel ao currentUser do contexto'
  );

  // 4. Deve fazer signOut com escopo local para não desconectar outras máquinas
  assert.ok(
    code.includes("signOut({ scope: 'local' })"),
    'AdminAuthGate.tsx deve deslogar com escopo local'
  );

  assert.ok(
    code.includes("sessionStorage.removeItem('gestao_gastro_user_role')") &&
    code.includes("sessionStorage.removeItem('gestao_gastro_user_name')"),
    'AdminAuthGate.tsx deve limpar cargo e nome da sessao anterior'
  );
});

test('Frontend Auth - ComandaMobileApp.tsx supports all roles and signOut local', () => {
  const code = read('gestao-gastro/src/components/ComandaMobileApp.tsx');

  // 1. Deve chamar a action com required_role 'team'
  assert.ok(
    code.includes("'team'"),
    'ComandaMobileApp.tsx deve validar acesso usando required_role team'
  );

  // 2. Deve autorizar os quatro papéis
  assert.ok(
    code.includes("allowedRoles = ['owner', 'admin', 'cashier', 'waiter']"),
    'ComandaMobileApp.tsx deve aceitar os 4 cargos do restaurante'
  );

  // 3. Deve deslogar com escopo local no logout
  assert.ok(
    !code.includes('supabase.auth.signOut()') &&
    code.includes("signOut({ scope: 'local' })"),
    'ComandaMobileApp.tsx deve executar apenas signOut local'
  );
});

test('Frontend Auth - useModules.ts propagates roles reactively', () => {
  const code = read('gestao-gastro/src/hooks/useModules.ts');

  // 1. Não deve ler do localStorage como fonte de papel de autorização principal
  assert.ok(
    !code.includes('storedRole = (currentUser.role || localStorage.getItem(USER_ROLE_KEY))'),
    'useModules.ts não deve usar localStorage como fonte de autorização persistente'
  );

  // 2. Deve propagar reativamente com base em [currentUser.role]
  assert.ok(
    code.includes('currentUser.role') && code.includes('}, [currentUser.role]);'),
    'useModules.ts deve monitorar de forma puramente reativa o papel do currentUser.role'
  );
});

test('Frontend Logout - Layout.tsx resets session safely in finally block and intercepts drafts', () => {
  const code = read('gestao-gastro/src/components/Layout.tsx');

  // 1. Deve executar o signOut com escopo local
  assert.ok(
    code.includes("signOut({ scope: 'local' })"),
    'Layout.tsx deve fazer o signOut com escopo local'
  );

  // 2. Deve limpar as chaves locais no bloco finally
  assert.ok(
    code.includes('finally {') &&
    code.includes("localStorage.removeItem('gestao_gastro_user_name')") &&
    code.includes("sessionStorage.removeItem('gestao_gastro_user_name')") &&
    code.includes("sessionStorage.removeItem('gestao_gastro_user_role')") &&
    code.includes("sessionStorage.removeItem('garcom_session')"),
    'Layout.tsx deve fazer a limpeza local de sessões e cargos sob o bloco finally do logout'
  );

  // 3. Deve verificar rascunho de vendas em andamento (draftOrder) e pedir confirmação antes de descartar
  assert.ok(
    code.includes('draftOrder') &&
    code.includes('clearDraftOrder()') &&
    code.includes('confirm'),
    'Layout.tsx deve pedir confirmação e limpar o draftOrder se houver venda pendente no logout'
  );
});
