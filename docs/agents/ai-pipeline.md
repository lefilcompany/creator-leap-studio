# AI pipeline

All generative AI runs through **Google Gemini**, called from edge functions via `supabase/functions/_shared/geminiClient.ts`. The Gemini API key is server-side only.

## Context philosophy

Two layered prompts:

1. **Master Prompt — Intent capture.** Translates the user's briefing, brand, persona and theme into a precise creative intent (what to communicate, to whom, in which format, with which constraints).
2. **Art Director — Enrichment.** Transforms the intent into photographic / typographic specs (lighting, camera angle, composition, color grading, typography weight and scale, hero hierarchy). Lives in `_shared/imagePromptBuilder.ts` and related modules.

The split keeps domain reasoning (Master Prompt) separate from craft reasoning (Art Director) and makes both independently testable.

## Image generation pipeline v5

For single images and per-slide carousel generation:

1. **Brief expansion** — `expandBriefing.ts` enriches the user's short brief with brand voice, persona language and active theme.
2. **Prompt build** — `imagePromptBuilder.ts` assembles the final prompt with Art Director enrichment, reference images and brand style feedback.
3. **Compliance pre-check** — `complianceCheck.ts` scans the planned prompt against Brazilian legal guardrails (CONAR, food, finance, medical, alcohol, children). Blocks or rewrites prompts that would yield non-compliant output.
4. **Image generation** — Gemini image model produces the asset.
5. **Vision pass for caption** — the generated image is sent back to Gemini Vision, which produces the suggested caption that actually matches what the image shows (Title, Body, CTA, 5 hashtags).
6. **Compliance post-check** — `complianceCheck.ts` re-runs against the rendered image. On violation, an **image-to-image auto-correction** pass is attempted before failing.
7. **Post-process** — `imagePostProcess.ts` handles format, resizing and watermarking.
8. **Credit consumption** — `consume_workspace_credits` is called only now, with a meaningful `p_action_type`.
9. **Persist action** — row inserted in `public.actions` with `ActionType`, `details`, `result`, `parentActionId` (for slides/regenerations).

## Fidelity guardrail

When the user supplies reference images, the main subject is **immutable**:

* Product, logo or person in the reference must appear unchanged in the output.
* The Art Director enrichment can change lighting, environment, framing and typography, but not the subject's identity.

Modes:

* **Standard mode** — reference image biases composition and style; subject preserved.
* **Marketplace mode** — 100% product fidelity for e-commerce-style montages. The product image is composited rather than re-imagined.
* **Professional ad mode** — hierarchical layout with a **Headline Hero** zone taking 30-40% of the canvas, supporting subline and CTA below.

The mapping from visual references to prompt instructions must be explicit. Never let the model infer that a reference is "inspiration" only — it is binding.

## Text on image

* Font size between **12 px and 36 px** on the rendered canvas.
* Maximum **50 characters** per text overlay.
* Typography choices follow the brand's tokens when available, falling back to the LLM Refiner's principles for legibility (contrast ratio, weight hierarchy, safe margins).
* Text is rendered via `_shared/textOverlay.ts` when overlay precision is required; the rest is part of the Gemini image prompt.

## Brand-style feedback loop

For each brand, the system tracks which generated results the user approved. The **top 3 approved recipes** (composition + palette + typography signals) are reinjected as references in subsequent prompts to anchor visual consistency over time. This is what `mem://features/learning/brand-style-feedback-system` describes — keep the loop intact when modifying generation flows.

## Compliance moderation

`_shared/complianceCheck.ts` enforces:

* No political marketing content under any circumstance.
* CONAR rules and Brazilian advertising law for sensitive categories (alcohol, tobacco, medication, finance, food, children).
* No misleading claims, no medical guarantees, no health miracle promises.
* No content that violates the brand's `restrictions` field.

On violation, the pipeline attempts image-to-image auto-correction first. Only if auto-correction fails does the function return an error to the user — and even then, the error message is generic (no leaked prompt fragments).

## Templates (ADRs 0001-0003)

The template subsystem is its own AI pipeline:

1. **Import** (`import-brand-template`, 3 credits) — Vision analyzes the uploaded PDF/image, extracts editable zones, isolates background via inpainting, identifies fonts.
2. **Commit** (`commit-brand-template`) — user-confirmed template persisted.
3. **Generate** (`generate-from-template`) — renders a variation with new text/image/background while preserving the locked zones.

Shared modules: `templateAi`, `templateVision`, `templateInpainting`, `templateBackground`, `templateCanvas`, `templateFontCache`.

## Carousel orchestration

`generate-carousel-images` is a **pure orchestrator**:

* It calls `generate-image` once per slide, passing the same payload (`preserveImages`, `styleReferenceImages`, `brandReferenceImages`, `aspectRatio`, `visualStyle`, `contentType`) with `parentActionId` linking slides to the carousel parent.
* It manages slide status (`pending → generating → done/error`) and refund/regen policy.
* It makes **one** direct Gemini call: `generateCarouselCaption` for the connecting caption.

Do not move per-slide generation logic back into the orchestrator. The split is what guarantees that a slide and a standalone single image look the same.

## Models in use

Gemini models are selected per task in `_shared/geminiClient.ts` (see `mem://infrastructure/google-gemini-direct-integration` for the current list). Do not introduce another provider without an ADR.

## Forbidden

* Political marketing content.
* Hardcoding model names or API keys outside `geminiClient.ts`.
* Inlining long prompt strings in handlers — use the builder modules.
* Skipping compliance check on user-facing creatives.
* Breaking the image-first → Vision-for-caption order (captions must describe the actual generated image).
* Making `generate-carousel-images` call Gemini directly for slides.
