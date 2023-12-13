import path from 'path'
import {
	getInput,
	getBooleanInput,
	setOutput,
	setFailed,
	startGroup,
	endGroup,
	debug,
	notice,
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
	const { owner, number: pull_number } = context.issue

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

	const base: { ref?: string; sha?: string } = {}
	const head: { ref?: string; sha?: string } = {}
	if (eventName === 'push') {
		base.ref = payload.ref
		base.sha = payload.before
		head.ref = payload.ref
		head.sha = payload.after
		console.log(`Commit pushed onto ${base.ref} (${head.sha})`)
	} else if (eventName === 'pull_request' || eventName === 'pull_request_target') {
		base.ref = payload.pull_request?.base?.ref
		base.sha = payload.pull_request?.base?.sha
		head.ref = payload.pull_request?.head?.ref
		head.sha = payload.pull_request?.head?.sha
		console.log(`PR #${pull_number} targeting ${base.ref} (${head.sha})`)
	} else {
		throw new Error(
			`Unsupported event type: ${eventName}. Only "pull_request", "pull_request_target", and "push" triggered workflows are currently supported.`
		)
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
		commit: head.sha,
		title: commentTitle,
		reportUrl,
		iconStyle
	})

	const prefix = `<!-- playwright-report-github-action -- ${reportTag} -->`
	const body = `${prefix}\n\n${summary}`
	let commentId = null

	const octokit = getOctokit(token)

	if (eventName !== 'pull_request' && eventName !== 'pull_request_target') {
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
		} catch (error: any) {
			console.error(`Error fetching existing comments: ${error.message}`)
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
			} catch (error: any) {
				console.error(`Error updating previous comment: ${error.message}`)
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
			} catch (error: any) {
				console.error(`Error creating comment: ${error.message}`)
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
				} catch (error: any) {
					console.error(`Error creating PR review: ${error.message}`)
				}
			}
		}
		endGroup()
	}

	if (!commentId) {
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
