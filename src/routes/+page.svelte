<h1>Github Comments for {new Date().toLocaleDateString()}</h1>

<style>
    ul {
        list-style-type: none;
        padding: 0;
        margin: 1em 0;
    }
    li {
        border: 1px solid #388bfd66;
        border-radius: 4px;
        margin-bottom: 1em;
    }
    .comment {
        padding: 0.8em;
    }
    .comment-footer {
        font-size: 0.8em;
        background-color: #388bfd1a;
        padding: 0.5em;
        border-top: 1px solid #388bfd66;
    }
</style>

<script lang="ts">

    import { onMount } from 'svelte';
    import { marked } from 'marked';
    import type { GithubComment } from './comments/+server';

    let comments: Array<GithubComment>;

    onMount(async () => {
        comments = await fetch('/comments').then(res => res.json());
    });
</script>

<ul>
    {#if comments !== undefined}
        {#each comments as comment (comment.id)}
            <li>
                <div class="markdown-body comment">
                    {@html comment.body ? marked(comment.body) : ''}
                </div>
                <div class="comment-footer">
                    {new Date(comment.created_at).toLocaleTimeString()}
                    by <b>{comment.user.login}</b>
                    on issue <a href={comment.html_url}>#{comment.issue_number}</a>
                    repo {comment.repo}
                </div>
            </li>
        {/each}
    {/if}
</ul>