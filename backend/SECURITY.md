# Security Improvements Documentation

This document outlines the security enhancements implemented in the Probos backend API.

## Overview of Changes

All identified security vulnerabilities have been fixed:

### ✅ 1. Input Validation
**Problem:** All API endpoints accepted raw `req.body` without validation.

**Solution:** Created comprehensive validation middleware.

**Files Created:**
- [src/middleware/validation.js](backend/src/middleware/validation.js)

**Validations Implemented:**
- **Sensor Registration** (`validateSensorRegistration`):
  - Validates `sensorId`, `zone`, `type` are non-empty strings
  - Validates optional `latitude` (-90 to 90) and `longitude` (-180 to 180)
  
- **Single Reading** (`validateReading`):
  - Validates `sensorId` is a non-empty string
  - Validates `value` is a valid number
  - Validates optional `timestamp` is a valid date
  
- **Batch Readings** (`validateBatchReadings`):
  - Validates `readings` is an array
  - Limits batch size to 1000 items
  - Validates each reading item
  
- **Ticket Status** (`validateTicketStatus`):
  - Validates `status` is one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED
  
- **Query Parameters** (`validateQueryParams`):
  - Generic validator for query parameters
  - Supports type checking, min/max validation, enum validation

**Files Modified:**
- [src/routes/readingRoutes.js](backend/src/routes/readingRoutes.js)
- [src/routes/sensorRoutes.js](backend/src/routes/sensorRoutes.js)
- [src/routes/ticketRoutes.js](backend/src/routes/ticketRoutes.js)
- [src/routes/dashboardRoutes.js](backend/src/routes/dashboardRoutes.js)

### ✅ 2. Environment Variable Validation
**Problem:** No `.env.example` file, DATABASE_URL not validated at startup.

**Solution:** Created environment validation utility and example file.

**Files Created:**
- [.env.example](backend/.env.example) - Documents all required and optional environment variables
- [src/utils/env.js](backend/src/utils/env.js) - Validates environment variables at startup

**Environment Variables:**
- **Required:**
  - `DATABASE_URL` - PostgreSQL connection string (format validated)
  
- **Optional:**
  - `PORT` - Server port (default: 5000, validated 1-65535)
  - `NODE_ENV` - Environment (default: development)
  - `API_KEY` - API authentication key
  - `CORS_ORIGIN` - Allowed CORS origins (comma-separated)

**Startup Behavior:**
- Server exits with error if required variables missing
- Validates DATABASE_URL format
- Warns about missing optional variables with defaults
- Displays security configuration status

### ✅ 3. CORS Configuration
**Problem:** `server.js:13` allowed all origins without restrictions.

**Solution:** Implemented configurable CORS with environment-based origin control.

**Configuration:**
```javascript
const corsOptions = {
    origin: process.env.CORS_ORIGIN === '*' ? '*' : 
            process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 
            'http://localhost:3000',
    credentials: true,
};
```

**Usage:**
- Development: Set `CORS_ORIGIN=http://localhost:3000`
- Production: Set `CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com`
- Allow all (not recommended): Set `CORS_ORIGIN=*`

**Files Modified:**
- [src/server.js](backend/src/server.js)

### ✅ 4. Authentication & Authorization
**Problem:** All endpoints publicly accessible.

**Solution:** Implemented API key authentication middleware.

**Files Created:**
- [src/middleware/auth.js](backend/src/middleware/auth.js)

**Features:**
- Simple API key authentication via `X-API-Key` header
- Backward compatible (if `API_KEY` not set, allows access)
- 401 Unauthorized for missing key
- 403 Forbidden for invalid key
- Health check endpoint remains public

**Files Modified:**
- [src/server.js](backend/src/server.js) - Applied authentication to all `/api/*` routes except health check

**Usage:**
1. Generate a secure API key:
   ```bash
   openssl rand -hex 32
   ```

2. Set in `.env`:
   ```
   API_KEY=your-generated-key-here
   ```

3. Include in API requests:
   ```bash
   curl -H "X-API-Key: your-api-key" http://localhost:5000/api/sensors
   ```

### ✅ 5. Rate Limiting
**Problem:** API vulnerable to abuse and DoS attacks.

**Solution:** Implemented in-memory rate limiting middleware.

**Files Created:**
- [src/middleware/rateLimit.js](backend/src/middleware/rateLimit.js)

**Rate Limits:**
- **Strict** (20 req/min): Sensitive endpoints
- **Standard** (100 req/min): Write operations (POST, PATCH)
- **Lenient** (200 req/min): Read operations (GET)

**Features:**
- Tracks by client IP address
- Returns standard rate limit headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
  - `Retry-After` (when rate limited)
- 429 Too Many Requests response when limit exceeded
- Auto-cleanup of old entries

**Applied to Routes:**
- POST/PATCH operations: Standard rate limit (100/min)
- GET operations: Lenient rate limit (200/min)

### ✅ 6. Input Sanitization
**Problem:** `dashboardController.js:44` - Unvalidated `parseInt()` could cause NaN values.

**Solution:** Implemented query parameter validation.

**Files Modified:**
- [src/controllers/dashboardController.js](backend/src/controllers/dashboardController.js)
- [src/routes/dashboardRoutes.js](backend/src/routes/dashboardRoutes.js)

**Changes:**
- Removed direct `parseInt(req.query.limit)`
- Added validation middleware that validates and converts query parameters
- Limits constrained to 1-100 range
- Default value of 10 if not provided

### ✅ 7. Additional Security Enhancements

**Payload Size Limits:**
```javascript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

**Error Handling:**
- Consistent error response format
- Validation errors include detailed error arrays
- Security-conscious error messages (no stack traces in production)

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
pnpm install
```

### 2. Configure Environment
```bash
# Copy example file
cp .env.example .env

# Edit .env and set your values
nano .env
```

### 3. Required Configuration
At minimum, set:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/probos"
```

### 4. Optional Security Configuration
For production, also set:
```env
API_KEY=your-secure-api-key-here
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
```

### 5. Start Server
```bash
pnpm dev
```

The server will validate all environment variables on startup and display security configuration status.

## API Usage Examples

### Without Authentication (Development)
If `API_KEY` is not set:
```bash
curl -X POST http://localhost:5000/api/sensors \
  -H "Content-Type: application/json" \
  -d '{"sensorId": "S001", "zone": "Field-1", "type": "temperature"}'
```

### With Authentication (Production)
```bash
curl -X POST http://localhost:5000/api/sensors \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"sensorId": "S001", "zone": "Field-1", "type": "temperature"}'
```

### Validation Error Response
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    "sensorId is required and must be a non-empty string",
    "zone is required and must be a non-empty string"
  ]
}
```

### Rate Limit Response
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": "45 seconds"
}
```

## Security Best Practices

### For Development
1. Keep `API_KEY` unset or use a simple key
2. Use `CORS_ORIGIN=http://localhost:3000`
3. Use `.env` file (never commit to git)

### For Production
1. ✅ Generate strong API key (32+ characters)
2. ✅ Set specific CORS origins (never use `*`)
3. ✅ Set `NODE_ENV=production`
4. ✅ Use HTTPS/TLS for all connections
5. ✅ Rotate API keys periodically
6. ✅ Monitor rate limit violations
7. ✅ Set up proper firewall rules
8. ✅ Keep dependencies updated

## Migration Guide

### For Existing API Clients

**No Breaking Changes:**
- If `API_KEY` is not set, API works as before
- All endpoints remain at same paths
- Response formats unchanged (except validation errors)

**To Enable Security:**
1. Set `API_KEY` in server `.env`
2. Update all API clients to include `X-API-Key` header
3. Test thoroughly before deploying

### Incremental Rollout
You can enable features incrementally:

1. **Start with validation** - Set up env vars but don't set API_KEY
2. **Add rate limiting** - Already active, monitor for issues
3. **Restrict CORS** - Set specific origins
4. **Enable auth** - Set API_KEY when clients are ready

## Testing

### Test Validation
```bash
# Should fail - missing required fields
curl -X POST http://localhost:5000/api/sensors \
  -H "Content-Type: application/json" \
  -d '{}'

# Should succeed
curl -X POST http://localhost:5000/api/sensors \
  -H "Content-Type: application/json" \
  -d '{"sensorId": "S001", "zone": "Field-1", "type": "temperature"}'
```

### Test Rate Limiting
```bash
# Send 101 requests rapidly - last one should be rate limited
for i in {1..101}; do 
  curl http://localhost:5000/api/dashboard/summary
done
```

### Test Authentication
```bash
# Should fail without key (if API_KEY is set)
curl http://localhost:5000/api/sensors

# Should succeed with key
curl -H "X-API-Key: your-key" http://localhost:5000/api/sensors
```

## Monitoring

### Rate Limit Headers
Every response includes:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2026-02-22T10:45:00.000Z
```

### Security Status
Check startup logs for configuration:
```
✅ Environment validation passed
🔒 Security configuration:
  - Authentication: ENABLED
  - CORS Origins: https://yourdomain.com
  - Environment: production
```

## Future Enhancements

Consider implementing:
- [ ] JWT-based authentication instead of API keys
- [ ] OAuth 2.0 support
- [ ] Role-based access control (RBAC)
- [ ] Request logging and audit trails
- [ ] Redis-based rate limiting for distributed systems
- [ ] IP whitelisting/blacklisting
- [ ] Request signing for additional security
- [ ] API versioning

## Support

For issues or questions:
1. Check this documentation
2. Review `.env.example` for configuration
3. Check startup logs for configuration status
4. Review error messages for validation details
