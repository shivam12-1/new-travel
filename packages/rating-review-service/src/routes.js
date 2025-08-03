import express from "express";
import {RatingAndReviewService} from "./handler.js";
import {asyncWrapper} from "../utils/index.js";
import {addReviewValidation, deleteReviewValidation, editReviewValidation, validate} from "./utils/validator.js";

const ratingRouter = express.Router();


ratingRouter.get('/review-rating',asyncWrapper(RatingAndReviewService.getReviewAndRating));
ratingRouter.post('/review-rating',[...addReviewValidation, validate],asyncWrapper(RatingAndReviewService.addReviewAndRating));
ratingRouter.put('/review-rating/:reviewId',[...editReviewValidation, validate],asyncWrapper(RatingAndReviewService.editReviewAndRating));
ratingRouter.delete('/review-rating/:reviewId', [...deleteReviewValidation, validate],asyncWrapper(RatingAndReviewService.deleteReviewAndRating));

export default ratingRouter;