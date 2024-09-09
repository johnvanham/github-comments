<script lang="ts">

    import './style.css';
    import { onMount } from 'svelte';
    import { marked } from 'marked';
    import type { GithubComment } from './comments/+server';
    import { DateInput } from 'date-picker-svelte';

    let comments: Array<GithubComment>|undefined;
    let dateInput: Date = new Date();
    let date = dateInput.toISOString().substring(0, 10);

    onMount(async () => {

        comments = await fetch('/comments?date=' + date).then(res => res.json());

        // Auto refresh comments every 5 minutes
        setInterval(() => {
            refresh();
        }, 300000);

        async function refresh() {
            refreshComments();
        }
    });

    async function refreshComments() {
        comments = undefined;
        date = dateInput.toISOString().substring(0, 10);
        comments = await fetch('/comments?date=' + date).then(res => res.json());
        console.log('Refreshed comments');
    }

</script>

<!-- Header -->
<div class="header">
    <h1>Github Comments Feed</h1>

    <!-- Date input -->
    <div class="date-input">
        <DateInput bind:value={dateInput} on:select={refreshComments} format="dd/MM/yyyy" />
    </div>
</div>

<!-- Show loading indicator while loading comments -->
<div class="loading-indicator" style="display: {comments === undefined ? 'flex' : 'none'}">
    <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
</div>

<!-- Show comments -->
{#if comments !== undefined}
<ul>
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
                        <span class="issue-link">#{comment.issue_number}</span>
                        repo {comment.repo.split('/').shift()}/<b>{comment.repo.split('/').pop()}</b>
                    </div>
                </div>
            </a>
        </li>
    {/each}
</ul>
{/if}