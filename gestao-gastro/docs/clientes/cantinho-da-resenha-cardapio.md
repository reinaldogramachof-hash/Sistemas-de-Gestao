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
> **Status de Integração:** O aplicativo `gestao-gastro` atualmente opera no modelo *Local-First* utilizando `localStorage` e dados simulados (`mock.ts`) para garantir a velocidade e funcionamento offline total do plano básico. Nesta etapa de liberação, o sistema local **ainda não consome** o banco de dados Supabase de forma automática. A sincronização automática e o consumo direto do Supabase estão agendados para a próxima fase evolutiva do ecossistema.
