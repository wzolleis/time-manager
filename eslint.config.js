import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import {defineConfig, globalIgnores} from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "\\.tsx?$",
              message: "Ohne Dateiendung importieren, z. B. \"@/api/holidays\" statt \"@/api/holidays.ts\".",
            },
          ],
        },
      ],
    },
  },
  {
    // Skripte laufen direkt mit node, und node braucht beim Import die Dateiendung
    files: ['scripts/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // shadcn-Komponenten werden generiert und exportieren auch Varianten wie buttonVariants
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Generierte Dateien behalten die Imports, die der Generator schreibt
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/routeTree.gen.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
])
