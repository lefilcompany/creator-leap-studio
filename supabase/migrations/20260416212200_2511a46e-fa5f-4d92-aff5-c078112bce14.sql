-- Tabela de templates de personas pré-prontas para o marketplace
CREATE TABLE public.persona_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  avatar_url TEXT,
  short_description TEXT,
  
  -- Campos demográficos
  gender TEXT NOT NULL,
  age TEXT NOT NULL,
  location TEXT NOT NULL,
  
  -- Campos estratégicos
  professional_context TEXT NOT NULL,
  beliefs_and_interests TEXT NOT NULL,
  content_consumption_routine TEXT NOT NULL,
  main_goal TEXT NOT NULL,
  challenges TEXT NOT NULL,
  preferred_tone_of_voice TEXT NOT NULL,
  purchase_journey_stage TEXT NOT NULL,
  interest_triggers TEXT NOT NULL,
  
  -- Controle
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.persona_templates ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode visualizar templates ativos
CREATE POLICY "Authenticated users can view active templates"
ON public.persona_templates
FOR SELECT
TO authenticated
USING (is_active = true);

-- Apenas admins do sistema podem gerenciar
CREATE POLICY "System admins can manage persona templates"
ON public.persona_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'system'::app_role))
WITH CHECK (has_role(auth.uid(), 'system'::app_role));

CREATE TRIGGER update_persona_templates_updated_at
BEFORE UPDATE ON public.persona_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_persona_templates_active_order ON public.persona_templates(is_active, display_order);

-- Seed inicial com 8 personas variadas
INSERT INTO public.persona_templates (name, category, short_description, gender, age, location, professional_context, beliefs_and_interests, content_consumption_routine, main_goal, challenges, preferred_tone_of_voice, purchase_journey_stage, interest_triggers, display_order) VALUES
('Mariana, a Empreendedora Digital', 'Negócios', 'Dona de pequeno e-commerce buscando crescer no online', 'Feminino', '32 anos', 'São Paulo, SP', 'Empreendedora digital com loja virtual de moda. Trabalha sozinha, gerencia tudo do estoque ao marketing.', 'Acredita em independência financeira, valoriza marcas autênticas, gosta de empreendedorismo, produtividade e moda sustentável.', 'Consome Instagram e TikTok no início e fim do dia. Ouve podcasts de negócios no carro. Newsletter pela manhã.', 'Aumentar faturamento da loja em 40% e construir marca pessoal forte no Instagram.', 'Falta de tempo, dificuldade com tráfego pago, ansiedade com flutuações de venda.', 'Inspirador e prático, com tom de mentora amiga', 'Consideração', 'Cases de sucesso, dicas de produtividade, ofertas com escassez real, conteúdo sobre escalar negócio', 1),
('Carlos, o Pai de Família', 'Família', 'Pai dedicado buscando equilíbrio entre carreira e família', 'Masculino', '38 anos', 'Curitiba, PR', 'Gerente de TI em multinacional. Trabalha home office 3x por semana. Casado, dois filhos pequenos.', 'Família em primeiro lugar, valoriza segurança financeira, gosta de tecnologia, churrasco e futebol.', 'WhatsApp e YouTube à noite após colocar filhos para dormir. Notícias pela manhã.', 'Garantir educação de qualidade aos filhos e construir reserva financeira sólida.', 'Pouco tempo livre, cansaço, dificuldade de equilibrar trabalho remoto e família.', 'Direto, confiável, com toque familiar', 'Decisão', 'Promoções de produtos para casa, conteúdo educativo familiar, dicas práticas, garantia estendida', 2),
('Júlia, a Universitária Conectada', 'Jovem', 'Estudante universitária antenada em tendências', 'Feminino', '21 anos', 'Belo Horizonte, MG', 'Estudante de Publicidade, faz estágio em agência. Mora com amigas em república.', 'Diversidade, sustentabilidade, saúde mental, K-pop, séries e cafeterias instagramáveis.', 'TikTok e Instagram o dia inteiro. Spotify durante estudos. Twitter para opiniões.', 'Construir portfólio profissional e ter experiências marcantes na vida.', 'Orçamento apertado, ansiedade com futuro profissional, FOMO.', 'Descontraído, autêntico, com gírias da geração Z', 'Descoberta', 'Trends do TikTok, descontos estudantis, causas sociais, lançamentos exclusivos', 3),
('Roberto, o Executivo Maduro', 'Corporativo', 'Diretor experiente focado em qualidade de vida', 'Masculino', '52 anos', 'Rio de Janeiro, RJ', 'Diretor comercial em grande empresa. Viaja a trabalho. Filhos já adultos.', 'Saúde e longevidade, vinhos, golfe, leitura de não-ficção, investimentos.', 'LinkedIn pela manhã, jornais digitais (Valor, Estadão), podcasts de negócios em viagens.', 'Planejar transição para conselheiro de empresas e ter mais tempo para hobbies.', 'Estresse acumulado, preocupação com saúde, gestão de equipe remota.', 'Sofisticado, informativo, com profundidade', 'Consideração', 'Conteúdo premium, networking de alto nível, experiências exclusivas, análises aprofundadas', 4),
('Amanda, a Mãe Wellness', 'Saúde', 'Mãe que prioriza bem-estar e alimentação consciente', 'Feminino', '35 anos', 'Florianópolis, SC', 'Nutricionista funcional autônoma. Atende em consultório próprio. Mãe de dois.', 'Alimentação natural, yoga, maternidade respeitosa, produtos orgânicos, autoconhecimento.', 'Instagram (Reels) durante intervalos. Podcasts de saúde durante caminhadas.', 'Expandir clientela e lançar curso online sobre alimentação infantil.', 'Conciliar atendimentos com filhos, marketing pessoal, precificação dos serviços.', 'Acolhedor, educativo, baseado em evidência', 'Descoberta', 'Receitas saudáveis, dicas de maternidade, produtos naturais, conteúdo de bem-estar mental', 5),
('Lucas, o Tech Lover', 'Tecnologia', 'Entusiasta de tecnologia e early adopter', 'Masculino', '28 anos', 'São Paulo, SP', 'Desenvolvedor full-stack em startup. Mora sozinho em apartamento conectado.', 'Tecnologia, gaming, ficção científica, criptomoedas, productividade hacks.', 'YouTube, Twitter/X, Reddit, Discord. Newsletters tech pela manhã.', 'Avançar para Tech Lead em 2 anos e construir patrimônio em ativos digitais.', 'Síndrome do impostor, sedentarismo, dificuldade de desconectar do trabalho.', 'Técnico mas acessível, com humor nerd', 'Consideração', 'Lançamentos de gadgets, reviews aprofundadas, descontos em ferramentas dev, conteúdo sobre IA', 6),
('Patrícia, a Aposentada Ativa', 'Sênior', 'Aposentada que descobriu o digital e quer aproveitar a vida', 'Feminino', '64 anos', 'Porto Alegre, RS', 'Aposentada do serviço público. Faz aquarela, viaja com amigas, cuida dos netos.', 'Família, viagens, artesanato, jardinagem, qualidade de vida na terceira idade.', 'WhatsApp e Facebook ao longo do dia. TV aberta à noite. Áudios de podcast aos poucos.', 'Viajar pela América do Sul e deixar memórias para os netos.', 'Insegurança com tecnologia, golpes online, preço de medicamentos.', 'Carinhoso, claro, paciente e respeitoso', 'Decisão', 'Promoções de viagem, produtos de saúde, conteúdo familiar, atendimento humanizado', 7),
('Pedro, o Pequeno Comerciante', 'Negócios', 'Dono de comércio local buscando modernização', 'Masculino', '45 anos', 'Recife, PE', 'Dono de mercadinho de bairro há 15 anos. Mulher ajuda no caixa, dois filhos adolescentes.', 'Trabalho duro, fé, comunidade do bairro, futebol e churrasco com vizinhos.', 'WhatsApp o dia todo (negócios e família). YouTube à noite. Rádio durante o trabalho.', 'Modernizar o mercado, oferecer entrega via app e fidelizar clientes do bairro.', 'Dificuldade com tecnologia, concorrência de grandes redes, margem apertada.', 'Próximo, simples, sem jargões', 'Descoberta', 'Promoções regionais, conteúdo sobre gestão prática, sistemas simples e baratos', 8);