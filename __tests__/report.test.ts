/**
 * Unit tests for src/report.ts
 */

import { expect } from '@jest/globals'
import { readFile } from '../src/fs'
import {
	ReportSummary,
	buildTitle,
	isValidReport,
	parseReport,
	parseReportFiles,
	parseReportSuites,
	renderReportSummary
} from '../src/report'

const defaultReport = 'report-valid.json'
const invalidReport = 'report-invalid.json'
const reportWithoutDuration = 'report-without-duration.json'
const shardedReport = 'report-sharded.json'
const nestedReport = 'report-nested.json'

async function getReport(file = defaultReport): Promise<string> {
	return await readFile(`__tests__/__fixtures__/${file}`)
}

async function getParsedReport(file = defaultReport): Promise<ReportSummary> {
	return parseReport(await getReport(file))
}

describe('isValidReport', () => {
	it('detects valid reports', async () => {
		const report = await getReport()
		expect(isValidReport(JSON.parse(report))).toBe(true)
	})
	it('detects invalid reports', async () => {
		const report = await getReport(invalidReport)
		expect(isValidReport([])).toBe(false)
		expect(isValidReport('')).toBe(false)
		expect(isValidReport(JSON.parse(report))).toBe(false)
	})
})

describe('buildTitle', () => {
	it('returns an object with path and title', async () => {
		const result = buildTitle('A', 'B')
		expect(result).toBeInstanceOf(Object)
		expect(result.path).toBeDefined()
		expect(result.title).toBeDefined()
	})
	it('concatenates and filters title segments', async () => {
		const { title } = buildTitle('A', 'B', '', 'C')
		expect(title).toBe('A › B › C')
	})
	it('concatenates and filters path segments', async () => {
		const { path } = buildTitle('A', '', 'B', 'C')
		expect(path).toStrictEqual(['A', 'B', 'C'])
	})
})

describe('parseReportFiles', () => {
	it('returns an array of root filenames', async () => {
		const report = JSON.parse(await getReport(nestedReport))
		const files = parseReportFiles(report)
		expect(files).toStrictEqual(['add.spec.ts', 'nested.spec.ts'])
	})
})

describe('parseReportSuites', () => {
	it('returns an array of root suite summaries', async () => {
		const report = JSON.parse(await getReport(nestedReport))
		const suites = parseReportSuites(report)
		expect(suites).toBeInstanceOf(Array)
		expect(suites.length).toBe(2)
		expect(suites[0].title).toBe('add.spec.ts')
	})
})

describe('parseReport', () => {
	it('returns an object', async () => {
		const parsed = await getParsedReport()
		expect(typeof parsed === 'object').toBe(true)
	})
	it('returns playwright version', async () => {
		const parsed = await getParsedReport()
		expect(parsed.version).toBe('1.37.1')
	})
	it('returns total duration', async () => {
		const parsed = await getParsedReport()
		expect(parsed.duration).toBe(1118.34)
	})
	it('calculates duration if missing', async () => {
		const parsed = await getParsedReport(reportWithoutDuration)
		expect(parsed.duration).toBe(943)
	})
	it('returns workers', async () => {
		const parsed = await getParsedReport()
		expect(parsed.workers).toBe(5)
	})
	it('returns shards', async () => {
		const parsed = await getParsedReport()
		expect(parsed.shards).toBe(2)
	})
	it('returns files', async () => {
		const parsed = await getParsedReport()
		expect(parsed.files.length).toBe(4)
	})
	it('returns suites', async () => {
		const parsed = await getParsedReport()
		expect(parsed.suites.length).toBe(4)
	})
	it('returns specs', async () => {
		const parsed = await getParsedReport()
		expect(parsed.specs.length).toBe(14)
	})
	it('counts tests', async () => {
		const parsed = await getParsedReport()
		expect(parsed.tests.length).toBe(14)
		expect(parsed.failed.length).toBe(2)
		expect(parsed.passed.length).toBe(10)
		expect(parsed.flaky.length).toBe(1)
		expect(parsed.skipped.length).toBe(1)
	})
	it('counts sharded tests', async () => {
		const parsed = await getParsedReport(shardedReport)
		expect(parsed.tests.length).toBe(27)
		expect(parsed.failed.length).toBe(1)
		expect(parsed.passed.length).toBe(22)
		expect(parsed.flaky.length).toBe(1)
		expect(parsed.skipped.length).toBe(3)
	})
	it('counts nested suites', async () => {
		const parsed = await getParsedReport(nestedReport)
		expect(parsed.suites.length).toBe(2)
		expect(parsed.specs.length).toBe(45)
		expect(parsed.tests.length).toBe(45)
	})
})

describe('renderReportSummary', () => {
	const renderOptions = {
		title: 'Test Report',
		reportUrl: 'https://example.com/report',
		customInfo: 'For more information, see our [documentation](https://example.com/docs)',
		commit: '1234567'
	}
	const getReportSummary = async (): Promise<string> =>
		renderReportSummary(parseReport(await getReport()), renderOptions)
	it('returns a string', async () => {
		const summary = await getReportSummary()
		expect(typeof summary === 'string').toBe(true)
	})
	it('matches snapshot', async () => {
		const summary = await getReportSummary()
		expect(summary).toMatchSnapshot()
	})
})
