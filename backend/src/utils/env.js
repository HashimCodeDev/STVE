/**
 * Environment variable validation
 */

/**
 * Required environment variables
 */
const requiredEnvVars = [
    'DATABASE_URL',
];

/**
 * Optional environment variables with descriptions
 */
const optionalEnvVars = {
    PORT: '5000',
    NODE_ENV: 'development',
    API_KEY: null, // Optional API key for authentication
    CORS_ORIGIN: '*', // Allowed CORS origins (comma-separated)
};

/**
 * Validate environment variables at startup
 */
export const validateEnv = () => {
    const errors = [];
    const warnings = [];

    // Check required variables
    for (const varName of requiredEnvVars) {
        if (!process.env[varName]) {
            errors.push(`Missing required environment variable: ${varName}`);
        }
    }

    // Validate DATABASE_URL format if present
    if (process.env.DATABASE_URL) {
        if (!process.env.DATABASE_URL.startsWith('postgresql://') &&
            !process.env.DATABASE_URL.startsWith('postgres://')) {
            errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
        }
    }

    // Validate PORT if present
    if (process.env.PORT) {
        const port = parseInt(process.env.PORT);
        if (isNaN(port) || port < 1 || port > 65535) {
            errors.push('PORT must be a valid number between 1 and 65535');
        }
    }

    // Check for optional variables and warn if missing
    for (const [varName, defaultValue] of Object.entries(optionalEnvVars)) {
        if (!process.env[varName] && defaultValue !== null) {
            warnings.push(`Optional environment variable ${varName} not set. Using default: ${defaultValue}`);
            process.env[varName] = defaultValue;
        }
    }

    // Report results
    if (errors.length > 0) {
        console.error('\n❌ Environment validation failed:');
        errors.forEach(error => console.error(`  - ${error}`));
        console.error('\nPlease check your .env file and ensure all required variables are set.');
        console.error('See .env.example for reference.\n');
        process.exit(1);
    }

    console.log('✅ Environment validation passed');

    if (warnings.length > 0) {
        console.log('\n⚠️  Environment warnings:');
        warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    // Log security status
    console.log('\n🔒 Security configuration:');
    console.log(`  - Authentication: ${process.env.API_KEY ? 'ENABLED' : 'DISABLED (consider setting API_KEY)'}`);
    console.log(`  - CORS Origins: ${process.env.CORS_ORIGIN || '*'}`);
    console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}\n`);
};

/**
 * Get a validated environment variable
 */
export const getEnv = (key, defaultValue = null) => {
    return process.env[key] || defaultValue;
};
