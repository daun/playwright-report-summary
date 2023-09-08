/**
 * Unit tests for src/report.ts
 */

import { expect } from '@jest/globals'
import { readFile } from '../src/fs'
import { isValidReport, parseReport } from '../src/report'

async function getReport() {
	return await readFile('__tests__/fixtures/report-valid.json')
}

async function getInvalidReport() {
	return await readFile('__tests__/fixtures/report-invalid.json')
}

describe('isValidReport', () => {
	it('detects valid reports', async () => {
		const report = await getReport()
		expect(isValidReport(JSON.parse(report))).toBe(true)
	})
	it('detects invalid reports', async () => {
		const report = await getInvalidReport()
		expect(isValidReport([])).toBe(false)
		expect(isValidReport('')).toBe(false)
		expect(isValidReport(JSON.parse(report))).toBe(false)
	})
})

describe('parseReport', () => {
	it('returns an object', async () => {
		const parsed = parseReport(await getReport())
		expect(typeof parsed === 'object').toBe(true)
	})
	it('returns playwright version', async () => {
		const parsed = parseReport(await getReport())
		expect(parsed.version).toBe('1.37.1')
	})
	it('returns total duration', async () => {
		const parsed = parseReport(await getReport())
		expect(parsed.duration).toBe(1118.34)
	})
	it('returns workers', async () => {
		const parsed = parseReport(await getReport())
		expect(parsed.workers).toBe(5)
	})
	it('returns shards', async () => {
		const parsed = parseReport(await getReport())
		expect(parsed.shards).toBe(2)
	})
	it('returns files', async () => {
		const parsed = parseReport(await getReport())
		expect(parsed.files.length).toBe(4)
	})
	it('returns suites', async () => {
		const parsed = parseReport(await getReport())
		expect(parsed.suites.length).toBe(4)
	})
	it('returns specs', async () => {
		const parsed = parseReport(await getReport())
		expect(parsed.specs.length).toBe(14)
		expect(parsed.failed.length).toBe(2)
		expect(parsed.passed.length).toBe(10)
		expect(parsed.flaky.length).toBe(1)
		expect(parsed.skipped.length).toBe(1)
	})
})
