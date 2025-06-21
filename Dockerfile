# Use the official Node.js 22.16-alpine image as a base
FROM node:22.16-alpine AS base

# Set the working directory in the container
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# --- Dependencies Stage ---
FROM base AS deps

# Copy package.json and lockfile
COPY package.json package-lock.json* .npmrc* ./

# Install dependencies
RUN npm install --frozen-lockfile

# --- Builder Stage ---
FROM base AS builder

# Copy dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the application source code
COPY . .

# Build the application (client and server)
# Ensure the build script is run by the root user to have the necessary permissions
RUN npm run build

# --- Runner Stage ---
FROM base AS runner

# Set the environment to production
ENV NODE_ENV=production

# Copy the built application from the 'builder' stage
COPY --from=builder /app/dist ./dist

# Copy production dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package.json
COPY package.json .

# Change ownership of the app directory to the non-root user
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Expose the port the app runs on (defaulting to 3333 based on health check)
EXPOSE 3333

# The command to run the application
CMD ["node", "dist/index.js"]
