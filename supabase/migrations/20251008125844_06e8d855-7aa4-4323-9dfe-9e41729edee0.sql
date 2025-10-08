
-- Primeiro, deletar as equipes com nome "a"
DELETE FROM teams WHERE name = 'a';

-- Depois, deletar os perfis dos usuários (isso também remove de auth.users devido ao cascade)
DELETE FROM auth.users 
WHERE id IN (
  SELECT id FROM profiles 
  WHERE name IN ('a', 'b', 'c', 'd', 'ca', 'j', 'e', 'l', 'f')
);
