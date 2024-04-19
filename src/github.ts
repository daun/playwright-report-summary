import { getOctokit } from '@actions/github'
import { components } from "@octokit/openapi-types"

type IssueComment = components["schemas"]["issue-comment"];
type PullRequestReview = components["schemas"]["pull-request-review"];
type Octokit = ReturnType<typeof getOctokit>

export async function getIssueComments(octokit: Octokit, { owner, repo, issue_number }: { owner: string, repo: string, issue_number: number }): Promise<IssueComment[]> {
	const params = { owner, repo, issue_number }
	const { data: comments } = await octokit.rest.issues.listComments(params)
	return comments
}

export async function updateIssueComment(octokit: Octokit, { owner, repo, comment_id, body }: { owner: string, repo: string, comment_id: number, body: string }): Promise<void> {
	const params = { owner, repo, comment_id, body }
	await octokit.rest.issues.updateComment(params)
}

export async function createIssueComment(octokit: Octokit, { owner, repo, issue_number, body }: { owner: string, repo: string, issue_number: number, body: string }): Promise<IssueComment> {
	const params = { owner, repo, issue_number, body }
	const { data: comment } = await octokit.rest.issues.createComment(params)
	return comment
}

export async function createPullRequestReview(octokit: Octokit, { owner, repo, pull_number, body }: { owner: string, repo: string, pull_number: number, body: string }): Promise<PullRequestReview> {
	const params = { owner, repo, pull_number, body, event: 'COMMENT' as const }
	const { data: review } = await octokit.rest.pulls.createReview(params)
	return review
}
