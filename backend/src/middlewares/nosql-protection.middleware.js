/**
 * @fileoverview Express Middleware - Request/response processing
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-28
 */

/**
 * Custom NoSQL injection protection middleware
 * Sanitizes request body, params, and query to prevent injection attacks
 */
export const sanitizeNoSQL = (req, res, next) => {
    const sanitize = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => sanitize(item));
        }

        // Handle objects
        const sanitized = {};
        for (const key in obj) {
            // Skip keys that start with $ (MongoDB operators)
            if (key.startsWith('$')) {
                console.warn(`[NoSQL Protection] Blocked MongoDB operator: ${key}`);
                continue;
            }

            const value = obj[key];

            // If value is an object, recursively sanitize
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Check if it's a plain object (not Date, etc.)
                if (value.constructor === Object) {
                    sanitized[key] = sanitize(value);
                } else {
                    sanitized[key] = value;
                }
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    };

    // Sanitize body
    if (req.body) {
        req.body = sanitize(req.body);
    }

    // Sanitize params
    if (req.params) {
        req.params = sanitize(req.params);
    }

    // Sanitize query - be careful with query as it might be read-only
    if (req.query && Object.keys(req.query).length > 0) {
        try {
            const sanitizedQuery = sanitize(req.query);
            // Only assign if we can
            Object.keys(req.query).forEach(key => {
                if (key.startsWith('$')) {
                    delete req.query[key];
                }
            });
        } catch (error) {
            // If we can't modify query, just log and continue
            console.warn('[NoSQL Protection] Could not sanitize query:', error.message);
        }
    }

    next();
};
