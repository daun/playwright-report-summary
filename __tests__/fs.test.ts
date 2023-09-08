/**
 * Unit tests for src/fs.ts
 */

import { expect } from '@jest/globals'
import { fileExists, readFile } from '../src/fs'

describe('fileExists', () => {
	it('returns a Promise', async () => {
		expect(fileExists('package.json') instanceof Promise).toBe(true)
	})
	it('resolves to a boolean', async () => {
		expect(typeof (await fileExists('package.json')) === 'boolean').toBe(true)
	})
	it('returns true for existing files', async () => {
		expect(await fileExists('package.json')).toBe(true)
	})
	it('returns false for non-existing files', async () => {
		expect(await fileExists('no-such-icon.json')).toBe(false)
	})
})

describe('readFile', () => {
	it('returns a Promise', async () => {
		expect(readFile('LICENSE') instanceof Promise).toBe(true)
	})
	it('resolves to a string', async () => {
		expect(typeof (await readFile('LICENSE')) === 'string').toBe(true)
	})
	it('returns file contents', async () => {
		expect(await readFile('LICENSE')).toMatch(/THE SOFTWARE IS PROVIDED/)
	})
})
