import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
export interface GithubComment {
	id: number;
	body: string;
	created_at: string;
	user: GithubUser;
	repo: string;
	html_url: string;
	issue_url: string;
	issue_number: number;
	own_comment: boolean;
}

export interface GithubUser {
	login: string;
	avatar_url: string;
}

export async function GET(event: RequestEvent) {
	const startTime = Date.now();
	const date = event.url.searchParams.get('date');
	const clientIP = event.getClientAddress();

	console.log(
		`[${new Date().toISOString()}] GET /comments - IP: ${clientIP}, Date param: ${date || 'today'}`
	);

	if (!env.GITHUB_TOKEN) {
		console.error(`[${new Date().toISOString()}] Error: No GITHUB_TOKEN defined`);
		throw new Error('No GITHUB_TOKEN defined');
	}

	const headers = {
		Authorization: `token ${env.GITHUB_TOKEN}`
	};

	let comments: GithubComment[] = [];

	const repos = env.GITHUB_REPOSITORIES?.split(',') || [];

	if (repos.length === 0) {
		console.error(`[${new Date().toISOString()}] Error: No repositories defined`);
		throw new Error('No repositories defined');
	}

	console.log(
		`[${new Date().toISOString()}] Fetching comments from ${repos.length} repositories: ${repos.join(', ')}`
	);

	const filterDate = date || new Date().toISOString().substring(0, 10);

	for (const repo of repos) {
		let page = 1;
		let repoComments: GithubComment[] = [];
		let shouldContinue = true;

		while (shouldContinue) {
			const issuesUrl = `https://api.github.com/repos/${repo}/issues/comments?per_page=100&page=${page}&direction=desc`;

			// Get the comments
			const res = await fetch(issuesUrl, { headers });

			if (!res.ok) {
				console.error(
					`[${new Date().toISOString()}] Error fetching from ${repo} page ${page}: ${res.status} ${res.statusText}`
				);
				break;
			}

			const data = (await res.json()) as GithubComment[];

			// Check if data.map is a function
			if (typeof data.map !== 'function') {
				console.warn(
					`[${new Date().toISOString()}] Invalid response format from ${repo} page ${page}, skipping`
				);
				break;
			}

			if (data.length === 0) {
				console.log(
					`[${new Date().toISOString()}] No more comments available for ${repo} at page ${page}`
				);
				break;
			}

			console.log(
				`[${new Date().toISOString()}] Fetched ${data.length} comments from ${repo} page ${page}`
			);

			// Process the comments for this page
			const processedComments = data.map((comment) => ({
				...comment,
				body: truncate(comment.body, 3),
				repo: env.GITHUB_ORG_NAME ? repo.replace(env.GITHUB_ORG_NAME+'/', '') : repo,
				own_comment: comment.user.login === env.GITHUB_OWN_USERNAME,
				issue_number: parseInt(comment.issue_url.split('/').pop() || '0', 10)
			}));

			repoComments = repoComments.concat(processedComments);

			// Check if any comment in this page has a date matching or prior to filter date
			const hasMatchingOrPriorDate = data.some(
				(comment) => comment.created_at.substring(0, 10) <= filterDate
			);

			if (hasMatchingOrPriorDate) {
				console.log(
					`[${new Date().toISOString()}] Found comments matching or prior to ${filterDate} in ${repo} page ${page}, stopping pagination`
				);
				shouldContinue = false;
			} else {
				console.log(
					`[${new Date().toISOString()}] No comments matching or prior to ${filterDate} found in ${repo} page ${page}, fetching next page`
				);
				page++;
			}

			// Safety limit to prevent infinite loops
			if (page > 50) {
				console.warn(
					`[${new Date().toISOString()}] Reached maximum page limit (50) for ${repo}, stopping pagination`
				);
				break;
			}
		}

		comments = comments.concat(repoComments);
	}

	// Sort comments by created_at
	comments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	// Filter comments for the specified date
	const filteredComments = comments.filter(
		(comment) => comment.created_at.substring(0, 10) === filterDate
	);

	const endTime = Date.now();
	const duration = endTime - startTime;

	console.log(
		`[${new Date().toISOString()}] Returning ${filteredComments.length} comments (filtered from ${comments.length} total) for date ${filterDate} - Request took ${duration}ms`
	);

	// Return the comments
	return json(filteredComments);
}

// Truncate a string to only include first paragraph
function truncate(str: string, paras: number) {
	const paragraphs = str.split('\n');
	return paragraphs.length > paras
		? paragraphs.slice(0, paras).join('<br>') + '<span class="more">...</span>'
		: str;
}
