import { validationResult, body,query } from 'express-validator';
import {DriverTransPorterServiceError} from "./myutils.js";


export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new DriverTransPorterServiceError("Validation Error",400,errors.array());
    }
    next();
};


const allowedTypes = [
    'AADHAR',
    'DRIVING_LICENSE',
    'AADHAR_IMAGE',
    'DRIVING_LICENSE_IMAGE',
];

const baseValidationRules = [
    body('TYPE')
        .exists().withMessage(`TYPE field is required. Allowed values: ${allowedTypes.join(', ')}`)
        .bail()
        .isIn(allowedTypes).withMessage(`Invalid TYPE value. Allowed values: ${allowedTypes.join(', ')}`),
];

// Conditional validation middleware
const conditionalValidation = [
    // Aadhaar number validation
    body('aadhaar_number')
        .if(body('TYPE').equals('AADHAR'))
        .exists().withMessage('Aadhaar number is required for AADHAR verification')
        .isLength({ min: 12, max: 12 }).withMessage('Aadhaar number must be 12 digits')
        .isNumeric().withMessage('Aadhaar number must contain only numbers'),

    // Driving license validation
    body('dl_number')
        .if(body('TYPE').equals('DRIVING_LICENSE'))
        .exists().withMessage('Driving license number is required for DRIVING_LICENSE verification')
        .isString().withMessage('Driving license number must be a string'),

    body('dob')
        .if(body('TYPE').equals('DRIVING_LICENSE'))
        .exists().withMessage('Date of birth is required for DRIVING_LICENSE verification'),

    // Image validation for OCR types
    body('image')
        .if(body('TYPE').isIn(['AADHAR_IMAGE', 'DRIVING_LICENSE_IMAGE']))
        .exists().withMessage('Image URL is required for image verification')
        .isString().withMessage('Image must be a valid URL or base64 string'),

    // Back image validation for Aadhaar OCR (optional)
    body('back_image')
        .if(body('TYPE').equals('AADHAR_IMAGE'))
        .optional()
        .isString().withMessage('Back image must be a valid URL or base64 string'),

    // Name validation (optional for all types)
    body('name')
        .optional()
        .isString().withMessage('Name must be a string')
        .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
];

const advancedValidation = [
    // Ensure required fields are present based on TYPE
    body()
        .custom((value, { req }) => {
            const { TYPE } = req.body;

            switch (TYPE) {
                case 'AADHAR':
                    if (!req.body.aadhaar_number) {
                        throw new Error('aadhaar_number is required for AADHAR verification');
                    }
                    break;

                case 'DRIVING_LICENSE':
                    if (!req.body.dl_number) {
                        throw new Error('dl_number is required for DRIVING_LICENSE verification');
                    }
                    if (!req.body.dob) {
                        throw new Error('dob is required for DRIVING_LICENSE verification');
                    }
                    break;

                case 'AADHAR_IMAGE':
                case 'DRIVING_LICENSE_IMAGE':
                    if (!req.body.image) {
                        throw new Error(`image is required for ${TYPE} verification`);
                    }
                    break;
                case 'GST':
                    if(!req.body.gst_number){
                        throw new Error('aadhaar_number is required for AADHAR verification');
                    }
                    break;
            }

            return true;
        }),
];


export const driverRegistrationValidation = [
    // Document validations
    body('drivingLicenceNumber')
        .exists().withMessage('Driving licence number is required')
        .isString().withMessage('Driving licence number must be a string')
        .isLength({ min: 6 }).withMessage('Driving licence number must be at least 6 characters long')
        .customSanitizer(value => value.trim().toUpperCase()),

    body('drivingLicencePhoto')
        .exists().withMessage('Driving licence photo is required')
        .isURL().withMessage('Driving licence photo must be a valid URL'),

    body('aadharCardNumber')
        .exists().withMessage('Aadhar card number is required')
        .isString().withMessage('Aadhar card number must be a string')
        .matches(/^\d{12}$/).withMessage('Aadhar card number must be 12 digits')
        .customSanitizer(value => value.trim()),

    body('aadharCardPhoto')
        .exists().withMessage('Aadhar card photo is required')
        .isURL().withMessage('Aadhar card photo must be a valid URL'),

    // PAN Card - Optional
    body('panCardNumber')
        .optional()
        .custom((value) => {
            if (value && value.trim() !== '') {
                if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
                    throw new Error('Invalid PAN card number format');
                }
            }
            return true;
        })
        .customSanitizer(value => value ? value.trim().toUpperCase() : ''),

    body('panCardPhoto')
        .optional()
        .custom((value, { req }) => {
            // If PAN number is provided, photo should also be provided
            if (req.body.panCardNumber && req.body.panCardNumber.trim() !== '' && (!value || value.trim() === '')) {
                throw new Error('PAN card photo is required when PAN number is provided');
            }
            if (value && value.trim() !== '' && !/^https?:\/\/.+/.test(value)) {
                throw new Error('PAN card photo must be a valid URL');
            }
            return true;
        })
        .customSanitizer(value => value || ''),

    // Vehicle and service details
    body('vehicleType')
        .exists().withMessage('Vehicle type is required')
        .isArray({ min: 1 }).withMessage('At least one vehicle type is required'),
    // .custom((value) => {
    //     if (!value.every(type => VehicleTypes.includes(type))) {
    //         throw new Error(`Invalid vehicle type. Allowed types: ${VehicleTypes.join(', ')}`);
    //     }
    //     return true;
    // }),

    body('servicesCities')
        .exists().withMessage('Service cities are required')
        .isArray({ min: 1 }).withMessage('At least one service city is required')
        .custom((value) => {
            if (!value.every(city => typeof city === 'string' && city.trim().length > 0)) {
                throw new Error('All service cities must be non-empty strings');
            }
            return true;
        }),

    // Personal information
    body('fullName')
        .exists().withMessage('Full name is required')
        .isString().withMessage('Full name must be a string')
        .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s.]+$/).withMessage('Full name can only contain letters, spaces, and dots')
        .customSanitizer(value => value.trim()),

    body('mobileNumber')
        .exists().withMessage('Mobile number is required')
        .matches(/^[6-9]\d{9}$/).withMessage('Mobile number must be a valid 10-digit Indian number starting with 6-9')
        .customSanitizer(value => value.trim()),

    body('profilePhoto')
        .exists().withMessage('Profile photo is required')
        .isURL().withMessage('Profile photo must be a valid URL'),

    body('languageSpoken')
        .exists().withMessage('Languages spoken are required')
        .isArray({ min: 1 }).withMessage('At least one language is required')
        .custom((value) => {
            if (!value.every(lang => typeof lang === 'string' && lang.trim().length > 0)) {
                throw new Error('All languages must be non-empty strings');
            }
            return true;
        }),

    body('bio')
        .optional()
        .isString().withMessage('Bio must be a string')
        .isLength({ max: 300 }).withMessage('Bio cannot exceed 300 characters')
        .customSanitizer(value => value ? value.trim() : ''),

    body('experience')
        .exists().withMessage('Experience is required')
        .isInt({ min: 0, max: 50 }).withMessage('Experience must be a number between 0 and 50'),

    // Address validation
    body('address')
        .exists().withMessage('Address is required')
        .isObject().withMessage('Address must be an object'),

    body('address.addressLine')
        .exists().withMessage('Address line is required')
        .isString().withMessage('Address line must be a string')
        .isLength({ min: 5, max: 200 }).withMessage('Address line must be between 5 and 200 characters')
        .customSanitizer(value => value.trim()),

    body('address.city')
        .exists().withMessage('City is required')
        .isString().withMessage('City must be a string')
        .isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters')
        .customSanitizer(value => value.trim()),

    body('address.state')
        .exists().withMessage('State is required')
        .isString().withMessage('State must be a string')
        .isLength({ min: 2, max: 50 }).withMessage('State must be between 2 and 50 characters')
        .customSanitizer(value => value.trim()),

    body('address.pincode')
        .exists().withMessage('Pincode is required')
        .isInt({ min: 100000, max: 999999 }).withMessage('Pincode must be a valid 6-digit number'),

    body('address.country')
        .optional()
        .isString().withMessage('Country must be a string')
        .customSanitizer(value => value ? value.trim() : 'India'),

    // Financial and other details
    body('minimumCharges')
        .exists().withMessage('Minimum charges are required')
        .isFloat({ min: 0 }).withMessage('Minimum charges must be a positive number'),

    body('dob')
        .exists().withMessage('Date of birth is required'),

    body('gender')
        .exists().withMessage('Gender is required')
        .isIn(['Male', 'Female', 'Other']).withMessage('Gender must be Male, Female, or Other'),

    // Apply validation
    validate
];

// Transporter Registration Validation
export const transporterRegistrationValidation = [
    // Profile image
    body('profilePhoto')
        .exists().withMessage('Profile image is required')
        .isURL().withMessage('Profile image must be a valid URL'),

    // GST validation
    body('gstin')
        .exists().withMessage('GST number is required')
        .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
        .withMessage('Invalid GST number format'),

    // Company/proprietor name (autofilled from GST)
    body('companyName')
        .exists().withMessage('Company/proprietor name is required')
        .isString().withMessage('Company name must be a string')
        .isLength({ min: 2, max: 200 }).withMessage('Company name must be between 2 and 200 characters')
        .customSanitizer(value => value.trim()),

    // Address (autofilled from GST)
    body('address')
        .exists().withMessage('Address is required')
        .isObject().withMessage('Address must be an object'),

    body('address.addressLine')
        .exists().withMessage('Address line is required')
        .isString().withMessage('Address line must be a string')
        .isLength({ min: 5, max: 300 }).withMessage('Address line must be between 5 and 300 characters'),

    body('address.pincode')
        .exists().withMessage('Pincode is required')
        .isInt({ min: 100000, max: 999999 }).withMessage('Pincode must be a valid 6-digit number'),

    body('address.city')
        .exists().withMessage('City is required')
        .isString().withMessage('City must be a string')
        .isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters'),

    body('address.state')
        .exists().withMessage('State is required')
        .isString().withMessage('State must be a string')
        .isLength({ min: 2, max: 50 }).withMessage('State must be between 2 and 50 characters'),

    // Phone number
    body('phoneNumber')
        .exists().withMessage('Phone number is required')
        .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian number starting with 6-9'),

    // Contact person
    body('contactPersonName')
        .exists().withMessage('Contact person name is required')
        .isString().withMessage('Contact person name must be a string')
        .isLength({ min: 2, max: 100 }).withMessage('Contact person name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s.]+$/).withMessage('Contact person name can only contain letters, spaces, and dots'),

    // About (prefilled and editable)
    body('bio')
        .optional()
        .isString().withMessage('About must be a string')
        .isLength({ max: 500 }).withMessage('About cannot exceed 500 characters'),

    // Transportation permit image (optional)
    body('transportationPermit')
        .optional()
        .isURL().withMessage('Transportation permit must be a valid URL'),

    // Fleet size validation
    body('fleetSize')
        .exists().withMessage('Fleet size is required')
        .isIn(['small', 'medium', 'large']).withMessage('Fleet size must be small(1-5), medium(6-10), or large(11+)'),

    // Vehicle counts validation
    body('counts')
        .exists().withMessage('Vehicle counts are required')
        .isObject().withMessage('Vehicle counts must be an object'),

    body('counts.car')
        .optional()
        .isInt({ min: 0 }).withMessage('Car count must be a non-negative integer'),

    body('counts.bus')
        .optional()
        .isInt({ min: 0 }).withMessage('Bus count must be a non-negative integer'),

    body('counts.van')
        .optional()
        .isInt({ min: 0 }).withMessage('Van count must be a non-negative integer'),

    // Fleet size limit validation
    body().custom((value, { req }) => {
        const { fleetSize, counts } = req.body;
        const totalVehicles = (counts?.car || 0) + (counts?.bus || 0) + (counts?.van || 0);
        
        let maxLimit;
        switch (fleetSize) {
            case 'small': maxLimit = 5; break;
            case 'medium': maxLimit = 10; break;
            case 'large': maxLimit = Infinity; break;
            default: maxLimit = 0;
        }
        
        if (totalVehicles > maxLimit && fleetSize !== 'large') {
            throw new Error(`Total vehicle count (${totalVehicles}) exceeds ${fleetSize} fleet size limit (${maxLimit})`);
        }
        
        if (totalVehicles === 0) {
            throw new Error('At least one vehicle count must be greater than 0');
        }
        
        return true;
    }),

    validate
];

// Auto Rickshaw Registration Validation
export const autoRickshawRegistrationValidation = [
    // Photo with image recognition
    body('profilePhoto')
        .exists().withMessage('Photo is required')
        .isURL().withMessage('Photo must be a valid URL'),

    // Name
    body('details.fullName')
        .exists().withMessage('Name is required')
        .isString().withMessage('Name must be a string')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s.]+$/).withMessage('Name can only contain letters, spaces, and dots'),

    // Phone number
    body('details.mobileNumber')
        .exists().withMessage('Phone number is required')
        .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian number starting with 6-9'),

    // About (prefilled and editable)
    body('details.bio')
        .optional()
        .isString().withMessage('About must be a string')
        .isLength({ max: 500 }).withMessage('About cannot exceed 500 characters'),

    // Address
    body('details.address')
        .exists().withMessage('Address is required')
        .isObject().withMessage('Address must be an object'),

    body('details.address.addressLine')
        .exists().withMessage('Address line is required')
        .isString().withMessage('Address line must be a string')
        .isLength({ min: 5, max: 300 }).withMessage('Address line must be between 5 and 300 characters'),

    body('details.address.pincode')
        .exists().withMessage('Pincode is required')
        .isInt({ min: 100000, max: 999999 }).withMessage('Pincode must be a valid 6-digit number'),

    body('details.address.city')
        .exists().withMessage('City is required (autofilled by pincode)')
        .isString().withMessage('City must be a string'),

    body('details.address.state')
        .exists().withMessage('State is required (autofilled by pincode)')
        .isString().withMessage('State must be a string'),

    // Aadhar card validation
    body('aadharCardNumber')
        .exists().withMessage('Aadhar card number is required')
        .matches(/^\d{12}$/).withMessage('Aadhar card number must be 12 digits'),

    body('aadharCardPhoto')
        .exists().withMessage('Aadhar card front image is required')
        .isURL().withMessage('Aadhar card front image must be a valid URL'),

    body('aadharCardPhotoBack')
        .exists().withMessage('Aadhar card back image is required')
        .isURL().withMessage('Aadhar card back image must be a valid URL'),

    // Driving license validation
    body('driverLicenseNumber')
        .exists().withMessage('Driving license number is required')
        .isString().withMessage('Driving license number must be a string')
        .isLength({ min: 6 }).withMessage('Driving license number must be at least 6 characters'),

    body('driverLicensePhoto')
        .exists().withMessage('Driving license image is required')
        .isURL().withMessage('Driving license image must be a valid URL'),

    // Vehicle details
    body('vehicleNumber')
        .exists().withMessage('Vehicle number is required')
        .isString().withMessage('Vehicle number must be a string')
        .matches(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/).withMessage('Invalid vehicle number format'),

    body('seatingCapacity')
        .exists().withMessage('Seating capacity is required')
        .isInt({ min: 1, max: 8 }).withMessage('Seating capacity must be between 1 and 8'),

    // Vehicle images
    body('vehicleImages')
        .exists().withMessage('Vehicle images are required')
        .isArray({ min: 1 }).withMessage('At least one vehicle image is required')
        .custom((value) => {
            if (!value.every(img => typeof img === 'string' && /^https?:\/\/.+/.test(img))) {
                throw new Error('All vehicle images must be valid URLs');
            }
            return true;
        }),

    // Vehicle video
    body('vehicleVideo')
        .exists().withMessage('Vehicle video is required')
        .isURL().withMessage('Vehicle video must be a valid URL')
        .custom((value) => {
            // Check if URL has video file extension or is from video hosting service
            if (!/\.(mp4|avi|mov|wmv|flv|webm)$/i.test(value) && 
                !/youtube|vimeo|dailymotion/i.test(value)) {
                throw new Error('Vehicle video must be a valid video file or video hosting URL');
            }
            return true;
        }),

    // Minimum charges
    body('minimumChargePerHour')
        .exists().withMessage('Minimum charges are required')
        .isFloat({ min: 0 }).withMessage('Minimum charges must be a positive number'),

    // Fare negotiable
    body('isPriceNegotiable')
        .exists().withMessage('Allow fare negotiable setting is required')
        .isBoolean().withMessage('Allow fare negotiable must be true or false'),

    // Service location
    body('serviceLocation')
        .exists().withMessage('Service location is required')
        .isObject().withMessage('Service location must be an object with lat/lng'),

    body('serviceLocation.lat')
        .exists().withMessage('Service location latitude is required')
        .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),

    body('serviceLocation.lng')
        .exists().withMessage('Service location longitude is required')
        .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),

    // Spoken languages
    body('details.languageSpoken')
        .exists().withMessage('Spoken languages are required')
        .isArray({ min: 1 }).withMessage('At least one spoken language is required')
        .custom((value) => {
            if (!value.every(lang => typeof lang === 'string' && lang.trim().length > 0)) {
                throw new Error('All spoken languages must be non-empty strings');
            }
            return true;
        }),

    validate
];

// E-Rickshaw Registration Validation
export const eRickshawRegistrationValidation = [
    // Same as autoRickshawRegistrationValidation but without driving license requirement
    
    // Photo with image recognition
    body('profilePhoto')
        .exists().withMessage('Photo is required')
        .isURL().withMessage('Photo must be a valid URL'),

    // Name
    body('details.fullName')
        .exists().withMessage('Name is required')
        .isString().withMessage('Name must be a string')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s.]+$/).withMessage('Name can only contain letters, spaces, and dots'),

    // Phone number
    body('details.mobileNumber')
        .exists().withMessage('Phone number is required')
        .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian number starting with 6-9'),

    // About (prefilled and editable)
    body('details.bio')
        .optional()
        .isString().withMessage('About must be a string')
        .isLength({ max: 500 }).withMessage('About cannot exceed 500 characters'),

    // Address
    body('details.address')
        .exists().withMessage('Address is required')
        .isObject().withMessage('Address must be an object'),

    body('details.address.addressLine')
        .exists().withMessage('Address line is required')
        .isString().withMessage('Address line must be a string')
        .isLength({ min: 5, max: 300 }).withMessage('Address line must be between 5 and 300 characters'),

    body('details.address.pincode')
        .exists().withMessage('Pincode is required')
        .isInt({ min: 100000, max: 999999 }).withMessage('Pincode must be a valid 6-digit number'),

    body('details.address.city')
        .exists().withMessage('City is required (autofilled by pincode)')
        .isString().withMessage('City must be a string'),

    body('details.address.state')
        .exists().withMessage('State is required (autofilled by pincode)')
        .isString().withMessage('State must be a string'),

    // Aadhar card validation
    body('aadharCardNumber')
        .exists().withMessage('Aadhar card number is required')
        .matches(/^\d{12}$/).withMessage('Aadhar card number must be 12 digits'),

    body('aadharCardPhoto')
        .exists().withMessage('Aadhar card front image is required')
        .isURL().withMessage('Aadhar card front image must be a valid URL'),

    body('aadharCardPhotoBack')
        .exists().withMessage('Aadhar card back image is required')
        .isURL().withMessage('Aadhar card back image must be a valid URL'),

    // Vehicle details
    body('vehicleNumber')
        .exists().withMessage('Vehicle number is required')
        .isString().withMessage('Vehicle number must be a string')
        .matches(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/).withMessage('Invalid vehicle number format'),

    body('seatingCapacity')
        .exists().withMessage('Seating capacity is required')
        .isInt({ min: 1, max: 8 }).withMessage('Seating capacity must be between 1 and 8'),

    // Vehicle images
    body('vehicleImages')
        .exists().withMessage('Vehicle images are required')
        .isArray({ min: 1 }).withMessage('At least one vehicle image is required')
        .custom((value) => {
            if (!value.every(img => typeof img === 'string' && /^https?:\/\/.+/.test(img))) {
                throw new Error('All vehicle images must be valid URLs');
            }
            return true;
        }),

    // Vehicle video
    body('vehicleVideo')
        .exists().withMessage('Vehicle video is required')
        .isURL().withMessage('Vehicle video must be a valid URL')
        .custom((value) => {
            if (!/\.(mp4|avi|mov|wmv|flv|webm)$/i.test(value) && 
                !/youtube|vimeo|dailymotion/i.test(value)) {
                throw new Error('Vehicle video must be a valid video file or video hosting URL');
            }
            return true;
        }),

    // Minimum charges
    body('minimumChargePerHour')
        .exists().withMessage('Minimum charges are required')
        .isFloat({ min: 0 }).withMessage('Minimum charges must be a positive number'),

    // Fare negotiable
    body('isPriceNegotiable')
        .exists().withMessage('Allow fare negotiable setting is required')
        .isBoolean().withMessage('Allow fare negotiable must be true or false'),

    // Service location
    body('serviceLocation')
        .exists().withMessage('Service location is required')
        .isObject().withMessage('Service location must be an object with lat/lng'),

    body('serviceLocation.lat')
        .exists().withMessage('Service location latitude is required')
        .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),

    body('serviceLocation.lng')
        .exists().withMessage('Service location longitude is required')
        .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),

    // Spoken languages
    body('details.languageSpoken')
        .exists().withMessage('Spoken languages are required')
        .isArray({ min: 1 }).withMessage('At least one spoken language is required')
        .custom((value) => {
            if (!value.every(lang => typeof lang === 'string' && lang.trim().length > 0)) {
                throw new Error('All spoken languages must be non-empty strings');
            }
            return true;
        }),

    validate
];

// Updated Driver Registration Validation
export const updatedDriverRegistrationValidation = [
    // Photo with image recognition
    body('profilePhoto')
        .exists().withMessage('Photo is required')
        .isURL().withMessage('Photo must be a valid URL'),

    // Name
    body('fullName')
        .exists().withMessage('Name is required')
        .isString().withMessage('Name must be a string')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s.]+$/).withMessage('Name can only contain letters, spaces, and dots'),

    // Phone number
    body('mobileNumber')
        .exists().withMessage('Phone number is required')
        .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian number starting with 6-9'),

    // DOB (not below 18)
    body('dob')
        .exists().withMessage('Date of birth is required')
        .isISO8601().withMessage('Date of birth must be a valid date')
        .custom((value) => {
            const birthDate = new Date(value);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            if (age < 18) {
                throw new Error('Driver must be at least 18 years old');
            }
            return true;
        }),

    // Gender
    body('gender')
        .exists().withMessage('Gender is required')
        .isIn(['Male', 'Female']).withMessage('Gender must be Male or Female'),

    // About (prefilled and editable)
    body('bio')
        .optional()
        .isString().withMessage('About must be a string')
        .isLength({ max: 500 }).withMessage('About cannot exceed 500 characters'),

    // Address
    body('address')
        .exists().withMessage('Address is required')
        .isObject().withMessage('Address must be an object'),

    body('address.addressLine')
        .exists().withMessage('Address line is required')
        .isString().withMessage('Address line must be a string')
        .isLength({ min: 5, max: 300 }).withMessage('Address line must be between 5 and 300 characters'),

    body('address.pincode')
        .exists().withMessage('Pincode is required')
        .isInt({ min: 100000, max: 999999 }).withMessage('Pincode must be a valid 6-digit number'),

    body('address.city')
        .exists().withMessage('City is required (autofilled by pincode)')
        .isString().withMessage('City must be a string'),

    body('address.state')
        .exists().withMessage('State is required (autofilled by pincode)')
        .isString().withMessage('State must be a string'),

    // Experience in years
    body('experience')
        .exists().withMessage('Experience in years is required')
        .isInt({ min: 0, max: 50 }).withMessage('Experience must be between 0 and 50 years'),

    // Minimum charge
    body('minimumCharges')
        .exists().withMessage('Minimum charges are required')
        .isFloat({ min: 0 }).withMessage('Minimum charges must be a positive number'),

    // Negotiable
    body('negotiable')
        .exists().withMessage('Negotiable setting is required')
        .isBoolean().withMessage('Negotiable must be true or false'),

    // Aadhar card validation
    body('aadharCardNumber')
        .exists().withMessage('Aadhar card number is required')
        .matches(/^\d{12}$/).withMessage('Aadhar card number must be 12 digits'),

    body('aadharCardPhoto')
        .exists().withMessage('Aadhar card front image is required')
        .isURL().withMessage('Aadhar card front image must be a valid URL'),

    body('aadharCardPhotoBack')
        .exists().withMessage('Aadhar card back image is required')
        .isURL().withMessage('Aadhar card back image must be a valid URL'),

    // Driving license validation
    body('drivingLicenceNumber')
        .exists().withMessage('Driving license number is required')
        .isString().withMessage('Driving license number must be a string')
        .isLength({ min: 6 }).withMessage('Driving license number must be at least 6 characters'),

    body('drivingLicencePhoto')
        .exists().withMessage('Driving license image is required')
        .isURL().withMessage('Driving license image must be a valid URL'),

    // Vehicle type drive
    body('vehicleType')
        .exists().withMessage('Vehicle type is required')
        .isArray({ min: 1 }).withMessage('At least one vehicle type is required'),

    // Service location
    body('serviceLocation')
        .exists().withMessage('Service location is required')
        .isObject().withMessage('Service location must be an object with lat/lng'),

    body('serviceLocation.lat')
        .exists().withMessage('Service location latitude is required')
        .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),

    body('serviceLocation.lng')
        .exists().withMessage('Service location longitude is required')
        .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),

    // Spoken languages
    body('languageSpoken')
        .exists().withMessage('Spoken languages are required')
        .isArray({ min: 1 }).withMessage('At least one spoken language is required')
        .custom((value) => {
            if (!value.every(lang => typeof lang === 'string' && lang.trim().length > 0)) {
                throw new Error('All spoken languages must be non-empty strings');
            }
            return true;
        }),

    validate
];



// Independent Car Owner Registration Validation
export const independentCarOwnerValidation = [
    // Photo with image recognition
    body('photo')
        .exists().withMessage('Photo is required')
        .isURL().withMessage('Photo must be a valid URL'),

    // Name
    body('name')
        .exists().withMessage('Name is required')
        .isString().withMessage('Name must be a string')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s.]+$/).withMessage('Name can only contain letters, spaces, and dots')
        .customSanitizer(value => value.trim()),

    // Phone number
    body('phoneNumber')
        .exists().withMessage('Phone number is required')
        .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian number starting with 6-9'),

    // About (prefilled and editable)
    body('about')
        .optional()
        .isString().withMessage('About must be a string')
        .isLength({ max: 300 }).withMessage('About cannot exceed 300 characters'),

    // Address
    body('address')
        .exists().withMessage('Address is required')
        .isObject().withMessage('Address must be an object'),

    body('address.addressLine')
        .exists().withMessage('Address line is required')
        .isString().withMessage('Address line must be a string')
        .isLength({ min: 5, max: 300 }).withMessage('Address line must be between 5 and 300 characters'),

    body('address.pincode')
        .exists().withMessage('Pincode is required')
        .isInt({ min: 100000, max: 999999 }).withMessage('Pincode must be a valid 6-digit number'),

    body('address.city')
        .exists().withMessage('City is required (autofilled by pincode)')
        .isString().withMessage('City must be a string'),

    body('address.state')
        .exists().withMessage('State is required (autofilled by pincode)')
        .isString().withMessage('State must be a string'),

    // Aadhaar card validation
    body('documents.aadharCardNumber')
        .exists().withMessage('Aadhaar card number is required')
        .matches(/^\d{12}$/).withMessage('Aadhaar card number must be 12 digits'),

    body('documents.aadharCardPhotoFront')
        .exists().withMessage('Aadhaar card front image is required')
        .isURL().withMessage('Aadhaar card front image must be a valid URL'),

    body('documents.aadharCardPhotoBack')
        .exists().withMessage('Aadhaar card back image is required')
        .isURL().withMessage('Aadhaar card back image must be a valid URL'),

    // Driving license validation
    body('documents.drivingLicenseNumber')
        .exists().withMessage('Driving license number is required')
        .isString().withMessage('Driving license number must be a string')
        .isLength({ min: 6 }).withMessage('Driving license number must be at least 6 characters'),

    body('documents.drivingLicensePhoto')
        .exists().withMessage('Driving license image is required')
        .isURL().withMessage('Driving license image must be a valid URL'),

    // Transportation permit (optional)
    body('documents.transportationPermitPhoto')
        .optional()
        .isURL().withMessage('Transportation permit photo must be a valid URL'),

    // Fleet size validation (max 2, only cars and minivans)
    body('fleetSize')
        .exists().withMessage('Fleet size is required')
        .isObject().withMessage('Fleet size must be an object'),

    body('fleetSize.cars')
        .exists().withMessage('Number of cars is required')
        .isInt({ min: 0, max: 2 }).withMessage('Number of cars must be between 0 and 2'),

    body('fleetSize.minivans')
        .exists().withMessage('Number of minivans is required')
        .isInt({ min: 0, max: 2 }).withMessage('Number of minivans must be between 0 and 2')
        .custom((value, { req }) => {
            const totalVehicles = (req.body.fleetSize?.cars || 0) + value;
            if (totalVehicles === 0) {
                throw new Error('Total fleet size must be at least 1 vehicle');
            }
            if (totalVehicles > 2) {
                throw new Error('Total fleet size cannot exceed 2 vehicles');
            }
            return true;
        }),

    validate
];

// Independent Car Owner Profile Update Validation
export const independentCarOwnerUpdateValidation = [
    // Photo validation (optional for updates)
    body('photo')
        .optional()
        .isURL().withMessage('Photo must be a valid URL'),

    // Name validation (optional for updates)
    body('name')
        .optional()
        .isString().withMessage('Name must be a string')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s.]+$/).withMessage('Name can only contain letters, spaces, and dots')
        .customSanitizer(value => value.trim()),

    // Phone number validation (optional for updates)
    body('phoneNumber')
        .optional()
        .matches(/^[6-9]\d{9}$/).withMessage('Phone number must be a valid 10-digit Indian number starting with 6-9'),

    // About validation (optional for updates)
    body('about')
        .optional()
        .isString().withMessage('About must be a string')
        .isLength({ max: 300 }).withMessage('About cannot exceed 300 characters'),

    // Address validation (optional for updates)
    body('address')
        .optional()
        .isObject().withMessage('Address must be an object'),

    body('address.addressLine')
        .optional()
        .isString().withMessage('Address line must be a string')
        .isLength({ min: 5, max: 300 }).withMessage('Address line must be between 5 and 300 characters'),

    body('address.pincode')
        .optional()
        .isInt({ min: 100000, max: 999999 }).withMessage('Pincode must be a valid 6-digit number'),

    body('address.city')
        .optional()
        .isString().withMessage('City must be a string'),

    body('address.state')
        .optional()
        .isString().withMessage('State must be a string'),

    // Fleet size validation (optional for updates)
    body('fleetSize')
        .optional()
        .isObject().withMessage('Fleet size must be an object'),

    body('fleetSize.cars')
        .optional()
        .isInt({ min: 0, max: 2 }).withMessage('Number of cars must be between 0 and 2'),

    body('fleetSize.minivans')
        .optional()
        .isInt({ min: 0, max: 2 }).withMessage('Number of minivans must be between 0 and 2'),

    validate
];

export const completeValidation = [
    ...baseValidationRules,
    ...conditionalValidation,
    ...advancedValidation,
    validate
];