-- Adicionar role 'system' ao enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'system';