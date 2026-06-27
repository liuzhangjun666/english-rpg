# syntax=docker/dockerfile:1
#
# 国内服务器推荐：在宿主机先装好依赖，再 docker build（避免镜像内访问 GitHub 失败）
#
#   composer install --no-dev --optimize-autoloader
#   npm ci && npm run build
#   sudo docker compose up -d --build

FROM php:8.3-fpm-bookworm AS app

WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libzip-dev \
        libpng-dev \
        libonig-dev \
        libicu-dev \
        unzip \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        mbstring \
        zip \
        bcmath \
        opcache \
        intl \
    && rm -rf /var/lib/apt/lists/*

COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

COPY composer.json composer.lock ./
COPY vendor ./vendor
COPY public/build ./public/build

COPY . .

RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]

FROM nginx:1.27-alpine AS web

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=app /var/www/html/public /var/www/html/public
