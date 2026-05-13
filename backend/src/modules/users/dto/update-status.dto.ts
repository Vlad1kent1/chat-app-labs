/**
 * DTO for updating user online status (heartbeat).
 * Used in the PATCH /users/status endpoint.
 * 
 * This DTO is intentionally empty as the heartbeat endpoint
 * only needs to update the user's lastSeen timestamp.
 * The user ID is extracted from the JWT token.
 */
export class UpdateStatusDto {}
