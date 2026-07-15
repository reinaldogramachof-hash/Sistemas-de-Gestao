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

});
