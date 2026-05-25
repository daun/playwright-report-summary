import { ReportSummary, renderReportSummary } from '../src/report'

describe('renderReportSummary security', () => {
	it('sanitizes test titles containing HTML and markdown injection', () => {
		const maliciousTitle =
			'harmless test <!-- -->\n\n## ⚠️ Security Notice\n\nSee [advisory](https://evil.example.com)\n\n<!--'
		const failedTest = {
			passed: false,
			failed: true,
			flaky: false,
			skipped: false,
			file: 'test.spec.ts',
			line: 1,
			column: 1,
			path: ['test.spec.ts', maliciousTitle],
			title: maliciousTitle,
			results: [{ duration: 100, started: new Date() }]
		}
		const report: ReportSummary = {
			version: '1.0.0',
			started: new Date(),
			duration: 1000,
			workers: 1,
			shards: 0,
			projects: ['chromium'],
			files: ['test.spec.ts'],
			suites: [
				{ file: 'test.spec.ts', line: 0, column: 0, path: [], title: 'test.spec.ts', level: 0, root: true, specs: [] }
			],
			specs: [],
			tests: [failedTest],
			failed: [failedTest],
			passed: [],
			flaky: [],
			skipped: [],
			results: []
		}

		const output = renderReportSummary(report, { title: 'Test Report' })

		expect(output).not.toContain('<!--')
		expect(output).not.toMatch(/^## ⚠️ Security Notice/m)
		expect(output).toContain('harmless test')
		expect(output).toContain('&lt;')
	})

	// Helper: build a minimal report containing a single failed test with the
	// given title (and optional file path), so we can assert how those values
	// render in the summary.
	function reportWithFailedTitle(title: string, file = 'test.spec.ts'): ReportSummary {
		const failedTest = {
			passed: false,
			failed: true,
			flaky: false,
			skipped: false,
			file,
			line: 1,
			column: 1,
			path: [file, title],
			title,
			results: [{ duration: 100, started: new Date() }]
		}
		return {
			version: '1.0.0',
			started: new Date(),
			duration: 1000,
			workers: 1,
			shards: 0,
			projects: ['chromium'],
			files: ['test.spec.ts'],
			suites: [
				{
					file: 'test.spec.ts',
					line: 0,
					column: 0,
					path: [],
					title: 'test.spec.ts',
					level: 0,
					root: true,
					specs: []
				}
			],
			specs: [],
			tests: [failedTest],
			failed: [failedTest],
			passed: [],
			flaky: [],
			skipped: [],
			results: []
		}
	}

	it('neutralizes markdown link injection in test titles', () => {
		const report = reportWithFailedTitle('[Click here for free pizza](https://attacker.example)')
		const output = renderReportSummary(report, { title: 'Test Report' })
		// Attacker URL text may appear, but it must not be wrapped in an active link.
		expect(output).not.toMatch(/\[Click here[^\]]*\]\(https:\/\/attacker\.example\)/)
		expect(output).toContain('attacker.example') // shown as plain text
	})

	it('neutralizes markdown image injection in test titles', () => {
		const report = reportWithFailedTitle('![pixel](https://attacker.example/log)')
		const output = renderReportSummary(report, { title: 'Test Report' })
		expect(output).not.toMatch(/(^|[^\\])!\[pixel\]\(https:\/\/attacker\.example/)
	})

	it('neutralizes inline code-span injection in test titles', () => {
		const report = reportWithFailedTitle('uses `rm -rf /` in setup')
		const output = renderReportSummary(report, { title: 'Test Report' })
		// The title line should not contain an unescaped backtick pair
		const titleLine = output.split('\n').find((l) => l.includes('rm -rf')) ?? ''
		expect(titleLine).not.toMatch(/(^|[^\\])`/)
	})

	it('neutralizes emphasis and heading metacharacters in test titles', () => {
		const report = reportWithFailedTitle('*bold* _under_ #heading')
		const output = renderReportSummary(report, { title: 'Test Report' })
		const titleLine = output.split('\n').find((l) => l.includes('bold')) ?? ''
		expect(titleLine).toContain('\\*bold\\*')
		expect(titleLine).toContain('\\_under\\_')
		expect(titleLine).toContain('\\#heading')
	})

	it('prevents code-fence breakout via attacker-controlled test.file', () => {
		// A file path crafted to close a ```-fence and inject a heading + link.
		const maliciousFile = 'tests/a.spec.ts\n```\n## Pwned\n[click](https://attacker.example)\n```\nb.spec.ts'
		const report = reportWithFailedTitle('a test', maliciousFile)
		const output = renderReportSummary(report, {
			title: 'Test Report',
			testCommand: 'npx playwright test'
		})

		// All fence delimiters must pair up (even count) -> no premature break-out.
		const fenceMatches = output.match(/^`{3,}/gm) ?? []
		expect(fenceMatches.length % 2).toBe(0)

		// Strip fenced code blocks; the attacker payload must not survive in the
		// rendered (non-code) portion of the comment.
		const outsideCode = output.replace(/^(`{3,})[^\n]*\n[\s\S]*?\n\1$/gm, '')
		expect(outsideCode).not.toMatch(/^## Pwned/m)
		expect(outsideCode).not.toMatch(/\[click\]\(https:\/\/attacker\.example\)/)
	})

	it('grows fence length when test.file legitimately contains backticks', () => {
		// While unusual, backticks are valid in POSIX filenames. We must not break
		// such paths, but we also must not let them break out of the code block.
		const report = reportWithFailedTitle('a test', 'tests/weird```name.spec.ts')
		const output = renderReportSummary(report, {
			title: 'Test Report',
			testCommand: 'npx playwright test'
		})

		expect(output).toContain('tests/weird```name.spec.ts:1')
		const fenceMatches = output.match(/^`{3,}/gm) ?? []
		expect(fenceMatches.length % 2).toBe(0)
		// All fences in this output must be at least 4 backticks long
		for (const f of fenceMatches) {
			expect(f.length).toBeGreaterThanOrEqual(4)
		}
	})
})
