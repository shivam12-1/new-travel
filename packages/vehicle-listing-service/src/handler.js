import VehicleModel from "../models/VehiclesModel.js";
import IndependentCarOwnerModel from "../models/IndependentCarOwnerModel.js";
import { VehicleListingServiceError } from "./utils/myutils.js";

export class VehicleListingService {
  static async registerVehicle(req, res) {
    const userId = req.headers["x-user-id"];
    const {
      vehicleOwnership,
      vehicleName,
      vehicleModelName,
      manufacturing,
      maxPower,
      maxSpeed,
      fuelType,
      milage,
      registrationDate,
      airConditioning,
      vehicleType,
      seatingCapacity,
      vehicleNumber,
      vehicleSpecifications,
      servedLocation,
      minimumChargePerHour,
      currency,
      images,
      videos,
      isPriceNegotiable,
      rcBookFrontPhoto,
      rcBookBackPhoto,
    } = req.body;

    // Independent Car Owner specific validations
    if (vehicleOwnership === "INDEPENDENT_CAR_OWNER") {
      // Verify user is registered as Independent Car Owner
      const independentCarOwner = await IndependentCarOwnerModel.findOne({ 
        userId,
        'documentVerificationStatus.isVerifiedByAdmin': true 
      });
      
      if (!independentCarOwner) {
        throw new VehicleListingServiceError(
          "User is not registered as a verified Independent Car Owner",
          403
        );
      }

      // Validate vehicle type (only CAR and MINIVAN allowed)
      if (!["CAR", "MINIVAN"].includes(vehicleType)) {
        throw new VehicleListingServiceError(
          "Independent Car Owners can only add CAR or MINIVAN vehicles",
          400
        );
      }

      // Check fleet size limits
      const currentVehicles = await VehicleModel.countDocuments({ 
        userId, 
        isDeleted: false,
        vehicleOwnership: "INDEPENDENT_CAR_OWNER"
      });

      if (currentVehicles >= 2) {
        throw new VehicleListingServiceError(
          "Independent Car Owners can only have maximum 2 vehicles",
          400
        );
      }
    }

    const newVehicle = new VehicleModel({
      userId,
      vehicleOwnership,
      vehicleName,
      vehicleModelName,
      manufacturing,
      maxPower: maxPower || "",
      maxSpeed: maxSpeed || "",
      fuelType,
      milage: milage || "",
      registrationDate: registrationDate || "",
      airConditioning,
      vehicleType,
      seatingCapacity,
      vehicleNumber: vehicleNumber || "",
      vehicleSpecifications: vehicleSpecifications || [],
      servedLocation,
      minimumChargePerHour,
      currency: currency || "INR",
      images: images || [],
      videos: videos || [],
      isPriceNegotiable: isPriceNegotiable || false,
      documents: {
        rcBookFrontPhoto: rcBookFrontPhoto || "",
        rcBookBackPhoto: rcBookBackPhoto || "",
      },
      isVerifiedByAdmin: false,
      isBlockedByAdmin: false,
    });

    await newVehicle.save();

    return res
      .status(201)
      .json({ success: true, message: "Vehicle Registered successfully" });
  }

  static async editVehicle(req, res) {
    const userId = req.headers["x-user-id"];
    const vehicleId = req.params.id;

    // Only allow editable fields
    const allowedFields = [
      "vehicleType",             // Vehicle type(category) (editable) - Car, SUV, Minivan, Bus  
      "vehicleName",             // Vehicle Name (editable)
      "vehicleNumber",           // Vehicle No.
      "seatingCapacity",         // Seating capacity (editable) - with limits per vehicle type
      "airConditioning",         // Air Conditioning (editable) - AC/No AC
      "vehicleSpecifications",   // Vehicle specification (editable)
      "servedLocation",          // Service Location (editable)
      "minimumChargePerHour",    // Minimum charges (editable)
      "isPriceNegotiable",       // Price Negotiable (editable)
      "images",                  // Vehicle images (editable)
      "videos",                  // Video (editable)
      // RC Book documents
      "documents"                // RC book front and back
    ];

    const updateData = {};

    // Validate seating capacity based on vehicle type
    if (req.body.vehicleType || req.body.seatingCapacity) {
      // Get current vehicle to check existing vehicleType
      const currentVehicle = await VehicleModel.findOne({ 
        _id: vehicleId, 
        userId, 
        isDeleted: false 
      });
      
      if (!currentVehicle) {
        throw new VehicleListingServiceError("Vehicle not found or not authorized", 404);
      }

      const vehicleType = req.body.vehicleType || currentVehicle.vehicleType;
      const seatingCapacity = req.body.seatingCapacity || currentVehicle.seatingCapacity;

      // Define seating limits per vehicle type
      const seatLimits = {
        "CAR": { max: 5, min: 1 },
        "SUV": { max: 7, min: 1 },
        "MINIVAN": { max: 9, min: 1 },
        "BUS": { max: 62, min: 10 }
      };

      if (seatLimits[vehicleType]) {
        if (seatingCapacity > seatLimits[vehicleType].max) {
          throw new VehicleListingServiceError(
            `${vehicleType} cannot have more than ${seatLimits[vehicleType].max} seats`,
            400
          );
        }
        if (seatingCapacity < seatLimits[vehicleType].min) {
          throw new VehicleListingServiceError(
            `${vehicleType} must have at least ${seatLimits[vehicleType].min} seats`,
            400
          );
        }
      }
    }

    // Validate Air Conditioning values
    if (req.body.airConditioning && !["AC", "Non-AC"].includes(req.body.airConditioning)) {
      throw new VehicleListingServiceError(
        "Air Conditioning must be either 'AC' or 'Non-AC'",
        400
      );
    }

    // Validate video format (only video files allowed)
    if (req.body.videos && Array.isArray(req.body.videos)) {
      const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
      const invalidVideos = req.body.videos.filter(video => {
        const ext = video.toLowerCase().slice(video.lastIndexOf('.'));
        return !videoExtensions.includes(ext);
      });
      
      if (invalidVideos.length > 0) {
        throw new VehicleListingServiceError(
          "Only video formats are allowed for videos field",
          400
        );
      }
    }

    // Process allowed fields
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === "documents") {
          // Handle documents object separately
          if (req.body.documents) {
            const allowedDocFields = ["rcBookFrontPhoto", "rcBookBackPhoto"];
            for (const docField of allowedDocFields) {
              if (req.body.documents[docField] !== undefined) {
                updateData[`documents.${docField}`] = req.body.documents[docField];
              }
            }
          }
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new VehicleListingServiceError("No valid fields provided for update", 400);
    }

    const updatedVehicle = await VehicleModel.findOneAndUpdate(
      { _id: vehicleId, userId, isDeleted: false },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedVehicle) {
      throw new VehicleListingServiceError(
        "Vehicle not found or not authorized",
        404
      );
    }

    return res.status(200).json({ 
      success: true, 
      message: "Vehicle updated successfully",
      data: updatedVehicle
    });
  }

  static async deleteVehicle(req, res) {
    const userId = req.headers["x-user-id"];
    const vehicleId = req.params.id;
    const { action } = req.query;

    if (!["ENABLE", "DISABLE", "DELETE"].includes(action)) {
      throw new VehicleListingServiceError(
        "Invalid action. Must be ENABLE, DISABLE, or DELETE.",
        400
      );
    }
    const updateFields = {};

    if (action === "ENABLE") {
      updateFields.isDisabled = false;
    } else if (action === "DISABLE") {
      updateFields.isDisabled = true;
    } else if (action === "DELETE") {
      updateFields.isDeleted = true;
    }

    const updatedVehicle = await VehicleModel.findOneAndUpdate(
      { _id: vehicleId, userId, isDeleted: false },
      updateFields,
      { new: true }
    );

    if (!updatedVehicle) {
      throw new VehicleListingServiceError(
        "Vehicle not found or not authorized",
        404
      );
    }

    return res.status(200).json({
      success: true,
      message: `Vehicle ${action.toUpperCase()}D successfully`,
    });
  }

  static async getAllVehicle(req, res) {
    const userId = req.headers["x-user-id"];

    const vehicles = await VehicleModel.find({ userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const data = vehicles.map(
      ({
        _id,
        __v,
        createdAt,
        updatedAt,
        isBlockedByAdmin,
        isDeleted,
        details,
        ...rest
      }) => ({
        vehicleId: _id,
        ...rest,
      })
    );

    return res.status(200).json({ success: true, data });
  }
}
