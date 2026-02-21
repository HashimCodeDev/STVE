#!/bin/bash

# WebSocket Test Script
# This script tests if WebSocket updates are working

echo "🧪 Testing WebSocket Real-time Updates"
echo "========================================"
echo ""

# Test 1: Test endpoint
echo "1️⃣  Testing WebSocket broadcast endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:5000/api/test/websocket)
echo "   Response: $RESPONSE"
echo "   ✓ Check browser console for: 📊 Dashboard update received"
echo ""

# Test 2: Simulate sensor reading (if sensors exist)
echo "2️⃣  To test with real sensor reading:"
echo "   Run: node backend/demo.js"
echo "   Or use: curl -X POST http://localhost:5000/api/readings \\"
echo "            -H 'Content-Type: application/json' \\"
echo "            -d '{\"sensorId\":\"SENSOR_001\",\"moisture\":45.5,\"temperature\":22.3,\"ec\":1.2,\"ph\":6.8}'"
echo ""

echo "📋 What to check:"
echo "   1. Browser console shows: ✅ WebSocket connected, ID: [id]"
echo "   2. On data change, see: 📈 New reading received"
echo "   3. Then see: 🔄 Fetching dashboard data..."
echo "   4. Then see: ✅ Dashboard data updated"
echo ""

echo "🔍 Troubleshooting:"
echo "   - Check backend logs for: 📈 Broadcasting new reading to X client(s)"
echo "   - Ensure both backend and frontend are running"
echo "   - Check browser console (F12) for WebSocket events"
echo "   - Verify API_URL in frontend/.env.local = http://localhost:5000"
