/**
 * Unit tests for src/icons.ts
 */

import { expect } from '@jest/globals'
import { renderIcon } from '../src/icons'

describe('renderIcon', () => {
	it('returns a string', async () => {
		expect(typeof renderIcon('passed') === 'string').toBe(true)
	})
	it('returns an empty string for undefined icons', async () => {
		expect(renderIcon('no-such-icon')).toBe('')
	})
	it('renders markdown images', async () => {
		expect(renderIcon('passed')).toMatch(/^[!]\[([\w\s\d]+)\]\((https?:\/\/[\w\d./?&=_-]+)\)$/i)
	})
	it('colorizes markdown images', async () => {
		expect(renderIcon('passed')).toMatch(/\?.*?\bcolor=[\w]{6}\b/i)
	})
	it('renders emojis', async () => {
		expect(renderIcon('passed', { iconStyle: 'emojis' })).toBe('✅')
	})
})
