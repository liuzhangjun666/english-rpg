#!/bin/sh
set -e

cd /var/www/html

db_ready() {
    php -r "
        \$host = getenv('DB_HOST') ?: 'mysql';
        \$db = getenv('DB_DATABASE') ?: 'levelup';
        \$user = getenv('DB_USERNAME') ?: 'levelup';
        \$pass = getenv('DB_PASSWORD') ?: '';
        new PDO(\"mysql:host={\$host};port=3306;dbname={\$db}\", \$user, \$pass, [
            PDO::ATTR_TIMEOUT => 3,
        ]);
    " 2>/dev/null
}

if [ "$1" = "php-fpm" ]; then
    echo "Waiting for database..."
    i=0
    until db_ready; do
        i=$((i + 1))
        if [ "$i" -ge 60 ]; then
            echo "Database not reachable after 120s."
            exit 1
        fi
        sleep 2
    done

    php artisan migrate --force
    php artisan storage:link --force 2>/dev/null || true

    php artisan config:cache
    php artisan route:cache
    php artisan view:cache

    chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

    if [ "${RUN_BOOTSTRAP:-false}" = "true" ]; then
        echo "Running content bootstrap in background (RUN_BOOTSTRAP=true)..."
        (
            php artisan app:bootstrap-content --fresh
            echo "Content bootstrap finished."
        ) >> /var/www/html/storage/logs/bootstrap.log 2>&1 &
    fi
fi

exec "$@"
