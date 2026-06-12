# UI conventions

## Floating board layout

The canonical surface for dashboards, creation flows and results is a **floating board**:

```tsx
<div className="bg-card rounded-2xl shadow-xl p-6 md:p-8">
  {/* content */}
</div>
```

* Use raw `div` with utility classes. Prefer **not** to use the `Card` shadcn component when building floating surfaces.
* Background: `bg-card`. Rounding: `rounded-2xl`. Elevation: `shadow-xl`.
* Internal padding: `p-6` on mobile, `p-8` on desktop.

## Page shell

* The dashboard layout is set up so the page is `overflow-hidden` and content is constrained to the dashboard viewport.
* Creation and result pages use `max-w-7xl` with fluid sidebars (see `CreateImage` for the reference implementation).
* New creation modes must visually match `CreateImage` for input parity (same field grouping, same input components, same spacing).

## Breadcrumbs

* Replace back buttons with breadcrumbs (`PageBreadcrumb`).
* Breadcrumbs are hidden on mobile.

## Colors and tokens

* Color, gradient and shadow values are semantic design tokens defined in `src/index.css`.
* Use tokens: `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `bg-primary`, `bg-secondary`, `bg-accent`, `bg-muted`, `bg-destructive`, `border`, `ring`.
* **Never** hardcode colors: `text-white`, `bg-black`, `bg-[#xxxxxx]`, `text-red-500` are all forbidden in feature components. They bypass theming and break dark mode.

## Terminology in copy

* "Ajustar" / "Ajuste", **never** "Revisar" / "Revisão", when talking about refining a result.
* "Calendário de Conteúdo", **never** "Planejar conteúdo".
* "Marca", "Persona", "Crédito", "Cupom".
* **Never** label a field with "(opcional)". Optionality is conveyed by the absence of the required asterisk.

## Result pages

* Result pages use glassmorphism: `backdrop-blur-2xl` with semi-transparent backgrounds.
* Action cards use a single consolidated status badge — `Approved` or `Pending`.
* Caption blocks render Title, Body, CTA and exactly 5 hashtags.

## Dashboard recent activity

* `DashboardRecentActivity` uses **Embla Carousel** with `dragFree: true`.
* Exactly 6 items are displayed at a time.

## Forms

* React Hook Form + Zod resolver.
* Inputs use shadcn primitives (`Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`).
* Validation errors render below the input in `text-destructive`.
* Drafts persist via `useDraftForm` / `useFormPersistence` when the user benefits from recovery.

## Toasts

* Use Sonner (`import { toast } from "sonner"`).
* Stable toast IDs for replaceable messages (e.g. `toast.success(..., { id: "pending-coupon" })`).

## Loading states

* Page-level: `PageLoader` inside `<Suspense fallback>`.
* Inline: skeletons (`ContentResultSkeleton`, etc.).
* Generation: `GeneratingOverlay` + `CreationProgressBar` for AI flows.

## Chatbot

* `PlatformChatbot` is themed with the Sparkles icon (`lucide-react`).
* Full-screen on mobile, anchored panel on desktop.

## Forbidden UI patterns

* Using `Card` for floating boards instead of `bg-card rounded-2xl shadow-xl` raw divs.
* Hardcoded color utilities in feature components.
* "Revisar" / "Revisão" in UI copy.
* "(opcional)" labels on form fields.
* Back buttons where breadcrumbs are expected.
* Removing the Sparkles theming on the chatbot.
* Replacing the Embla `dragFree` carousel with a different paging mechanism on the recent-activity strip.
