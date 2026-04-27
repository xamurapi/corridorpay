FROM nginx:1.27-alpine

RUN apk add --no-cache bash gettext

COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d /etc/nginx/conf.d
COPY entrypoint.sh /docker-entrypoint.d/40-render-config.sh

# nginx:alpine already runs `docker-entrypoint.sh` which executes /docker-entrypoint.d/*.sh
# We name ours 40-* to run after nginx-internal scripts.
RUN chmod +x /docker-entrypoint.d/40-render-config.sh
