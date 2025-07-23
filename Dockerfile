# Build stage
FROM node:23-alpine AS builder

# Install dependencies
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source code (excluding files listed in .dockerignore)
COPY . .

# Generate SvelteKit files and build the application  
RUN npx svelte-kit sync && npm run build

# Production stage
FROM node:23-alpine AS runner

# Install dependencies
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 sveltekit && \
    adduser --system --uid 1001 sveltekit

# Copy built application and package.json from builder stage
COPY --from=builder --chown=sveltekit:sveltekit /app/build ./build
COPY --from=builder --chown=sveltekit:sveltekit /app/package.json ./package.json
COPY --from=builder --chown=sveltekit:sveltekit /app/package-lock.json ./package-lock.json

# Install only production dependencies
RUN npm ci --only=production --ignore-scripts

# Switch to non-root user  
USER sveltekit

# Expose port
EXPOSE 7585

# Set environment variables
ENV NODE_ENV=production
ENV PORT=7585
ENV HOST=0.0.0.0

# Start the application
CMD ["node", "build"]
