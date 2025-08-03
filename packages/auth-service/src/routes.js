import express from 'express';
import {AuthService} from "./handler.js";
import {asyncWrapper} from "./utils/myutils.js";
import {legalDocsValidation, sendOtpValidation, validate, verifyOtpValidation} from "./utils/validator.js";


const authRouter=express.Router();

authRouter.post('/send-otp',[...sendOtpValidation,validate],asyncWrapper(AuthService.sendOtp));
authRouter.post('/verify-otp',[...verifyOtpValidation,validate],asyncWrapper(AuthService.verifyOtp));
authRouter.post('/login',asyncWrapper(AuthService.adminLogin));
authRouter.get('/legal',[...legalDocsValidation,validate],asyncWrapper(AuthService.getLegalDocs));
authRouter.get('/support',asyncWrapper(AuthService.getSupport));

export default authRouter;