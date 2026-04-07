# Numeric Keypad

**File:** `src/components/NumericKeypad.tsx`

DSEG7-styled calculator widget. Fully controlled (parent owns the value). Supports
minimized/expanded states. All interactive elements carry `data-autopilot-key`
attributes so autopilot can find and click them by key name.

---

## Props

```ts
interface NumericKeypadProps {
  value: string;                      // controlled display value
  onChange?: (v: string) => void;     // called on every key press
  onSubmit?: () => void;              // called when submit (✓) is pressed
  canSubmit?: boolean;                // default false; disables submit when false
  minimized: boolean;                 // controlled from GameLayout
  onToggleMinimized: () => void;      // called when display is clicked
}
```

---

## Visual design

**Outer container:**
```css
background: rgba(2,6,23,0.97)
border: 4px solid rgba(56,189,248,0.45)
box-shadow: 0 0 18px rgba(56,189,248,0.12), inset 0 0 12px rgba(0,0,0,0.4)
border-radius: 0.75rem
padding: 0.375rem
gap: 0.25rem
```
Width: `w-[12.5rem] md:w-[13.75rem]` (desktop), `w-[16.25rem]` (mobile landscape).

**Digital display:**
```css
font-family: 'DSEG7Classic', 'Courier New', monospace
font-weight: 700
font-size: 2.1rem
color: #67e8f9
text-shadow: 0 0 12px rgba(103,232,249,0.85), 0 0 26px rgba(56,189,248,0.4)
letter-spacing: 0.08em
background: rgba(0,8,4,0.95)
height: 3.5rem (desktop) / 3rem on md
```

Display shows `"0"` when `value === ""`. Click the display → calls `onToggleMinimized`.

When minimized, the display border is removed (`border: none`); when expanded, adds
`2px solid rgba(56,189,248,0.28)`.

**Active key flash style:**
```css
background: #67e8f9
color: #020617
borderColor: #67e8f9
boxShadow: 0 0 16px rgba(103,232,249,0.45)
```
Flash duration: 140ms.

---

## Button grid layout

### Row 1–3 (4 columns each):
```
Row 1: 7  8  9  ⌫
Row 2: 4  5  6  ±
Row 3: 1  2  3  .
```

### Bottom row (2 buttons, equal width):
```
0    ✓ (submit)
```

**Digit buttons** (`/[0-9]/.test(btn)`) — style class `digit`:
```
bg-slate-800 text-slate-100 border border-slate-600/60
```
Font: `1.7rem` (mobile landscape: `1.875rem`).

**Operator buttons** (`⌫`, `±`, `.`) — style class `op`:
```
bg-slate-700/80 text-slate-100 border border-slate-500/60
```

**Submit button** — `.arcade-button` style, `disabled:opacity-40 disabled:cursor-not-allowed`.
Shows a checkmark SVG (path `M4 13 L9 18 L20 7`, stroke white, width 3).

Button heights: `56px` (mobile landscape) / `45px` (touch) / `55px md:40px` (desktop).

---

## Button key values and `data-autopilot-key`

Every button has `data-autopilot-key="<value>"`:

| Button | `data-autopilot-key` |
|--------|---------------------|
| `0`–`9` | the digit itself |
| `⌫` | `"⌫"` |
| `±` | `"±"` |
| `.` | `"."` |
| Submit ✓ | `"submit"` |

The `<input>` field in `SessionReportModal` uses `data-autopilot-key="email-input"`.
The email send button uses `data-autopilot-key="email-send"`.
The "Next Level" button uses `data-autopilot-key="next-level"`.

All interactive autopilot targets must have a `data-autopilot-key` attribute.

---

## Key press logic (`press(key)`)

```ts
function press(key: string) {
  if (!onChange) return;
  playKeyClick();      // tick SFX
  flashKey(key);       // 140ms highlight

  if (key === "⌫") { onChange(value.slice(0, -1)); return; }
  if (key === "±") {
    if (value.startsWith("-")) onChange(value.slice(1));
    else onChange("-" + (value || "0"));
    return;
  }
  if (key === ".") {
    if (!value.includes(".")) onChange(value === "" ? "0." : `${value}.`);
    return;
  }
  // Digit
  if (value === "0") onChange(key);          // replace leading zero
  else if (value === "-0") onChange("-" + key);
  else onChange(`${value}${key}`);
}
```

---

## Collapse/expand animation

The number grid collapses without affecting the canvas layout:
```tsx
<div style={{
  overflow: "hidden",
  maxHeight: minimized ? "0px" : "400px",
  opacity: minimized ? 0 : 1,
  pointerEvents: minimized ? "none" : "auto",
  transition: "max-height 0.4s ease-in-out, opacity 0.3s ease-in-out",
}}>
  {/* button grid */}
</div>
```

The display (`h-14`) is always visible even when minimized. Clicking it (or the
QuestionBox) toggles the grid.

---

## Integration notes

1. `GameLayout` owns the `calcMinimized` state and passes it as `minimized`.
2. The parent (`RippleScreen`) owns `calcValue` and `setCalcValue`.
3. `forceKeypadExpanded={isAutopilot && phase === "answering"}` in GameLayout keeps
   the grid visible while autopilot types the answer.
4. The autopilot clicks buttons via `el.click()` which calls `press()` normally.
