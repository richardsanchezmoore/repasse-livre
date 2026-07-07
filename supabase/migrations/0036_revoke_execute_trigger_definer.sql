-- Security Advisor: 2 warnings "Public/Signed-In Users Can Execute SECURITY
-- DEFINER Function" em public.handle_novo_usuario().
--
-- Essa função é a TRIGGER que cria o perfil no 1º login (on_auth_user_created
-- em auth.users). Por padrão o Postgres concede EXECUTE a PUBLIC em toda função;
-- como ela é SECURITY DEFINER (roda com privilégio do dono), o advisor pede que
-- ela NÃO seja chamável direto pela API REST. Revogar o EXECUTE de
-- public/anon/authenticated NÃO afeta a trigger — triggers disparam junto do
-- insert, independem de grant pro papel que autentica.
revoke execute on function public.handle_novo_usuario() from public;
revoke execute on function public.handle_novo_usuario() from anon;
revoke execute on function public.handle_novo_usuario() from authenticated;
