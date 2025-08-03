import DriversModel from "../models/DriversModel.js";
import TransporterModel from "../models/TransporterModel.js";
import VehicleModel from "../models/VehiclesModel.js";
import UserModel from "../models/UserModel.js";
import IndependentCarOwnerModel from "../models/IndependentCarOwnerModel.js";
import {
  AirConditioningTypes,
  FuelTypes,
} from "../utils/myutils.js";
import ActivityModel from "../models/ActivityModel.js";
import dayjs from "dayjs";
import { ObjectId } from "bson";
import SubscriptionsModel from "../models/SubscriptionsModel.js";
import RegistrationFeeModel from "../models/RegistrationFeeModel.js";
import PlansModel from "../models/PlansModel.js";
import { DriverTransPorterServiceError } from "./utils/myutils.js";
import {
  aadharNumber,
  aadharOCR,
  checkDrivingLicense,
  drivingLicenseImage,
  verifyGST,
  gstOCR,
} from "./utils/docValidator.js";

export class DriverTransporterService {
  static async becomeDriver(req, res) {
    const id = req.headers["x-user-id"];
    const uuid = req.headers["x-uuid"];
    console.log(req.headers);

    if (!id || !uuid) {
      throw new DriverTransPorterServiceError("Missing required headers", 400);
    }
    const {
      drivingLicenceNumber,
      drivingLicencePhoto,
      aadharCardNumber,
      aadharCardPhoto,
      aadharCardPhotoBack,
      panCardNumber,
      panCardPhoto,
      vehicleType,
      servicesCities,
      fullName,
      mobileNumber,
      profilePhoto,
      languageSpoken,
      bio,
      experience,
      address,
      minimumCharges,
      dob,
      gender,
    } = req.body;

    const existingDriver = await DriversModel.findOne({
      $or: [
        { mobileNumber },
        { "documents.drivingLicenceNumber": drivingLicenceNumber },
        { "documents.aadharCardNumber": aadharCardNumber },
        // Only check PAN if it's provided (not empty string)
        ...(panCardNumber && panCardNumber.trim() !== ""
          ? [{ "documents.panCardNumber": panCardNumber }]
          : []),
      ],
    });

    if (existingDriver) {
      let conflictField = "mobile number";
      if (
        existingDriver.documents.drivingLicenceNumber === drivingLicenceNumber
      ) {
        conflictField = "driving licence number";
      } else if (
        existingDriver.documents.aadharCardNumber === aadharCardNumber
      ) {
        conflictField = "Aadhar card number";
      } else if (
        panCardNumber &&
        panCardNumber.trim() !== "" &&
        existingDriver.documents.panCardNumber === panCardNumber
      ) {
        conflictField = "PAN card number";
      }
      throw new DriverTransPorterServiceError(
        `Driver with this ${conflictField} already exists`,
        400
      );
    }

    // Check if user has paid registration fee for DRIVER category
    const registrationPayment = await SubscriptionsModel.findOne({
      userId: id,
      category: "DRIVER",
      subscriptionType: { $in: ["REGISTRATION_ONLY", "REGISTRATION_WITH_SUBSCRIPTION"] },
      registrationFeePaid: true,
      status: "active"
    });

    if (!registrationPayment) {
      throw new DriverTransPorterServiceError(
        "You must pay the registration fee before becoming a driver",
        400
      );
    }

    // Set plan expiry date if user has subscription
    let planExpiryDate = new Date();
    if (registrationPayment.subscriptionType === "REGISTRATION_WITH_SUBSCRIPTION" && registrationPayment.endDate) {
      planExpiryDate = registrationPayment.endDate;
    } else {
      // If only registration, set expiry to 30 days from now as default
      planExpiryDate.setDate(planExpiryDate.getDate() + 30);
    }

    const newDriver = new DriversModel({
      userId: id,
      uuid,
      documents: {
        drivingLicenceNumber,
        drivingLicencePhoto,
        aadharCardNumber,
        aadharCardPhoto,
        aadharCardPhotoBack,
        panCardNumber: panCardNumber || "",
        panCardPhoto: panCardPhoto || "",
      },
      vehicleType,
      servicesCities,
      fullName,
      mobileNumber,
      profilePhoto,
      languageSpoken,
      bio: bio || "",
      experience, //
      address: {
        addressLine: address.addressLine,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country || "India",
      },
      minimumCharges,
      dob,
      gender,
      isVerifiedByAdmin: false,
      isBlockedByAdmin: false,
      planExpiredDate: planExpiryDate,
    });

    await newDriver.save();

    await UserModel.findByIdAndUpdate(id, {
      isRegisteredAsDriver: true,
      firstName: fullName.split(" ")[0],
      lastName: fullName.split(" ").slice(1).join(" ") || "",
    });
    res.status(201).json({
      success: true,
      message: "Driver registered successfully",
      data: {
        driverId: newDriver._id,
        planExpiryDate: planExpiryDate,
        isVerified: false,
      },
    });
  }

  static async becomeTransporter(req, res) {
    const id = req.headers["x-user-id"];
    const uuid = req.headers["x-uuid"];
    const {
      companyName,
      phoneNumber,
      address,
      addressType,
      fleetSize,
      counts,
      contactPersonName,
      points,
      bio,
      photo,
      gstin,
      business_registration_certificate,
      aadharCardNumber,
      aadharCardPhoto,
      aadharCardPhotoBack,
      panCardNumber,
      panCardPhoto,
      transportationPermit,
      allowNegotiation,
    } = req.body;

    if (!phoneNumber || !address) {
      throw new DriverTransPorterServiceError(
        "Phone number and address are required",
        400
      );
    }

    const existingTransporter = await TransporterModel.findOne({ phoneNumber });
    if (existingTransporter) {
      throw new DriverTransPorterServiceError(
        "Transporter with this phone number already exists",
        400
      );
    }

    const newTransporter = new TransporterModel({
      userId: id,
      uuid,
      companyName: companyName || "",
      phoneNumber,
      address,
      addressType: addressType || "Home",
      fleetSize: fleetSize || "",
      counts: counts || { car: 0, bus: 0, van: 0 },
      contactPersonName: contactPersonName || "",
      points: points || {
        use_login_number: true,
        show_number_on_app_website: true,
        enable_chat: true,
      },
      bio: bio || "",
      photo: photo || "",
      documents: {
        gstin: gstin || "",
        business_registration_certificate:
          business_registration_certificate || "",
        aadharCardNumber: aadharCardNumber || "",
        aadharCardPhoto: aadharCardPhoto || "",
        aadharCardPhotoBack: aadharCardPhotoBack || "",
        panCardNumber: panCardNumber || "",
        panCardPhoto: panCardPhoto || "",
        transportationPermit: transportationPermit || "",
      },
      isVerifiedByAdmin: false,
      isBlockedByAdmin: false,
    });

    await newTransporter.save();
    await UserModel.findByIdAndUpdate(id, {
      isRegisteredAsTransporter: true,
      firstName: contactPersonName?.split(" ")[0] || companyName,
      lastName: contactPersonName?.split(" ").slice(1).join(" ") || "",
    });

    res.status(201).json({
      success: true,
      message: "Transporter registered successfully",
    });
  }

  static async becomeTransporterERiksha(req, res) {
    const id = req.headers["x-user-id"];
    const uuid = req.headers["x-uuid"];
    const {
      seatingCapacity,
      vehicleOwnership,
      minimumFare,
      first2Km,
      allowNegosiation,
      vehicleNumber,
      vehiclePhotos,
      vehicleVideos,
      name,
      photo,
      bio,
      phoneNumber,
      address,
      serviceCity,
      aadharCardNumber,
      aadharCardPhoto,
      aadharCardPhotoBack,
      panCardNumber,
      panCardPhoto,
      language,
      experience,
    } = req.body;

    if (!seatingCapacity || !minimumFare || !serviceCity || !address) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided" });
    }
    const existingERickshaw = await VehicleModel.findOne({
      "details.mobileNumber": phoneNumber,
    });
    if (existingERickshaw) {
      throw new DriverTransPorterServiceError(
        "E_Rickshaw with this phone number already exists",
        400
      );
    }

    const newERickshaw = new VehicleModel({
      userId: id,
      uuid,
      vehicleOwnership: "N/A",
      vehicleName: "E Rickshaw",
      vehicleModelName: "Electric Rickshaw",
      manufacturing: new Date().getFullYear().toString(),
      fuelType: "Battery",
      first2Km,
      airConditioning: "None",
      vehicleType: "E_RICKSHAW",
      seatingCapacity,
      vehicleNumber: vehicleNumber || "",
      vehicleSpecifications: ["Electric"],
      servedLocation: serviceCity,
      minimumChargePerHour: minimumFare,
      currency: "INR",
      images: vehiclePhotos || [],
      videos: vehicleVideos || [],
      isPriceNegotiable: allowNegosiation || false,
      documents: {
        aadharCardNumber,
        aadharCardPhoto,
        aadharCardPhotoBack,
        panCardNumber,
        panCardPhoto,
      },
      details: {
        fullName: name,
        mobileNumber: phoneNumber,
        profilePhoto: photo,
        address,
        bio,
        languageSpoken: language,
        experience,
      },
      isVerifiedByAdmin: false,
      isBlockedByAdmin: false,
    });

    await newERickshaw.save();
    await UserModel.findByIdAndUpdate(id, { isRegisterAsERickshaw: true });

    res.status(201).json({
      success: true,
      message: "E_Rickshaw registered successfully",
    });
  }

  static async becomeTransporterRiksha(req, res) {
    const id = req.headers["x-user-id"];
    const uuid = req.headers["x-uuid"];
    const {
      seatingCapacity,
      fuelType,
      vehicleOwnership,
      rcBookFrontPhoto,
      rcBookBackPhoto,
      minimumFare,
      first2Km,
      allowNegosiation,
      aadharCardNumber,
      aadharCardPhoto,
      aadharCardPhotoBack,
      drivingLicenceNumber,
      drivingLicencePhoto,
      panCardNumber,
      panCardPhoto,
      vehiclePhotos,
      vehicleVideos,
      name,
      phoneNumber,
      photo,
      bio,
      address,
      language,
      experience,
      serviceCity,
      vehicleNumber,
    } = req.body;

    if (!seatingCapacity || !minimumFare || !serviceCity || !address) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided" });
    }

    const existingRickshaw = await VehicleModel.findOne({
      "details.mobileNumber": phoneNumber,
    });
    if (existingRickshaw) {
      throw new DriverTransPorterServiceError(
        "Rickshaw with this phone number already exists",
        400
      );
    }

    const newRickshaw = new VehicleModel({
      userId: id,
      uuid: uuid,
      vehicleOwnership: "N/A",
      vehicleName: "Auto Rickshaw",
      vehicleModelName: "Standard Auto Rickshaw",
      manufacturing: new Date().getFullYear().toString(),
      fuelType: FuelTypes.at(5),
      first2Km,
      airConditioning: AirConditioningTypes.at(3),
      vehicleType: "RICKSHAW",
      seatingCapacity,
      vehicleNumber: vehicleNumber,
      vehicleSpecifications: [],
      servedLocation: serviceCity,
      minimumChargePerHour: minimumFare,
      currency: "INR",
      images: vehiclePhotos || [],
      videos: vehicleVideos || [],
      isPriceNegotiable: allowNegosiation || false,
      documents: {
        rcBookFrontPhoto: rcBookFrontPhoto || "",
        rcBookBackPhoto: rcBookBackPhoto || "",
        aadharCardPhoto: aadharCardPhoto || "",
        aadharCardPhotoBack: aadharCardPhotoBack || "",
        aadharCardNumber: aadharCardNumber || "",
        panCardPhoto: panCardPhoto || "",
        panCardNumber: panCardNumber || "",
        drivingLicenceNumber: drivingLicenceNumber || "",
        drivingLicencePhoto: drivingLicencePhoto || "",
      },
      details: {
        fullName: name,
        mobileNumber: phoneNumber,
        profilePhoto: photo,
        languageSpoken: language,
        bio: bio,
        experience: experience,
        address: address,
      },
      isVerifiedByAdmin: false,
      isBlockedByAdmin: false,
    });

    await newRickshaw.save();
    await UserModel.findByIdAndUpdate(id, { isRegisterAsRickshaw: true });

    res.status(201).json({
      success: true,
      message: "Rickshaw registered successfully",
    });
  }

  static async dashboard(req, res) {
    const id = req.headers["x-user-id"];
    const now = dayjs();
    const act = await ActivityModel.find({ to: id }).exec();
    const activity = {
      daily: {
        chat: 0,
        whatsapp: 0,
        call: 0,
        click: 0,
      },
      weekly: {
        chat: 0,
        whatsapp: 0,
        call: 0,
        click: 0,
      },
      monthly: {
        chat: 0,
        whatsapp: 0,
        call: 0,
        click: 0,
      },
      all: {
        chat: 0,
        whatsapp: 0,
        call: 0,
        click: 0,
      },
    };
    act.forEach((item) => {
      const category = getCategory(item.activity);
      if (!category) return;

      const createdAt = dayjs(item.timestamp); // Adjust to match your schema
      const diffDays = now.diff(createdAt, "day");
      const diffWeeks = now.diff(createdAt, "week");
      const diffMonths = now.diff(createdAt, "month");

      if (diffDays < 1) {
        activity.daily[category]++;
      }

      if (diffWeeks < 1) {
        activity.weekly[category]++;
      }

      if (diffMonths < 1) {
        activity.monthly[category]++;
      }

      activity.all[category]++;
    });
    const user = await UserModel.findOne({ _id: id }).exec();
    const subscription = await SubscriptionsModel.findOne({
      userId: id,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .exec();
    const usertype = [
      user?.isRegisteredAsDriver && "DRIVER",
      user?.isRegisteredAsTransporter && "TRANSPORTER",
      user?.isRegisterAsRickshaw && "RICKSHAW",
      user?.isRegisterAsERickshaw && "E_RICKSHAW",
    ].filter(Boolean);
    const maxLimit = usertype.includes("DRIVER")
      ? 1
      : usertype.includes("TRANSPORTER")
        ? subscription.plan.maxVehicles
        : usertype.includes("RICKSHAW")
          ? 1
          : usertype.includes("E_RICKSHAW")
            ? 1
            : 0;
    return res.json({
      status: true,
      message: "Dashboard",
      data: { activity, usertype, maxLimit },
    });
  }

  static async getProfile(req, res) {
    const id = req.headers["x-user-id"];
    const { TYPE } = req.query;
    let data;
    if (TYPE === "DRIVER") {
      const driver = await DriversModel.findOne({ userId: id }).exec();
      if (!driver) {
        throw new DriverTransPorterServiceError("No Driver Found", 404);
      }
      data = {
        myId: "454353533",
        address: driver.address,
        userId: driver.userId,
        id: driver._id,
        vehicleType: driver.vehicleType,
        servicesCities: driver.servicesCities,
        fullName: driver.fullName,
        mobileNumber: driver.mobileNumber,
        profilePhoto: driver.profilePhoto,
        languageSpoken: driver.languageSpoken,
        bio: driver.bio,
        experience: driver.experience,
        minimumCharges: driver.minimumCharges,
        dob: driver.dob,
        gender: driver.gender,
        rating: driver.rating,
        totalRating: driver.totalRating,
        isVerifiedByAdmin: driver.isVerifiedByAdmin,
        userType: "DRIVER",
      };
    } else if (TYPE === "RICKSHAW" || TYPE === "E_RICKSHAW") {
      const vehicle = await VehicleModel.findOne({ userId: id }).exec();
      if (!vehicle) {
        throw new DriverTransPorterServiceError(`No ${TYPE} Found`, 404);
      }
      data = {
        myId: "454353533",
        id: vehicle._id,
        userId: vehicle.userId,
        fullName: vehicle.details.fullName,
        phoneNumber: vehicle.details.mobileNumber,
        address: vehicle.details.address,
        contactPersonName: vehicle.details.contactPersonName,
        bio: vehicle.details.bio,
        photo: vehicle.details.profilePhoto,
        rating: vehicle.details.rating,
        totalRating: vehicle.details.totalRating,
        userType: TYPE,

        vehicleOwnership: vehicle.vehicleOwnership,
        vehicleName: vehicle.vehicleName,
        vehicleModelName: vehicle.vehicleModelName,
        manufacturing: vehicle.manufacturing,
        maxPower: vehicle.maxPower,
        maxSpeed: vehicle.maxSpeed,
        fuelType: vehicle.fuelType,
        first2Km: vehicle.first2Km,
        milage: vehicle.milage,
        registrationDate: vehicle.registrationDate,
        airConditioning: vehicle.airConditioning,
        vehicleType: vehicle.vehicleType,
        seatingCapacity: vehicle.seatingCapacity,
        vehicleNumber: vehicle.vehicleNumber,
        vehicleSpecifications: vehicle.vehicleSpecifications,
        servedLocation: vehicle.servedLocation,
        minimumChargePerHour: vehicle.minimumChargePerHour,
        images: vehicle.images,
        videos: vehicle.videos,
        isPriceNegotiable: vehicle.isPriceNegotiable,
        isVerifiedByAdmin: vehicle.isVerifiedByAdmin,
      };
    } else if (TYPE === "TRANSPORTER") {
      const transporter = await TransporterModel.findOne({ userId: id }).exec();
      if (!transporter) {
        throw new DriverTransPorterServiceError("No Transporter found.", 404);
      }
      data = {
        myId: "454353533",
        id: transporter._id,
        userId: transporter.userId,
        companyName: transporter.companyName,
        phoneNumber: transporter.phoneNumber,
        address: transporter.address,
        addressType: transporter.addressType,
        fleetSize: transporter.fleetSize,
        counts: transporter.counts,
        contactPersonName: transporter.contactPersonName,
        bio: transporter.bio,
        photo: transporter.photo,
        rating: transporter.rating,
        totalRating: transporter.totalRating,
        isVerifiedByAdmin: transporter.isVerifiedByAdmin,
        userType: "TRANSPORTER",
      };
    } else {
      const user = UserModel.findOne({ _id: id }).exec();
      if (!user) {
        throw new DriverTransPorterServiceError("No User Found", 404);
      }
      data = {
        userId: id,
        id: id,
        displayName: `${user?.firstName} ${user?.lastName}`,
        firstName: user?.firstName ?? "",
        lastName: user?.lastName ?? "",
        number: user?.mobileNumber ?? "",
        email: user?.email ?? "",
        image: user?.image,
        language: user?.language ?? "",
        userType: "USER",
      };
    }
    return res.json({
      status: true,
      message: `Your PROFILE ${TYPE}}`,
      data: data,
    });
  }

  static async updateProfile(req, res) {
    const id = req.headers["x-user-id"];
    const { TYPE } = req.query;

    if (
      !TYPE ||
      ![
        "DRIVER",
        "TRANSPORTER",
        "RICKSHAW",
        "E_RICKSHAW",
        "INDEPENDENT_CAR_OWNER",
      ].includes(TYPE)
    ) {
      throw new DriverTransPorterServiceError("Invalid or missing TYPE", 404);
    }

    let updatedDoc;
    const updateData = {};

    if (TYPE === "DRIVER") {
      // Only editable/changeable fields for Driver
      const allowedFields = [
        "fullName", // Name (editable)
        "mobileNumber", // Phone no.(editable)
        "profilePhoto", // Photo (editable)
        "bio", // About (editable)
        "address", // Address (editable)
        "experience", // Experience in Years (editable)
        "minimumCharges", // Minimum charge (editable)
        "vehicleType", // Vehicle type drive (editable)
        "servicesCities", // Location service area (editable)
        "languageSpoken", // Spoken language (editable)
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      updatedDoc = await DriversModel.findOneAndUpdate(
        { userId: id },
        { $set: updateData },
        { new: true }
      ).exec();

      if (!updatedDoc) {
        throw new DriverTransPorterServiceError("No Driver Found", 404);
      }
    } else if (TYPE === "TRANSPORTER") {
      // Only editable/changeable fields for Transporter
      const allowedFields = [
        "photo", // Profile image (editable)
        "companyName", // Company/proprietor Name (editable)
        "address", // Address (editable)
        "phoneNumber", // Phone No. (editable)
        "contactPersonName", // Contact person (editable)
        "bio", // About (editable)
        "fleetSize", // Fleet size (changeable)
        "counts", // Vehicle counts (changeable)
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      updatedDoc = await TransporterModel.findOneAndUpdate(
        { userId: id },
        { $set: updateData },
        { new: true }
      ).exec();

      if (!updatedDoc) {
        throw new DriverTransPorterServiceError("No Transporter Found", 404);
      }
    } else if (TYPE === "INDEPENDENT_CAR_OWNER") {
      // Only editable/changeable fields for Independent Car Owner
      const allowedFields = [
        "name", // Name (editable)
        "phoneNumber", // Phone no. (editable)
        "photo", // Photo (editable)
        "about", // About (editable)
        "address", // Address (editable)
        "fleetSize", // Fleet size (editable but with constraints)
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      // Validate fleet size if provided
      if (updateData.fleetSize) {
        const totalVehicles = (updateData.fleetSize.cars || 0) + (updateData.fleetSize.minivans || 0);
        if (totalVehicles === 0 || totalVehicles > 2) {
          throw new DriverTransPorterServiceError(
            "Fleet size must be between 1 and 2 vehicles total",
            400
          );
        }
      }

      updatedDoc = await IndependentCarOwnerModel.findOneAndUpdate(
        { userId: id },
        { $set: updateData },
        { new: true }
      ).exec();

      if (!updatedDoc) {
        throw new DriverTransPorterServiceError(
          "No Independent Car Owner Found",
          404
        );
      }
    } else if (TYPE === "RICKSHAW") {
      // Only editable/changeable fields for Auto Rickshaw
      const allowedFields = [
        "images", // Vehicle images (editable)
        "videos", // Vehicle video (editable)
        "minimumChargePerHour", // Minimum charges (editable)
        "isPriceNegotiable", // Allow fare negotiable (changeable)
        "servedLocation", // Location service area (editable)
        "fullName", // Name (editable) - maps to details.fullName
        "mobileNumber", // Phone no. (editable) - maps to details.mobileNumber
        "profilePhoto", // Photo (editable) - maps to details.profilePhoto
        "bio", // About (editable) - maps to details.bio
        "address", // Address (editable) - maps to details.address
        "languageSpoken", // Spoken language (changeable) - maps to details.languageSpoken
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          // Map personal fields to details object in database
          if (
            [
              "fullName",
              "mobileNumber",
              "profilePhoto",
              "bio",
              "address",
              "languageSpoken",
            ].includes(field)
          ) {
            updateData[`details.${field}`] = req.body[field];
          } else {
            // Vehicle fields go directly
            updateData[field] = req.body[field];
          }
        }
      }

      updatedDoc = await VehicleModel.findOneAndUpdate(
        { userId: id, vehicleType: "RICKSHAW" },
        { $set: updateData },
        { new: true }
      ).exec();

      if (!updatedDoc) {
        throw new DriverTransPorterServiceError("No Rickshaw Found", 404);
      }
    } else if (TYPE === "E_RICKSHAW") {
      // Only editable/changeable fields for E-Rickshaw
      const allowedFields = [
        "images", // Vehicle images (editable)
        "videos", // Vehicle video (editable)
        "minimumChargePerHour", // Minimum charges (editable)
        "isPriceNegotiable", // Allow fare negotiable (changeable)
        "servedLocation", // Location service area (editable)
        "fullName", // Name (editable) - maps to details.fullName
        "mobileNumber", // Phone no. (editable) - maps to details.mobileNumber
        "profilePhoto", // Photo (editable) - maps to details.profilePhoto
        "bio", // About (editable) - maps to details.bio
        "address", // Address (editable) - maps to details.address
        "languageSpoken", // Spoken language (changeable) - maps to details.languageSpoken
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          // Map personal fields to details object in database
          if (
            [
              "fullName",
              "mobileNumber",
              "profilePhoto",
              "bio",
              "address",
              "languageSpoken",
            ].includes(field)
          ) {
            updateData[`details.${field}`] = req.body[field];
          } else {
            // Vehicle fields go directly
            updateData[field] = req.body[field];
          }
        }
      }

      updatedDoc = await VehicleModel.findOneAndUpdate(
        { userId: id, vehicleType: "E_RICKSHAW" },
        { $set: updateData },
        { new: true }
      ).exec();

      if (!updatedDoc) {
        throw new DriverTransPorterServiceError("No E-Rickshaw Found", 404);
      }
    }

    return res.json({
      status: true,
      message: `${TYPE} Profile updated successfully`,
    });
  }

  static async subscriptions(req, res) {
    const userId = req.headers["x-user-id"];
    const userObjectId = new ObjectId(userId);
    const now = new Date();

    const userSubscriptions = await SubscriptionsModel.aggregate([
      { $match: { userId: userObjectId } },
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: "$plan" },
      { $sort: { startDate: -1 } },
    ]);

    const activePlan = userSubscriptions
      .filter((sub) => sub.endDate && sub.endDate > now)
      .at(0);

    const planInfo = activePlan
      ? {
          name: activePlan.plan.name,
          status: activePlan.status,
          amount: activePlan.amount / 100,
          planId: activePlan.planId,
          description: activePlan.description,
          expiryDate: activePlan.endDate,
          purchaseDate: activePlan.startDate,
          featureTitle: activePlan.plan.featureTitle,
          features: activePlan.plan.features,
        }
      : null;

    const transactions = userSubscriptions.map((sub) => ({
      planName: sub.plan.name,
      amount: sub.amount / 100,
      currency: sub.currency,
      status: sub.status,
      invoice: `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <title>Invoice</title>
  <style>
    body {
      background-color: #fff;
      color: #000;
      font-family: Arial, sans-serif;
      padding: 40px;
    }

    h2 {
      text-align: center;
      margin-bottom: 30px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .logo img {
      width: 60px;
    }

    .company-section {
      margin-top: 10px;
    }

    .company-section p {
      margin: 2px 0;
    }

    .invoice-details {
      text-align: right;
    }

    .bill-section {
      margin-top: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 30px;
    }

    th,
    td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    }

    .tax-description {
      margin-top: 30px;
      width: 40%;
    }

    .tax-description table {
      width: 100%;
    }

    .footer {
      margin-top: 50px;
      font-style: italic;
      text-align: center;
      font-size: 14px;
      color: #000;
    }

    .flex-row {
      display: flex;
      justify-content: space-between;
    }

    .left,
    .right {
      width: 48%;
    }

    h3 {
      margin-bottom: 5px;
    }
  </style>
</head>

<body>

  <h2>Invoice</h2>

  <div class="header">
    <div class="logo">
      <img src="https://www.adaptivewfs.com/wp-content/uploads/2020/07/logo-placeholder-image.png" alt="Logo">
      <p><strong>logo</strong></p>
    </div>
    <div class="invoice-details">
      <p><strong>Invoice No.-</strong> ${sub.orderId}</p>
      <p><strong>Invoice date-</strong> ${sub.startDate}</p>
    </div>
  </div>

  <div class="flex-row company-section">
    <div class="left">
      <p><strong>Company name-</strong></p>
      <p>GST No.</p>
      <p>Address- city, state</p>
    </div>
    <div class="right">
      <p><strong>Bill TO</strong></p>
      <p>Customer name</p>
      <p>GST no.</p>
      <p>Address- city state</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>SR</th>
        <th>Item</th>
        <th>HSN code</th>
        <th>Quantity</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${sub.plan.name}</td>
        <td></td>
        <td>1</td>
        <td>₹${sub.amount / 100}</td>
      </tr>
    </tbody>
  </table>

  <div class="tax-description">
    <h3>Tax description</h3>
    <table>
      <tr>
        <td>IGST -18%-</td>
        <td></td>
      </tr>
      <tr>
        <td>CGST-9%</td>
        <td></td>
      </tr>
      <tr>
        <td>SGST-9%</td>
        <td></td>
      </tr>
    </table>
  </div>

  <div class="footer">
    Note- This is a computer generated bill. No signature required
  </div>

</body>

</html>
`,
      startDate: sub.startDate,
      endDate: sub.endDate,
    }));

    return res.json({
      status: true,
      message: "Subscriptions Details",
      data: {
        activePlan: planInfo,
        transactions,
      },
    });
  }

  static async verifyEndPoint(req, res) {
    const { TYPE, aadhaar_number, name, dl_number, dob, image, back_image, gst_number, business_name } =
      req.body;
    console.log("Verification request:", req.body);
    let verificationResult;

    switch (TYPE) {
      case "AADHAR":
        verificationResult = await aadharNumber(aadhaar_number, name);
        break;

      case "DRIVING_LICENSE":
        verificationResult = await checkDrivingLicense(dl_number, dob, name);
        break;

      case "AADHAR_IMAGE":
        verificationResult = await aadharOCR(image, back_image);
        break;

      case "DRIVING_LICENSE_IMAGE":
        verificationResult = await drivingLicenseImage(image);
        break;

      case "GST":
        verificationResult = await verifyGST(gst_number, business_name);
        break;

      case "GST_IMAGE":
        verificationResult = await gstOCR(image);
        break;

      default:
        throw new DriverTransPorterServiceError(
          `Unsupported verification type: ${TYPE}`,
          400
        );
    }

    console.log(verificationResult);
    if (verificationResult.success === true) {
      return res
        .status(200)
        .json({ status: true, message: `${TYPE} Verification Success` });
    } else {
      throw new DriverTransPorterServiceError(
        `${TYPE} Verification Failed`,
        500
      );
    }
  }

  // Get registration fee and subscription plans for a specific category
  static async getRegistrationAndPlans(req, res) {
    try {
      const { category } = req.params;

      if (!category) {
        throw new DriverTransPorterServiceError("Category is required", 400);
      }

      // Get registration fee for the category
      const registrationFee = await RegistrationFeeModel.findOne({
        category: category.toUpperCase(),
        isActive: true,
      });

      if (!registrationFee) {
        throw new DriverTransPorterServiceError(
          `No registration fee found for ${category}`,
          404
        );
      }

      // Get subscription plans for the category
      const subscriptionPlans = await PlansModel.find({
        planFor: category.toUpperCase(),
        planType: "SUBSCRIPTION",
        isActive: true,
      }).sort({ durationInMonths: 1 });

      // Calculate total prices for each plan (registration + subscription)
      const plansWithTotal = subscriptionPlans.map((plan) => ({
        ...plan.toObject(),
        totalWithRegistration:
          plan.subscriptionFinalPrice + registrationFee.finalPrice,
        registrationFee: {
          grossPrice: registrationFee.grossPrice,
          earlyBirdDiscountPrice: registrationFee.earlyBirdDiscountPrice,
          finalPrice: registrationFee.finalPrice,
        },
      }));

      return res.json({
        status: true,
        message: `Registration fee and subscription plans for ${category}`,
        data: {
          category: category.toUpperCase(),
          registrationFee: {
            _id: registrationFee._id,
            grossPrice: registrationFee.grossPrice,
            earlyBirdDiscountPercentage:
              registrationFee.earlyBirdDiscountPercentage,
            earlyBirdDiscountPrice: registrationFee.earlyBirdDiscountPrice,
            finalPrice: registrationFee.finalPrice,
            mandatory: true,
          },
          subscriptionPlans: plansWithTotal,
          note: "Registration fee is mandatory for all new registrations. Users can choose to add a subscription plan along with registration.",
        },
      });
    } catch (error) {
      console.error("Error fetching registration and plans:", error);
      if (error instanceof DriverTransPorterServiceError) {
        return res.status(error.statusCode || 500).json({
          status: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Check if user has paid registration fee for a category
  static async checkRegistrationStatus(req, res) {
    try {
      const userId = req.headers["x-user-id"];
      const { category } = req.params;

      if (!userId || !category) {
        throw new DriverTransPorterServiceError(
          "User ID and category are required",
          400
        );
      }

      // Check if user has paid registration fee for this category
      const registrationPayment = await SubscriptionsModel.findOne({
        userId,
        category: category.toUpperCase(),
        subscriptionType: {
          $in: ["REGISTRATION_ONLY", "REGISTRATION_WITH_SUBSCRIPTION"],
        },
        registrationFeePaid: true,
        status: "active",
      });

      return res.json({
        status: true,
        message: "Registration status checked",
        data: {
          category: category.toUpperCase(),
          hasRegistrationFee: !!registrationPayment,
          registrationPaidAt:
            registrationPayment?.registrationFeePaidAt || null,
          canRegister: !registrationPayment, // Can register if no registration fee paid yet
        },
      });
    } catch (error) {
      console.error("Error checking registration status:", error);
      if (error instanceof DriverTransPorterServiceError) {
        return res.status(error.statusCode || 500).json({
          status: false,
          message: error.message,
        });
      }
      return res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Independent Car Owner Registration
  static async becomeIndependentCarOwner(req, res) {
    const id = req.headers["x-user-id"];
    const uuid = req.headers["x-uuid"];

    if (!id || !uuid) {
      throw new DriverTransPorterServiceError("Missing required headers", 400);
    }

    const {
      photo,
      name,
      phoneNumber,
      about,
      address,
      documents,
      fleetSize
    } = req.body;

    // Check if Independent Car Owner with same phone, Aadhaar, or DL already exists
    const existingCarOwner = await IndependentCarOwnerModel.findOne({
      $or: [
        { phoneNumber },
        { "documents.aadharCardNumber": documents.aadharCardNumber },
        { "documents.drivingLicenseNumber": documents.drivingLicenseNumber }
      ]
    });

    if (existingCarOwner) {
      let conflictField = "phone number";
      if (existingCarOwner.documents.aadharCardNumber === documents.aadharCardNumber) {
        conflictField = "Aadhaar card number";
      } else if (existingCarOwner.documents.drivingLicenseNumber === documents.drivingLicenseNumber) {
        conflictField = "driving license number";
      }
      throw new DriverTransPorterServiceError(
        `Independent Car Owner with this ${conflictField} already exists`,
        400
      );
    }

    // Check if user has paid registration fee for INDEPENDENT_CAR_OWNER category
    const registrationPayment = await SubscriptionsModel.findOne({
      userId: id,
      category: "INDEPENDENT_CAR_OWNER",
      subscriptionType: { $in: ["REGISTRATION_ONLY", "REGISTRATION_WITH_SUBSCRIPTION"] },
      registrationFeePaid: true,
      status: "active"
    });

    if (!registrationPayment) {
      throw new DriverTransPorterServiceError(
        "Registration fee payment not found or expired. Please complete the payment process first.",
        400
      );
    }

    // Verify Aadhaar card
    const aadhaarVerification = await aadharNumber(documents.aadharCardNumber, name);
    let aadhaarVerified = false;
    
    if (aadhaarVerification.success) {
      aadhaarVerified = true;
      console.log("Aadhaar verification successful");
    } else {
      console.log("Aadhaar verification failed, will be marked for manual review");
    }

    // Verify Driving License
    const dlVerification = await checkDrivingLicense(
      documents.drivingLicenseNumber,
      new Date().toISOString().split('T')[0] // Current date as fallback
    );
    let dlVerified = false;
    
    if (dlVerification.success) {
      dlVerified = true;
      console.log("Driving license verification successful");
    } else {
      console.log("Driving license verification failed, will be marked for manual review");
    }

    try {
      // Create Independent Car Owner record
      const newIndependentCarOwner = new IndependentCarOwnerModel({
        userId: id,
        uuid,
        photo,
        name,
        phoneNumber,
        about: about || "I am an independent car owner providing reliable transportation services.",
        address,
        documents,
        fleetSize,
        documentVerificationStatus: {
          aadhaarVerified,
          drivingLicenseVerified: dlVerified,
          isVerifiedByAdmin: false
        }
      });

      await newIndependentCarOwner.save();

      // Update user registration status
      await UserModel.findByIdAndUpdate(id, {
        isRegisteredAsIndependentCarOwner: true
      });

      // Log activity
      await ActivityModel.create({
        userId: id,
        uuid,
        activityType: "REGISTRATION",
        description: "Independent Car Owner registration completed",
        metadata: {
          category: "INDEPENDENT_CAR_OWNER",
          verificationStatus: {
            aadhaar: aadhaarVerified,
            drivingLicense: dlVerified
          }
        }
      });

      res.status(201).json({
        success: true,
        message: "Independent Car Owner registration successful! Your application is under review.",
        data: {
          id: newIndependentCarOwner._id,
          verificationStatus: {
            aadhaarVerified,
            drivingLicenseVerified: dlVerified,
            adminVerificationRequired: true
          }
        }
      });

    } catch (error) {
      console.error("Error creating Independent Car Owner:", error);
      throw new DriverTransPorterServiceError(
        "Failed to complete registration. Please try again.",
        500
      );
    }
  }
}

function getCategory(type) {
  switch (type) {
    case "CHAT":
    case "MESSAGE":
      return "chat";
    case "WHATSAPP":
      return "whatsapp";
    case "PHONE":
      return "call";
    case "CLICK":
      return "click";
    default:
      return null;
  }
}
