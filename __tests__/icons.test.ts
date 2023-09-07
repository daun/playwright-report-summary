/**
 * Unit tests for src/icons.ts
 */

import { expect } from '@jest/globals'
import { renderIcon } from '../src/icons'

describe('icons.ts', () => {
	it('returns a string', async () => {
		expect(renderIcon('something')).toBe('')
	})
})
