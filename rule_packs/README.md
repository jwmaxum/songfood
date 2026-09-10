# Global Food Labeling Rule Packs — Starter v1.0.0

Files:
- `us.json` — FDA / USDA-FSIS starter rules
- `cn.json` — SAMR / GACC starter rules
- `jp.json` — CAA starter rules
- `eu.json` — EU FIC / additives starter rules
- `uae.json` — GSO / UAE/MOIAT starter rules
- `index.ts` — typed registry

## Important
These files are a production-oriented *starter registry*, not a legal guarantee or exhaustive codification of every food-labeling rule.

Before production deployment:
1. Attach exact official source URLs and article/section citations to every rule.
2. Add effective-from/effective-to and supersession fields.
3. Add product-category-specific additive/claim thresholds.
4. Add jurisdiction-specific exemptions.
5. Add language, font-size, panel/layout, rounding and unit rules.
6. Add country/member-state overlays where applicable.
7. Run the rule packs against validated regulatory test cases.
8. Have regulatory/legal specialists sign off on each release.

The current user-provided tests should be retained as regression tests, but should not be treated as proof of complete compliance coverage.
