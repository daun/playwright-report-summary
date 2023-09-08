/**
 * Unit tests for src/report.ts
 */

import { expect } from '@jest/globals'
import { readFile } from '../src/fs'
import { isValidReport } from '../src/report'

describe('isValidReport', () => {
	it('detects valid reports', async () => {
		const report = await readFile('__tests__/fixtures/report-valid.json')
		expect(isValidReport(JSON.parse(report))).toBe(true)
	})
	it('detects invalid reports', async () => {
		const invalidReport = await readFile('__tests__/fixtures/report-invalid.json')
		expect(isValidReport([])).toBe(false)
		expect(isValidReport("")).toBe(false)
		expect(isValidReport(invalidReport)).toBe(false)
	})
})
