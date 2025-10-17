# Guia de Tradução do Sistema

## Sistema de Internacionalização (i18n)

O site agora suporta 8 idiomas:
- 🇧🇷 Português (pt) - Padrão
- 🇺🇸 Inglês (en)
- 🇪🇸 Espanhol (es)
- 🇩🇪 Alemão (de)
- 🇫🇷 Francês (fr)
- 🇮🇹 Italiano (it)
- 🇷🇺 Russo (ru)
- 🇨🇳 Chinês (zh)

## Como Funciona

### 1. Contexto de Idioma
O idioma é gerenciado pelo `LanguageProvider` em `src/contexts/LanguageContext.tsx`

### 2. Hook de Tradução
Use o hook `useTranslation()` em qualquer componente:

```tsx
import { useTranslation } from '@/hooks/useTranslation';

const MyComponent = () => {
  const { t, language } = useTranslation();
  
  return <h1>{t.dashboard.welcome}</h1>;
};
```

### 3. Arquivo de Traduções
Todas as traduções estão em `src/lib/translations.ts`

## Componentes Traduzidos

✅ **Header** - 100% traduzido
✅ **Sidebar** - 100% traduzido  
✅ **Login** - 100% traduzido
✅ **Register** - 100% traduzido
✅ **Dashboard** - 100% traduzido

## Como Adicionar Traduções a Novos Componentes

1. Adicione as chaves no arquivo `src/lib/translations.ts`:

```typescript
export const translations = {
  pt: {
    mySection: {
      title: "Meu Título",
      description: "Minha descrição"
    }
  },
  en: {
    mySection: {
      title: "My Title",
      description: "My description"
    }
  },
  // ... outros idiomas
};
```

2. Use no componente:

```tsx
const { t } = useTranslation();

<h1>{t.mySection.title}</h1>
<p>{t.mySection.description}</p>
```

## Componentes Pendentes de Tradução

Os seguintes componentes ainda precisam ser traduzidos:
- [ ] ForgotPassword
- [ ] ResetPassword
- [ ] CreateContent
- [ ] QuickContent
- [ ] PlanContent
- [ ] ReviewContent
- [ ] Brands
- [ ] Personas
- [ ] Themes
- [ ] History
- [ ] Profile
- [ ] Team
- [ ] Plans
- [ ] About
- [ ] Privacy

## Nota

Os textos inseridos pelo usuário (dados, marcas, personas, etc.) NÃO são traduzidos - apenas a interface do sistema.
