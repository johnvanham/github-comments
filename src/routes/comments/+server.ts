import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
export interface GithubFeedItem {
	id: number;
	type: 'comment' | 'event';
	created_at: string;
	user: GithubUser;
	repo: string;
	html_url: string;
	issue_url: string;
	issue_number: number;
	own_comment?: boolean;

	// For comments
	body?: string;

	// For events
	event?: 'opened' | 'closed' | 'reopened';
	issue_title?: string;
}

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

export interface GithubEvent {
	id: string;
	type: string;
	created_at: string;
	actor: GithubUser;
	payload: {
		action: string;
		issue: {
			number: number;
			html_url: string;
			url: string;
			body: string;
			title: string;
		};
	};
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

	let feedItems: GithubFeedItem[] = [];

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
		// Fetch comments and events in parallel
		const [repoComments, repoEvents] = await Promise.all([
			fetchCommentsForRepo(repo, headers, filterDate),
			fetchEventsForRepo(repo, headers, filterDate)
		]);

		feedItems = feedItems.concat(repoComments, repoEvents);
	}

	// Sort feed items by created_at
	feedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	// Merge close/reopen events with comments that happen within 30 seconds
	feedItems = mergeEventsWithComments(feedItems);

	// Filter feed items for the specified date
	const filteredItems = feedItems.filter((item) => item.created_at.substring(0, 10) === filterDate);

	const endTime = Date.now();
	const duration = endTime - startTime;

	console.log(
		`[${new Date().toISOString()}] Returning ${filteredItems.length} items (${filteredItems.filter((i) => i.type === 'comment').length} comments, ${filteredItems.filter((i) => i.type === 'event').length} events) for date ${filterDate} - Request took ${duration}ms`
	);

	// Return the feed items
	return json(filteredItems);
}

async function fetchCommentsForRepo(
	repo: string,
	headers: Record<string, string>,
	filterDate: string
): Promise<GithubFeedItem[]> {
	let page = 1;
	let repoComments: GithubFeedItem[] = [];
	let shouldContinue = true;

	while (shouldContinue) {
		const issuesUrl = `https://api.github.com/repos/${repo}/issues/comments?per_page=100&page=${page}&direction=desc`;

		const res = await fetch(issuesUrl, { headers });

		if (!res.ok) {
			console.error(
				`[${new Date().toISOString()}] Error fetching comments from ${repo} page ${page}: ${res.status} ${res.statusText}`
			);
			break;
		}

		const data = (await res.json()) as GithubComment[];

		if (typeof data.map !== 'function') {
			console.warn(
				`[${new Date().toISOString()}] Invalid response format from ${repo} comments page ${page}, skipping`
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

		const processedComments: GithubFeedItem[] = data.map((comment) => ({
			id: comment.id,
			type: 'comment' as const,
			created_at: comment.created_at,
			user: comment.user,
			repo: env.GITHUB_ORG_NAME ? repo.replace(env.GITHUB_ORG_NAME + '/', '') : repo,
			html_url: comment.html_url,
			issue_url: comment.issue_url,
			issue_number: parseInt(comment.issue_url.split('/').pop() || '0', 10),
			own_comment: comment.user.login === env.GITHUB_OWN_USERNAME,
			body: truncate(comment.body, 3)
		}));

		repoComments = repoComments.concat(processedComments);

		const hasMatchingOrPriorDate = data.some(
			(comment) => comment.created_at.substring(0, 10) <= filterDate
		);

		if (hasMatchingOrPriorDate) {
			console.log(
				`[${new Date().toISOString()}] Found comments matching or prior to ${filterDate} in ${repo} page ${page}, stopping pagination`
			);
			shouldContinue = false;
		} else {
			page++;
		}

		if (page > 50) {
			console.warn(
				`[${new Date().toISOString()}] Reached maximum page limit (50) for ${repo} comments, stopping pagination`
			);
			break;
		}
	}

	return repoComments;
}

async function fetchEventsForRepo(
	repo: string,
	headers: Record<string, string>,
	filterDate: string
): Promise<GithubFeedItem[]> {
	let page = 1;
	let repoEvents: GithubFeedItem[] = [];
	let shouldContinue = true;

	const relevantEvents = ['opened', 'closed', 'reopened'];

	while (shouldContinue) {
		const eventsUrl = `https://api.github.com/repos/${repo}/events?per_page=100&page=${page}`;

		const res = await fetch(eventsUrl, { headers });

		if (!res.ok) {
			console.error(
				`[${new Date().toISOString()}] Error fetching events from ${repo} page ${page}: ${res.status} ${res.statusText}`
			);
			break;
		}

		const data = (await res.json()) as GithubEvent[];

		if (typeof data.map !== 'function') {
			console.warn(
				`[${new Date().toISOString()}] Invalid response format from ${repo} events page ${page}, skipping`
			);
			break;
		}

		if (data.length === 0) {
			console.log(
				`[${new Date().toISOString()}] No more events available for ${repo} at page ${page}`
			);
			break;
		}

		console.log(
			`[${new Date().toISOString()}] Fetched ${data.length} events from ${repo} page ${page}`
		);

		const processedEvents: GithubFeedItem[] = data
			.filter((event) => event.type === 'IssuesEvent' && relevantEvents.includes(event.payload.action))
			.map((event) => ({
				id: parseInt(event.id, 10),
				type: 'event' as const,
				created_at: event.created_at,
				user: event.actor,
				repo: env.GITHUB_ORG_NAME ? repo.replace(env.GITHUB_ORG_NAME + '/', '') : repo,
				html_url: event.payload.issue.html_url,
				issue_url: event.payload.issue.url,
				issue_number: event.payload.issue.number,
				own_comment: event.actor.login === env.GITHUB_OWN_USERNAME,
				event: event.payload.action as 'opened' | 'closed' | 'reopened',
				issue_title: event.payload.issue.title,
				body: event.payload.action === 'opened' ? truncate(event.payload.issue.body || '', 3) : undefined
			}));

		repoEvents = repoEvents.concat(processedEvents);

		const hasMatchingOrPriorDate = data.some(
			(event) => event.created_at.substring(0, 10) <= filterDate
		);

		if (hasMatchingOrPriorDate) {
			console.log(
				`[${new Date().toISOString()}] Found events matching or prior to ${filterDate} in ${repo} page ${page}, stopping pagination`
			);
			shouldContinue = false;
		} else {
			page++;
		}

		if (page > 50) {
			console.warn(
				`[${new Date().toISOString()}] Reached maximum page limit (50) for ${repo} events, stopping pagination`
			);
			break;
		}
	}

	return repoEvents;
}

// Merge close/reopen events with comments that happen within 30 seconds
function mergeEventsWithComments(feedItems: GithubFeedItem[]): GithubFeedItem[] {
	const mergedItems: GithubFeedItem[] = [];
	const itemsToSkip = new Set<number>();

	for (let i = 0; i < feedItems.length; i++) {
		if (itemsToSkip.has(i)) continue;

		const item = feedItems[i];
		
		// Only merge close/reopen events (not opens, as they already have issue body)
		if (item.type === 'event' && (item.event === 'closed' || item.event === 'reopened')) {
			// Look for a comment from the same user on the same issue within 30 seconds
			const itemTime = new Date(item.created_at).getTime();
			
			for (let j = 0; j < feedItems.length; j++) {
				if (j === i || itemsToSkip.has(j)) continue;
				
				const potentialComment = feedItems[j];
				
				if (
					potentialComment.type === 'comment' &&
					potentialComment.issue_number === item.issue_number &&
					potentialComment.user.login === item.user.login &&
					potentialComment.repo === item.repo
				) {
					const commentTime = new Date(potentialComment.created_at).getTime();
					const timeDiff = Math.abs(itemTime - commentTime);
					
					// If within 30 seconds, merge them
					if (timeDiff <= 30000) {
						// Use the earlier timestamp
						const earlierTime = itemTime < commentTime ? item.created_at : potentialComment.created_at;
						
						// Create merged event with comment body
						const mergedEvent: GithubFeedItem = {
							...item,
							created_at: earlierTime,
							body: potentialComment.body
						};
						
						mergedItems.push(mergedEvent);
						itemsToSkip.add(j); // Skip the comment since it's now merged
						itemsToSkip.add(i); // Skip this event since it's now merged
						break;
					}
				}
			}
		}
		
		// If not merged, add the original item
		if (!itemsToSkip.has(i)) {
			mergedItems.push(item);
		}
	}

	return mergedItems;
}

// Truncate a string to only include first paragraph
function truncate(str: string, paras: number) {
	const paragraphs = str.split('\n');
	return paragraphs.length > paras
		? paragraphs.slice(0, paras).join('<br>') + '<span class="more">...</span>'
		: str;
}
