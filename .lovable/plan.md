

## Refatorar carrossel de Atividade Recente usando Embla Carousel

### Contexto
O projeto ja possui a biblioteca `embla-carousel-react` instalada e o componente shadcn `Carousel` (`src/components/ui/carousel.tsx`) pronto para uso. O Embla e reconhecido como a melhor lib de carrossel para React, com arrasto suave nativo, momentum integrado e precisao de swipe superior.

Atualmente, o carrossel usa um hook customizado `useDragScroll` com logica manual de pointer events e momentum via `requestAnimationFrame`. Isso e fragil e inferior ao que o Embla oferece nativamente.

### Solucao
Substituir toda a logica manual de drag/scroll pelo Embla Carousel usando o modo `dragFree`, que oferece:
- Arrasto com momentum suave nativo (sem codigo manual de fisica)
- Precisao de swipe em touch devices
- Performance otimizada com GPU compositing
- Snap opcional e loop

### Arquivo alterado
`src/components/dashboard/DashboardRecentActivity.tsx`

### O que muda

**1. Remover o hook `useDragScroll` inteiro**
Toda a logica de pointer events, velocity, momentum e friction sera removida (~80 linhas).

**2. Usar `useEmblaCarousel` com `dragFree: true`**
```typescript
import useEmblaCarousel from 'embla-carousel-react';

const [emblaRef, emblaApi] = useEmblaCarousel({
  dragFree: true,
  containScroll: 'trimSnaps',
  align: 'start',
});
```

**3. Botoes de navegacao usam a API do Embla**
```typescript
const scroll = (dir: 'left' | 'right') => {
  if (!emblaApi) return;
  if (dir === 'left') emblaApi.scrollPrev();
  else emblaApi.scrollNext();
};
```

**4. Controle de canScrollLeft/canScrollRight via eventos Embla**
```typescript
useEffect(() => {
  if (!emblaApi) return;
  const onSelect = () => {
    setCanScrollLeft(emblaApi.canScrollPrev());
    setCanScrollRight(emblaApi.canScrollNext());
  };
  emblaApi.on('select', onSelect);
  emblaApi.on('reInit', onSelect);
  onSelect();
  return () => {
    emblaApi.off('select', onSelect);
    emblaApi.off('reInit', onSelect);
  };
}, [emblaApi]);
```

**5. Prevenir clique apos arrasto**
O Embla emite eventos que permitem detectar se houve arrasto, usado para bloquear o `navigate()`:
```typescript
const [clickAllowed, setClickAllowed] = useState(true);

useEffect(() => {
  if (!emblaApi) return;
  emblaApi.on('pointerDown', () => setClickAllowed(true));
  emblaApi.on('pointerUp', () => {
    // Se o embla detectou drag significativo, bloqueia clique
    if (emblaApi.internalEngine().dragHandler.pointerDown()) return;
    setClickAllowed(!emblaApi.internalEngine().scrollBody.velocity());
  });
}, [emblaApi]);
```

**6. Estrutura HTML do Embla**
```html
<div ref={emblaRef} className="overflow-hidden cursor-grab active:cursor-grabbing">
  <div className="flex gap-3">
    {activities.map(activity => (
      <div className="shrink-0 w-[200px] sm:w-[220px]">
        <!-- card atual mantido identico -->
      </div>
    ))}
  </div>
</div>
```

### O que permanece igual
- Visual dos cards (imagem, icone, tipo, marca, titulo, data relativa)
- Skeleton loading
- Estado vazio
- Botoes de setas no header
- Animacoes de entrada com framer-motion
- Funcao `getImageUrl` com suporte a base64
- Toda a estrutura do Card wrapper

### Beneficios
- Arrasto com momentum suave e natural (testado em milhares de projetos)
- Zero logica manual de fisica - tudo gerenciado pelo Embla
- Funciona perfeitamente em mobile, tablet e desktop
- Reducao de ~80 linhas de codigo customizado
- Usa uma dependencia que ja esta instalada no projeto

