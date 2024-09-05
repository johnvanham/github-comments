import { GITHUB_TOKEN, GITHUB_REPOSITORIES, GITHUB_OWN_USERNAME } from '$env/static/private';
import { json } from '@sveltejs/kit';

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

export async function GET(event) {

    if(!GITHUB_TOKEN) {
        throw new Error('No GITHUB_TOKEN defined');
    }

    const headers = {
        'Authorization': `token ${GITHUB_TOKEN}`
    };

    let comments: GithubComment[] = [];

    const repos = GITHUB_REPOSITORIES.split(',');

    if(repos.length === 0) {
        throw new Error('No repositories defined');
    }

    for (const repo of repos) {
        const issuesUrl = `https://api.github.com/repos/${repo}/issues/comments?per_page=100&page=1&direction=desc`;

        // Get the comments
        const res = await fetch(issuesUrl, { headers });
        const data = await res.json() as GithubComment[];

        // Add the comments to the list
        comments = comments.concat(data.map(comment => ({
            ...comment,
            body: truncate(comment.body),
            repo,
            own_comment: comment.user.login === GITHUB_OWN_USERNAME,
            issue_number: parseInt(comment.issue_url.split('/').pop() || '0', 10),
        })));
    }

    // Sort comments by created_at
    comments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Remove any comments not from today
    comments = comments.filter(comment => comment.created_at.substring(0, 10) === new Date().toISOString().substring(0, 10));

    // Return the comments
    return json(comments);

}

// Truncate a string to only include first paragraph
function truncate(str: string) {
    const paragraphs = str.split('\n');
    return paragraphs.length > 1 ? paragraphs[0] + '<br>...' : str;
}