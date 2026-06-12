# Triage and issues

This project does not yet have a strict GitHub issue automation. The conventions below keep the workflow lightweight and compatible with future automation.

## Issue conventions

* Title in present tense, action-oriented: "Add credit cost to template import", "Fix breadcrumb hiding on mobile".
* Body must include:
  * **Context** — which feature, page or edge function is affected.
  * **Expected behavior** — what should happen.
  * **Actual behavior** — what is happening today.
  * **Reproduction** — steps, URL, account profile (free / paid).
  * **Domain references** — link to `CONTEXT.md` terms and to any relevant ADR.
* Sensitive data (real emails, phone numbers, payment IDs, brand assets) must **never** appear in issue bodies. Use IDs.

## Suggested labels

Optional, lightweight vocabulary:

* `needs-triage` — needs maintainer evaluation.
* `needs-info` — waiting on reporter.
* `ready-for-agent` — fully specified, AFK-ready (an agent can pick it up with no human context).
* `ready-for-human` — needs human implementation.
* `wontfix` — will not be actioned.

Use these consistently if you adopt them. If your repo already uses different label names, map them here so the labels you apply match what is actually configured.

## ADRs

ADRs live under `docs/adr/NNNN-title.md` with `NNNN` zero-padded to four digits. Current ADRs:

* `0001-templates-backend.md`
* `0002-templates-frontend.md`
* `0003-templates-ai-agent.md`

### When to write an ADR

Create an ADR only if all three are true:

1. **Hard to reverse** — undoing the decision later would be expensive.
2. **Surprising without context** — a future reader will wonder "why did we do it this way?".
3. **Result of a real trade-off** — there were genuine alternatives and one was chosen for specific reasons.

If any of the three is missing, skip the ADR.

### ADR shape

```markdown
# NNNN — <Decision title>

## Status
Proposed | Accepted | Superseded by NNNN

## Context
What forces are at play, what constraints exist, what we knew at the time.

## Decision
What we decided to do, in plain prose.

## Consequences
What becomes easier, what becomes harder, what we accept as a cost.

## Alternatives considered
Brief description of the options we rejected and why.
```

## Issue → PR flow

1. Read `CONTEXT.md` and the relevant `docs/agents/*.md` files.
2. Read the affected feature module and existing tests.
3. Apply the stop rule (AGENTS.md §7.1) for any ambiguity before writing code.
4. Implement following the per-bounded-context guidelines in AGENTS.md §13.
5. Run the minimum relevant test set (`docs/agents/testing.md`).
6. In the PR description, reference the issue, list domain rules preserved, tests executed and remaining risks.
