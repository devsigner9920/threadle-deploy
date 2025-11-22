#!/bin/bash

# Initialize Let's Encrypt SSL certificate for Threadle

DOMAIN="threadle.dvsgn-t01.dev"
EMAIL="dvsgn.eth@gmail.com"  # Replace with your email
STAGING=0  # Set to 1 if you want to test with Let's Encrypt staging server

# Create required directories
mkdir -p certbot/conf certbot/www

# Download recommended TLS parameters
if [ ! -e "certbot/conf/options-ssl-nginx.conf" ] || [ ! -e "certbot/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters ..."
  mkdir -p certbot/conf
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
  echo
fi

# Create dummy certificate for nginx to start
echo "### Creating dummy certificate for $DOMAIN ..."
mkdir -p "certbot/conf/live/$DOMAIN"
docker-compose -f docker-compose.prod.yml run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '/etc/letsencrypt/live/$DOMAIN/privkey.pem' \
    -out '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' \
    -subj '/CN=localhost'" certbot
echo

# Start nginx
echo "### Starting nginx ..."
docker-compose -f docker-compose.prod.yml up --force-recreate -d nginx
echo

# Delete dummy certificate
echo "### Deleting dummy certificate for $DOMAIN ..."
docker-compose -f docker-compose.prod.yml run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN && \
  rm -rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot
echo

# Request Let's Encrypt certificate
echo "### Requesting Let's Encrypt certificate for $DOMAIN ..."

# Select appropriate email arg
case "$EMAIL" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $EMAIL" ;;
esac

# Enable staging mode if needed
if [ $STAGING != "0" ]; then staging_arg="--staging"; fi

docker-compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    -d $DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal \
    --non-interactive" certbot
echo

# Reload nginx
echo "### Reloading nginx ..."
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "### Done! Your site should now be available at https://$DOMAIN"
