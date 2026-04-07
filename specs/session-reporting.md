## Feature: Session Reporting

**Files:** `src/report/shareReport.ts`, `src/report/generatePdf.ts`, `src/report/sessionLog.ts`

Each level completion generates a session summary with:
- Player name, level, score, accuracy
- Per-question details (prompt, correct answer, given answer, ripple positions)
- PDF report (downloadable or emailable)
- Email via `/api/send-report` endpoint
