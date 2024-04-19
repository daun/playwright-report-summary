import { getOctokit } from '@actions/github'

// eslint-disable-next-line import/no-unresolved
import { components } from '@octokit/openapi-types'

type IssueComment = components['schemas']['issue-comment']
type PullRequestReview = components['schemas']['pull-request-review']
type Octokit = ReturnType<typeof getOctokit>

export async function getIssueComments(
	octokit: Octokit,
	params: { owner: string; repo: string; issue_number: number }
): Promise<IssueComment[]> {
	const { data: comments } = await octokit.rest.issues.listComments(params)
	return comments
}

export async function createIssueComment(
	octokit: Octokit,
	params: { owner: string; repo: string; issue_number: number; body: string }
): Promise<IssueComment> {
	const { data: comment } = await octokit.rest.issues.createComment(params)
	return comment
}

export async function updateIssueComment(
	octokit: Octokit,
	params: { owner: string; repo: string; comment_id: number; body: string }
): Promise<IssueComment> {
	const { data: comment } = await octokit.rest.issues.updateComment(params)
	return comment
}

export async function createPullRequestReview(
	octokit: Octokit,
	params: { owner: string; repo: string; pull_number: number; body: string }
): Promise<PullRequestReview> {
	const { data: review } = await octokit.rest.pulls.createReview({ ...params, event: 'COMMENT' })
	return review
}
