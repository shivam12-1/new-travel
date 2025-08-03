import {envPath} from "../../../../utils/global-utils.js";
import dotenv from 'dotenv';

dotenv.config({ path: envPath()});
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { DetectLabelsCommand } from "@aws-sdk/client-rekognition";

import {
    RekognitionClient,
    DetectModerationLabelsCommand,
    DetectFacesCommand,
} from "@aws-sdk/client-rekognition";
import sharp from 'sharp'; // Add this dependency: npm install sharp

const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
});

const rekognition = new RekognitionClient({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
});

const bucketName = process.env.S3_BUCKET_NAME;
const region = process.env.S3_REGION;

// Validate and process image before upload
async function processImageBuffer(buffer, mimetype) {
    try {
        // Get image metadata
        const metadata = await sharp(buffer).metadata();

        // Check if image dimensions are within Rekognition limits
        // Rekognition supports images with dimensions between 15x15 and 15000x15000 pixels
        if (metadata.width < 15 || metadata.height < 15 ||
            metadata.width > 15000 || metadata.height > 15000) {
            throw new Error(`Image dimensions ${metadata.width}x${metadata.height} are outside supported range (15x15 to 15000x15000)`);
        }

        // Convert to JPEG if it's PNG (Rekognition works better with JPEG)
        if (mimetype === 'image/png' || metadata.format === 'png') {
            const processedBuffer = await sharp(buffer)
                .jpeg({ quality: 90 })
                .toBuffer();
            return {
                buffer: processedBuffer,
                contentType: 'image/jpeg',
                extension: 'jpg'
            };
        }

        // For JPEG, ensure it's properly formatted
        if (mimetype === 'image/jpeg' || metadata.format === 'jpeg') {
            const processedBuffer = await sharp(buffer)
                .jpeg({ quality: 90 })
                .toBuffer();
            return {
                buffer: processedBuffer,
                contentType: 'image/jpeg',
                extension: 'jpg'
            };
        }

        throw new Error(`Unsupported image format: ${metadata.format}`);
    } catch (error) {
        throw new Error(`Image processing failed: ${error.message}`);
    }
}

export async function uploadToS3(buffer, key, contentType) {
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: "public-read",
    });
    await s3.send(command);
    return `https://s3.ap-south-1.amazonaws.com/media.ridewithdriver/${key}`;
}

// Wait for S3 object to be available
async function waitForS3Object(key, maxAttempts = 10, delay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const command = new HeadObjectCommand({
                Bucket: bucketName,
                Key: key,
            });
            await s3.send(command);
            return true; // Object exists and is accessible
        } catch (error) {
            if (error.name === 'NotFound' && attempt < maxAttempts) {
                console.log(`Attempt ${attempt}: S3 object not ready, waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw new Error(`S3 object ${key} not available after ${maxAttempts} attempts`);
}

export async function moderateImage(key) {
    console.log(key);
    // Wait for S3 object to be fully available
    await waitForS3Object(key);

    // First, check for inappropriate content
    const moderationCommand = new DetectModerationLabelsCommand({
        Image: {
            S3Object: {
                Bucket: bucketName,
                Name: key
            },
        },
        MinConfidence: 80,
    });

    const blocked = [
        "Explicit Nudity",
        "Suggestive",
        "Violence",
        "Weapons",
        "Terrorism",
    ];

    const requiresVehicle = key.includes("vehicle");

    try {
        // Check for inappropriate content
        const moderationResult = await rekognition.send(moderationCommand);
        console.log('Moderation result:', moderationResult);

        const moderationLabels = moderationResult.ModerationLabels;
        const blockedLabels = moderationLabels.filter(label =>
            blocked.includes(label.Name) || blocked.includes(label.ParentName)
        );

        if (blockedLabels.length > 0) {
            return blockedLabels;
        }

        // If this is a vehicle image, check for vehicle presence
        if (requiresVehicle) {
            console.log("Vehicle check....");

            // Use DetectLabels for object detection
            const labelCommand = new DetectLabelsCommand({
                Image: {
                    S3Object: {
                        Bucket: bucketName,
                        Name: key
                    },
                },
                MinConfidence: 70, // Lower confidence for object detection
                MaxLabels: 50 // Get more labels to ensure we catch vehicles
            });

            const labelResult = await rekognition.send(labelCommand);
            console.log('Label detection result:', labelResult);

            // Vehicle-related labels to look for
            const vehicleLabels = [
                'vehicle', 'car', 'truck', 'bus', 'motorcycle', 'bike',
                'automobile', 'van', 'suv', 'sedan', 'taxi', 'auto',
                'transportation', 'wheel', 'tire'
            ];

            const detectedLabels = labelResult.Labels || [];
            const hasVehicle = detectedLabels.some(label => {
                const labelName = label.Name.toLowerCase();
                return vehicleLabels.some(vehicleTerm =>
                    labelName.includes(vehicleTerm)
                );
            });

            if (!hasVehicle) {
                console.log('No vehicle detected in vehicle image');
                return [{ Name: "No Vehicle Detected", Confidence: 0 }];
            }

            console.log('Vehicle detected successfully');
        }

        return [];
    } catch (error) {
        console.error('Rekognition error:', error);
        throw error;
    }
}

export async function deleteFromS3(key) {
    const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
    });

    await s3.send(command);
}

/**
 * Validate if image contains a human face using AWS Rekognition
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<{success: boolean, faceCount: number, confidence: number, error?: string}>}
 */
export async function validateFaceInImage(imageBuffer) {
    try {
        const command = new DetectFacesCommand({
            Image: {
                Bytes: imageBuffer,
            },
            Attributes: ['ALL']
        });

        const response = await rekognition.send(command);
        
        if (response.FaceDetails && response.FaceDetails.length > 0) {
            const face = response.FaceDetails[0];
            const confidence = face.Confidence || 0;
            
            return {
                success: true,
                faceCount: response.FaceDetails.length,
                confidence: confidence,
                faceDetails: {
                    ageRange: face.AgeRange,
                    gender: face.Gender,
                    emotions: face.Emotions,
                    quality: face.Quality
                }
            };
        } else {
            return {
                success: false,
                faceCount: 0,
                confidence: 0,
                error: 'No face detected in the image'
            };
        }

    } catch (error) {
        console.error('Face detection error:', error);
        return {
            success: false,
            faceCount: 0,
            confidence: 0,
            error: `Face detection failed: ${error.message}`
        };
    }
}

/**
 * Comprehensive photo validation for profile pictures
 * @param {Buffer} imageBuffer - Image buffer
 * @returns {Promise<{isValid: boolean, issues: Array, faceDetails?: object}>}
 */
export async function validateProfilePhoto(imageBuffer) {
    try {
        const issues = [];
        let faceDetails = null;

        // 1. Check for inappropriate content
        const moderationResult = await moderateImage(imageBuffer);
        if (moderationResult.inappropriate) {
            issues.push('Image contains inappropriate content');
        }

        // 2. Check for face presence
        const faceResult = await validateFaceInImage(imageBuffer);
        if (!faceResult.success) {
            issues.push('No clear face detected in the image');
        } else {
            faceDetails = faceResult.faceDetails;
            
            // 3. Check if face confidence is high enough
            if (faceResult.confidence < 80) {
                issues.push('Face detection confidence is too low');
            }

            // 4. Check for multiple faces
            if (faceResult.faceCount > 1) {
                issues.push('Multiple faces detected - only single person photos allowed');
            }
        }

        return {
            isValid: issues.length === 0,
            issues,
            faceDetails,
            moderationLabels: moderationResult.labels,
            faceConfidence: faceResult.confidence
        };

    } catch (error) {
        console.error('Photo validation error:', error);
        return {
            isValid: false,
            issues: [`Validation failed: ${error.message}`]
        };
    }
}

// Export the image processing function
export { processImageBuffer };