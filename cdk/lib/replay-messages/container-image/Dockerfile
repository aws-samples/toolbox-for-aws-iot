FROM --platform=linux/arm64 node:18-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

EXPOSE 8080

RUN groupadd -r user && useradd -r -g user user
USER user

CMD [ "node", "server.mjs"]