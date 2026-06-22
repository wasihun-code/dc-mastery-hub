#!/bin/bash
cd backend
node index.js &
SERVER_PID=$!
sleep 3
echo "=== 1. Register User ==="
REGISTER_RES=$(curl -s -i -X POST -H "Content-Type: application/json" -d '{"username":"curltest3@test.com","password":"password123"}' http://localhost:3001/api/auth/register)
COOKIE=$(echo "$REGISTER_RES" | grep -i "set-cookie" | awk '{print $2}' | cut -d';' -f1)
echo "Extracted Cookie: $COOKIE"

echo -e "\n=== 3. Protected Route (SQLite backed) ==="
curl -s -i -H "Cookie: $COOKIE" http://localhost:3001/api/progress/dashboard

kill $SERVER_PID
