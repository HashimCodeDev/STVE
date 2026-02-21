/**
 * Input validation middleware
 */

/**
 * Validate sensor registration data
 */
export const validateSensorRegistration = (req, res, next) => {
    const { sensorId, zone, type } = req.body;

    const errors = [];

    if (!sensorId || typeof sensorId !== 'string' || sensorId.trim() === '') {
        errors.push('sensorId is required and must be a non-empty string');
    }

    if (!zone || typeof zone !== 'string' || zone.trim() === '') {
        errors.push('zone is required and must be a non-empty string');
    }

    if (!type || typeof type !== 'string' || type.trim() === '') {
        errors.push('type is required and must be a non-empty string');
    }

    // Validate optional latitude and longitude
    if (req.body.latitude !== undefined) {
        const lat = parseFloat(req.body.latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
            errors.push('latitude must be a valid number between -90 and 90');
        }
    }

    if (req.body.longitude !== undefined) {
        const lon = parseFloat(req.body.longitude);
        if (isNaN(lon) || lon < -180 || lon > 180) {
            errors.push('longitude must be a valid number between -180 and 180');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors,
        });
    }

    next();
};

/**
 * Validate single sensor reading data
 */
export const validateReading = (req, res, next) => {
    const { sensorId, value, timestamp } = req.body;

    const errors = [];

    if (!sensorId || typeof sensorId !== 'string' || sensorId.trim() === '') {
        errors.push('sensorId is required and must be a non-empty string');
    }

    if (value === undefined || value === null) {
        errors.push('value is required');
    } else {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            errors.push('value must be a valid number');
        }
    }

    if (timestamp !== undefined && timestamp !== null) {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            errors.push('timestamp must be a valid date string');
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors,
        });
    }

    next();
};

/**
 * Validate batch readings data
 */
export const validateBatchReadings = (req, res, next) => {
    const { readings } = req.body;

    if (!readings || !Array.isArray(readings)) {
        return res.status(400).json({
            success: false,
            error: 'readings must be an array',
        });
    }

    if (readings.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'readings array cannot be empty',
        });
    }

    // Limit batch size to prevent abuse
    if (readings.length > 1000) {
        return res.status(400).json({
            success: false,
            error: 'readings array cannot contain more than 1000 items',
        });
    }

    const errors = [];

    readings.forEach((reading, index) => {
        if (!reading.sensorId || typeof reading.sensorId !== 'string') {
            errors.push(`readings[${index}].sensorId is required and must be a string`);
        }

        if (reading.value === undefined || reading.value === null) {
            errors.push(`readings[${index}].value is required`);
        } else {
            const numValue = parseFloat(reading.value);
            if (isNaN(numValue)) {
                errors.push(`readings[${index}].value must be a valid number`);
            }
        }
    });

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.slice(0, 10), // Limit error messages to first 10
        });
    }

    next();
};

/**
 * Validate ticket status update
 */
export const validateTicketStatus = (req, res, next) => {
    const { status } = req.body;

    if (!status || typeof status !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'status is required and must be a string',
        });
    }

    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            error: `status must be one of: ${validStatuses.join(', ')}`,
        });
    }

    next();
};

/**
 * Validate query parameters
 */
export const validateQueryParams = (schema) => {
    return (req, res, next) => {
        const errors = [];

        for (const [key, rules] of Object.entries(schema)) {
            const value = req.query[key];

            // Check if required
            if (rules.required && !value) {
                errors.push(`${key} is required`);
                continue;
            }

            // Skip validation if optional and not provided
            if (!value && !rules.required) {
                continue;
            }

            // Type validation
            if (rules.type === 'number') {
                const num = Number(value);
                if (isNaN(num)) {
                    errors.push(`${key} must be a valid number`);
                    continue;
                }

                // Min/Max validation
                if (rules.min !== undefined && num < rules.min) {
                    errors.push(`${key} must be at least ${rules.min}`);
                }
                if (rules.max !== undefined && num > rules.max) {
                    errors.push(`${key} must be at most ${rules.max}`);
                }

                // Set validated value
                req.query[key] = num;
            }

            if (rules.type === 'string') {
                if (typeof value !== 'string') {
                    errors.push(`${key} must be a string`);
                    continue;
                }

                // Enum validation
                if (rules.enum && !rules.enum.includes(value)) {
                    errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors,
            });
        }

        next();
    };
};
