import {
	JSONReport,
	JSONReportSpec,
	JSONReportSuite,
	JSONReportTest,
	JSONReportTestResult
} from '@playwright/test/reporter'
import { debug } from '@actions/core'

import { formatDuration, n, renderAccordion, renderCodeBlock, upperCaseFirst } from './formatting'
import { icons, renderIcon } from './icons'

export interface ReportSummary {
	version: string
	started: Date
	duration: number
	workers: number
	shards: number
	projects: string[]
	files: string[]
	suites: SuiteSummary[]
	specs: SpecSummary[]
	tests: TestSummary[]
	failed: TestSummary[]
	passed: TestSummary[]
	flaky: TestSummary[]
	skipped: TestSummary[]
	results: TestResultSummary[]
}

interface SuiteSummary {
	file: string
	line: number
	column: number
	path: string[]
	title: string
	level: number
	root: boolean
	specs: SpecSummary[]
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
	commitUrl?: string
	message?: string
	title?: string
	customInfo?: string
	reportUrl?: string
	iconStyle?: keyof typeof icons
	testCommand?: string
}

export function isValidReport(report: unknown): report is JSONReport {
	return report !== null && typeof report === 'object' && 'config' in report && 'errors' in report && 'suites' in report
}

export function makeReport(data: string): JSONReport {
	const report: JSONReport = JSON.parse(data)
	if (isValidReport(report)) {
		return report
	} else {
		debug('Invalid report file')
		debug(data)
		throw new Error('Invalid JSON report file')
	}
}

export function parseReport(data: string): ReportSummary {
	const report = makeReport(data)
	const files = parseReportFiles(report)
	const allSuites = parseReportSuites(report)
	const suites = allSuites.filter((suite) => suite.root)
	const specs = allSuites.flatMap((suite) => suite.specs)

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

export function parseReportFiles({ suites }: JSONReport): string[] {
	return suites.map((suite) => suite.file)
}

export function parseReportSuites({ suites }: JSONReport): SuiteSummary[] {
	return suites.map((suite) => parseSuite(suite))
}

function parseSuite(suite: JSONReportSuite, parents: string[] = []): SuiteSummary {
	const { file, line, column } = suite
	const { title, path } = buildTitle(...parents, suite.title)
	const level = parents.length
	const root = level === 0

	const directSpecs = (suite.specs ?? []).map((spec) => parseSpec(spec, [...parents, suite.title]))
	const nestedSuites = (suite.suites ?? []).map((child) => parseSuite(child, [...parents, suite.title]))
	const nestedSpecs = nestedSuites.flatMap((suite) => suite.specs)
	const specs = [...nestedSpecs, ...directSpecs]

	return { file, line, column, path, title, level, root, specs }
}

function parseSpec(spec: JSONReportSpec, parents: string[] = []): SpecSummary {
	const { ok, file, line, column } = spec
	const { title, path } = buildTitle(...parents, spec.title)
	const tests = spec.tests.map((test) => parseTest(test, spec, parents))
	return { ok, file, line, column, path, title, tests }
}

function parseTest(test: JSONReportTest, spec: JSONReportSpec, parents: string[] = []): TestSummary {
	const { file, line, column } = spec
	const { status, projectName: project } = test
	const { title, path } = buildTitle(project, ...parents, spec.title)
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

export function buildTitle(...paths: string[]): { title: string; path: string[] } {
	const path = paths.filter(Boolean)
	const title = path.join(' › ')
	return { title, path }
}

export function renderReportSummary(
	report: ReportSummary,
	{ commit, commitUrl, message, title, customInfo, reportUrl, iconStyle, testCommand }: ReportRenderOptions = {}
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

	const shortCommit = commit?.slice(0, 7)
	const commitText = commitUrl ? `[${shortCommit}](${commitUrl})` : shortCommit

	const stats = [
		reportUrl ? `${icon('report')}  [Open report ↗︎](${reportUrl})` : '',
		`${icon('stats')}  ${report.tests.length} ${n('test', report.tests.length)} across ${report.suites.length} ${n(
			'suite',
			report.suites.length
		)}`,
		`${icon('duration')}  ${duration ? formatDuration(duration) : 'unknown'}`,
		commitText && message ? `${icon('commit')}  ${message} (${commitText})` : '',
		commitText && !message ? `${icon('commit')}  ${commitText}` : '',
		customInfo ? `${icon('info')}  ${customInfo}` : ''
	]
	paragraphs.push(stats.filter(Boolean).join('  \n'))

	// Lists of failed/skipped tests

	const listStatuses = ['failed', 'flaky', 'skipped'] as const
	const details = listStatuses.map((status) => {
		const tests = report[status]
		if (tests.length) {
			const summary = `${upperCaseFirst(status)} tests`
			const content = renderTestList(tests, status !== 'skipped' ? testCommand : undefined)
			const open = status === 'failed'
			return renderAccordion(summary, content, { open })
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

function renderTestList(tests: TestSummary[], testCommand: string | undefined) {
	const list = tests.map((test) => `  ${test.title}`).join('\n')
	if (!testCommand) {
		return list
	}

	const testIds = tests.map((test) => `${test.file}:${test.line}`).join(' ')
	const command = `${testCommand} ${testIds}`

	return `${list}\n\n${renderCodeBlock(command)}`
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

export function getCommitUrl(repoUrl: string | undefined, sha: string) {
	return repoUrl ? `${repoUrl}/commit/${sha}` : undefined
}
