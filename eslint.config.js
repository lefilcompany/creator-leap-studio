import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Edge functions rodam em Deno e têm runtime/types próprios; configs Node também ficam fora.
  { ignores: ["dist", "supabase/functions/**", "tailwind.config.ts", "*.config.{js,ts}"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // `any` é usado intencionalmente em fronteiras de API (supabase, fetch). Mantemos como
      // warning para sinalizar smell sem quebrar o build com falsos positivos de boundary.
      "@typescript-eslint/no-explicit-any": "warn",
      // exhaustive-deps mantido como warn — quebrar o build aqui costuma forçar refactors
      // arriscados de hooks. Sinalizamos sem barrar PRs.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // Arquivos de teste podem usar `any` em mocks sem aviso.
  {
    files: ["**/*.{test,spec}.{ts,tsx}", "src/test/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
