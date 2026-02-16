# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve to run the production build
RUN npm install -g serve

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
