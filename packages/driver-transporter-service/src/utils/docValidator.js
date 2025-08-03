import axios from 'axios';

// IDfy API Configuration
const IDFY_CONFIG = {
    baseURL: 'https://eve.idfy.com/v3/tasks',
    apiKey: '5f15987b-8bc4-4663-ba69-eced4284b2fc', // Replace with your actual API key
    accountId: '505a5d8436d5/4b29bf3f-9a98-4737-af07-dc3673f896f6', // Replace with your actual account ID
    headers: {
        'Content-Type': 'application/json',
        'api-key': '5f15987b-8bc4-4663-ba69-eced4284b2fc', // Replace with your actual API key
        'account-id': '505a5d8436d5/4b29bf3f-9a98-4737-af07-dc3673f896f6' // Replace with your actual account ID
    }
};

/**
 * Verify Driving License Number
 * @param {string} dlNumber - Driving License Number
 * @param {string} dob - Date of Birth (YYYY-MM-DD format)
 * @param {string} name - Name as per DL (optional)
 * @returns {Promise} - API response
 */
async function checkDrivingLicense(dlNumber, dob, name = '') {
    try {
        const payload = {
            task_id: `dl_${Date.now()}`,
            group_id: `group_${Date.now()}`,
            data: {
                id_number: dlNumber,
                date_of_birth: dob,
                name: name
            }
        };

        console.log('DL Verification Request:', JSON.stringify(payload, null, 2));

        const response = await axios.post(
            `${IDFY_CONFIG.baseURL}/sync/verify_with_source/ind_driving_license`,
            payload,
            { headers: IDFY_CONFIG.headers }
        );

        return {
            success: true,
            data: response.data,
            message: 'Driving license verification completed'
        };
    } catch (error) {
        console.error('Error in driving license verification:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            method: error.config?.method
        });
        return {
            success: false,
            error: error.response?.data || error.message,
            message: 'Driving license verification failed'
        };
    }
}

/**
 * Helper function to convert image URL to base64
 * @param {string} imageUrl - URL of the image (S3 or any public URL)
 * @param {number} maxSizeKB - Maximum size in KB (default: 1024KB = 1MB)
 * @returns {Promise<string>} - Base64 encoded image
 */
async function urlToBase64(imageUrl, maxSizeKB = 1024) {
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
            maxContentLength: maxSizeKB * 1024, // Max size limit
            maxBodyLength: maxSizeKB * 1024
        });

        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        const mimeType = response.headers['content-type'] || 'image/jpeg';

        console.log(`Image converted - Size: ${Math.round(base64.length / 1024)}KB, Type: ${mimeType}`);

        return `data:${mimeType};base64,${base64}`;
    } catch (error) {
        throw new Error(`Failed to fetch image from URL: ${error.message}`);
    }
}

/**
 * Verify Driving License using Image OCR
 * @param {string} imageInput - Either base64 encoded image or S3/public image URL
 * @returns {Promise} - API response with extracted data
 */
async function drivingLicenseImage(imageInput) {
    try {
        let formattedImage;

        // Check if input is a URL or base64
        if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
            console.log('Converting S3 URL to base64:', imageInput);
            formattedImage = await urlToBase64(imageInput);
        } else if (imageInput.startsWith('data:image/')) {
            formattedImage = imageInput;
        } else {
            // Assume it's base64 without data URL prefix
            formattedImage = `data:image/jpeg;base64,${imageInput}`;
        }

        /**
         * Verify Driving License using Image OCR
         * @param {string} imageInput - Either base64 encoded image or S3/public image URL
         * @returns {Promise} - API response with extracted data
         */
        async function drivingLicenseImage(imageInput) {
            try {
                let formattedImage;

                // Check if input is a URL or base64
                if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
                    console.log('Converting S3 URL to base64:', imageInput);
                    formattedImage = await urlToBase64(imageInput, 800); // Limit to 800KB
                } else if (imageInput.startsWith('data:image/')) {
                    formattedImage = imageInput;
                } else {
                    // Assume it's base64 without data URL prefix
                    formattedImage = `data:image/jpeg;base64,${imageInput}`;
                }

                const payload = {
                    task_id: `dl_ocr_${Date.now()}`,
                    group_id: `group_${Date.now()}`,
                    data: {
                        document1: formattedImage // Base64 encoded image with data URL
                    }
                };

                console.log('DL OCR Request:', {
                    task_id: payload.task_id,
                    group_id: payload.group_id,
                    imageSize: formattedImage.length,
                    imageSizeKB: Math.round(formattedImage.length / 1024),
                    imagePrefix: formattedImage.substring(0, 50) + '...'
                });

                // Create axios instance with better error handling
                const apiClient = axios.create({
                    timeout: 60000, // 60 second timeout
                    maxContentLength: 50 * 1024 * 1024, // 50MB
                    maxBodyLength: 50 * 1024 * 1024, // 50MB
                });

                // Try the most likely correct endpoint first
                const endpoints = [
                    `${IDFY_CONFIG.baseURL}/sync/extract/ind_driving_license`,
                    `${IDFY_CONFIG.baseURL}/async/extract/ind_driving_license`,
                    `${IDFY_CONFIG.baseURL}/sync/extract/in_driving_license`,
                    `${IDFY_CONFIG.baseURL}/extract/ind_driving_license`
                ];

                let lastError;
                for (const endpoint of endpoints) {
                    try {
                        console.log(`Trying endpoint: ${endpoint}`);
                        const response = await apiClient.post(
                            endpoint,
                            payload,
                            {
                                headers: {
                                    ...IDFY_CONFIG.headers,
                                    'Content-Length': JSON.stringify(payload).length
                                }
                            }
                        );

                        console.log(`Success with endpoint: ${endpoint}, Status: ${response.status}`);
                        return {
                            success: true,
                            data: response.data,
                            message: 'Driving license OCR completed',
                            endpoint: endpoint
                        };
                    } catch (err) {
                        lastError = err;
                        console.log(`Endpoint ${endpoint} failed:`, {
                            status: err.response?.status,
                            statusText: err.response?.statusText,
                            code: err.code,
                            message: err.message,
                            isTimeout: err.code === 'ECONNABORTED',
                            isNetworkError: err.code === 'EPIPE' || err.code === 'ECONNRESET'
                        });

                        // If it's not a 404, this might be the right endpoint but with a different error
                        if (err.response?.status && err.response.status !== 404) {
                            throw err;
                        }

                        // If it's a network error, don't try other endpoints
                        if (err.code === 'EPIPE' || err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
                            throw err;
                        }
                    }
                }

                throw lastError;

            } catch (error) {
                console.error('Error in driving license OCR:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    url: error.config?.url,
                    method: error.config?.method,
                    code: error.code,
                    message: error.message
                });
                return {
                    success: false,
                    error: error.response?.data || error.message,
                    message: 'Driving license OCR failed',
                    errorCode: error.code
                };
            }
        }

    } catch (error) {
        console.error('Error in driving license OCR:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            method: error.config?.method
        });
        return {
            success: false,
            error: error.response?.data || error.message,
            message: 'Driving license OCR failed'
        };
    }
}

/**
 * Verify Aadhaar Number
 * @param {string} aadhaarNumber - 12-digit Aadhaar number
 * @param {string} name - Name as per Aadhaar (optional)
 * @returns {Promise} - API response
 */
async function aadharNumber(aadhaarNumber, name = '') {
    try {
        const payload = {
            task_id: `aadhaar_${Date.now()}`,
            group_id: `group_${Date.now()}`,
            data: {
                id_number: aadhaarNumber,
                name: name
            }
        };

        console.log('Aadhaar Verification Request:', JSON.stringify(payload, null, 2));

        const response = await axios.post(
            `${IDFY_CONFIG.baseURL}/sync/verify_with_source/ind_aadhaar`,
            payload,
            { headers: IDFY_CONFIG.headers }
        );

        return {
            success: true,
            data: response.data,
            message: 'Aadhaar verification completed'
        };
    } catch (error) {
        console.error('Error in Aadhaar verification:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            method: error.config?.method
        });
        return {
            success: false,
            error: error.response?.data || error.message,
            message: 'Aadhaar verification failed'
        };
    }
}

/**
 * Extract data from Aadhaar Card using OCR
 * @param {string} frontImageInput - Base64 encoded image or S3/public URL of front Aadhaar card
 * @param {string} backImageInput - Base64 encoded image or S3/public URL of back Aadhaar card (optional)
 * @returns {Promise} - API response with extracted data
 */
async function aadharOCR(frontImageInput, backImageInput = '') {
    try {
        // Handle front image
        let formattedFrontImage;
        if (frontImageInput.startsWith('http://') || frontImageInput.startsWith('https://')) {
            console.log('Converting front image S3 URL to base64:', frontImageInput);
            formattedFrontImage = await urlToBase64(frontImageInput);
        } else if (frontImageInput.startsWith('data:image/')) {
            formattedFrontImage = frontImageInput;
        } else {
            formattedFrontImage = `data:image/jpeg;base64,${frontImageInput}`;
        }

        // Handle back image if provided
        let formattedBackImage = '';
        if (backImageInput) {
            if (backImageInput.startsWith('http://') || backImageInput.startsWith('https://')) {
                console.log('Converting back image S3 URL to base64:', backImageInput);
                formattedBackImage = await urlToBase64(backImageInput);
            } else if (backImageInput.startsWith('data:image/')) {
                formattedBackImage = backImageInput;
            } else {
                formattedBackImage = `data:image/jpeg;base64,${backImageInput}`;
            }
        }

        const payload = {
            task_id: `aadhaar_ocr_${Date.now()}`,
            group_id: `group_${Date.now()}`,
            data: {
                document1: formattedFrontImage, // Front side of Aadhaar
                ...(formattedBackImage && { document2: formattedBackImage }) // Back side only if provided
            }
        };

        console.log('Aadhaar OCR Request:', {
            task_id: payload.task_id,
            group_id: payload.group_id,
            frontImageSize: formattedFrontImage.length,
            backImageSize: formattedBackImage ? formattedBackImage.length : 0
        });

        const response = await axios.post(
            `${IDFY_CONFIG.baseURL}/sync/extract/ind_aadhaar`,
            payload,
            { headers: IDFY_CONFIG.headers }
        );

        return {
            success: true,
            data: response.data,
            message: 'Aadhaar OCR completed'
        };
    } catch (error) {
        console.error('Error in Aadhaar OCR:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            method: error.config?.method
        });
        return {
            success: false,
            error: error.response?.data || error.message,
            message: 'Aadhaar OCR failed'
        };
    }
}

/**
 * Test API connectivity and credentials
 */
async function testAPIConnection() {
    try {
        // Try a simple request first
        const response = await axios.get(
            `${IDFY_CONFIG.baseURL}`,
            {
                headers: IDFY_CONFIG.headers,
                timeout: 10000
            }
        );

        console.log('API Connection Test Successful:', response.status);
        return { success: true, message: 'API connection successful' };
    } catch (error) {
        console.error('API Connection Test Failed:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            code: error.code,
            message: error.message
        });
        return {
            success: false,
            error: error.response?.data || error.message,
            message: 'API connection failed - check credentials and base URL',
            errorCode: error.code
        };
    }
}

/**
 * Verify GST Number (GSTIN)
 * @param {string} gstNumber - 15-digit GST number
 * @param {string} businessName - Business name (optional for additional validation)
 * @returns {Promise} - API response with GST details
 */
async function verifyGST(gstNumber, businessName = '') {
    try {
        const payload = {
            task_id: `gst_${Date.now()}`,
            group_id: `group_${Date.now()}`,
            data: {
                id_number: gstNumber,
                ...(businessName && { name: businessName })
            }
        };

        console.log('GST Verification Request:', JSON.stringify(payload, null, 2));

        const response = await axios.post(
            `${IDFY_CONFIG.baseURL}/sync/verify_with_source/ind_gst`,
            payload,
            { headers: IDFY_CONFIG.headers }
        );

        return {
            success: true,
            data: response.data,
            message: 'GST verification completed'
        };
    } catch (error) {
        console.error('Error in GST verification:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            method: error.config?.method
        });
        return {
            success: false,
            error: error.response?.data || error.message,
            message: 'GST verification failed'
        };
    }
}

/**
 * Extract data from GST Certificate using OCR
 * @param {string} imageInput - Base64 encoded image or S3/public URL of GST certificate
 * @returns {Promise} - API response with extracted GST data
 */
async function gstOCR(imageInput) {
    try {
        let formattedImage;

        // Check if input is a URL or base64
        if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
            console.log('Converting GST certificate S3 URL to base64:', imageInput);
            formattedImage = await urlToBase64(imageInput, 800); // Limit to 800KB
        } else if (imageInput.startsWith('data:image/')) {
            formattedImage = imageInput;
        } else {
            // Assume it's base64 without data URL prefix
            formattedImage = `data:image/jpeg;base64,${imageInput}`;
        }

        const payload = {
            task_id: `gst_ocr_${Date.now()}`,
            group_id: `group_${Date.now()}`,
            data: {
                document1: formattedImage
            }
        };

        console.log('GST OCR Request:', {
            task_id: payload.task_id,
            group_id: payload.group_id,
            imageSize: formattedImage.length,
            imageSizeKB: Math.round(formattedImage.length / 1024),
            imagePrefix: formattedImage.substring(0, 50) + '...'
        });

        // Create axios instance with better error handling
        const apiClient = axios.create({
            timeout: 60000, // 60 second timeout
            maxContentLength: 50 * 1024 * 1024, // 50MB
            maxBodyLength: 50 * 1024 * 1024, // 50MB
        });

        // Try different possible endpoints for GST OCR
        const endpoints = [
            `${IDFY_CONFIG.baseURL}/sync/extract/ind_gst`,
            `${IDFY_CONFIG.baseURL}/async/extract/ind_gst`,
            `${IDFY_CONFIG.baseURL}/sync/extract/in_gst`,
            `${IDFY_CONFIG.baseURL}/extract/ind_gst`
        ];

        let lastError;
        for (const endpoint of endpoints) {
            try {
                console.log(`Trying GST OCR endpoint: ${endpoint}`);
                const response = await apiClient.post(
                    endpoint,
                    payload,
                    {
                        headers: {
                            ...IDFY_CONFIG.headers,
                            'Content-Length': JSON.stringify(payload).length
                        }
                    }
                );

                console.log(`Success with endpoint: ${endpoint}, Status: ${response.status}`);
                return {
                    success: true,
                    data: response.data,
                    message: 'GST OCR completed',
                    endpoint: endpoint
                };
            } catch (err) {
                lastError = err;
                console.log(`GST OCR endpoint ${endpoint} failed:`, {
                    status: err.response?.status,
                    statusText: err.response?.statusText,
                    code: err.code,
                    message: err.message
                });

                // If it's not a 404, this might be the right endpoint but with a different error
                if (err.response?.status && err.response.status !== 404) {
                    throw err;
                }

                // If it's a network error, don't try other endpoints
                if (err.code === 'EPIPE' || err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
                    throw err;
                }
            }
        }

        throw lastError;

    } catch (error) {
        console.error('Error in GST OCR:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            method: error.config?.method,
            code: error.code,
            message: error.message
        });
        return {
            success: false,
            error: error.response?.data || error.message,
            message: 'GST OCR failed',
            errorCode: error.code
        };
    }
}

/**
 * Test with a smaller dummy request to identify the issue
 */
async function testDummyOCR() {
    try {
        // Create a small test image (1x1 pixel red dot in base64)
        const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

        const payload = {
            task_id: `test_${Date.now()}`,
            group_id: `test_group_${Date.now()}`,
            data: {
                document1: testImage
            }
        };

        console.log('Testing with dummy image payload...');

        const response = await axios.post(
            `${IDFY_CONFIG.baseURL}/sync/extract/ind_driving_license`,
            payload,
            {
                headers: IDFY_CONFIG.headers,
                timeout: 30000
            }
        );

        return {
            success: true,
            data: response.data,
            message: 'Dummy OCR test completed successfully'
        };
    } catch (error) {
        console.error('Dummy OCR Test Failed:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            code: error.code,
            message: error.message
        });
        return {
            success: false,
            error: error.response?.data || error.message,
            message: 'Dummy OCR test failed',
            errorCode: error.code
        };
    }
}

// Export functions for use in other modules_
export {
    checkDrivingLicense,
    drivingLicenseImage,
    aadharNumber,
    aadharOCR,
    verifyGST,
    gstOCR,
    testAPIConnection,
    testDummyOCR,
    urlToBase64
};