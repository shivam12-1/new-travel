import { body, param, query, validationResult } from 'express-validator';
import {UserServiceError} from "./myutils.js";

const allowedTypes = ['DRIVER', 'TRANSPORTER', 'RICKSHAW', 'E_RICKSHAW'];
const searchAllowedTypes = ['CAR', 'SUV', 'E_RICKSHAW', 'VAN', 'MINIVAN', 'BUS', 'RICKSHAW', 'ALL_VEHICLES','DRIVER'];
const activityType = ['WHATSAPP', 'MESSAGE', 'CHAT', 'PHONE', 'CLICK'];
const mediaType=['IMAGE','VIDEO','DOCUMENT'];

const mediaKind = ['vehicle', 'transporter', 'driver', 'rickshaw', 'e_rickshaw', 'user','chat','admin'];

const kindValidation = body('kind')
    .notEmpty().withMessage('kind is required')
    .customSanitizer(value => value.toLowerCase()) // convert to lowercase before validation
    .custom(value => {
        if (!mediaKind.includes(value)) {
            throw new Error(`Invalid kind value. Allowed values: ${mediaKind.join(', ')}`);
        }
        return true;
    });

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new UserServiceError('Validation Error', 400, errors.array());
    }
    next();
};

// GET /single/:id?type=TYPE
export const searchSingleValidation = [
    param('id')
        .notEmpty().withMessage('ID param is required')
        .isMongoId().withMessage('Invalid MongoDB ID'),

    query('type')
        .notEmpty().withMessage('Type query param is required')
        .isIn(allowedTypes).withMessage(`Invalid type value only ${JSON.stringify(allowedTypes)} allowed`),
];

// POST /activity
export const activityValidation = [
    body('id')
        .notEmpty().withMessage('ID is required')
        .isMongoId().withMessage('Invalid MongoDB ID'),

    body('activity')
        .notEmpty().withMessage('Activity is required')
        .isIn(activityType).withMessage(`Invalid activity value only ${JSON.stringify(activityType)} allowed`),


    body('TYPE')
        .notEmpty().withMessage('TYPE is required')
        .isIn(allowedTypes).withMessage(`Invalid TYPE value only ${JSON.stringify(allowedTypes)} allowed`),
];

// GET /filter?toDrivers=&searchType=
export const filterValidation = [
    query('searchType')
        .notEmpty().withMessage('searchType query param is required')
        .isIn(allowedTypes).withMessage(`Invalid searchType value ${JSON.stringify(allowedTypes)}`),

    query('toDrivers')
        .optional()
        .isBoolean().withMessage('toDrivers must be boolean'),
];

// POST /search
export const searchValidation = [
    body('pincode')
        .optional()
        .isString().withMessage('pincode must be a string'),

    body('lat')
        .optional()
        .isFloat({ min: -90, max: 90 }).withMessage('lat must be a valid latitude'),

    body('lng')
        .optional()
        .isFloat({ min: -180, max: 180 }).withMessage('lng must be a valid longitude'),

    body('searchType')
        .optional()
        .isIn(searchAllowedTypes).withMessage(`Invalid searchType value only ${JSON.stringify(searchAllowedTypes)}`),

    body('page')
        .optional()
        .isInt({ min: 1 }).withMessage('page must be an integer >= 1'),

    body('limit')
        .optional()
        .isInt({ min: 1 }).withMessage('limit must be an integer >= 1'),
    //
    // body('filters')
    //     .optional()
    //     .isObject().withMessage('filters must be an object'),
];

// POST /upload (multipart)
export const uploadValidation = [
    body('type')
        .notEmpty().withMessage('type is required')
        .isIn(mediaType).withMessage(`Invalid type value  ${JSON.stringify(mediaType)}`),
    kindValidation
];

// PUT /location
export const updateLocationValidation = [
    body('lat')
        .notEmpty().withMessage('lat is required')
        .isFloat({ min: -90, max: 90 }).withMessage('lat must be a valid latitude between -90 and 90'),
    body('lng')
        .notEmpty().withMessage('lng is required')
        .isFloat({ min: -180, max: 180 }).withMessage('lng must be a valid longitude between -180 and 180')
];
