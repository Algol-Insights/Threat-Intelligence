FROM node:20-slim

# Install nmap for network scanning and build tools for better-sqlite3
RUN apt-get update && apt-get install -y \
    nmap \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install --production

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose ports
EXPOSE 8080
EXPOSE 1514/udp

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/v1/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
