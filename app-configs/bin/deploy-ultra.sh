#!/bin/bash
set -e
cd /var/www/ecommerce/backend
pm2 stop ecommerce 2>/dev/null || true
pm2 delete ecommerce 2>/dev/null || true
cd /var/www/ecommerce && tar -zxf /home/admin/app/package.tgz -C . && cd backend && npm i --production
cd ../frontend && npm i && npm run build
cd ../backend && mkdir -p logs && pm2 start server.js -n ecommerce && pm2 save && pm2 startup
sleep 10 && curl -s http://localhost:3001/api/health | grep success && echo "OK" || (pm2 logs ecommerce --lines 10 && exit 1)
