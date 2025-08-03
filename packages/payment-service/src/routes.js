import express from "express";

import {PaymentService} from "./handler.js";
import {asyncWrapper} from "../utils/index.js";
import {createOrderValidation, saveOrderValidation, validate} from "./utils/validate.js";

const paymentRouter = express.Router();


paymentRouter.get('/plans',asyncWrapper(PaymentService.getPlans));
paymentRouter.post('/create-order',[...createOrderValidation,validate],asyncWrapper(PaymentService.createOrder));
paymentRouter.post('/save-order',[...saveOrderValidation,validate],asyncWrapper(PaymentService.saveOrder));

// Registration fee payment routes
paymentRouter.post('/create-registration-order', asyncWrapper(PaymentService.createRegistrationOrder));
paymentRouter.post('/save-registration-order', [...saveOrderValidation,validate], asyncWrapper(PaymentService.saveRegistrationOrder));

// Payment status check
paymentRouter.get('/status/:category', asyncWrapper(PaymentService.getPaymentStatus));

export default paymentRouter;