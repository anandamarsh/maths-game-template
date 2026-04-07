# Interactive Maths — Game Template Specs

Feature specifications for the game template. Each file in this folder describes
a reusable capability that all games built on this template should implement.

---

## Feature Index

| Feature | Spec file | Playbook | Key files |
|---------|-----------|----------|-----------|
| [Autopilot Mode](./autopilot.md) | `specs/autopilot.md` | `autopilot.md` | `useAutopilot.ts`, `useCheatCode.ts`, `PhantomHand`, `AutopilotIcon` |
| [Cheat Code System](./cheat-codes.md) | `specs/cheat-codes.md` | — | `useCheatCode.ts` |
| [Session Reporting](./session-reporting.md) | `specs/session-reporting.md` | — | `shareReport.ts`, `generatePdf.ts`, `sessionLog.ts` |
| [Numeric Keypad](./numeric-keypad.md) | `specs/numeric-keypad.md` | — | `NumericKeypad.tsx` |
| [Sound System](./sound-system.md) | `specs/sound-system.md` | — | `sound/index.ts` |
| [Internationalisation (i18n)](./i18n.md) | `specs/i18n.md` | `i18n.md` | `src/i18n/`, `LanguageSwitcher.tsx`, `api/translate.ts` |
