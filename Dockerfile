FROM node:18-alpine
COPY . /opt/app
WORKDIR /opt/app
RUN npm i
EXPOSE 8080
ENTRYPOINT ["node", "/opt/app/server.js"]