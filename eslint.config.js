import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

export default [
  // Global ignores (replaces .eslintignore)
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'demo/**']
  },

  // Base configuration for TypeScript files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,

      // Custom rules from original config
      'max-len': ['error', { code: 120 }],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': ['error', { ignoreRestArgs: true }],

      // Disable no-undef for TypeScript as TypeScript compiler handles this
      'no-undef': 'off'
    }
  },

  // Configuration for test files
  {
    files: ['**/*.spec.ts'],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  },

  // Configuration for JavaScript files
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off'
    }
  }
];
