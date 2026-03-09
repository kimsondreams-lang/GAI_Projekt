FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Expose port (Cloud Run expects 8080)
ENV PORT=8080
EXPOSE 8080

# Start server
CMD ["npm", "start"]
