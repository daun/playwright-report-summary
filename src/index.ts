import path from 'path'
import {
	getInput,
	getBooleanInput,
	setOutput,
	setFailed,
	startGroup,
	endGroup,
	debug,
	warning,
	summary as setSummary
} from '@actions/core'
import { context, getOctokit } from '@actions/github'
import { fileExists, readFile } from './fs'
import { parseReport, renderReportSummary, getCommitUrl } from './report'
import {
	getIssueComments,
	createIssueComment,
	updateIssueComment,
	createPullRequestReview,
	getPullRequestInfo
} from './github'

/**
 * The main function for the action.
 */
export async function run(): Promise<void> {
	try {
		await report()
	} catch (error) {
		if (error instanceof Error) {
			setFailed(error.message)
		}
	}
}

/**
 * Parse the Playwright report and post a comment on the PR.
 */
export async function report(): Promise<void> {
	const cwd = process.cwd()

	const {
		workflow,
		eventName,
		repo: { owner, repo },
		payload
	} = context
	const { number: issueNumber } = context.issue || {}

	const token = getInput('github-token')
	const reportFile = getInput('report-file', { required: true })
	const reportUrl = getInput('report-url')
	const reportTag = getInput('report-tag') || workflow
	const commentTitle = getInput('comment-title') || 'Playwright test results'
	const customInfo = getInput('custom-info')
	const iconStyle = getInput('icon-style') || 'octicons'
	const jobSummary = getInput('job-summary') ? getBooleanInput('job-summary') : false
	const testCommand = getInput('test-command')

	debug(`Report file: ${reportFile}`)
	debug(`Report url: ${reportUrl || '(none)'}`)
	debug(`Report tag: ${reportTag || '(none)'}`)
	debug(`Comment title: ${commentTitle}`)
	debug(`Custom info: ${customInfo || '(none)'}`)

	let ref: string = context.ref
	let sha: string = context.sha
	let pr: number | null = null
	let commitUrl: string | undefined

	const octokit = getOctokit(token)

	switch (eventName) {
		case 'push':
			ref = payload.ref
			sha = payload.after
			commitUrl = getCommitUrl(payload.repository?.html_url, sha)
			console.log(`Commit pushed onto ${ref} (${sha})`)
			break

		case 'pull_request':
		case 'pull_request_target':
			ref = payload.pull_request?.base?.ref
			sha = payload.pull_request?.head?.sha
			pr = issueNumber
			commitUrl = getCommitUrl(payload.repository?.html_url, sha)
			console.log(`PR #${pr} targeting ${ref} (${sha})`)
			break

		case 'issue_comment':
			if (payload.issue?.pull_request) {
				pr = issueNumber
				;({ ref, sha } = await getPullRequestInfo(octokit, { owner, repo, pull_number: pr }))
				console.log(`Comment on PR #${pr} targeting ${ref} (${sha})`)
			} else {
				console.log(`Comment on issue #${issueNumber}`)
			}
			break

		case 'workflow_dispatch':
			console.log(`Workflow dispatched on ${ref} (${sha})`)
			break

		default:
			console.warn(`Unsupported event type: ${eventName}`)
			break
	}

	const reportPath = path.resolve(cwd, reportFile)
	const reportExists = await fileExists(reportPath)
	if (!reportExists) {
		debug(`Failed to find report file at path ${reportPath}`)
		throw new Error(
			`Report file ${reportFile} not found. Make sure Playwright is configured to generate a JSON report.`
		)
	}

	const data = await readFile(reportPath)
	const report = parseReport(data)
	const summary = renderReportSummary(report, {
		commit: sha,
		commitUrl,
		title: commentTitle,
		customInfo,
		reportUrl,
		iconStyle,
		testCommand
	})

	const prefix = `<!-- playwright-report-github-action -- ${reportTag} -->`
	const body = `${prefix}\n\n${summary}`
	let commentId = null

	if (!pr) {
		console.log('No PR associated with this action run. Not posting a check or comment.')
	} else {
		startGroup(`Commenting test report on PR`)
		try {
			const comments = await getIssueComments(octokit, { owner, repo, issue_number: pr })
			const existingComment = comments.findLast((c) => c.body?.includes(prefix))
			commentId = existingComment?.id || null
		} catch (error: unknown) {
			console.error(`Error fetching existing comments: ${(error as Error).message}`)
		}

		if (commentId) {
			console.log(`Found previous comment #${commentId}`)
			try {
				await updateIssueComment(octokit, { owner, repo, comment_id: commentId, body })
				console.log(`Updated previous comment #${commentId}`)
			} catch (error: unknown) {
				console.error(`Error updating previous comment: ${(error as Error).message}`)
				commentId = null
			}
		}

		if (!commentId) {
			console.log('Creating new comment')
			try {
				const newComment = await createIssueComment(octokit, { owner, repo, issue_number: pr, body })
				commentId = newComment.id
				console.log(`Created new comment #${commentId}`)
			} catch (error: unknown) {
				console.error(`Error creating comment: ${(error as Error).message}`)
				console.log(`Submitting PR review comment instead...`)
				try {
					const { issue } = context
					const review = await createPullRequestReview(octokit, {
						owner,
						repo: issue.repo,
						pull_number: issue.number,
						body
					})
					console.log(`Created pull request review: #${review.id}`)
				} catch (error: unknown) {
					console.error(`Error creating PR review: ${(error as Error).message}`)
				}
			}
		}
		endGroup()
	}

	if (!commentId && pr) {
		const intro = `Unable to comment on your PR — this can happen for PR's originating from a fork without write permissions. You can copy the test results directly into a comment using the markdown summary below:`
		warning(`${intro}\n\n${body}`, { title: 'Unable to comment on PR' })
	}

	if (jobSummary) {
		setSummary.addRaw(summary).write()
	}

	setOutput('summary', summary)
	setOutput('comment-id', commentId)
}

if (process.env.GITHUB_ACTIONS === 'true') {
	// eslint-disable-next-line @typescript-eslint/no-floating-promises
	run()
}
