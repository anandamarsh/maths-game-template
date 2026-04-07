## Feature: Cheat Code System

**File:** `src/hooks/useCheatCode.ts`

A global keyboard listener that accumulates digit keypresses into a rolling buffer.
When the buffer ends with a registered code, the associated handler fires.
Non-digit, non-modifier keys reset the buffer.

### Standard codes (all games)
| Code | Action |
|------|--------|
| `198081` | Toggle autopilot |
| `197879` | Show correct answer (answering phase only) |

Additional game-specific codes may be registered via the same hook.
