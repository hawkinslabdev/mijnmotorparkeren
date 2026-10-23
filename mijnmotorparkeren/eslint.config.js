import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import react from 'eslint-plugin-react'

export default [
  {
    ignores: ['dist', 'node_modules', 'build', '.vite']
  },
  {
    // Astro API routes and scripts run on Node.js — need Node globals (process, etc.)
    files: ['src/pages/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node }
    }
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022
      },
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      '@typescript-eslint': tseslint
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // shortcut: new React Compiler rules in react-hooks v7 flag existing working code, enable once those effects are refactored
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',

      // Custom rules from your original config
      'react/react-in-jsx-scope': 'off',
      'react-refresh/only-export-components': 'warn',
      
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // React specific rules
      'react/prop-types': 'off' // TypeScript handles this
    }
  }
]