#!/bin/sh
set -e
certbot renew --quiet
nginx -s reload 2>/dev/null || true
