# Use the official Node.js image. Choose the version that suits your project.
FROM node:14

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install app dependencies by copying package.json and package-lock.json
COPY package*.json ./

# Install dependencies in the container
RUN npm install

# Your application's default port
EXPOSE 3000
