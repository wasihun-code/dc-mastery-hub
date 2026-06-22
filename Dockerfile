# Use a Node image that has Python 3 available (Debian Bookworm)
FROM node:20-bookworm

# Install Python and pip
RUN apt-get update && \
        apt-get install -y python3 python3-pip && \
        rm -rf /var/lib/apt/lists/*

# Install Python dependencies globally
COPY requirements.txt .
RUN pip3 install -r requirements.txt --break-system-packages

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json* ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

    # Install root, backend, and frontend dependencies
RUN npm install --omit=dev
RUN cd backend && npm install --omit=dev
RUN cd frontend && npm install

# Copy the rest of the application code
COPY . .

# Build the frontend (React/Vite)
RUN cd frontend && npm run build

# Expose the backend port
EXPOSE 3001

# Start the application
CMD ["node", "backend/index.js"]
