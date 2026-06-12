# Domain documentation layout

This repository uses a **single-context** layout. There is one `CONTEXT.md` at the repository root and one set of ADRs under `docs/adr/`. No `CONTEXT-MAP.md` is needed.

## Files

* `CONTEXT.md` — domain glossary and high-level architecture. The agent must read this before any implementation.
* `docs/adr/NNNN-title.md` — architectural decision records. Currently:
  * `0001-templates-backend.md`
  * `0002-templates-frontend.md`
  * `0003-templates-ai-agent.md`
* `docs/agents/*.md` — operational guides that AGENTS.md cross-links from each relevant section.

## When to update CONTEXT.md

Update the glossary when any of the following happens:

* A new domain term is introduced or an existing term is renamed.
* A user-facing label canonicalizes a new term (e.g. "Calendário de Conteúdo" replacing "Planejar conteúdo").
* A new bounded context (feature folder + edge function group) is added.
* A new system role or authorization boundary is created.
* A new persisted entity is created and exposed to the product (a new table that the UI reads or writes).

Do **not** add to `CONTEXT.md`:

* Implementation details (file paths beyond a top-level pointer, function bodies, prompt strings).
* Decisions and trade-offs — those go in an ADR.
* Temporary notes, scratch work or change history.

`CONTEXT.md` is a glossary and an architecture map. Keep it pure.

## When to write an ADR

Create a new ADR under `docs/adr/NNNN-title.md` only if all three are true:

1. **Hard to reverse** — undoing the decision later would be expensive.
2. **Surprising without context** — a future reader will wonder "why did we do it this way?".
3. **Result of a real trade-off** — there were genuine alternatives and one was chosen for specific reasons.

If any of the three is missing, skip the ADR.

## Naming conventions

* ADR filenames: `NNNN-kebab-case-title.md` with `NNNN` zero-padded to 4 digits, incrementing from the highest existing number.
* Agent guides: `docs/agents/kebab-case.md`.
* Domain terms in `CONTEXT.md`: title case section headers, `code term` in backticks at the end of the definition.

## Vocabulary discipline

When a user, issue or PR uses a term that conflicts with `CONTEXT.md`, call it out and either:

* Align the request to the glossary, or
* Update the glossary in the same change (with justification in the PR description).

Do not silently accept synonyms. Synonyms erode the shared language.
