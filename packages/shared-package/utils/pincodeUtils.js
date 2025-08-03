import axios from 'axios';

/**
 * Get city and state details from pincode using India Post API
 * @param {string|number} pincode - 6-digit pincode
 * @returns {Promise<{success: boolean, data: {city: string, state: string}, error?: string}>}
 */
export async function getCityStateFromPincode(pincode) {
    try {
        // Validate pincode format
        if (!pincode || !/^\d{6}$/.test(pincode.toString())) {
            return {
                success: false,
                error: 'Invalid pincode format. Must be 6 digits.'
            };
        }

        // Try India Post API first
        try {
            const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, {
                timeout: 5000
            });

            if (response.data && response.data[0] && response.data[0].Status === 'Success') {
                const postOffice = response.data[0].PostOffice[0];
                return {
                    success: true,
                    data: {
                        city: postOffice.District,
                        state: postOffice.State,
                        area: postOffice.Name,
                        district: postOffice.District
                    }
                };
            }
        } catch (indiaPostError) {
            console.log('India Post API failed, trying alternative API');
        }

        // Fallback to alternative API
        try {
            const response = await axios.get(`https://api.zippopotam.us/in/${pincode}`, {
                timeout: 5000
            });

            if (response.data && response.data.places && response.data.places.length > 0) {
                const place = response.data.places[0];
                return {
                    success: true,
                    data: {
                        city: place['place name'],
                        state: place['state'],
                        area: place['place name'],
                        district: place['place name']
                    }
                };
            }
        } catch (zippopotamError) {
            console.log('Zippopotam API also failed');
        }

        // If both APIs fail, return static data for common pincodes (fallback)
        const staticPincodeData = getStaticPincodeData(pincode);
        if (staticPincodeData) {
            return {
                success: true,
                data: staticPincodeData
            };
        }

        return {
            success: false,
            error: 'Unable to fetch location details for this pincode'
        };

    } catch (error) {
        console.error('Error in getCityStateFromPincode:', error);
        return {
            success: false,
            error: 'Service unavailable. Please enter city and state manually.'
        };
    }
}

/**
 * Fallback static data for major Indian pincodes
 * @param {string|number} pincode 
 * @returns {object|null}
 */
function getStaticPincodeData(pincode) {
    const staticData = {
        // Delhi
        '110001': { city: 'New Delhi', state: 'Delhi' },
        '110002': { city: 'New Delhi', state: 'Delhi' },
        '110003': { city: 'New Delhi', state: 'Delhi' },
        
        // Mumbai
        '400001': { city: 'Mumbai', state: 'Maharashtra' },
        '400002': { city: 'Mumbai', state: 'Maharashtra' },
        '400003': { city: 'Mumbai', state: 'Maharashtra' },
        
        // Bangalore
        '560001': { city: 'Bangalore', state: 'Karnataka' },
        '560002': { city: 'Bangalore', state: 'Karnataka' },
        '560003': { city: 'Bangalore', state: 'Karnataka' },
        
        // Chennai
        '600001': { city: 'Chennai', state: 'Tamil Nadu' },
        '600002': { city: 'Chennai', state: 'Tamil Nadu' },
        '600003': { city: 'Chennai', state: 'Tamil Nadu' },
        
        // Kolkata
        '700001': { city: 'Kolkata', state: 'West Bengal' },
        '700002': { city: 'Kolkata', state: 'West Bengal' },
        '700003': { city: 'Kolkata', state: 'West Bengal' },
        
        // Hyderabad
        '500001': { city: 'Hyderabad', state: 'Telangana' },
        '500002': { city: 'Hyderabad', state: 'Telangana' },
        '500003': { city: 'Hyderabad', state: 'Telangana' },
        
        // Pune
        '411001': { city: 'Pune', state: 'Maharashtra' },
        '411002': { city: 'Pune', state: 'Maharashtra' },
        '411003': { city: 'Pune', state: 'Maharashtra' },
        
        // Ahmedabad
        '380001': { city: 'Ahmedabad', state: 'Gujarat' },
        '380002': { city: 'Ahmedabad', state: 'Gujarat' },
        '380003': { city: 'Ahmedabad', state: 'Gujarat' }
    };

    return staticData[pincode.toString()] || null;
}

/**
 * Validate Indian pincode format
 * @param {string|number} pincode 
 * @returns {boolean}
 */
export function validatePincode(pincode) {
    return /^\d{6}$/.test(pincode.toString());
}

/**
 * Get multiple location suggestions from partial pincode
 * @param {string|number} partialPincode - 3-6 digit partial pincode
 * @returns {Promise<{success: boolean, data: Array, error?: string}>}
 */
export async function getPincodeSuggestions(partialPincode) {
    try {
        if (!partialPincode || partialPincode.toString().length < 3) {
            return {
                success: false,
                error: 'Please enter at least 3 digits'
            };
        }

        // For now, return static suggestions based on first 3 digits
        const suggestions = getStaticSuggestions(partialPincode.toString().substring(0, 3));
        
        return {
            success: true,
            data: suggestions
        };

    } catch (error) {
        console.error('Error in getPincodeSuggestions:', error);
        return {
            success: false,
            error: 'Unable to fetch suggestions'
        };
    }
}

function getStaticSuggestions(prefix) {
    const suggestions = {
        '110': [{ city: 'New Delhi', state: 'Delhi', pincode: '110001' }],
        '400': [{ city: 'Mumbai', state: 'Maharashtra', pincode: '400001' }],
        '560': [{ city: 'Bangalore', state: 'Karnataka', pincode: '560001' }],
        '600': [{ city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' }],
        '700': [{ city: 'Kolkata', state: 'West Bengal', pincode: '700001' }],
        '500': [{ city: 'Hyderabad', state: 'Telangana', pincode: '500001' }],
        '411': [{ city: 'Pune', state: 'Maharashtra', pincode: '411001' }],
        '380': [{ city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' }]
    };

    return suggestions[prefix] || [];
}