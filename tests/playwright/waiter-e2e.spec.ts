import { test, expect } from '@playwright/test';

test.describe('E2E: Fluxo do Garçom (Waiter)', () => {

  const TENANT_SLUG = 'cantinhodaresenha';
  
  test.beforeEach(async ({ page }) => {
    // Acessa a raiz
    await page.goto(`/${TENANT_SLUG}`);
  });

  test('Garçom deve acessar apenas a comanda e ter painel administrativo bloqueado', async ({ page, context }) => {
    // 1. Validar login com usuário waiter
    await page.fill('input[type="email"]', 'garcom@cantinhodaresenha.com.br');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Aguarda redirecionamento para o dashboard
    await page.waitForURL(`**/${TENANT_SLUG}/dashboard`);

    // Como o usuário é waiter, ele deve ver a opção de acessar a Comanda, mas não deve conseguir acessar as configurações administrativas
    await expect(page.locator('text=Acesso Negado')).not.toBeVisible();
    
    // 2. Confirmar acesso apenas à rota da Comanda Mobile
    await page.click('text=Comanda Mobile');
    await page.waitForURL(`**/${TENANT_SLUG}/comanda`);
    await expect(page.locator('text=Mesas do Salão')).toBeVisible();

    // 3. Confirmar bloqueio do painel administrativo
    // Tenta acessar diretamente a URL administrativa
    await page.goto(`/${TENANT_SLUG}/settings`);
    // Deve ser redirecionado ou mostrar tela de acesso negado
    const isAccessDenied = await page.locator('text=Acesso Negado').isVisible();
    const isRedirected = page.url().includes('dashboard');
    expect(isAccessDenied || isRedirected).toBeTruthy();
  });

  test('Garçom pode criar pedido na mesa e refletir no painel (mockado)', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', 'garcom@cantinhodaresenha.com.br');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Vai para a comanda
    await page.goto(`/${TENANT_SLUG}/comanda`);
    await page.waitForLoadState('networkidle');

    // Seleciona Mesa 1
    await page.click('text=Mesa 1');
    
    // Adiciona um produto (Hamburguer)
    await page.click('text=Hamburguer');
    
    // Envia o pedido
    await page.click('button:has-text("Enviar Pedido")');

    // Confirma envio
    await expect(page.locator('text=Pedido enviado com sucesso')).toBeVisible();

    // Como não temos um segundo browser neste teste para verificar o painel em tempo real, 
    // consideramos o teste de reflexo no painel como um teste de unidade/integração separado 
    // onde verificamos se a order criada no Supabase possui o tenant correto e status "preparando".
  });
});
