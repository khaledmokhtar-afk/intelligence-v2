FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --omit=dev

# Build frontend
COPY client/package.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Copy server
COPY server/ ./server/
COPY data/column_config.json ./data/column_config.json
COPY data/responsibility_matrix.json ./data/responsibility_matrix.json

RUN mkdir -p data/uploads

EXPOSE 3001

CMD ["node", "server/index.js"]
