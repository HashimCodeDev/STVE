/**
 * Rate limiting middleware
 * Implements in-memory rate limiting to prevent abuse
 */

const rateLimitStore = new Map();

/**
 * Clean up old entries periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.resetTime > 60000) { // Clean up entries older than 1 minute
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Run every minute

/**
 * Rate limiting middleware
 * @param {number} maxRequests - Maximum number of requests allowed
 * @param {number} windowMs - Time window in milliseconds
 */
export const rateLimit = (maxRequests = 100, windowMs = 60000) => {
    return (req, res, next) => {
        // Get client identifier (IP address)
        const clientId = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();

        // Get or create rate limit data for this client
        let rateLimitData = rateLimitStore.get(clientId);

        if (!rateLimitData || now - rateLimitData.resetTime > windowMs) {
            // Reset or create new rate limit data
            rateLimitData = {
                count: 0,
                resetTime: now,
            };
            rateLimitStore.set(clientId, rateLimitData);
        }

        rateLimitData.count++;

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rateLimitData.count));
        res.setHeader('X-RateLimit-Reset', new Date(rateLimitData.resetTime + windowMs).toISOString());

        if (rateLimitData.count > maxRequests) {
            const retryAfter = Math.ceil((rateLimitData.resetTime + windowMs - now) / 1000);
            res.setHeader('Retry-After', retryAfter);

            return res.status(429).json({
                success: false,
                error: 'Too many requests. Please try again later.',
                retryAfter: `${retryAfter} seconds`,
            });
        }

        next();
    };
};

/**
 * Strict rate limiting for sensitive endpoints
 */
export const strictRateLimit = rateLimit(20, 60000); // 20 requests per minute

/**
 * Standard rate limiting for normal endpoints
 */
export const standardRateLimit = rateLimit(100, 60000); // 100 requests per minute

/**
 * Lenient rate limiting for read-only endpoints
 */
export const lenientRateLimit = rateLimit(200, 60000); // 200 requests per minute
