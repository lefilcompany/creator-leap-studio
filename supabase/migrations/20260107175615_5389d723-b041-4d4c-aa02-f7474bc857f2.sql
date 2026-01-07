-- Política para admins verem todos os logs do sistema (já existe, mas vamos garantir)
-- A tabela system_logs já tem política para admins

-- Política para admins verem todo histórico de créditos
CREATE POLICY "Admins can view all credit history" 
ON public.credit_history 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Política para admins verem todas as ações
CREATE POLICY "Admins can view all actions" 
ON public.actions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));