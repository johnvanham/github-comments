# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SvelteKit application that displays GitHub issue comments from configured repositories in chronological order. It fetches comments from specified GitHub repositories and presents them in a feed-like interface with truncated content, user avatars, timestamps, and issue links.

## Environment Setup

The application requires a `.env` file in the root directory with:

- `GITHUB_TOKEN` - Personal GitHub access token for API authentication
- `GITHUB_REPOSITORIES` - Comma-separated list of repositories in format `username/repo`
- `GITHUB_OWN_USERNAME` - GitHub username to highlight own comments

## Common Commands

### Development

- `npm run dev` - Start development server
- `npm run dev -- --open` - Start dev server and open in browser

### Build & Preview

- `npm run build` - Create production build
- `npm run preview` - Preview production build locally

### Testing

- `npm run test` - Run all tests (integration + unit)
- `npm run test:unit` - Run Vitest unit tests
- `npm run test:integration` - Run Playwright integration tests

### Code Quality

- `npm run check` - Run Svelte type checking
- `npm run check:watch` - Run type checking in watch mode
- `npm run lint` - Check code formatting and linting
- `npm run format` - Auto-format code with Prettier

### Docker

- `docker build -t github-comments:latest .` - Build Docker image
- `docker-compose up` - Run with docker-compose (requires .env file)
- `docker run -p 7585:7585 -e GITHUB_TOKEN=... -e GITHUB_REPOSITORIES=... -e GITHUB_OWN_USERNAME=... github-comments:latest` - Run container directly

## Architecture

### Frontend Structure

- **Main page** (`src/routes/+page.svelte`): Single-page app displaying comment feed with date picker
- **API endpoint** (`src/routes/comments/+server.ts`): Server-side endpoint that fetches GitHub comments
- **Styling** (`src/routes/style.css`): Component-specific styles

### Key Components

- Date picker using `date-picker-svelte` for filtering comments by date
- Auto-refresh mechanism (5-minute intervals)
- Comment truncation to first 3 paragraphs with "..." indicator
- Real-time loading states and empty state handling
- Issue pills showing unique issue numbers from comments

### Data Flow

1. Frontend loads and calls `/comments` endpoint with optional date parameter
2. Server endpoint fetches comments from all configured repositories (100 per repo)
3. Comments are filtered by date, sorted chronologically, and returned
4. Frontend displays comments with markdown rendering using `marked` library

### Configuration

- **TypeScript**: Strict mode enabled with ESModule interop
- **Vite**: Standard SvelteKit + Vitest configuration
- **ESLint**: TypeScript + Svelte + Prettier integration
- **Playwright**: Integration tests with build-then-preview workflow

### Testing Structure

- **Unit tests**: Vitest in `src/**/*.{test,spec}.{js,ts}` files
- **Integration tests**: Playwright in `tests/` directory
- **Test config**: Playwright runs against production build on port 4173

## Deployment

### Docker Container

- **Port**: 7585 (configurable via PORT environment variable)
- **Multi-platform**: Supports AMD64, ARM64, and ARMv7 (Apple M1, Raspberry Pi 4, Intel)
- **Registry**: GitHub Container Registry (ghcr.io) via automated CI/CD
- **Logging**: Comprehensive request/response logging with timestamps and performance metrics
- **Health endpoint**: `/health` for container health checks

### GitHub Actions

- Automated multi-platform Docker builds on push to main/master
- Automatic deployment to GitHub Container Registry (ghcr.io)
- Supports semantic versioning tags (v1.0.0) and branch-based tags

## Development Notes

- Comments are limited to 100 per repository due to GitHub API pagination
- Comment text is truncated to first 3 paragraphs for feed readability
- Own comments are highlighted based on `GITHUB_OWN_USERNAME` environment variable
- All timestamps display in both local time and IST
- The app auto-refreshes comments every 5 minutes when active
- Uses SvelteKit's Node.js adapter for containerization
- Environment variables are loaded at runtime (not build time) for container flexibility
