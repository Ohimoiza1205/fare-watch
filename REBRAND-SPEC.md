# REBRAND-SPEC.md
# Rename FareWatch to Farepoint throughout

This spec governs the rebranding from FareWatch to Farepoint across the entire codebase, amending REDESIGN-SPEC Part 1.

## PART 1. REBRAND SCOPE

Every instance of the name "FareWatch" is renamed to "Farepoint", applied uniformly across:
- UI text and labels (wordmark, headings, empty states, help text)
- Code identifiers (component names, variable names, function names, type names)
- Comments and docstrings
- Configuration files and environment variable documentation
- Database records where appropriate (corridors table initial labels remain as route references, not renamed)
- Git commit messages

"Farepoint" is written as one word, title case in headings and labels, lowercase in code identifiers.

No other behavioural or design changes. The REDESIGN-SPEC phases proceed unchanged; each phase's visual verification confirms the rename is complete and consistent.

## PART 2. REBRAND CONSTRAINTS

- No em dashes in any new or changed text (inherited from REDESIGN-SPEC Part 1 rule 10)
- No invented copy. All user-facing text is literal.
- The rebrand is aesthetic only; functionality, data structures, and APIs are unchanged.
