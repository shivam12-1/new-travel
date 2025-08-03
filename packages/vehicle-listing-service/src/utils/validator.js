import { validationResult, body } from 'express-validator';

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation Error",
            errors: errors.array()
        });
    }
    next();
};

// Vehicle Listing Validation
export const vehicleListingValidation = [
    // Vehicle type (category)
    body('vehicleType')
        .exists().withMessage('Vehicle type is required')
        .isIn(['Car upto 5 seat', 'SUV upto 7 seat', 'Minivan upto 9 seat', 'Bus 10-62 seat'])
        .withMessage('Vehicle type must be: Car upto 5 seat, SUV upto 7 seat, Minivan upto 9 seat, or Bus 10-62 seat'),

    // Vehicle name
    body('vehicleName')
        .exists().withMessage('Vehicle name is required')
        .isString().withMessage('Vehicle name must be a string')
        .isLength({ min: 2, max: 100 }).withMessage('Vehicle name must be between 2 and 100 characters'),

    // Vehicle number
    body('vehicleNumber')
        .exists().withMessage('Vehicle number is required')
        .isString().withMessage('Vehicle number must be a string')
        .matches(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/).withMessage('Invalid vehicle number format'),

    // Seating capacity validation based on vehicle type
    body('seatingCapacity')
        .exists().withMessage('Seating capacity is required')
        .isInt({ min: 1 }).withMessage('Seating capacity must be a positive integer')
        .custom((value, { req }) => {
            const { vehicleType } = req.body;
            let maxCapacity;
            
            switch (vehicleType) {
                case 'Car upto 5 seat':
                    maxCapacity = 5;
                    break;
                case 'SUV upto 7 seat':
                    maxCapacity = 7;
                    break;
                case 'Minivan upto 9 seat':
                    maxCapacity = 9;
                    break;
                case 'Bus 10-62 seat':
                    maxCapacity = 62;
                    if (value < 10) {
                        throw new Error('Bus must have at least 10 seats');
                    }
                    break;
                default:
                    maxCapacity = 1;
            }
            
            if (value > maxCapacity) {
                throw new Error(`Seating capacity cannot exceed ${maxCapacity} for ${vehicleType}`);
            }
            
            return true;
        }),

    // Air conditioning
    body('airConditioning')
        .exists().withMessage('Air conditioning selection is required')
        .isIn(['AC', 'No AC']).withMessage('Air conditioning must be either AC or No AC'),

    // Service location
    body('serviceLocation')
        .exists().withMessage('Service location is required')
        .isObject().withMessage('Service location must be an object'),

    // Minimum charges
    body('minimumCharges')
        .exists().withMessage('Minimum charges are required')
        .isFloat({ min: 0 }).withMessage('Minimum charges must be a positive number'),

    // Price negotiable
    body('isPriceNegotiable')
        .exists().withMessage('Price negotiable setting is required')
        .isBoolean().withMessage('Price negotiable must be true or false'),

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

    // RC book images
    body('rcBookFrontPhoto')
        .exists().withMessage('RC book front image is required')
        .isURL().withMessage('RC book front image must be a valid URL'),

    body('rcBookBackPhoto')
        .exists().withMessage('RC book back image is required')
        .isURL().withMessage('RC book back image must be a valid URL'),

    validate
];