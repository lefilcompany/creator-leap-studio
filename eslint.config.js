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
      // Mantemos `warn` (com `--max-warnings=0` no CI) para que `any` seja sinalizado
      // mas tolere overrides explícitos via `eslint-disable-next-line` em código legado.
      "@typescript-eslint/no-explicit-any": "warn",
      // Idem para exhaustive-deps: legado já está silenciado linha-a-linha; novas violações
      // aparecerão como warning e quebrarão o CI por causa do --max-warnings=0.
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
