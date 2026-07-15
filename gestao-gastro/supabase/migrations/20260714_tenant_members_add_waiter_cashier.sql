-- Migration: 20260714_tenant_members_add_waiter_cashier.sql
-- Objetivo: Adicionar os papeis 'waiter' e 'cashier' a constraint de role
-- sem remover os papeis existentes (owner, admin, operator, viewer).
--
-- INSTRUCOES PARA O ARQUITETO:
-- Aplique manualmente no painel SQL do Supabase (SQL Editor):
--   1. Copie e execute o bloco abaixo no tenant/projeto correto.
--   2. Confirme que nenhuma linha em tenant_members ficou com role invalido.
--   3. Esta migracao e idempotente via DROP IF EXISTS + ADD CONSTRAINT.

-- 1. Remove a constraint antiga (pelo nome padrao gerado pelo Supabase/Postgres)
ALTER TABLE public.tenant_members
  DROP CONSTRAINT IF EXISTS tenant_members_role_check;

-- 2. Recria com o conjunto completo de papeis
ALTER TABLE public.tenant_members
  ADD CONSTRAINT tenant_members_role_check
    CHECK (role IN ('owner', 'admin', 'operator', 'viewer', 'waiter', 'cashier'));

-- 3. Verificacao pos-aplicacao (execute e confirme 0 linhas)
-- SELECT id, role FROM public.tenant_members
--   WHERE role NOT IN ('owner', 'admin', 'operator', 'viewer', 'waiter', 'cashier');
