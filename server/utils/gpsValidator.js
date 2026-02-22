/**
 * GPS Validation Utility
 * Uses Haversine formula to calculate distance between two GPS coordinates
 */

const toRadians = (degrees) => degrees * (Math.PI / 180);

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Validate if student is within allowed radius
 */
const isWithinRadius = (teacherLat, teacherLng, studentLat, studentLng, radiusMeters) => {
    const distance = calculateDistance(teacherLat, teacherLng, studentLat, studentLng);
    return {
        isValid: distance <= radiusMeters,
        distance: Math.round(distance * 100) / 100
    };
};

module.exports = { calculateDistance, isWithinRadius };
