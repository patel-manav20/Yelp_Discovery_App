FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
ARG VITE_APP_BUILD=
ENV VITE_APP_BUILD=${VITE_APP_BUILD}
ARG VITE_ENABLE_REDUX_DEVTOOLS=false
ENV VITE_ENABLE_REDUX_DEVTOOLS=${VITE_ENABLE_REDUX_DEVTOOLS}
RUN npm run build

FROM nginx:alpine AS serve

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
