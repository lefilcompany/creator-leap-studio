-- Preencher campos vazios em personas legadas (criadas antes do marketplace)
UPDATE personas SET 
  preferred_tone_of_voice = 'Inspirador, acolhedor e prático, com tom de mentora amiga',
  purchase_journey_stage = 'Descoberta'
WHERE id = '8ef29540-038c-4afe-810c-34882467e37a';

UPDATE personas SET 
  preferred_tone_of_voice = 'Próximo, motivacional e prático, com linguagem simples',
  purchase_journey_stage = 'Consideração'
WHERE id = '99d636ed-ccf9-4c9b-88f2-adaa4c0038eb';

UPDATE personas SET 
  preferred_tone_of_voice = 'Estratégico, empoderador e profissional',
  purchase_journey_stage = 'Decisão'
WHERE id = '66004060-df30-4f58-b3b5-da87f03db4f6';

UPDATE personas SET 
  preferred_tone_of_voice = 'Acolhedor, próximo e motivacional',
  purchase_journey_stage = 'Consideração'
WHERE id = '8b8a8a41-db08-4dc0-ac6f-0a9c5b9fb6e7';

UPDATE personas SET 
  preferred_tone_of_voice = 'Acolhedor, próximo e motivacional',
  purchase_journey_stage = 'Consideração'
WHERE id = 'dbb9d7d6-4863-45bf-8181-1e6bccd7fd54';

UPDATE personas SET 
  preferred_tone_of_voice = 'Direto, confiável e próximo',
  purchase_journey_stage = 'Consideração'
WHERE id = '3202c781-6898-459e-9ac0-e714059dd1ca';

UPDATE personas SET 
  purchase_journey_stage = 'Descoberta'
WHERE id = '0e555437-be67-47c4-b32c-b9b79dd0596c';

UPDATE personas SET 
  purchase_journey_stage = 'Consideração'
WHERE id = '079516ec-8dec-4450-8a3b-62666cf54f7e';