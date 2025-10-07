
-- Remove roles de admin dos usuários que não devem ser admin na equipe LeFil
-- Apenas emanuel.rodrigues@lefil.com.br deve permanecer como admin
DELETE FROM user_roles
WHERE user_id IN (
  '61bedf0f-28f6-4431-9eff-68cb0a9d6ae2',  -- emanuel.rodrigues1@lefil.com.br
  '74cbdcb2-2374-4d10-ab18-d4390bac1293',  -- sinara.vasconcelos@lefil.com.br
  '7a360882-b750-434d-9cde-31c7e38337d7'   -- vinicius.souza.ext@lefil.com.br
)
AND role = 'admin';
