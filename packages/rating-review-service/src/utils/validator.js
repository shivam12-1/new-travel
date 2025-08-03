import { body, param, validationResult } from 'express-validator';
import {RatingAndReviewServiceError} from "./myutils.js";

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new RatingAndReviewServiceError('Validation Error', 400, errors.array());
    }
    next();
};

export const addReviewValidation = [
    body('rating')
        .notEmpty().withMessage('Rating is required')
        .isFloat({ min: 0, max: 5 }).withMessage('Rating must be a number between 0 and 5'),

    body('review')
        .notEmpty().withMessage('Review is required')
        .isString().withMessage('Review must be a string'),

    body('id')
        .notEmpty().withMessage('Id is required')
        .isMongoId().withMessage('Id must be a valid MongoDB ID'),

    body('service')
        .notEmpty().withMessage('Service is required')
        .isIn(['DRIVER', 'TRANSPORTER', 'RICKSHAW', 'E_RICKSHAW', 'INDEPENDENT_CAR_OWNER'])
        .withMessage('Invalid service value only \'DRIVER\', \'TRANSPORTER\', \'RICKSHAW\', \'E_RICKSHAW\', \'INDEPENDENT_CAR_OWNER\' allowed'),

];

export const editReviewValidation = [
    param('reviewId')
        .notEmpty().withMessage('Review ID is required')
        .isMongoId().withMessage('Review ID must be a valid MongoDB ID'),

    body('rating')
        .notEmpty().withMessage('Rating is required')
        .isFloat({ min: 0, max: 5 }).withMessage('Rating must be a number between 0 and 5'),

    body('review')
        .notEmpty().withMessage('Review is required')
        .isString().withMessage('Review must be a string'),
];

export const deleteReviewValidation = [
    param('reviewId')
        .notEmpty().withMessage('Review ID is required')
        .isMongoId().withMessage('Review ID must be a valid MongoDB ID'),
];
