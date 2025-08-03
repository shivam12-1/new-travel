import { validationResult, body,query } from 'express-validator';
import {AuthServiceError} from "./myutils.js";


export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new AuthServiceError("Validation Error",400,errors.array());
    }
    next();
};


const allowedTypes = [
    'PRIVACY_POLICY',
    'TERMS_AND_CONDITIONS',
    'LEGAL_DISCLAIMER',
    'DRIVER_AGREEMENT',
    'TRANSPORTER_AGREEMENT',
    'E_RICKSHAW_AGREEMENT',
    'RICKSHAW_AGREEMENT',
    'ABOUT_US',
    'FAQ_POLICY',
    'FAQ',
];

const isValidIndianPhone = (value) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(value);
};


export const sendOtpValidation = [
    body('number')
        .notEmpty().withMessage('Phone number is required')
        .custom(value => isValidIndianPhone(value)).withMessage('Invalid Indian phone number'),
];


export const verifyOtpValidation = [
    body('number')
        .notEmpty().withMessage('Phone number is required')
        .custom(value => isValidIndianPhone(value)).withMessage('Invalid Indian phone number'),

    body('otp')
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 4, max: 4 }).withMessage('OTP must be exactly 4 digits')
        .isNumeric().withMessage('OTP must be numeric'),
];


export const legalDocsValidation = [
    query('TYPE')
        .exists().withMessage(`TYPE query parameter is required. Allowed values: ${allowedTypes.join(', ')}`)
        .bail() // stop if 'exists' fails
        .isIn(allowedTypes).withMessage(`Invalid TYPE value. Allowed values: ${allowedTypes.join(', ')}`),
    query('LANG')
        .notEmpty().withMessage('lang is required')
];
