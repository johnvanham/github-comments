<h1>Github Comments for {new Date().toLocaleDateString()}</h1>

<style>
    ul {
        list-style-type: none;
        padding: 0;
        margin: 1em 0;
    }
    .comment-container {
        border: 1px solid #3d444d;
        border-radius: 4px;
        margin-bottom: 1em;
        background-color: #24001d;
    }
    .comment-container.comment-own {
        border: 1px solid #388bfd66;
        border-radius: 4px;
        background-color: transparent;
    }
    .comment-container:hover {
        border-color: #1f6feb;
        box-shadow: 0 0 0 1px #4493f8;
    }
    .comment-header {
        padding: 0.25em 0.5em;
        display: flex;
        align-items: center;
        border-bottom: 1px solid #3d444d;
        font-size: 0.8em;
    }
    .comment-own .comment-header {
        border-bottom: 1px solid #388bfd66;
    }
    .comment-avatar {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        margin-right: 0.5em;
    }
    .comment-timestamp {
        margin-left: auto;
    }
    .comment-header-username {
        font-weight: bold;
    }
    .comment {
        padding: 0.8em;
    }
    .comment-footer {
        display: flex;
        font-size: 0.8em;
        background-color: #37002c;
        padding: 0.5em;
        border-top: 1px solid #3d444d;
    }
    .comment-own .comment-footer {
        background-color: #388bfd1a;
        padding: 0.5em;
        border-top: 1px solid #388bfd66;
    }
    .comment-link {
        text-decoration: none;
        color: inherit;
        font-weight: inherit;
    }
    .issue-link {
        color: #388bfd;
    }
    .loading-indicator {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100px;
        width: 100%;
    }
    .lds-ring {
        display: inline-block;
        position: relative;
        width: 40px;
        height: 40px;
    }
    .lds-ring div {
        box-sizing: border-box;
        display: block;
        position: absolute;
        width: 32px;
        height: 32px;
        margin: 4%;
        border: 4px solid #a3a3a3;
        border-radius: 50%;
        animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        border-color: #a3a3a3 transparent transparent transparent;
    }
    .lds-ring div:nth-child(1) {
        animation-delay: -0.45s;
    }
    .lds-ring div:nth-child(2) {
        animation-delay: -0.3s;
    }
    .lds-ring div:nth-child(3) {
        animation-delay: -0.15s;
    }
    @keyframes lds-ring {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>

<script lang="ts">

    import { onMount } from 'svelte';
    import { marked } from 'marked';
    import type { GithubComment } from './comments/+server';

    let comments: Array<GithubComment>;

    onMount(async () => {
        comments = await fetch('/comments').then(res => res.json());

        // Auto refresh comments every 5 minutes
        setInterval(() => {
            refreshComments();
        }, 300000);

        async function refreshComments() {
            comments = await fetch('/comments').then(res => res.json());
            console.log('Refreshed comments');
        }
    });

</script>

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