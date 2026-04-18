import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Convention standard : les variables préfixées "_" sont intentionnellement inutilisées
  // (ex: destructuring pour exclure un champ : const { secret: _s, ...rest } = obj)
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern:       "^_",
        varsIgnorePattern:       "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },
]);

export default eslintConfig;
