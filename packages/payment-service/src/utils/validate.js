import { body, validationResult } from 'express-validator';
import {PaymentServiceError} from "./myutils.js";

export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Throw custom error with validation error details
        throw new PaymentServiceError('Validation Error', 400, errors.array());
    }
    next();
};

export const createOrderValidation = [
    body('planId')
        .notEmpty().withMessage('planId is required')
        .isMongoId().withMessage('planId must be a valid MongoDB ID'),
];

export const saveOrderValidation = [
    body('razorpay_order_id')
        .notEmpty().withMessage('razorpay_order_id is required')
        .isString().withMessage('razorpay_order_id must be a string'),

    body('razorpay_payment_id')
        .notEmpty().withMessage('razorpay_payment_id is required')
        .isString().withMessage('razorpay_payment_id must be a string'),

    body('razorpay_signature')
        .notEmpty().withMessage('razorpay_signature is required')
        .isString().withMessage('razorpay_signature must be a string'),
];
