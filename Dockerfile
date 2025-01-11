FROM node:iron
WORKDIR /app
RUN git clone https://github.com/YakiHonne/yakihonne-web-app.git
WORKDIR /app/yakihonne-web-app/Client
RUN npm install
EXPOSE 3200
CMD ["npm", "start"]
