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
import { parseReport, renderReportSummary } from './report'

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

	const { workflow, eventName, repo, payload } = context
	const { owner, number: pull_number } = context.issue || {}

	const token = getInput('github-token')
	const reportFile = getInput('report-file', { required: true })
	const reportUrl = getInput('report-url')
	const reportTag = getInput('report-tag') || workflow
	const commentTitle = getInput('comment-title') || 'Playwright test results'
	const iconStyle = getInput('icon-style') || 'octicons'
	const jobSummary = getBooleanInput('job-summary')

	debug(`Report file: ${reportFile}`)
	debug(`Report url: ${reportUrl}`)
	debug(`Report tag: ${reportTag || '(none)'}`)
	debug(`Comment title: ${commentTitle}`)

	let ref: string = context.ref
	let sha: string = context.sha

	if (eventName === 'push') {
		ref = payload.ref
		sha = payload.after
		console.log(`Commit pushed onto ${ref} (${sha})`)
	} else if (eventName === 'pull_request' || eventName === 'pull_request_target') {
		ref = payload.pull_request?.base?.ref
		sha = payload.pull_request?.head?.sha
		console.log(`PR #${pull_number} targeting ${ref} (${sha})`)
	} else if (eventName === 'workflow_dispatch') {
		console.log(`Workflow dispatched on ${ref} (${sha})`)
	} else {
		console.warn(`Unsupported event type: ${eventName}`)
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
		title: commentTitle,
		reportUrl,
		iconStyle
	})

	const prefix = `<!-- playwright-report-github-action -- ${reportTag} -->`
	const body = `${prefix}\n\n${summary}`
	let commentId = null

	const octokit = getOctokit(token)

	const hasPR = eventName === 'pull_request' || eventName === 'pull_request_target'

	if (!hasPR) {
		console.log('No PR associated with this action run. Not posting a check or comment.')
	} else {
		startGroup(`Commenting test report on PR`)
		try {
			const { data: comments } = await octokit.rest.issues.listComments({
				...repo,
				issue_number: pull_number
			})
			const existingComment = comments.findLast((c) => c.body?.includes(prefix))
			commentId = existingComment?.id || null
		} catch (error: unknown) {
			console.error(`Error fetching existing comments: ${(error as Error).message}`)
		}

		if (commentId) {
			console.log(`Found previous comment #${commentId}`)
			try {
				await octokit.rest.issues.updateComment({
					...repo,
					comment_id: commentId,
					body
				})
				console.log(`Updated previous comment #${commentId}`)
			} catch (error: unknown) {
				console.error(`Error updating previous comment: ${(error as Error).message}`)
				commentId = null
			}
		}

		if (!commentId) {
			console.log('Creating new comment')
			try {
				const { data: newComment } = await octokit.rest.issues.createComment({
					...repo,
					issue_number: pull_number,
					body
				})
				commentId = newComment.id
				console.log(`Created new comment #${commentId}`)
			} catch (error: unknown) {
				console.error(`Error creating comment: ${(error as Error).message}`)
				console.log(`Submitting PR review comment instead...`)
				try {
					const { issue } = context
					await octokit.rest.pulls.createReview({
						owner,
						repo: issue.repo,
						pull_number: issue.number,
						event: 'COMMENT',
						body
					})
				} catch (error: unknown) {
					console.error(`Error creating PR review: ${(error as Error).message}`)
				}
			}
		}
		endGroup()
	}

	if (!commentId && hasPR) {
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
