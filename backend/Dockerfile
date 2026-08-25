FROM php:8.4-cli-bookworm

# Set working directory
WORKDIR /var/www/html

# Install system runtime dependencies & PostgreSQL client
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    curl \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions using official docker-php-extension-installer
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions \
    pdo_pgsql \
    pgsql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    intl \
    opcache

# Copy Composer from official composer image
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Custom PHP settings for large file upload
RUN echo "upload_max_filesize = 100M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 100M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 512M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/uploads.ini

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Copy composer files first for caching
COPY composer.json composer.lock ./

# Install dependencies (production / no-dev)
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

# Copy application source code
COPY . .

# Finish composer autoload optimization
RUN composer dump-autoload --optimize --no-dev

# Ensure storage directories exist and have proper permissions
RUN mkdir -p storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    /mnt/storage/uploads \
    && chmod -R 777 storage bootstrap/cache

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
