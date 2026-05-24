import js from '@eslint/js'
import github from 'eslint-plugin-github'
import jest from 'eslint-plugin-jest'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const githubConfigs = github.getFlatConfigs()

export default tseslint.config(
	{
		ignores: ['dist/**', 'coverage/**', 'lib/**', 'node_modules/**', '**/*.json']
	},
	js.configs.recommended,
	githubConfigs.recommended,
	...githubConfigs.typescript,
	{
		files: ['**/*.ts'],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: 'module',
			globals: {
				...globals.node,
				...globals.es2023,
				...globals.jest,
				Atomics: 'readonly',
				SharedArrayBuffer: 'readonly'
			},
			parserOptions: {
				project: ['./.github/linters/tsconfig.json', './tsconfig.json']
			}
		},
		rules: {
			'@typescript-eslint/no-shadow': 'off',
			'@typescript-eslint/array-type': ['error', { default: 'array' }],
			'camelcase': 'off',
			'eslint-comments/no-use': 'off',
			'eslint-comments/no-unused-disable': 'off',
			'i18n-text/no-en': 'off',
			'import/no-namespace': 'off',
			'no-console': 'off',
			'no-unused-vars': 'off',
			'prettier/prettier': 'error',
			'semi': 'off',
			'no-shadow': 'off',
			'github/no-then': 'off',
			'no-irregular-whitespace': 'off',
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/ban-ts-comment': 'error',
			'@typescript-eslint/consistent-type-assertions': 'error',
			'@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
			'@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
			'@typescript-eslint/no-array-constructor': 'error',
			'@typescript-eslint/no-empty-interface': 'error',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-extraneous-class': 'error',
			'@typescript-eslint/no-for-in-array': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',
			'@typescript-eslint/no-misused-new': 'error',
			'@typescript-eslint/no-namespace': 'error',
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/no-require-imports': 'error',
			'@typescript-eslint/no-unnecessary-qualifier': 'error',
			'@typescript-eslint/no-unnecessary-type-assertion': 'error',
			'@typescript-eslint/no-unused-vars': 'error',
			'@typescript-eslint/no-useless-constructor': 'error',
			'@typescript-eslint/prefer-for-of': 'warn',
			'@typescript-eslint/prefer-function-type': 'warn',
			'@typescript-eslint/prefer-includes': 'error',
			'@typescript-eslint/prefer-string-starts-ends-with': 'error',
			'@typescript-eslint/promise-function-async': 'error',
			'@typescript-eslint/require-array-sort-compare': 'error',
			'@typescript-eslint/restrict-plus-operands': 'error',
			'@typescript-eslint/unbound-method': 'error'
		}
	},
	{
		files: ['__tests__/**/*.ts'],
		...jest.configs['flat/recommended'],
		rules: {
			...jest.configs['flat/recommended'].rules
		}
	},
	{
		files: ['eslint.config.mjs'],
		rules: {
			'import/no-unresolved': 'off'
		}
	}
)
