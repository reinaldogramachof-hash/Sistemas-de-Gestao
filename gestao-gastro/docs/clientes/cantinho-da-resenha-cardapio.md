# Rastreabilidade de Cardápio - Cantinho da Resenha

Este documento serve como registro de rastreabilidade para o cardápio do primeiro cliente real do **Gestão Gastro**.

## Informações do Cliente no Supabase

- **customer_id:** `c032e085-f322-41d2-9487-63e58e7bfd23`
- **tenant_id:** `cd8f21f4-73a1-4c87-a385-9b6deacaeae7`
- **tenant_slug:** `cantinho-da-resenha`

## Resumo do Catálogo

- **Categorias:** 8 categorias cadastradas no banco de dados.
- **Produtos:** 50 produtos cadastrados no banco de dados.

## Observações Especiais do Catálogo

1. **Combo Chivas:** Produto configurado com preço sob consulta.
2. **Gin Dobro:** Produto configurado com promoção ativa.

---

> [!NOTE]
> **Status de Integracao:** O aplicativo `gestao-gastro` mantem fallback local para uso sem Supabase configurado, mas o fluxo de liberacao do Cantinho da Resenha ja usa Supabase Auth, `tenant_members`, cardapio online, mesas, pedidos e Realtime quando as variaveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_GASTRO_TENANT_ID` estao configuradas. Para homologacao real ainda e necessario provisionar usuarios Auth, vinculos em `tenant_members` e mesas do tenant.
