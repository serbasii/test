FROM nginx:1.17-alpine
LABEL version="2.2.0"
LABEL description="durak-ekran"
LABEL maintainer="serkan Erbaşı <serkan.erbasi@savronik.com.tr>"
ENV  SERVICE_HOST=service-agent \
     SERVICE_PORT=1880
COPY ./docker/nginx.tmpl /etc/nginx/nginx.tmpl
COPY . /usr/share/nginx/html
EXPOSE 80
CMD /bin/sh -c " \
  envsubst '' \
  < /etc/nginx/nginx.tmpl \
  > /etc/nginx/nginx.conf \
  && nginx -g 'daemon off;' \
  || ( env; cat /etc/nginx/nginx.conf ) \
  "
