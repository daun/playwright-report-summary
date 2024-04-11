import {
	JSONReport,
	JSONReportSpec,
	JSONReportSuite,
	JSONReportTest,
	JSONReportTestResult
} from '@playwright/test/reporter'
import { debug } from '@actions/core'

import { formatDuration, n, renderAccordion, upperCaseFirst } from './formatting'
import { icons, renderIcon } from './icons'

// interface Report {
// 	config: {
// 		configFile: string
// 		rootDir: string
// 		fullyParallel: boolean
// 		globalTimeout: number
// 		grep: Record<string, unknown>
// 		grepInvert: null
// 		maxFailures: number
// 		metadata: {
// 			actualWorkers: number
// 			totalTime: number
// 		}
// 		projects: Project[]
// 		shard?: {
// 			current: number
// 			total: number
// 		}
// 		version: string
// 		workers: number
// 	}
// 	suites: Suite[]
// 	errors: any[]
// }

// interface Project {
// 	id: string
// 	name: string
// }

// interface Suite {
// 	title: string
// 	file: string
// 	column: number
// 	line: number
// 	specs: Spec[]
// 	suites: Suite[]
// }

// interface Spec {
// 	title: string
// 	ok: boolean
// 	tags: string[]
// 	tests: Test[]
// 	id: string
// 	file: string
// 	line: number
// 	column: number
// }

// interface Test {
// 	timeout: number
// 	expectedStatus: 'passed' | 'skipped' | 'failed' | 'flaky' | string
// 	projectId: string
// 	projectName: string
// 	results: TestResult[]
// 	status: 'expected' | 'skipped' | string
// }

// interface TestResult {
// 	workerIndex: number
// 	status: 'passed' | 'failed' | 'skipped' | string
// 	duration: number
// 	error?: any
// 	errors: any[]
// 	retry: number
// 	startTime: string
// }

export interface ReportSummary {
	version: string
	started: Date
	duration: number
	workers: number
	shards: number
	projects: string[]
	files: string[]
	suites: string[]
	specs: SpecSummary[]
	tests: TestSummary[]
	failed: TestSummary[]
	passed: TestSummary[]
	flaky: TestSummary[]
	skipped: TestSummary[]
	results: TestResultSummary[]
}

interface SpecSummary {
	ok: boolean
	file: string
	line: number
	column: number
	path: string[]
	title: string
	tests: TestSummary[]
}

interface TestSummary {
	passed: boolean
	failed: boolean
	flaky: boolean
	skipped: boolean
	file: string
	line: number
	column: number
	path: string[]
	title: string
	results: TestResultSummary[]
}

interface TestResultSummary {
	duration: number
	started: Date
}

interface ReportRenderOptions {
	commit?: string
	message?: string
	title?: string
	reportUrl?: string
	iconStyle?: keyof typeof icons
}

export function isValidReport(report: unknown): report is JSONReport {
	return report !== null && typeof report === 'object' && 'config' in report && 'errors' in report && 'suites' in report
}

export function parseReport(data: string): ReportSummary {
	let report: JSONReport
	try {
		report = JSON.parse(data)
		if (!isValidReport(report)) {
			debug('Invalid report file')
			debug(data)
			throw new Error('Invalid JSON report file')
		}
	} catch (error) {
		throw error
	}

	const files: string[] = report.suites.map((file) => file.title)
	const suites: string[] = report.suites.flatMap((file) =>
		file.suites?.length ? [...file.suites.map((suite) => `${file.title} > ${suite.title}`)] : [file.title]
	)
	const specs: SpecSummary[] = report.suites.reduce((all, file) => {
		for (const spec of file.specs) {
			all.push(parseSpec(spec, [file]))
		}
		for (const suite of file.suites || []) {
			for (const spec of suite.specs) {
				all.push(parseSpec(spec, [file, suite]))
			}
		}
		return all
	}, [] as SpecSummary[])
	const tests = specs.flatMap((spec) => spec.tests)
	const results = tests.flatMap((test) => test.results)
	const failed = tests.filter((test) => test.failed)
	const passed = tests.filter((test) => test.passed)
	const flaky = tests.filter((test) => test.flaky)
	const skipped = tests.filter((test) => test.skipped)

	const { duration, started } = getTotalDuration(report, results)
	const version: string = report.config.version
	const workers: number = report.config.metadata.actualWorkers || report.config.workers || 1
	const shards: number = report.config.shard?.total || 0
	const projects: string[] = report.config.projects.map((p) => p.name)

	return {
		version,
		started,
		duration,
		workers,
		shards,
		projects,
		files,
		suites,
		specs,
		tests,
		results,
		failed,
		passed,
		flaky,
		skipped
	}
}

function getTotalDuration(report: JSONReport, results: TestResultSummary[]): { duration: number; started: Date } {
	let duration = 0
	let started = new Date()
	const { totalTime } = report.config.metadata
	if (totalTime) {
		duration = totalTime
	} else {
		const sorted = results.sort((a, b) => a.started.getTime() - b.started.getTime())
		const first = sorted[0]
		const last = sorted[sorted.length - 1]
		if (first && last) {
			started = first.started
			duration = last.started.getTime() + last.duration - first.started.getTime()
		}
	}
	return { duration, started }
}

function parseSpec(spec: JSONReportSpec, parents: JSONReportSuite[] = []): SpecSummary {
	const { ok, file, line, column } = spec
	const { title, path } = buildTitle(...parents.map((p) => p.title), spec.title)
	const tests = spec.tests.map((test) => parseTest(test, spec, parents))
	return { ok, file, line, column, path, title, tests }
}

function parseTest(test: JSONReportTest, spec: JSONReportSpec, parents: JSONReportSuite[] = []): TestSummary {
	const { file, line, column } = spec
	const { status, projectName: project } = test
	const { title, path } = buildTitle(project, ...parents.map((p) => p.title), spec.title)
	const results = test.results.map((result) => parseTestResult(result))
	const passed = status === 'expected'
	const failed = status === 'unexpected'
	const skipped = status === 'skipped'
	const flaky = status === 'flaky'
	return { passed, failed, flaky, skipped, results, title, path, file, line, column }
}

function parseTestResult({ duration, startTime }: JSONReportTestResult): TestResultSummary {
	return { duration, started: new Date(startTime) }
}

function buildTitle(...paths: string[]): { title: string; path: string[] } {
	const path = paths.filter(Boolean)
	const title = path.join(' → ')
	return { title, path }
}

export function renderReportSummary(
	report: ReportSummary,
	{ commit, message, title, reportUrl, iconStyle }: ReportRenderOptions = {}
): string {
	const { duration, failed, passed, flaky, skipped } = report
	const icon = (symbol: string): string => renderIcon(symbol, { iconStyle })
	const paragraphs = []

	// Title

	paragraphs.push(`### ${title}`)

	// Passed/failed tests

	const tests = [
		failed.length ? `${icon('failed')}  **${failed.length} failed**` : ``,
		passed.length ? `${icon('passed')}  **${passed.length} passed**  ` : ``,
		flaky.length ? `${icon('flaky')}  **${flaky.length} flaky**  ` : ``,
		skipped.length ? `${icon('skipped')}  **${skipped.length} skipped**` : ``
	]
	paragraphs.push(tests.filter(Boolean).join('  \n'))

	// Stats about test run

	paragraphs.push(`#### Details`)

	const stats = [
		reportUrl ? `${icon('report')}  [Open report ↗︎](${reportUrl})` : '',
		`${icon('stats')}  ${report.tests.length} ${n('test', report.tests.length)} across ${report.suites.length} ${n(
			'suite',
			report.suites.length
		)}`,
		`${icon('duration')}  ${duration ? formatDuration(duration) : 'unknown'}`,
		commit && message ? `${icon('commit')}  ${message} (${commit.slice(0, 7)})` : '',
		commit && !message ? `${icon('commit')}  ${commit.slice(0, 7)}` : ''
	]
	paragraphs.push(stats.filter(Boolean).join('  \n'))

	// Lists of failed/skipped tests

	const listStatuses = ['failed', 'flaky', 'skipped'] as const
	const details = listStatuses.map((status) => {
		const tests = report[status]
		if (tests.length) {
			const summary = `${upperCaseFirst(status)} tests`
			const list = tests.map((test) => test.title).join('\n  ')
			const open = status === 'failed'
			return renderAccordion(summary, list, { open })
		}
	})
	paragraphs.push(
		details
			.filter(Boolean)
			.map((md) => (md as string).trim())
			.join('\n')
	)

	return paragraphs
		.map((p) => p.trim())
		.filter(Boolean)
		.join('\n\n')
}
