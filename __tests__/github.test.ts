/**
 * Unit tests for src/github.ts
 */

import { expect } from '@jest/globals'

import * as github from '@actions/github'
import { createPullRequestReview } from '../src/github'

// jest.mock('@actions/github', () => ({
// 	getOctokit: jest.fn().mockReturnValue({
// 		rest: {
// 			issues: {
// 				listComments: jest.fn(),
// 				updateComment: jest.fn(),
// 				createComment: jest.fn()
// 			},
// 			pulls: {
// 				createReview: jest.fn()
// 			}
// 		}
// 	})
// }))

describe('github', () => {
  let octokit: any;

  beforeEach(() => {
		octokit = {
			rest: {
				issues: {
					listComments: jest.fn(() => Promise.resolve({ data: [ { id: 1 }, { id: 2 }] })),
					updateComment: jest.fn((data: any) => Promise.resolve({ data: { id: data.comment_id } })),
					createComment: jest.fn((data: any) => Promise.resolve({ data: { ...data, id: 4 } })),
				},
				pulls: {
					createReview: jest.fn((data: object) => Promise.resolve({ data: { ...data, id: 5 } })),
				}
			}
		};
		jest.clearAllMocks();
  });

	describe('createPullRequestReview', () => {
		it('calls pulls.createReview with correct parameters', async () => {
			const params = { owner: 'owner', repo: 'repo', pull_number: 123, body: 'body' };
			const expectedArguments = { ...params, event: 'COMMENT' };

			await createPullRequestReview(octokit, params);

			expect(octokit.rest.pulls.createReview).toHaveBeenCalledWith(expectedArguments);
		});

		it('returns the review data', async () => {
			const params = { owner: 'owner', repo: 'repo', pull_number: 123, body: 'body' };
			const expectedReview = { ...params, id: expect.any(Number) };

			const review = await createPullRequestReview(octokit, params);

			expect(review).toMatchObject(expectedReview);
		});

		it('throws an error if createReview fails', async () => {
			octokit.rest.pulls.createReview.mockRejectedValue(new Error('API error'));
			const params = { owner: 'owner', repo: 'repo', pull_number: 123, body: 'body' };

			await expect(createPullRequestReview(octokit, params)).rejects.toThrow('API error');
		});
	});
});
