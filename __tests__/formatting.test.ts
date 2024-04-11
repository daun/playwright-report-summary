/**
 * Unit tests for src/formatting.ts
 */

import { expect } from '@jest/globals'
import { formatDuration, upperCaseFirst, renderMarkdownTable } from '../src/formatting'

describe('formatDuration', () => {
	it('returns a string', async () => {
		expect(typeof formatDuration(3000) === 'string').toBe(true)
	})
	it('formats milliseconds', async () => {
		expect(formatDuration(500)).toBe('0.5 seconds')
	})
	it('formats seconds', async () => {
		expect(formatDuration(3000)).toBe('3 seconds')
	})
	it('formats singular seconds', async () => {
		expect(formatDuration(1000)).toBe('1 second')
	})
	it('formats minutes', async () => {
		expect(formatDuration(330000)).toBe('5 minutes, 30 seconds')
	})
	it('formats singular minutes', async () => {
		expect(formatDuration(60000)).toBe('1 minute')
	})
	it('formats hours', async () => {
		// (5*1000)+(15*1000*60)+(2*1000*60*60)
		expect(formatDuration(8105000)).toBe('2 hours, 15 minutes, 5 seconds')
	})
	it('formats singular hours', async () => {
		expect(formatDuration(3600000)).toBe('1 hour')
	})
	it('formats days', async () => {
		// (8*1000)+(36*1000*60)+(13*1000*60*60)+(3*1000*60*60*24)
		expect(formatDuration(308168000)).toBe('3 days, 13 hours, 36 minutes, 8 seconds')
	})
	it('formats singular days', async () => {
		expect(formatDuration(86400000)).toBe('1 day')
	})
})

describe('upperCaseFirst', () => {
	it('returns a string', async () => {
		expect(typeof upperCaseFirst('lorem') === 'string').toBe(true)
	})
	it('uppercases the first letter', async () => {
		expect(upperCaseFirst('lorem')).toBe('Lorem')
	})
})

describe('renderMarkdownTable', () => {
	it('returns a string', async () => {
		expect(
			typeof renderMarkdownTable([
				['A', 'B'],
				['C', 'D']
			]) === 'string'
		).toBe(true)
	})
	it('generates the correct markup', async () => {
		const expected = `|  |\n| :--- | :---: |\n| A | B |\n| C | D |`
		expect(
			renderMarkdownTable([
				['A', 'B'],
				['C', 'D']
			])
		).toBe(expected)
	})
	it('returns empty string for empty data', async () => {
		expect(renderMarkdownTable([])).toBe('')
	})
})
