import express from 'express';
import multer from 'multer'
import {UserService} from "./handler.js";
import {asyncWrapper} from "../utils/index.js";
import {
    activityValidation,
    filterValidation,
    searchSingleValidation,
    searchValidation, 
    uploadValidation,
    updateLocationValidation,
    validate
} from "./utils/validate.js";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

router.get('/secrets', asyncWrapper(UserService.getApplicationSecrets));
router.post('/home',asyncWrapper(UserService.home));
router.post('/search',[...searchValidation,validate],asyncWrapper(UserService.search));
router.get('/filter',[...filterValidation,validate],asyncWrapper(UserService.filter));

router.post('/public/search',[...searchValidation,validate],asyncWrapper(UserService.search));
router.get('/public/filter',[...filterValidation,validate],asyncWrapper(UserService.filter));


router.get('/profile',asyncWrapper(UserService.myProfile));
router.put('/profile',asyncWrapper(UserService.updateProfile));
router.put('/location',[...updateLocationValidation,validate],asyncWrapper(UserService.updateLocation));

router.get('/my-notification',asyncWrapper(UserService.notification));
router.get('/support',asyncWrapper(UserService.support));



router.post('/activity',[...activityValidation,validate],asyncWrapper(UserService.activity));


router.get('/single/:id',[...searchSingleValidation,validate],asyncWrapper(UserService.searchSingle));




router.get('/state-city',asyncWrapper(UserService.getStateAndCity));
router.get('/pincode/:pincode',asyncWrapper(UserService.getCityStateByPincode));

router.post('/upload',upload.single('file'),[...uploadValidation,validate],asyncWrapper(UserService.uploadMedia));
router.post('/validate-photo',upload.single('photo'),asyncWrapper(UserService.validatePhoto));

router.delete('/delete-account',asyncWrapper(UserService.deleteAccountOfUser));
router.post('/pref-account',asyncWrapper(UserService.prefAccountOfUser));
router.get('/pref-account',asyncWrapper(UserService.getAccountPreferences));



export default router;