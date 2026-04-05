#!/bin/sh
set -e

# Fix uploads directory ownership at runtime.
# Docker bind-mount volumes override the Dockerfile's chown, so we must
# re-apply correct ownership here before dropping privileges.
mkdir -p /app/uploads/tmp /app/uploads/announcements
chown -R nodejs:nodejs /app/uploads

# Drop to non-root user and exec the CMD (e.g. npm start)
exec su-exec nodejs "$@"
