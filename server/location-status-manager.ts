/**
 * Status Manager for Datacenter Locations
 * 
 * This module handles the storage and retrieval of location statuses,
 * particularly for "coming_soon" status which doesn't have a direct database field.
 * 
 * The database only has a boolean is_active field:
 * - For locations with status 'active' or 'coming_soon', is_active=true in DB
 * - For locations with status 'inactive', is_active=false in DB
 * 
 * This manager keeps track of which active locations are 'coming_soon' vs 'active'
 */

// In-memory map to store location statuses
const locationStatusMap: Record<number, string> = {};

/**
 * Set the status for a location in the memory map
 * @param locationId The location ID
 * @param status The status value ('active', 'coming_soon', 'inactive')
 */
export function setLocationStatus(locationId: number, status: string): void {
  // We only need to store "coming_soon" in the map
  // Other statuses are directly derived from is_active in DB
  if (status === 'coming_soon') {
    locationStatusMap[locationId] = 'coming_soon';
    console.log(`[LocationStatusManager] Stored "coming_soon" status for location ${locationId}`);
  } else if (locationStatusMap[locationId]) {
    // Remove the status from the map if it's not coming_soon anymore
    delete locationStatusMap[locationId];
    console.log(`[LocationStatusManager] Removed status for location ${locationId} (now ${status})`);
  }
}

/**
 * Get the status for a location, considering both the memory map and the is_active status
 * @param locationId The location ID
 * @param isActive The is_active value from the database
 * @returns The appropriate status based on the memory map and isActive
 */
export function getLocationStatus(locationId: number, isActive: boolean): string {
  if (!isActive) {
    return 'inactive';
  }
  
  // If active in DB, check if it's in our map as "coming_soon"
  return locationStatusMap[locationId] || 'active';
}

/**
 * Remove a location from the status map (e.g., when deleting)
 * @param locationId The location ID to remove
 */
export function removeLocationStatus(locationId: number): void {
  if (locationStatusMap[locationId]) {
    delete locationStatusMap[locationId];
    console.log(`[LocationStatusManager] Removed status for deleted location ${locationId}`);
  }
}

/**
 * Get all statuses in the memory map (for debugging)
 * @returns A copy of the current status map
 */
export function getAllLocationStatuses(): Record<number, string> {
  return { ...locationStatusMap };
}