import ReviewRatingModel from "../models/Review-RatingModel.js";
import { RatingAndReviewServiceError } from "./utils/myutils.js";
import DriversModel from "../models/DriversModel.js";
import TransporterModel from "../models/TransporterModel.js";
import VehicleModel from "../models/VehiclesModel.js";
import IndependentCarOwnerModel from "../models/IndependentCarOwnerModel.js";
import mongoose from "mongoose";

export class RatingAndReviewService {

    static async calculateRatingFromReviews(targetId, serviceType) {
        const pipeline = [
            {
                $match: {
                    to: new mongoose.Types.ObjectId(targetId),
                    serviceType: serviceType,
                    isDeleted: false
                }
            },
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    totalRatingSum: { $sum: "$rating" },
                    averageRating: { $avg: "$rating" }
                }
            }
        ];

        const result = await ReviewRatingModel.aggregate(pipeline);

        if (result.length === 0) {
            return {
                rating: 4.0, // Default rating when no reviews exist
                totalReviews: 0,
                averageRating: 4.0
            };
        }

        const data = result[0];
        return {
            rating: Math.round(data.averageRating * 10) / 10, // Round to 1 decimal
            totalReviews: data.totalReviews,
            averageRating: data.averageRating
        };
    }

    static async updateModelRating(targetId, serviceType) {
        const ratingData = await RatingAndReviewService.calculateRatingFromReviews(targetId, serviceType);

        const updateData = {
            rating: ratingData.rating,
            totalRating: ratingData.totalReviews, // Keep for backward compatibility
            totalRatingSum: Math.round(ratingData.averageRating * ratingData.totalReviews) // Keep for backward compatibility
        };

        switch (serviceType) {
            case 'DRIVER':
                await DriversModel.findOneAndUpdate(
                    { userId: targetId },
                    { $set: updateData },
                    { new: true }
                );
                break;

            case 'TRANSPORTER':
                await TransporterModel.findOneAndUpdate(
                    { userId: targetId },
                    { $set: updateData },
                    { new: true }
                );
                break;

            case 'INDEPENDENT_CAR_OWNER':
                await IndependentCarOwnerModel.findOneAndUpdate(
                    { userId: targetId },
                    { $set: updateData },
                    { new: true }
                );
                break;

            case 'RICKSHAW':
            case 'E_RICKSHAW':
                await VehicleModel.findOneAndUpdate(
                    { userId: targetId },
                    {
                        $set: {
                            'details.rating': updateData.rating,
                            'details.totalRating': updateData.totalRating,
                            'details.totalRatingSum': updateData.totalRatingSum
                        }
                    },
                    { new: true }
                );
                break;
        }
    }
    static async getReviewAndRating(req, res) {
        const userId = req.headers['x-user-id'];
        const { id } = req.query;
        const personId = id !== undefined ? id : userId;

        try {
            const reviews = await ReviewRatingModel.aggregate([
                {
                    $match: {
                        to: new mongoose.Types.ObjectId(personId),
                        isDeleted: false
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                {
                    $project: {
                        _id: 0,
                        id: "$_id",
                        review: 1,
                        userId: 1,
                        rating: 1,
                        createdAt: 1,
                        userName: {
                            $concat: ['$user.firstName', ' ', '$user.lastName']
                        },
                        userPhoto: '$user.image'
                    }
                },
                { $sort: { createdAt: -1 } } // Most recent first
            ]).exec();

            const data = reviews.map(review => ({
                ...review,
                isReviewedByMe: review.userId.toString() === userId.toString()
            }));

            // Get current rating statistics
            const ratingStats = await RatingAndReviewService.calculateRatingFromReviews(personId, null);

            return res.json({
                status: true,
                message: 'All Reviews And Rating',
                data,
                ratingStats: {
                    averageRating: ratingStats.rating,
                    totalReviews: ratingStats.totalReviews
                }
            });

        } catch (error) {
            console.error('Error fetching reviews:', error);
            return res.status(500).json({
                status: false,
                message: 'Failed to fetch reviews',
                error: error.message
            });
        }
    }

    static async addReviewAndRating(req, res) {
        const { rating, review, id, service } = req.body;
        const userId = req.headers['x-user-id'];

        // Validation
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            throw new RatingAndReviewServiceError("Rating must be between 1 and 5", 400);
        }

        if (!id || !service) {
            throw new RatingAndReviewServiceError("Target ID and service type are required", 400);
        }

        try {
            // Check if user already reviewed this service
            const existingReview = await ReviewRatingModel.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                to: new mongoose.Types.ObjectId(id),
                serviceType: service,
                isDeleted: false
            });

            if (existingReview) {
                throw new RatingAndReviewServiceError("You have already reviewed this service. Please edit or delete your existing review.", 400);
            }

            // Create new review
            const newReview = await ReviewRatingModel.create({
                userId: new mongoose.Types.ObjectId(userId),
                to: new mongoose.Types.ObjectId(id),
                serviceType: service,
                rating,
                review: review || "" // Allow empty reviews
            });

            // Update model rating
            await RatingAndReviewService.updateModelRating(id, service);

            return res.json({
                status: true,
                message: 'Review created successfully',
                data: newReview
            });

        } catch (error) {
            console.error('Error adding review:', error);
            if (error instanceof RatingAndReviewServiceError) {
                return res.status(error.statusCode).json({
                    status: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                status: false,
                message: 'Failed to add review',
                error: error.message
            });
        }
    }

    static async editReviewAndRating(req, res) {
        const { rating, review } = req.body;
        const { reviewId } = req.params;
        const userId = req.headers['x-user-id'];

        // Validation
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            throw new RatingAndReviewServiceError("Rating must be between 1 and 5", 400);
        }

        try {
            // Find and update the review
            const updatedReview = await ReviewRatingModel.findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(reviewId),
                    userId: new mongoose.Types.ObjectId(userId),
                    isDeleted: false
                },
                {
                    rating,
                    review: review || "",
                    updatedAt: new Date()
                },
                { new: true }
            );

            if (!updatedReview) {
                throw new RatingAndReviewServiceError("Review not found or unauthorized", 404);
            }

            // Update model rating
            await RatingAndReviewService.updateModelRating(updatedReview.to, updatedReview.serviceType);

            return res.json({
                status: true,
                message: 'Review updated successfully',
                data: updatedReview
            });

        } catch (error) {
            console.error('Error updating review:', error);
            if (error instanceof RatingAndReviewServiceError) {
                return res.status(error.statusCode).json({
                    status: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                status: false,
                message: 'Failed to update review',
                error: error.message
            });
        }
    }

    static async deleteReviewAndRating(req, res) {
        const { reviewId } = req.params;
        const userId = req.headers['x-user-id'];

        try {
            // Soft delete the review
            const deletedReview = await ReviewRatingModel.findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(reviewId),
                    userId: new mongoose.Types.ObjectId(userId),
                    isDeleted: false
                },
                {
                    isDeleted: true,
                    deletedAt: new Date()
                },
                { new: true }
            );

            if (!deletedReview) {
                throw new RatingAndReviewServiceError("Review not found or unauthorized", 404);
            }

            // Update model rating
            await RatingAndReviewService.updateModelRating(deletedReview.to, deletedReview.serviceType);

            return res.json({
                status: true,
                message: 'Review deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting review:', error);
            if (error instanceof RatingAndReviewServiceError) {
                return res.status(error.statusCode).json({
                    status: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                status: false,
                message: 'Failed to delete review',
                error: error.message
            });
        }
    }
}