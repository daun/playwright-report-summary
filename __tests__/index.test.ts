/**
 * Unit tests for the action's entrypoint, src/index.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import { Context } from '@actions/github/lib/context'
import * as actionsCore from '@actions/core'
import * as actionsGitHub from '@actions/github'

import * as index from '../src/index'
import * as fs from '../src/fs'
import * as report from '../src/report'
import * as github from '../src/github'

// Mock the GitHub Actions core library
jest.spyOn(actionsCore, 'info').mockImplementation(jest.fn())
jest.spyOn(actionsCore, 'warning').mockImplementation(jest.fn())
jest.spyOn(actionsCore, 'error').mockImplementation(jest.fn())
const debugMock = jest.spyOn(actionsCore, 'debug').mockImplementation(jest.fn())
const getInputMock = jest.spyOn(actionsCore, 'getInput').mockImplementation((name: string) => inputs[name] || '')
const setFailedMock = jest.spyOn(actionsCore, 'setFailed').mockImplementation(jest.fn())
const setOutputMock = jest.spyOn(actionsCore, 'setOutput').mockImplementation(jest.fn())

// Mock the fs module
const readFileMock = jest.spyOn(fs, 'readFile')

// Mock the report module
const parseReportMock = jest.spyOn(report, 'parseReport')
const renderReportSummaryMock = jest.spyOn(report, 'renderReportSummary')

// Mock the github module
const createIssueCommentMock = jest.spyOn(github, 'createIssueComment')

// Mock the GitHub Actions context library
// const contextMock = jest.spyOn(github, 'context')

// Mock the GitHub Actions Octokit instance
type Octokit = ReturnType<typeof actionsGitHub.getOctokit>

const octokitMock = {
	rest: {
		issues: {
			listComments: jest.fn(async () => ({ data: [{ id: 1 }, { id: 2 }] })),
			updateComment: jest.fn(async (data: any) => ({ data: { ...data, id: data.comment_id } })),
			createComment: jest.fn(async (data: any) => ({ data: { ...data, id: 4 } }))
		},
		pulls: {
			createReview: jest.fn(async (data: object) => ({ data: { ...data, id: 5 } }))
		}
	}
} as unknown as Octokit

const getOctokitMock = jest.spyOn(actionsGitHub, 'getOctokit').mockImplementation(() => octokitMock)

// Mock the action's entrypoint
const runMock = jest.spyOn(index, 'run')

// Mark as GitHub action environment
// process.env.GITHUB_ACTIONS = 'true'

// Shallow clone original @actions/github context
// @ts-expect-error missing issue and repo keys
const originalContext: Context = { issue: {}, ...actionsGitHub.context }

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
			base: {
				ref: 'main',
				sha: 'abc123'
			},
			head: {
				ref: 'feature-branch',
				sha: 'def456'
			}
		}
	}
}

// Inputs for mock @actions/core
let inputs: Record<string, string> = {}

function setContext(context: any): void {
	Object.defineProperty(actionsGitHub, 'context', { value: context, writable: true })
}

describe('action', () => {
	beforeAll(() => {})

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

	it('reads its inputs', async () => {
		inputs = {
			'report-file': '__tests__/__fixtures__/report-valid.json',
			'comment-title': 'Custom comment title'
		}

		await index.run()

		expect(runMock).toHaveReturned()
		expect(getInputMock).toHaveBeenCalledWith('github-token')
		expect(getInputMock).toHaveBeenCalledWith('report-file', { required: true })
		expect(getInputMock).toHaveBeenCalledWith('report-url')
		expect(getInputMock).toHaveBeenCalledWith('report-tag')
		expect(getInputMock).toHaveBeenCalledWith('comment-title')
		expect(getInputMock).toHaveBeenCalledWith('icon-style')
		expect(getInputMock).toHaveBeenCalledWith('create-comment')
		expect(getInputMock).toHaveBeenCalledWith('job-summary')
		expect(getInputMock).toHaveBeenCalledWith('test-command')
		expect(getInputMock).toHaveBeenCalledWith('footer')
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
		expect(debugMock).toHaveBeenNthCalledWith(5, 'Creating comment? yes')
		expect(debugMock).toHaveBeenNthCalledWith(6, 'Creating job summary? no')
	})

	it('creates an Octokit instance', async () => {
		inputs = {
			'github-token': 'some-token'
		}

		await index.run()
		expect(runMock).toHaveReturned()
		expect(getOctokitMock).toHaveBeenCalledWith('some-token')
	})

	it('reads the supplied report file', async () => {
		inputs = {
			'report-file': '__tests__/__fixtures__/report-valid.json'
		}

		await index.run()

		expect(runMock).toHaveReturned()
		expect(readFileMock).toHaveBeenNthCalledWith(
			1,
			expect.stringMatching(/__tests__[/]__fixtures__[/]report-valid.json$/)
		)
	})

	it('parses the report and renders a summary', async () => {
		inputs = {
			'report-file': '__tests__/__fixtures__/report-valid.json'
		}

		await index.run()
		expect(runMock).toHaveReturned()

		expect(parseReportMock).toHaveBeenNthCalledWith(1, expect.any(String))
		expect(renderReportSummaryMock).toHaveBeenNthCalledWith(
			1,
			expect.any(Object),
			expect.objectContaining({
				commit: 'def456',
				title: 'Playwright test results',
				reportUrl: expect.any(String),
				iconStyle: expect.any(String)
			})
		)
	})

	it('sets a summary and comment id output', async () => {
		inputs = {
			'report-file': '__tests__/__fixtures__/report-valid.json'
		}

		await index.run()

		expect(runMock).toHaveReturned()
		expect(setOutputMock).toHaveBeenNthCalledWith(1, 'summary', expect.stringContaining('# Playwright test results'))
		expect(setOutputMock).toHaveBeenNthCalledWith(2, 'comment-id', expect.anything())
	})

	it('creates a comment', async () => {
		inputs = {
			'report-file': '__tests__/__fixtures__/report-valid.json'
		}

		await index.run()

		expect(runMock).toHaveReturned()
		expect(createIssueCommentMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				body: expect.stringContaining('# Playwright test results')
			})
		)
	})

	it('can disable creating a comment', async () => {
		inputs = {
			'report-file': '__tests__/__fixtures__/report-valid.json',
			'create-comment': 'false'
		}

		await index.run()

		expect(runMock).toHaveReturned()
		expect(createIssueCommentMock).not.toHaveBeenCalled()
	})

	it('sets a failed status', async () => {
		inputs = {
			'report-file': 'file-does-not-exist.json'
		}

		await index.run()

		expect(runMock).toHaveReturned()
		expect(setFailedMock).toHaveBeenNthCalledWith(
			1,
			'Report file file-does-not-exist.json not found. Make sure Playwright is configured to generate a JSON report.'
		)
	})
})
