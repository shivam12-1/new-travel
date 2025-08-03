import { body, param, validationResult } from 'express-validator';
import {ChatServiceError} from "./myutils.js";


export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        throw new ChatServiceError('Validation Error', 400, errors.array());
    }
    next();
};

export const createChatValidation = [
    body('cause')
        .notEmpty().withMessage('Cause is required')
        .isIn(['DRIVER', 'TRANSPORTER', 'RICKSHAW', 'E_RICKSHAW', 'INDEPENDENT_CAR_OWNER'])
        .withMessage('Invalid cause value only \'DRIVER\', \'TRANSPORTER\', \'RICKSHAW\', \'E_RICKSHAW\', \'INDEPENDENT_CAR_OWNER\' Allowed'),

    body('id')
        .notEmpty().withMessage('ID is required')
        .isMongoId().withMessage('Invalid MongoDB ID'),
];

export const deleteChatValidation = [
    param('conversationsId')
        .notEmpty().withMessage('Conversation ID is required')
        .isMongoId().withMessage('Invalid conversation ID'),
];

