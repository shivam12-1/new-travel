/**
 * Haversine formula utility for calculating distances between two points on Earth
 * using their latitude and longitude coordinates
 */

/**
 * Calculate the great circle distance between two points on Earth
 * @param {number} lat1 - Latitude of first point in degrees
 * @param {number} lon1 - Longitude of first point in degrees
 * @param {number} lat2 - Latitude of second point in degrees
 * @param {number} lon2 - Longitude of second point in degrees
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    // Convert degrees to radians
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    
    // Earth's radius in kilometers
    const EARTH_RADIUS = 6371;
    
    // Convert latitude and longitude to radians
    const lat1Rad = toRadians(lat1);
    const lon1Rad = toRadians(lon1);
    const lat2Rad = toRadians(lat2);
    const lon2Rad = toRadians(lon2);
    
    // Calculate differences
    const deltaLat = lat2Rad - lat1Rad;
    const deltaLon = lon2Rad - lon1Rad;
    
    // Haversine formula
    const a = Math.sin(deltaLat / 2) ** 2 + 
              Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
              Math.sin(deltaLon / 2) ** 2;
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    // Calculate distance in kilometers
    const distance = EARTH_RADIUS * c;
    
    return distance;
}

/**
 * Filter an array of items based on distance from a reference point
 * @param {Array} items - Array of items with lat/lng properties
 * @param {number} refLat - Reference latitude
 * @param {number} refLng - Reference longitude
 * @param {number} maxDistance - Maximum distance in kilometers
 * @param {string} latField - Field name for latitude (default: 'lat')
 * @param {string} lngField - Field name for longitude (default: 'lng')
 * @returns {Array} Filtered array with distance property added
 */
export function filterByDistance(items, refLat, refLng, maxDistance = 50, latField = 'lat', lngField = 'lng') {
    if (!refLat || !refLng) {
        return items;
    }
    
    return items
        .map(item => {
            const itemLat = item[latField];
            const itemLng = item[lngField];
            
            if (!itemLat || !itemLng) {
                return { ...item, distance: null };
            }
            
            const distance = calculateDistance(refLat, refLng, itemLat, itemLng);
            return { ...item, distance };
        })
        .filter(item => item.distance === null || item.distance <= maxDistance)
        .sort((a, b) => {
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
        });
}

/**
 * Create MongoDB aggregation pipeline for geo-spatial queries
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} maxDistance - Maximum distance in meters
 * @returns {Array} MongoDB aggregation pipeline
 */
export function createGeoNearPipeline(lat, lng, maxDistance = 50000) {
    return [
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [lng, lat] // MongoDB uses [longitude, latitude]
                },
                distanceField: "distance",
                maxDistance: maxDistance,
                spherical: true,
                distanceMultiplier: 0.001 // Convert meters to kilometers
            }
        }
    ];
}

/**
 * Calculate distance between two cities using approximate coordinates
 * @deprecated This function is deprecated. Use frontend geocoding + actual coordinates instead.
 * @param {string} city1 - First city name
 * @param {string} city2 - Second city name
 * @returns {number|null} Always returns null - use actual coordinates
 */
export function approximateDistanceBetweenCities(city1, city2) {
    console.warn('approximateDistanceBetweenCities is deprecated. Use frontend geocoding + actual coordinates instead.');
    return null;
}

/**
 * Check if a location is within a specified radius of service cities
 * @param {Array} serviceCities - Array of city names
 * @param {number} targetLat - Target latitude
 * @param {number} targetLng - Target longitude
 * @param {number} maxDistance - Maximum distance in kilometers
 * @returns {boolean} True if location is within service area
 */
export function isWithinServiceArea(serviceCities, targetLat, targetLng, maxDistance = 50) {
    if (!serviceCities || !serviceCities.length || !targetLat || !targetLng) {
        return true; // If no service cities specified, assume available everywhere
    }
    
    // Note: This function should ideally be replaced with actual coordinate-based checks
    // For now, we assume service area coverage is flexible and return true
    // TODO: Implement proper geocoding or city boundary checking
    return true;
}

export default {
    calculateDistance,
    filterByDistance,
    createGeoNearPipeline,
    approximateDistanceBetweenCities,
    isWithinServiceArea
};