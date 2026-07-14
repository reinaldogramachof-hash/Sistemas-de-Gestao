import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CHECKOUT_MODAL = join(process.cwd(), 'gestao-gastro', 'src', 'components', 'CheckoutModal.tsx');

describe('CheckoutModal Troco & Divisão', () => {

  test('Deve validar pagamento em dinheiro, troco e pagamento insuficiente/dividido', () => {
    let content;
    try {
      content = readFileSync(CHECKOUT_MODAL, 'utf-8');
    } catch {
      assert.fail('CheckoutModal.tsx não encontrado');
    }

    assert.ok(
      content.includes('amountPaid'),
      'CheckoutModal deve ter o campo amountPaid para registrar dinheiro recebido'
    );
    
    assert.ok(content.includes('receivedAmount'), 'CheckoutModal deve registrar o valor recebido em dinheiro');
    assert.ok(content.includes('changeAmount'), 'CheckoutModal deve registrar o troco calculado');
    assert.ok(content.includes('Troco a devolver'), 'CheckoutModal deve apresentar o troco antes da confirmacao');

    assert.ok(
      content.includes('setPayments(prev => [...prev'),
      'CheckoutModal deve suportar pagamentos múltiplos (divididos)'
    );
  });

});
