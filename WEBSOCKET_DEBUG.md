# WebSocket Debugging Guide

## 🔧 What Was Fixed

1. **Import Error**: Changed from `require()` to proper ES6 `import` in server.js
2. **Better Logging**: Added client count and more detailed connection logs
3. **Debug Tools**: Created test HTML page and status endpoint

## ✅ Step-by-Step Testing

### 1. Restart Backend Server
```bash
# Kill existing backend process first
pkill -f "node.*server.js"

# Start fresh backend
cd backend
pnpm run dev
```

**Expected Output:**
```
🚀 Probos API server running on port 5000
📊 Dashboard API: http://localhost:5000/api/dashboard/summary
🔧 Health check: http://localhost:5000/api/health
🔌 WebSocket server initialized and ready
```

### 2. Check WebSocket Status
```bash
curl http://localhost:5000/api/websocket/status
```

**Expected Response:**
```json
{
  "success": true,
  "connected": 0,
  "initialized": true
}
```

### 3. Open the Test Page
```bash
# Open in browser
firefox websocket-test.html
# or
google-chrome websocket-test.html
```

**What to Look For:**
- Status should show "✅ Connected"
- Log should show "✅ WebSocket connected! ID: [socket-id]"
- Backend console should show "✅ WebSocket client connected: [socket-id]"
- Backend should show "Total clients: 1"

### 4. Test Broadcast
Click "Test Broadcast" button in the test page

**Expected:**
- Frontend log: "📊 Dashboard update: {test:true,...}"
- Backend log: "📊 Broadcasting dashboard update to 1 client(s)"

### 5. Open Main Dashboard
```bash
# In another terminal or browser tab
http://localhost:3000
```

**What to Look For:**
- Top right shows green pulsing dot with "Live updates active"
- Browser console (F12) shows:
  ```
  🔌 Initializing WebSocket connection to: http://localhost:5000
  ✅ WebSocket connected, ID: [socket-id]
  ```
- Backend shows "Total clients: 2" (test page + dashboard)

### 6. Test Live Updates

**Option A: Use demo.js**
```bash
cd backend
node demo.js
```

**Option B: Manual API call**
```bash
curl -X POST http://localhost:5000/api/readings \
  -H "Content-Type: application/json" \
  -d '{
    "sensorId": "SENSOR_001",
    "moisture": 45.5,
    "temperature": 22.3,
    "ec": 1.2,
    "ph": 6.8
  }'
```

**Expected Dashboard Behavior:**
1. Backend logs:
   ```
   📈 Broadcasting new reading to 2 client(s)
   📊 Broadcasting dashboard update to 2 client(s): {type: 'reading', sensorId: 'SENSOR_001'}
   ```

2. Browser console logs:
   ```
   📈 New reading received: {...}
   🔄 Fetching dashboard data...
   ✅ Dashboard data updated
   ```

3. **Dashboard updates WITHOUT page refresh** ✨

## 🐛 Troubleshooting

### Issue: "WebSocket not initialized" error
**Solution**: Restart backend server, WebSocket must initialize on startup

### Issue: Frontend shows "Connecting..." forever
**Solution**: 
1. Check CORS: Backend must allow `http://localhost:3000`
2. Check API_URL in frontend `.env.local` or code
3. Verify backend is running on port 5000

### Issue: "dashboard:update" received but no visual update
**Solution**:
- Check browser console for fetch errors
- Verify `fetchDashboardData` is being called (should see "🔄 Fetching...")
- Check if API returns valid data

### Issue: No broadcasts when adding data
**Solution**:
1. Verify `broadcastNewReading()` is called in dataIngestion.js
2. Check backend logs show "📈 Broadcasting..."
3. Ensure WebSocket io object is initialized

### Issue: Client count is 0
**Solution**:
- Frontend hasn't connected yet
- Check CORS settings
- Open browser DevTools Network tab, filter by WS (WebSocket)
- Should see active WebSocket connection

## 📊 What Should Happen

**Normal Flow:**
```
1. User uploads sensor data
   ↓
2. Backend: ingestReading() called
   ↓
3. Backend: broadcastNewReading() + broadcastDashboardUpdate()
   ↓
4. Frontend: Receives 'reading:new' event
   ↓
5. Frontend: Calls fetchDashboardData()
   ↓
6. Frontend: Dashboard updates (no refresh!)
```

## 🔍 Debug Checklist

- [ ] Backend shows "🔌 WebSocket server initialized and ready"
- [ ] `/api/websocket/status` returns `initialized: true`
- [ ] Test page connects successfully
- [ ] Test broadcast works
- [ ] Main dashboard shows green "Live updates active"
- [ ] Browser console shows WebSocket connected
- [ ] Adding sensor data triggers broadcasts
- [ ] Dashboard updates without page refresh

## 📝 Notes

- WebSocket runs on the same port as API (5000)
- Use Socket.IO protocol, not raw WebSocket
- Events: `dashboard:update`, `reading:new`, `ticket:update`
- Broadcasts happen on: reading ingestion, ticket updates
- Caching: Dashboard caches invalidate automatically on updates
