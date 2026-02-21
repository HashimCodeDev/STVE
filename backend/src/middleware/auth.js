/**
 * Authentication and Authorization middleware
 */

/**
 * Simple API key authentication middleware
 * In production, replace with JWT or OAuth
 */
export const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    // If no API key is configured, allow access (backward compatibility)
    if (!process.env.API_KEY) {
        return next();
    }

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required. Provide X-API-Key header',
        });
    }

    if (apiKey !== process.env.API_KEY) {
        return res.status(403).json({
            success: false,
            error: 'Invalid API key',
        });
    }

    next();
};

/**
 * Role-based authorization middleware
 * For future use when implementing user roles
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        // This is a placeholder for future role-based access control
        // When implementing, you would check req.user.role against allowed roles

        if (!process.env.API_KEY) {
            return next();
        }

        // For now, if authenticated, allow access
        next();
    };
};
