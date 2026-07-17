import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const API_ADMIN = join(process.cwd(), 'api_admin_users.php');

describe('Collaborators Contract — api_admin_users.php', () => {

  test('Deve validar corretamente a criacao no auth e resgatar o user_id', () => {
    let content;
    try {
      content = readFileSync(API_ADMIN, 'utf-8');
    } catch {
      assert.fail('api_admin_users.php não encontrado');
    }

    assert.ok(
      content.includes('$newUserId = $userRes[\'data\'][\'id\']'),
      'api_admin_users.php deve extrair user_id do data.id na criação via admin api'
    );

    assert.ok(
      content.includes('$userRes[\'code\'] >= 400') || content.includes('$userRes[\'code\'] === 200'),
      'api_admin_users.php deve tratar códigos de sucesso e erro corretamente (200/201 etc)'
    );

    assert.ok(
      content.includes('http_response_code(500)'),
      'api_admin_users.php deve retornar 500 caso ocorra falha interna e o id nao for obtido'
    );
  });

  test('Deve permitir atualizar acesso de colaborador com senha opcional', () => {
    const content = readFileSync(API_ADMIN, 'utf-8');

    assert.ok(
      content.includes("if ($action === 'update_member')"),
      'api_admin_users.php deve expor a acao update_member'
    );

    assert.ok(
      content.includes("'/auth/v1/admin/users/' . urlencode($targetUserId)"),
      'update_member deve atualizar metadados/senha no Auth Admin'
    );

    assert.ok(
      content.includes("$authPayload['password'] = $password"),
      'update_member deve permitir redefinir senha quando informada'
    );

    assert.ok(
      content.includes("$authPayload['email_confirm'] = true"),
      'update_member deve confirmar e-mail ao redefinir senha'
    );

    assert.ok(
      content.includes("'display_name' => $name") && content.includes("'role' => $role") && content.includes("'active' => $active"),
      'update_member deve persistir nome, funcao e status em tenant_members'
    );
  });

  test('Deve atualizar senha quando reaproveitar usuario Auth existente sem vinculo', () => {
    const content = readFileSync(API_ADMIN, 'utf-8');

    assert.ok(
      content.includes('Se nao tem vinculo, atualiza a senha informada'),
      'create_member deve tratar usuario Auth existente sem vinculo'
    );

    assert.ok(
      content.includes('$existingUpdateRes = supabase_admin_request') &&
      content.includes("'password' => $password") &&
      content.includes("'email_confirm' => true"),
      'create_member deve atualizar senha e confirmar e-mail antes de vincular usuario existente'
    );
  });

});
