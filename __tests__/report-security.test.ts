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
})
