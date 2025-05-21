# Use Node.js LTS image
FROM node:18

# Set working directory
WORKDIR /app

# Copy files and install dependencies
COPY . .
RUN npm install

# Start app
CMD ["npm", "start"]

# Expose port (Cloud Run expects your app to listen on PORT)
ENV PORT 8080
EXPOSE 8080
