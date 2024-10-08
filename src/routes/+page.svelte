<script lang="ts">

    import './style.css';
    import { onMount } from 'svelte';
    import { marked } from 'marked';
    import type { GithubComment } from './comments/+server';
    import { DateInput } from 'date-picker-svelte';

    interface IssuePill {
        issue_number: number;
        repo: string;
        html_url: string;
    }

    let comments: Array<GithubComment>|undefined;
    let uniqueIssues: Array<IssuePill>|undefined;
    let dateInput: Date = new Date();
    let date = dateInput.toISOString().substring(0, 10);

    onMount(async () => {

        // Get the comments
        loadCommentsData();

        // Auto refresh comments every 5 minutes
        setInterval(() => {
            loadCommentsData();
        }, 300000);

    });

    async function loadCommentsData() {
        comments = undefined;
        date = dateInput.toISOString().substring(0, 10);
        comments = await fetch('/comments?date=' + date).then(res => res.json());

        // Get unique issue number with issue url from the list of comments
        if(typeof comments !== 'undefined' && comments.length > 0) {
            uniqueIssues = comments.reduce((acc, comment) => {
                if(!acc.find(issue => issue.issue_number === comment.issue_number)) {
                    acc.push({ issue_number: comment.issue_number, repo: comment.repo, html_url: comment.html_url.split('#')[0] });
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

<!-- Show loading indicator while loading comments -->
{#if comments === undefined}
<div class="loading-indicator" style="display: flex">
    <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
</div>
{/if}

<!-- Show comments -->
{#if comments !== undefined && comments.length > 0}
<ul>
    <!-- Show each comment -->
    {#each comments as comment (comment.id)}
        <li class="comment-container {comment.own_comment ? 'comment-own' : ''}">
            <a href={comment.html_url} target="_blank" rel="noopener" class="comment-link">
                <div class="comment-header">
                    <img class="comment-avatar" src={comment.user.avatar_url} alt="avatar" />
                    <div class="comment-header-username">
                        {comment.user.login}
                    </div>
                    <div class="comment-timestamp">
                        <b>{new Date(comment.created_at).toLocaleTimeString('en-GB', { timeZoneName: 'short' })}</b>
                        ({new Date(comment.created_at).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata' })} IST)
                    </div>
                </div>
                <div class="markdown-body comment">
                    {@html comment.body ? marked(comment.body) : ''}
                </div>
                <div class="comment-footer">
                    <div class="comment-issue-details">
                        <span class="issue-link">#{comment.issue_number}</span> <b>{comment.repo}</b>
                    </div>
                </div>
            </a>
        </li>
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
{#if typeof comments == 'object' && (comments.length === undefined || comments.length === 0)}
    <div class="no-comments">
        <h2>No comments found</h2>
    </div>
{/if}