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
import * as fs from '../src/fs'
import * as report from '../src/report'
import { Context } from '@actions/github/lib/context'

// Mock the GitHub Actions core library
const debugMock = jest.spyOn(core, 'debug').mockImplementation(jest.fn())
const infoMock = jest.spyOn(core, 'info').mockImplementation(jest.fn())
const warningMock = jest.spyOn(core, 'warning').mockImplementation(jest.fn())
const errorMock = jest.spyOn(core, 'error').mockImplementation(jest.fn())
const getInputMock = jest.spyOn(core, 'getInput').mockImplementation((name: string) => inputs[name] || '')
const setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation(jest.fn())
const setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation(jest.fn())

// Mock the fs module
const readFileMock = jest.spyOn(fs, 'readFile')

// Mock the report module
const parseReportMock = jest.spyOn(report, 'parseReport')
const renderReportSummaryMock = jest.spyOn(report, 'renderReportSummary')

// Mock the GitHub Actions context library
// const getOctokitMock = jest.spyOn(github, 'getOctokit')
// const contextMock = jest.spyOn(github, 'context')

// Mock the action's entrypoint
const runMock = jest.spyOn(index, 'run')

// Mark as GitHub action environment
// process.env.GITHUB_ACTIONS = 'true'

// Shallow clone original @actions/github context
// @ts-expect-error missing issue and repo keys
const originalContext: Context = { issue: {}, ...github.context }

const defaultContext = {
	eventName: 'pull_request',
	repo: {
		owner: 'some-owner',
		repo: 'some-repo'
	},
	issue: {
		owner: 'some-owner',
		number: 12345
	},
	payload: {
		issue: {
			number: 12345
		},
		pull_request: {
			head: {
				ref: 'feature-branch',
				sha: 'abc123'
			}
		}
	}
}

// Inputs for mock @actions/core
let inputs: Record<string, string> = {}

function setContext(context: any): void {
	Object.defineProperty(github, 'context', { value: context, writable: true })
}

describe('action', () => {
	beforeAll(() => {
	})

	beforeEach(() => {
		setContext(defaultContext)
		jest.clearAllMocks()
	})

	afterEach(() => {
		// Restore @actions/github context
		setContext(originalContext)
	})

	afterAll(() => {
		// Restore
		jest.restoreAllMocks()
	})

	it('debugs its inputs', async () => {
		inputs = {
			'report-file': '__tests__/__fixtures__/report-valid.json',
			'comment-title': 'Custom comment title'
		}

		await index.run()
		expect(runMock).toHaveReturned()

		expect(debugMock).toHaveBeenNthCalledWith(1, 'Report file: __tests__/__fixtures__/report-valid.json')
		expect(debugMock).toHaveBeenNthCalledWith(2, 'Report url: (none)')
		expect(debugMock).toHaveBeenNthCalledWith(3, 'Report tag: (none)')
		expect(debugMock).toHaveBeenNthCalledWith(4, 'Comment title: Custom comment title')
	})

	it('reads the supplied report file', async () => {
		inputs = {
			'report-file': '__tests__/__fixtures__/report-valid.json'
		}

		await index.run()
		expect(runMock).toHaveReturned()

		expect(readFileMock).toHaveBeenNthCalledWith(1, expect.stringMatching(/__tests__[/]__fixtures__[/]report-valid.json$/))
	})

	it('parses the report and renders a summary', async () => {
		inputs = {
			'report-file': '__tests__/__fixtures__/report-valid.json'
		}

		await index.run()
		expect(runMock).toHaveReturned()

		expect(parseReportMock).toHaveBeenNthCalledWith(1, expect.any(String))
		expect(renderReportSummaryMock).toHaveBeenNthCalledWith(1, expect.any(Object), expect.objectContaining({
			commit: expect.any(String),
			title: expect.any(String),
			reportUrl: expect.any(String),
			iconStyle: expect.any(String)
		}))
	})

	it('sets a summary and comment id output', async () => {
		inputs = {
			'report-file': '__tests__/__fixtures__/report-valid.json',
			'comment-title': 'Custom comment title'
		}

		await index.run()
		expect(runMock).toHaveReturned()

		// Verify that all of the core library functions were called correctly
		expect(setOutputMock).toHaveBeenNthCalledWith(1, 'summary', expect.anything())
		expect(setOutputMock).toHaveBeenNthCalledWith(2, 'comment-id', expect.anything())
	})

	it('sets a failed status', async () => {
		inputs = {
			'report-file': 'file-does-not-exist.json'
		}

		await index.run()
		expect(runMock).toHaveReturned()

		// Verify that all of the core library functions were called correctly
		expect(setFailedMock).toHaveBeenNthCalledWith(1, 'Report file file-does-not-exist.json not found. Make sure Playwright is configured to generate a JSON report.')
	})
})
