#!/bin/bash
cd backend
node index.js &
SERVER_PID=$!
sleep 3
echo "=== Try Admin Login ==="
LOGIN_RES=$(curl -s -i -X POST -H "Content-Type: application/json" -d '{"username":"admin@gmail.com","password":"admin123"}' http://localhost:3001/api/auth/login)
echo "$LOGIN_RES"
kill $SERVER_PID
