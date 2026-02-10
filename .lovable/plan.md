

## Adicionar Avatar/Foto e Editor de Cor Identificadora na Marca

### O que vai mudar

O avatar da marca (a letra inicial colorida no header) ganha um botao de edicao (lapis). Ao clicar, abre um modal com duas funcionalidades:

1. **Amostragens de cores**: Mostra a letra inicial da marca renderizada em varios circulos com as cores disponiveis, permitindo escolher a cor identificadora visualmente
2. **Upload de foto**: Permite enviar uma imagem/logo para substituir a letra inicial, com preview e opcao de remover

---

### Detalhes do plano

#### 1. Banco de dados
- Adicionar coluna `avatar_url` (text, nullable) na tabela `brands` para armazenar a URL da foto da marca
- Criar bucket de storage `brand-avatars` (publico) para armazenar as imagens
- Adicionar politicas RLS no bucket para que usuarios autenticados possam fazer upload/delete dos seus arquivos

#### 2. Novo componente: `BrandAvatarEditor`
Um modal (Dialog) que mostra:

- **Secao de cores**: Grid com a letra inicial da marca renderizada em circulos coloridos (10 cores pre-definidas), permitindo selecionar a cor identificadora de forma visual e intuitiva
- **Secao de foto**: Area para upload de imagem com:
  - Botao para selecionar arquivo (aceita imagens ate 5MB)
  - Preview da imagem selecionada em formato circular
  - Botao para remover foto existente
- Botao "Salvar" que aplica as alteracoes

#### 3. Alteracao no `BrandView.tsx`
- Adicionar overlay com icone de lapis (Pencil) sobre o avatar da marca no header
- Ao clicar, abre o modal `BrandAvatarEditor`
- O avatar passa a mostrar a foto da marca quando disponivel, ou a letra inicial com a cor quando nao
- Integrar o upload com o bucket `brand-avatars` do storage
- Incluir `avatar_url` no fluxo de save existente

#### 4. Alteracao no `BrandList.tsx`
- Na listagem (grid e list), exibir a foto da marca quando disponivel em vez da letra inicial

#### 5. Fluxo tecnico

```text
Usuario clica no lapis do avatar
       |
       v
Abre modal BrandAvatarEditor
       |
       +-- Escolhe cor --> Atualiza preview da letra com a cor
       |
       +-- Upload foto --> Valida (imagem, <5MB)
       |                   Upload para bucket brand-avatars
       |                   Salva avatar_url na tabela brands
       |
       v
Fecha modal, avatar atualizado no header
```

#### 6. Arquivos modificados/criados
- **Novo**: `src/components/marcas/BrandAvatarEditor.tsx` - Modal de edicao
- **Migracao SQL**: Coluna `avatar_url` + bucket `brand-avatars` + politicas RLS
- **Editado**: `src/pages/BrandView.tsx` - Integrar lapis e modal no avatar do header
- **Editado**: `src/components/marcas/BrandList.tsx` - Mostrar foto da marca na listagem
- **Editado**: `src/types/brand.ts` - Adicionar campo `avatarUrl`
- **Editado**: `src/hooks/useBrands.ts` - Incluir `avatar_url` no mapeamento
