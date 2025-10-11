#!/bin/bash

echo "🧪 Testing BrainVault Backend..."
echo

# Start server in background
cd server
node index.js > /dev/null 2>&1 &
SERVER_PID=$!
cd ..

# Wait for server
sleep 3

# Test health
echo "1. Testing health endpoint..."
HEALTH=$(curl -s http://localhost:3001/api/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "   ✅ Health check passed"
else
    echo "   ❌ Health check failed"
    kill $SERVER_PID
    exit 1
fi

# Test note creation
echo "2. Testing note creation..."
NOTE=$(curl -s -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Note","content":"Hello #world"}')
NOTE_ID=$(echo $NOTE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
if [ ! -z "$NOTE_ID" ]; then
    echo "   ✅ Note created: $NOTE_ID"
else
    echo "   ❌ Note creation failed"
    kill $SERVER_PID
    exit 1
fi

# Test note retrieval
echo "3. Testing note retrieval..."
GET_NOTE=$(curl -s http://localhost:3001/api/notes/$NOTE_ID)
if echo "$GET_NOTE" | grep -q "Test Note"; then
    echo "   ✅ Note retrieved"
else
    echo "   ❌ Note retrieval failed"
    kill $SERVER_PID
    exit 1
fi

# Test search
echo "4. Testing search..."
SEARCH=$(curl -s "http://localhost:3001/api/search?q=hello")
if echo "$SEARCH" | grep -q "results"; then
    echo "   ✅ Search working"
else
    echo "   ❌ Search failed"
    kill $SERVER_PID
    exit 1
fi

# Test tags
echo "5. Testing tags..."
TAGS=$(curl -s http://localhost:3001/api/search/tags)
if echo "$TAGS" | grep -q "world"; then
    echo "   ✅ Tags working"
else
    echo "   ❌ Tags failed"
    kill $SERVER_PID
    exit 1
fi

# Test settings
echo "6. Testing settings..."
SETTINGS=$(curl -s http://localhost:3001/api/settings)
if echo "$SETTINGS" | grep -q "theme"; then
    echo "   ✅ Settings working"
else
    echo "   ❌ Settings failed"
    kill $SERVER_PID
    exit 1
fi

# Test AI status
echo "7. Testing AI status..."
AI=$(curl -s http://localhost:3001/api/ai/status)
if echo "$AI" | grep -q "ollama"; then
    echo "   ✅ AI endpoint working"
else
    echo "   ❌ AI endpoint failed"
    kill $SERVER_PID
    exit 1
fi

# Cleanup
kill $SERVER_PID 2>/dev/null

echo
echo "✨ All tests passed! Backend is working perfectly."
echo
