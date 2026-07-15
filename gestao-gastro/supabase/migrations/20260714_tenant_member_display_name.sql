-- Mantem o nome exibido da equipe no proprio vinculo do tenant.
ALTER TABLE public.tenant_members
  ADD COLUMN IF NOT EXISTS display_name text;

-- Recupera nomes de membros ja criados a partir dos metadados do Supabase Auth.
UPDATE public.tenant_members AS member
SET display_name = COALESCE(
  NULLIF(auth_user.raw_user_meta_data ->> 'display_name', ''),
  NULLIF(auth_user.raw_user_meta_data ->> 'name', ''),
  split_part(auth_user.email, '@', 1)
)
FROM auth.users AS auth_user
WHERE member.user_id = auth_user.id
  AND member.display_name IS NULL;
