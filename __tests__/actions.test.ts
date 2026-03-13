/**
 * Unit tests for src/actions.ts
 */

import { expect } from '@jest/globals'
import { parseListInput } from '../src/actions'

describe('parseListInput', () => {
	it('returns an array of strings', async () => {
		expect(parseListInput('a,b,c')).toBeInstanceOf(Array)
	})
	it('ignores whitespace', async () => {
		expect(parseListInput('a, b , c')).toEqual(['a', 'b', 'c'])
	})
	it('ignores empty items', async () => {
		expect(parseListInput('a, , c')).toEqual(['a', 'c'])
	})
	it('allow filtering', async () => {
		expect(parseListInput('a, b, c', ['b', 'c'])).toEqual(['b', 'c'])
	})
})
