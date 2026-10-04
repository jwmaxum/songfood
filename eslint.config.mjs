import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["scripts/**/*.cjs", "e2e/**/*.cjs", "scripts/seed-supabase-labels.js", "scripts/products-seed-data.js"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "supabase/functions/**",
    "coverage/**",
    ".npm-cache/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "playwright-report/**",
    "test-results/**",
    ".next-qa/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
