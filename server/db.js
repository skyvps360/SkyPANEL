"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.pool = void 0;
var serverless_1 = require("@neondatabase/serverless");
var neon_serverless_1 = require("drizzle-orm/neon-serverless");
var ws_1 = require("ws");
var schema = require("@shared/schema");
// Configure Neon for Node.js environment
serverless_1.neonConfig.webSocketConstructor = ws_1.default;
// Patch for ErrorEvent message property TypeError
var originalErrorEventConstructor = global.ErrorEvent;
if (originalErrorEventConstructor) {
    global.ErrorEvent = function (type, eventInit) {
        var event = new originalErrorEventConstructor(type, eventInit);
        // Make message property writable to avoid TypeError
        Object.defineProperty(event, 'message', {
            writable: true,
            configurable: true,
            value: (eventInit === null || eventInit === void 0 ? void 0 : eventInit.message) || ''
        });
        return event;
    };
    global.ErrorEvent.prototype = originalErrorEventConstructor.prototype;
}
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database? you can get a free one from neon.tech");
}
// Create a connection pool with better error handling and retry logic
exports.pool = new serverless_1.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10, // Reduced max connections for better stability
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 10000, // Increased timeout for better reliability
});
// Add comprehensive error handling for the connection pool
exports.pool.on('error', function (err, client) {
    console.error('Unexpected error on idle client:', err.message);
    // Don't attempt to release if client is undefined
    if (client) {
        try {
            client.release(true);
        }
        catch (releaseError) {
            console.error('Error releasing client:', releaseError);
        }
    }
});
// Add connection event logging
exports.pool.on('connect', function (client) {
    console.log('Database client connected');
});
exports.pool.on('remove', function (client) {
    console.log('Database client removed from pool');
});
// Export the database instance with the configured pool
exports.db = (0, neon_serverless_1.drizzle)({ client: exports.pool, schema: schema });
