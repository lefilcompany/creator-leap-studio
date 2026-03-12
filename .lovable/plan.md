

## Problem

The `allowReselectToClear` approach using `onPointerDown` on Radix UI `SelectItem` doesn't work reliably — Radix intercepts pointer events internally, so clicking the already-selected item doesn't trigger the clear.

## Solution

Replace the `onPointerDown` hack with the Radix-recommended pattern: add a visible "Nenhuma/Nenhum" clear option with a sentinel value (`"__none__"`) at the top of the dropdown. When selected, it clears the value. This is simple, reliable, and requires no event hacking.

## Changes

### 1. `src/components/ui/native-select.tsx`
- Remove `allowReselectToClear` prop and all `onPointerDown` logic
- Add a new prop `showClearOption?: boolean` with a `clearLabel?: string` (default "Nenhum")
- When `showClearOption` is true and a value is selected, render a `SelectItem` with value `"__none__"` at the top of the list styled as muted text
- In `onValueChange`, map `"__none__"` to `onValueChange?.("")`

### 2. `src/pages/CreateImage.tsx`
- Replace `allowReselectToClear` with `showClearOption` on the Marca, Persona, and Tema selects
- Set `clearLabel="Nenhuma"` for Marca/Persona, `clearLabel="Nenhum"` for Tema
- Remove any `{ value: "", label: "Nenhuma" }` manual entries from options arrays

### 3. `src/pages/QuickContent.tsx`
- Apply the same `showClearOption` prop to the Marca, Persona, and Tema selects for consistency

