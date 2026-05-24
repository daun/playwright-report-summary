import type { Config } from 'jest'

// @actions/* packages are ESM-only from v3 onward. Jest still runs in CJS mode
// here, so we down-compile those dependencies via ts-jest and bypass their
// `"import"`-only exports map with explicit moduleNameMapper entries.
const config: Config = {
	preset: 'ts-jest',
	verbose: true,
	clearMocks: true,
	testEnvironment: 'node',
	moduleFileExtensions: ['js', 'ts'],
	moduleNameMapper: {
		'^@actions/core$': '<rootDir>/node_modules/@actions/core/lib/core.js',
		'^@actions/exec$': '<rootDir>/node_modules/@actions/exec/lib/exec.js',
		'^@actions/io$': '<rootDir>/node_modules/@actions/io/lib/io.js',
		'^@actions/io/lib/(.*)$': '<rootDir>/node_modules/@actions/io/lib/$1.js',
		'^@actions/http-client$': '<rootDir>/node_modules/@actions/http-client/lib/index.js',
		'^@actions/http-client/lib/(.*)$': '<rootDir>/node_modules/@actions/http-client/lib/$1.js',
		'^@actions/github$': '<rootDir>/node_modules/@actions/github/lib/github.js',
		'^@actions/github/lib/(.*)$': '<rootDir>/node_modules/@actions/github/lib/$1.js'
	},
	testMatch: ['**/*.test.ts'],
	testPathIgnorePatterns: ['/node_modules/', '/dist/'],
	transform: {
		'^.+\\.(ts|js)$': [
			'ts-jest',
			{
				diagnostics: false,
				tsconfig: 'tsconfig.test.json'
			}
		]
	},
	transformIgnorePatterns: [
		'/node_modules/(?!(@actions/(core|exec|github|io|http-client)|@octokit/[^/]+|universal-user-agent|before-after-hook)/)'
	],
	coverageReporters: ['json-summary', 'text', 'lcov'],
	collectCoverage: true,
	collectCoverageFrom: ['./src/**']
}

export default config
