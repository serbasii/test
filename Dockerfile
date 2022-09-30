FROM nginx:latest

ARG NGINX_PORT
ENV NGINX_PORT=$NGINX_PORT

COPY ./pipeline/nginx.conf /etc/nginx/nginx.conf
COPY . /ybs/