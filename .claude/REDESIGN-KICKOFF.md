# REDESIGN Session Kickoff and Resume Instructions

This file governs the full REDESIGN-SPEC build session. It survives session
boundaries and must be read at every resume. Do not skip it.

## On Session Start or Resume

Always begin by reading, in order:
1. CLAUDE.md
2. MASTER-PLAN.md
3. DESIGN-STANDARD.md
4. PLANNER-SPEC.md
5. REDESIGN-SPEC.md

REDESIGN-SPEC.md is the governing document. Its Part 10 is the execution
protocol. Execute exactly as written: one commit per phase, visual
verification through Chrome per page, no dummy elements, zero em dashes.

## Delegation and Review Policy

Delegate mechanical, parallelizable work to cheaper sub-agents (Sonnet,
Haiku) for Part 3 primitives, copy sweeps, lint cleanup. Never delegate:
orchestration, page assembly, data bindings, money rendering, currency
fix, visual verification through Chrome.

Review every sub-agent output before integrating. Sub-agent work is a
draft, never a direct merge.

## Verification Discipline (Non-Negotiable)

Per REDESIGN-SPEC Part 10, for EVERY phase:
1. Build
2. typecheck, lint, production build must pass
3. Navigate the page in Chrome at desktop width AND 390px
4. Compare against the spec's checklist for that page
5. Fix and re-verify, three cycles maximum
6. Log residuals honestly in the BUILD LOG

NEVER mark a phase done on build success alone. Visual confirmation in
the browser is REQUIRED.

## Final Review Gate (Before Report)

After P15 and before updating MASTER-PLAN:

1. Spawn a fresh context-isolated reviewer sub-agent that had NO part in
   the build.
2. Give it REDESIGN-SPEC.md and the full diff of this session's commits.
3. Have it audit: page checklists, copy rules (zero em dashes, no
   unnecessary hyphens, no marketing language, sentence case), data
   honesty (no dummy values, estimates marked by form only, no invented
   figures, currency correctness), reduced motion coverage, empty states,
   every button performs its stated action.
4. Fix everything it flags, re-verify visually where relevant, and run
   the reviewer again until clean or only accepted residuals logged with
   reasons.
5. Then update MASTER-PLAN, run T12, attempt git push.
6. Stop with full report including reviewer's final findings.

## Resume Path

If the session hits a usage limit mid-build, after the reset:

1. Run `git log --oneline -5` and `git status` to verify current state.
2. Determine which phase was interrupted and whether that phase's files
   are complete.
3. If complete and typecheck clean, commit the phase and continue.
4. If incomplete, log in BUILD LOG and either finish or rebuild clean.
5. Continue phases as written, never skipping verification.

Work without pausing for approval. Log ambiguities and blockers in BUILD
LOG instead of stopping.
