/**
 * Unit tests for the action's entrypoint, src/index.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import * as index from '../src/index'

// Mock the GitHub Actions core library
const debugMock = jest.spyOn(core, 'debug')
const getInputMock = jest.spyOn(core, 'getInput')
const setFailedMock = jest.spyOn(core, 'setFailed')
const setOutputMock = jest.spyOn(core, 'setOutput')

// Mock the GitHub Actions context library
// const getOctokitMock = jest.spyOn(github, 'getOctokit')
// const contextMock = jest.spyOn(github, 'context')

// Mock the action's entrypoint
const runMock = jest.spyOn(index, 'run')

// Mark as GitHub action environment
// process.env.GITHUB_ACTIONS = 'true'

describe('action', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('sets the comment id output', async () => {
		// Set the action's inputs as return values from core.getInput()
		getInputMock.mockImplementation((name: string): string => {
			switch (name) {
				case 'report-file':
					return '__tests__/__fixtures__/report-valid.json'
				case 'comment-title':
					return 'Custom comment title'
				default:
					return ''
			}
		})

		await index.run()
		expect(runMock).toHaveReturned()

		// Verify that all of the core library functions were called correctly
		expect(debugMock).toHaveBeenNthCalledWith(1, 'Report file: __tests__/__fixtures__/report-valid.json')
		expect(debugMock).toHaveBeenNthCalledWith(2, 'Comment title: Custom comment title')
		expect(setOutputMock).toHaveBeenNthCalledWith(1, 'comment-id', expect.anything())
	})

	it('sets a failed status', async () => {
		// Set the action's inputs as return values from core.getInput()
		getInputMock.mockImplementation((name: string): string => {
			switch (name) {
				case 'report-file':
					return 'file-does-not-exist.json'
				default:
					return ''
			}
		})

		await index.run()
		expect(runMock).toHaveReturned()

		// Verify that all of the core library functions were called correctly
		expect(setFailedMock).toHaveBeenNthCalledWith(
			1,
			'Failed to find report file at path file-does-not-exist.json'
		)
	})
})
