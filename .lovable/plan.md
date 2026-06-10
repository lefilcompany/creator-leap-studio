# ADR 0002 — Frontend de Templates por Marca

Objetivo: entregar a UI de Templates ligada às edge functions `import-brand-template`, `commit-brand-template`, `delete-brand-template` e `generate-from-template` (ADR 0003), com progresso, erros e consumo de créditos consistentes com `/create-image`.

## Princípios

- **Floating board** (`bg-card`, `rounded-2xl`, raw divs), terminologia "ajustar", breadcrumbs, sem rótulo "(opcional)" — memórias do projeto.
- **Reuso visual de `/create-image`**: mesmos componentes/estilos de inputs (`Label` + `Input/Textarea`, `Popover`, `CategorySelector`, `CreditConfirmationDialog`, `BackgroundTaskProvider`, `CreationProgressBar`, `GeneratingOverlay`, `VisualStyleGrid`).
- **TDD vertical** (tracer bullets): cada hook/comp recebe 1 teste → implementação mínima → próximo. Sem horizontal slicing.

## Decisões técnicas

| Item | Decisão |
| --- | --- |
| Rasterização de PDF no client | `pdfjs-dist` + `<canvas>` → blob PNG @ 1080px na maior dimensão antes de enviar. Mantém o PDF original em `source.pdf` (base64 também enviado). |
| Editor de zonas | HTML/CSS puro com `react-rnd` (drag+resize sobre `<img>` do preview, bbox em coords relativas 0–1). Sem Konva/Fabric. |
| Fontes Google no autocomplete | Lista estática curada (top ~80 do Google Fonts) em `src/lib/googleFonts.ts`. Combobox shadcn. |
| Estado de geração | Reusa `BackgroundTaskProvider` + `GeneratingOverlay` (mesmo padrão de `/create-image`). |
| Créditos | `useCreditsAction` com `TEMPLATE_IMAGE` (4) e `CreditConfirmationDialog`. 402 → modal de compra existente. |
| Invocação | Sempre via `supabase.functions.invoke()`. |

## Estrutura de arquivos

```
src/
├── lib/
│   ├── googleFonts.ts                    # lista curada
│   └── rasterizePdf.ts                   # pdf → PNG dataURL
├── hooks/
│   ├── useBrandTemplates.ts              # list + soft-delete (React Query)
│   ├── useImportTemplate.ts              # upload → import-brand-template
│   ├── useCommitTemplate.ts              # commit-brand-template
│   └── useGenerateFromTemplate.ts        # generate-from-template + background task
├── components/marcas/templates/
│   ├── BrandTemplatesTab.tsx             # grid + header "X / 10" + CTA
│   ├── TemplateCard.tsx                  # preview + menu (ajustar/excluir)
│   ├── TemplateUploadDialog.tsx          # 4 steps (upload → processando → ajustar → confirmar)
│   ├── TemplateZoneEditor.tsx            # canvas + react-rnd
│   ├── TemplateZonePanel.tsx             # painel lateral por zona
│   └── FontPicker.tsx                    # Google + custom fonts
└── pages/
    └── CreateFromTemplate.tsx            # rota /create-from-template
```

Testes TDD (cycle por arquivo, não em bulk):
```
src/hooks/useBrandTemplates.test.ts
src/hooks/useImportTemplate.test.ts
src/hooks/useGenerateFromTemplate.test.ts
src/lib/rasterizePdf.test.ts
src/components/marcas/templates/TemplateUploadDialog.test.tsx
src/components/marcas/templates/TemplateZoneEditor.test.tsx
src/pages/CreateFromTemplate.test.tsx
```

## Comportamentos verificados (ordem dos tracer bullets)

1. `useBrandTemplates` lista templates `ready`/`draft` não deletados por `brand_id`.
2. `useBrandTemplates.softDelete(id)` chama `delete-brand-template` e invalida cache.
3. `rasterizePdf(file)` retorna `{ pngBlob, width, height }` para PDF de 1 página.
4. `useImportTemplate` rejeita arquivo > 5MB e MIME ≠ pdf/png antes da chamada.
5. `useImportTemplate` envia `mime_type`, `size_bytes`, `pdf_page_count`, `image_base64` para `import-brand-template` e retorna `{ template_id, text_zones, logo_slot, preview_url }`.
6. `useCommitTemplate` envia `text_zones` + `font_assets` ajustados.
7. `TemplateUploadDialog` percorre os 4 steps (upload → processando → ajustar → salvar) e mostra erro inline em fonte faltante.
8. `TemplateZoneEditor` permite mover/redimensionar uma zona e emite bbox normalizado 0–1.
9. `BrandTemplatesTab` mostra "X / 10" e desabilita "+ Novo template" no limite.
10. `useGenerateFromTemplate` envia `template_id`, `fills` (array `{zone_id, value}`), `background_mode`, `background_prompt?`, debita via `useCreditsAction`, registra como `BackgroundTask` e navega para `/content/:actionId` ao final.
11. `CreateFromTemplate` exibe preview ao vivo com texto sobreposto conforme o usuário digita.
12. Erro 402 abre `CreditConfirmationDialog` → modal de compra; erro 422 (compliance) renderiza `ComplianceAlert`.

## Integração com app shell

- `App.tsx`: nova rota lazy `/create-from-template` dentro do `DashboardLayout` protegido.
- `AppSidebar.tsx`: novo item "Criar a partir de template" na seção de criação.
- `BrandView.tsx`: nova aba "Templates" (`BrandTemplatesTab`), mantendo abas atuais intactas.

## Fora de escopo deste PR

- Ajuste fino de zonas no mobile (mobile só visualiza/gera; ADR já antecipa).
- Tour de onboarding dedicado.
- Migração de templates legados.

## Confirmações que preciso antes de codar

1. **Ponto de entrada do upload**: adicionar a aba "Templates" em `BrandView.tsx` (página da marca) — **confirma?** A ADR fala em `BrandDetails`, mas a página atual é `BrandView`.
2. **Editor de zonas — biblioteca**: usar `react-rnd` (leve, ~10KB) está OK, ou prefere reaproveitar algo já existente (não vi equivalente no projeto)?
3. **Preview ao vivo na página de geração**: render via `<canvas>` no client (carrega Google Fonts via `FontFace`), aceitando possível FOUT — OK?
4. **Lista de Google Fonts**: lista estática curada (~80 fontes) no bundle vs. fetch da API do Google em runtime — confirma estática?
