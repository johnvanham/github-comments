<script lang="ts">
	import './style.css';
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import type { GithubFeedItem } from './comments/+server';
	import { DateInput } from 'date-picker-svelte';

	interface IssuePill {
		issue_number: number;
		repo: string;
		html_url: string;
	}

	let feedItems: Array<GithubFeedItem> | undefined;
	let uniqueIssues: Array<IssuePill> | undefined;
	let dateInput: Date = new Date();
	let date: string;

	onMount(async () => {
		// Get the comments
		loadCommentsData();

		// Auto refresh comments every 5 minutes
		setInterval(() => {
			loadCommentsData();
		}, 300000);
	});

	async function loadCommentsData() {
		feedItems = undefined;
		// Format date as YYYY-MM-DD without timezone conversion
		const year = dateInput.getFullYear();
		const month = String(dateInput.getMonth() + 1).padStart(2, '0');
		const day = String(dateInput.getDate()).padStart(2, '0');
		date = `${year}-${month}-${day}`;
		feedItems = await fetch('/comments?date=' + date).then((res) => res.json());

		// Get unique issue number with issue url from the list of feed items
		if (typeof feedItems !== 'undefined' && feedItems.length > 0) {
			uniqueIssues = feedItems.reduce((acc, item) => {
				if (!acc.find((issue) => issue.issue_number === item.issue_number)) {
					acc.push({
						issue_number: item.issue_number,
						repo: item.repo,
						html_url: item.html_url.split('#')[0]
					});
				}
				return acc;
			}, [] as Array<IssuePill>);
			uniqueIssues.sort((a, b) => a.issue_number - b.issue_number);
		}
	}
</script>

<!-- Header -->
<div class="header">
	<h1>Github Comments Feed</h1>

	<!-- Date input -->
	<div class="date-input">
		<DateInput bind:value={dateInput} on:select={loadCommentsData} format="dd/MM/yyyy" />
	</div>
</div>

<!-- Show loading indicator while loading feed items -->
{#if feedItems === undefined}
	<div class="loading-indicator" style="display: flex">
		<div class="lds-ring">
			<div></div>
			<div></div>
			<div></div>
			<div></div>
		</div>
	</div>
{/if}

<!-- Show feed items -->
{#if feedItems !== undefined && feedItems.length > 0}
	<ul>
		<!-- Show each feed item -->
		{#each feedItems as item (item.id)}
			{#if item.type === 'comment'}
				<li class="comment-container {item.own_comment ? 'comment-own' : ''}">
					<a href={item.html_url} target="_blank" rel="noopener" class="comment-link">
						<div class="comment-header">
							<img class="comment-avatar" src={item.user.avatar_url} alt="avatar" />
							<div class="comment-header-username">
								{item.user.login}
							</div>
							<div class="comment-timestamp">
								<b
									>{new Date(item.created_at).toLocaleTimeString('en-GB', {
										timeZoneName: 'short'
									})}</b
								>
								({new Date(item.created_at).toLocaleTimeString('en-GB', {
									timeZone: 'Asia/Kolkata'
								})} IST)
							</div>
						</div>
						<div class="markdown-body comment">
							{@html item.body ? marked(item.body) : ''}
						</div>
						<div class="comment-footer">
							<div class="comment-issue-details">
								<span class="issue-link">#{item.issue_number}</span> <b>{item.repo}</b>
							</div>
						</div>
					</a>
				</li>
			{:else if item.type === 'event'}
				<li class="event-container {item.own_comment ? 'event-own' : ''}">
					<a href={item.html_url} target="_blank" rel="noopener" class="event-link">
						<div class="event-header">
							<img class="event-avatar" src={item.user.avatar_url} alt="avatar" />
							<div class="event-header-username">
								{item.user.login}
							</div>
							<div class="event-timestamp">
								<b
									>{new Date(item.created_at).toLocaleTimeString('en-GB', {
										timeZoneName: 'short'
									})}</b
								>
								({new Date(item.created_at).toLocaleTimeString('en-GB', {
									timeZone: 'Asia/Kolkata'
								})} IST)
							</div>
						</div>
						{#if item.body}
							<div class="event-body">
								<div class="markdown-body event-description">
									{@html marked(item.body)}
								</div>
							</div>
						{/if}
						<div class="event-footer">
							<div class="event-issue-details">
								<span class="issue-link">#{item.issue_number}</span> <b>{item.repo}</b>
							</div>
							<div class="event-badge-container">
								{#if item.event === 'opened'}
									<span class="issue-state-badge opened">
										<svg viewBox="0 0 16 16"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>
										Open
									</span>
								{:else if item.event === 'closed'}
									<span class="issue-state-badge closed">
										<svg viewBox="0 0 16 16"><path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z"></path><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"></path></svg>
										Closed
									</span>
								{:else if item.event === 'reopened'}
									<span class="issue-state-badge reopened">
										<svg viewBox="0 0 16 16"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path></svg>
										Reopened
									</span>
								{/if}
							</div>
						</div>
					</a>
				</li>
			{/if}
		{/each}
		<!-- Pills showing each unique issue number -->
		{#if uniqueIssues !== undefined && uniqueIssues.length > 0}
			<li class="unique-issues-container">
				{#each uniqueIssues as issue}
					<a href={issue.html_url} target="_blank" rel="noopener" class="issue-link pill">
						{issue.repo}#{issue.issue_number}
					</a>
				{/each}
			</li>
		{/if}
	</ul>
{/if}
{#if typeof feedItems == 'object' && (feedItems.length === undefined || feedItems.length === 0)}
	<div class="no-comments">
		<h2>No items found</h2>
	</div>
{/if}
