# Github Comments Today

Simple [SvelteKit](https://github.com/sveltejs/kit) app to display a summary of the current day's comments added to issues for one or more repositories in chronological order with comments truncated.  

## Config

Expects a .env file in the root directory with the following keys added:

- `GITHUB_TOKEN` (Your Github token)
- `GITHUB_REPOSITORIES` (A comma seperated list of repos in the format username/repo)

## Notes

This will currently only grab 100 comments from each repo. So if there are more than 100 comments on the current day, not all will be shown from that repo.

## Developing

Once conled, install dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
