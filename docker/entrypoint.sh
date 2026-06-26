#!/bin/sh
set -e

cd /var/www/html

if [ "$1" = "php-fpm" ]; then
    echo "Waiting for database..."
    i=0
    until php artisan db:show >/dev/null 2>&1; do
        i=$((i + 1))
        if [ "$i" -ge 60 ]; then
            echo "Database not reachable after 120s."
            exit 1
        fi
        sleep 2
    done

    php artisan migrate --force

    if [ "${RUN_BOOTSTRAP:-false}" = "true" ]; then
        echo "Running content bootstrap (RUN_BOOTSTRAP=true)..."
        php artisan app:bootstrap-content --fresh
    fi

    php artisan storage:link --force 2>/dev/null || true

    php artisan config:cache
    php artisan route:cache
    php artisan view:cache

    chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
fi

exec "$@"
