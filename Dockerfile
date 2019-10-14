FROM node:10-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY ./*.js ./
ENTRYPOINT ["node", "bin.js"]