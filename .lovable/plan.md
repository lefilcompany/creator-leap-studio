
# Fix Sidebar Collapsed State Alignment

## Problem
The collapsed sidebar icons are visually misaligned -- they appear pushed to the left instead of being centered. The credits button at the bottom also doesn't align properly with the white content board.

## Root Cause
- The sidebar collapsed width (`SIDEBAR_WIDTH_ICON`) is set to `3rem` (48px), which is too narrow for the icon buttons with their padding (`p-2.5` = 10px each side + 20px icon = 40px min).
- The nav container uses `px-1` (4px) padding, leaving almost no breathing room and causing visual misalignment.

## Solution

### 1. Increase collapsed sidebar width (`sidebar.tsx`)
- Change `SIDEBAR_WIDTH_ICON` from `"3rem"` to `"3.5rem"` (56px) to give icons proper centering space.

### 2. Fix nav container padding (`AppSidebar.tsx`)
- Change collapsed padding from `px-1` to `px-2` to properly center items within the wider sidebar.

### 3. Align credits button bottom margin (`AppSidebar.tsx`)
- Adjust the credits container bottom margin to `mb-5` to align precisely with the bottom edge of the white content board (which has `mb-4` + rounding).

---

### Technical Details

**File: `src/components/ui/sidebar.tsx`**
- Line 19: `SIDEBAR_WIDTH_ICON = "3rem"` changed to `"3.5rem"`

**File: `src/components/AppSidebar.tsx`**
- Line 229: Collapsed nav padding `px-1` changed to `px-2`
- Line 257: Credits container `mb-4` changed to `mb-5`
