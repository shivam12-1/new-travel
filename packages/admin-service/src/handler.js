import AdminModel from "../models/AdminModel.js";
import UserModel from "../models/UserModel.js";
import DriversModel from "../models/DriversModel.js";
import TransporterModel from "../models/TransporterModel.js";
import IndependentCarOwnerModel from "../models/IndependentCarOwnerModel.js";
import bcrypt from "bcrypt";
import plansModel from "../models/PlansModel.js";
import Plans from "../models/PlansModel.js";
import SubscriptionsModel from "../models/SubscriptionsModel.js";
import mongoose from "mongoose";
import VehicleModel from "../models/VehiclesModel.js";
import ReviewRatingModel from "../models/Review-RatingModel.js";
import ActivityModel from "../models/ActivityModel.js";
import dayjs from "dayjs";
import NotificationsModel from "../models/NotificationsModel.js";
import SupportModel from "../models/SupportModel.js";
import NotificationTemplate from "../models/NotificationTemplateModel.js";
import LegalModel from "../models/LegalModel.js";
import ContainerModel from "../models/ContainerModel.js";
import RegistrationFeeModel from "../models/RegistrationFeeModel.js";
import HaversineModel, {
  VALID_HAVERSINE_CATEGORIES,
} from "../models/HarversineModel.js";

export async function home(req, res) {
  try {
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    // Get total counts
    const totalUsers = await UserModel.countDocuments({});
    const totalDrivers = await DriversModel.countDocuments({});
    const totalTransporters = await TransporterModel.countDocuments({});
    const totalIndependentCarOwners =
      await IndependentCarOwnerModel.countDocuments({});
    const totalVehicles = await VehicleModel.countDocuments({});
    const totalSubscriptions = await SubscriptionsModel.countDocuments({
      status: "active",
    });

    const pendingDrivers = await DriversModel.countDocuments({
      isVerifiedByAdmin: false,
    });
    const pendingTransporters = await TransporterModel.countDocuments({
      isVerifiedByAdmin: false,
    });
    const pendingIndependentCarOwners =
      await IndependentCarOwnerModel.countDocuments({
        "documentVerificationStatus.isVerifiedByAdmin": false,
      });
    const pendingVehicles = await VehicleModel.countDocuments({
      isVerifiedByAdmin: false,
      vehicleType: { $nin: ["E_RICKSHAW", "RICKSHAW"] },
    });
    const pendingE_Rickshaw = await VehicleModel.countDocuments({
      isVerifiedByAdmin: false,
      vehicleType: "E_RICKSHAW",
    });
    const pendingRickshaw = await VehicleModel.countDocuments({
      isVerifiedByAdmin: false,
      vehicleType: "RICKSHAW",
    });

    // Get rickshaw counts
    const totalRickshaw = await VehicleModel.countDocuments({
      vehicleType: "RICKSHAW",
    });
    const totalE_Rickshaw = await VehicleModel.countDocuments({
      vehicleType: "E_RICKSHAW",
    });

    // Get today's counts
    const totalUsersToday = await UserModel.countDocuments({
      createdAt: { $gte: startOfToday },
    });
    const totalDriversToday = await DriversModel.countDocuments({
      createdAt: { $gte: startOfToday },
    });
    const totalTransportersToday = await TransporterModel.countDocuments({
      createdAt: { $gte: startOfToday },
    });
    const totalIndependentCarOwnersToday =
      await IndependentCarOwnerModel.countDocuments({
        createdAt: { $gte: startOfToday },
      });
    const totalVehicleToday = await VehicleModel.countDocuments({
      createdAt: { $gte: startOfToday },
    });
    const totalSubscriptionToday = await SubscriptionsModel.countDocuments({
      createdAt: { $gte: startOfToday },
      status: "active",
    });
    const totalRickshawToday = await VehicleModel.countDocuments({
      vehicleType: "RICKSHAW",
      createdAt: { $gte: startOfToday },
    });
    const totalE_RickshawToday = await VehicleModel.countDocuments({
      vehicleType: "E_RICKSHAW",
      createdAt: { $gte: startOfToday },
    });

    // Get monthly data for graphs (last 12 months)
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const nextMonth = new Date(
        today.getFullYear(),
        today.getMonth() - i + 1,
        1
      );

      const monthName = date.toLocaleString("default", { month: "short" });

      const users = await UserModel.countDocuments({
        createdAt: { $gte: date, $lt: nextMonth },
      });
      const drivers = await DriversModel.countDocuments({
        createdAt: { $gte: date, $lt: nextMonth },
      });
      const transporters = await TransporterModel.countDocuments({
        createdAt: { $gte: date, $lt: nextMonth },
      });
      const rickshaw = await VehicleModel.countDocuments({
        vehicleType: "RICKSHAW",
        createdAt: { $gte: date, $lt: nextMonth },
      });
      const eRickshaw = await VehicleModel.countDocuments({
        vehicleType: "E_RICKSHAW",
        createdAt: { $gte: date, $lt: nextMonth },
      });
      const subscriptions = await SubscriptionsModel.countDocuments({
        createdAt: { $gte: date, $lt: nextMonth },
        status: "active",
      });

      monthlyData.push({
        month: monthName,
        users,
        drivers,
        transporters,
        rickshaw,
        eRickshaw,
        subscriptions,
      });
    }

    // Get state-wise distribution
    const stateData = await UserModel.aggregate([
      {
        $lookup: {
          from: "drivers",
          localField: "_id",
          foreignField: "userId",
          as: "driverData",
        },
      },
      {
        $lookup: {
          from: "transporters",
          localField: "_id",
          foreignField: "userId",
          as: "transporterData",
        },
      },
      {
        $project: {
          state: {
            $cond: {
              if: { $gt: [{ $size: "$driverData" }, 0] },
              then: { $arrayElemAt: ["$driverData.address.state", 0] },
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$transporterData" }, 0] },
                  then: { $arrayElemAt: ["$transporterData.address.state", 0] },
                  else: "Unknown",
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$state",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    const data = {
      totalUsers,
      totalVehicles,
      totalVehicleToday,
      totalUsersToday,
      totalDrivers,
      totalDriversToday,
      totalTransporters,
      totalTransportersToday,
      totalIndependentCarOwners,
      totalIndependentCarOwnersToday,
      totalRickshaw,
      totalRickshawToday,
      totalE_Rickshaw,
      totalE_RickshawToday,
      totalSubscriptions,
      totalSubscriptionToday,
      pendingDrivers,
      pendingTransporters,
      pendingIndependentCarOwners,
      pendingVehicles,
      pendingE_Rickshaw,
      pendingRickshaw,
    };

    return res.json({
      status: true,
      message: "Home data fetched successfully",
      data: {
        count: data,
        monthlyData,
        stateData,
      },
    });
  } catch (error) {
    console.error("Error in home API:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
export async function getAllUsers(req, res) {
  try {
    let {
      page = 1,
      limit = 10,
      searchQuery = "",
      status = "",
      startDate = "",
      endDate = "",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    const searchCondition = {};

    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i");
      searchCondition.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { mobileNumber: regex },
        { uuid: regex },
      ];
    }

    if (status === "Blocked") {
      searchCondition.isBlockedByAdmin = true;
    } else if (status === "Unblocked") {
      searchCondition.isBlockedByAdmin = false;
    }

    // Date filtering
    if (startDate || endDate) {
      searchCondition.createdAt = {};

      if (startDate) {
        searchCondition.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        // Add 23:59:59 to include the entire end date
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        searchCondition.createdAt.$lte = endDateTime;
      }
    }

    const users = await UserModel.find(searchCondition, {
      uuid: 1,
      firstName: 1,
      lastName: 1,
      image: 1,
      mobileNumber: 1,
      email: 1,
      isBlockedByAdmin: 1,
      isRegisteredAsDriver: 1,
      isRegisteredAsTransporter: 1,
      isRegisterAsERickshaw: 1,
      isRegisterAsRickshaw: 1,
      message: 1,
      language: 1,
      createdAt: 1,
      fcmToken: 1,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await UserModel.countDocuments(searchCondition);

    return res.json({
      status: true,
      message: "Users fetched successfully",
      data: {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      message: "Something went wrong while fetching users.",
    });
  }
}
export async function editUsers(req, res) {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const isBlocking = !user.isBlockedByAdmin;
    let { message } = req.body;

    if (isBlocking) {
      // Blocking user, message is required
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          status: false,
          message: "Blocking requires a message.",
        });
      }
      message = message.trim();
      user.isBlockedByAdmin = true;
      user.message = message;
    } else {
      // Unblocking user
      user.isBlockedByAdmin = false;
      user.message = "";
      message = ""; // So it’s consistent in submodels
    }

    // Update related models
    const updatePayload = { isBlockedByAdmin: isBlocking, message };

    if (user.isRegisteredAsTransporter) {
      await TransporterModel.findOneAndUpdate(
        { userId: user._id },
        { $set: updatePayload }
      );
    }

    if (user.isRegisteredAsDriver) {
      await DriversModel.findOneAndUpdate(
        { userId: user._id },
        { $set: updatePayload }
      );
    }

    if (user.isRegisteredAsRickshaw || user.isRegisteredAsERickshaw) {
      await VehicleModel.findOneAndUpdate(
        { userId: user._id },
        { $set: updatePayload }
      );
    }

    await user.save();

    res.json({
      status: true,
      message: `User ${user.isBlockedByAdmin ? "blocked" : "unblocked"}`,
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Internal error" });
  }
}

export async function downloadUsers(req, res) {
  try {
    const {
      searchQuery = "",
      status = "",
      startDate = "",
      endDate = "",
    } = req.query;

    const searchCondition = {};

    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i");
      searchCondition.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { mobileNumber: regex },
      ];
    }

    if (status === "Blocked") {
      searchCondition.isBlockedByAdmin = true;
    } else if (status === "Unblocked") {
      searchCondition.isBlockedByAdmin = false;
    }

    // Date filtering
    if (startDate || endDate) {
      searchCondition.createdAt = {};

      if (startDate) {
        searchCondition.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        searchCondition.createdAt.$lte = endDateTime;
      }
    }

    // Fetch all users matching criteria (no pagination for download)
    const users = await UserModel.find(searchCondition, {
      uuid: 1,
      firstName: 1,
      lastName: 1,
      mobileNumber: 1,
      email: 1,
      isBlockedByAdmin: 1,
      isRegisteredAsDriver: 1,
      isRegisteredAsTransporter: 1,
      isRegisterAsERickshaw: 1,
      isRegisterAsRickshaw: 1,
      message: 1,
      createdAt: 1,
    }).sort({ createdAt: -1 });

    // Helper function to get registration type
    const getRegistrationType = (user) => {
      if (user.isRegisteredAsTransporter) return "Transporter";
      if (user.isRegisteredAsDriver) return "Driver";
      if (user.isRegisterAsERickshaw) return "E-Rickshaw";
      if (user.isRegisterAsRickshaw) return "Rickshaw";
      return "User";
    };

    // Convert to CSV format
    const csvHeaders = [
      "User ID",
      "Name",
      "Mobile",
      "Email",
      "Register As",
      "Registration Date",
      "Status",
      "Message",
    ];

    const csvData = users.map((user) => [
      user.uuid || "",
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A",
      user.mobileNumber || "N/A",
      user.email || "N/A",
      getRegistrationType(user),
      new Date(user.createdAt).toLocaleString(),
      user.isBlockedByAdmin ? "Blocked" : "Unblocked",
      user.message || "",
    ]);

    // Create CSV content
    const csvContent = [
      csvHeaders.join(","),
      ...csvData.map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Set headers for file download
    const filename = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.send(csvContent);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      message: "Something went wrong while downloading users.",
    });
  }
}
export async function downloadTransportersList(req, res) {
  let { search = "", isVerified, isBlocked, startDate, endDate } = req.query;

  const query = {};

  // Apply same filters as the main function
  if (search) {
    query.$or = [
      { companyName: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
      { contactPersonName: { $regex: search, $options: "i" } },
    ];
  }

  if (isVerified !== undefined) {
    query.isVerifiedByAdmin = isVerified === "true";
  }

  if (isBlocked !== undefined && isBlocked.toString().trim().length > 0) {
    query.isBlockedByAdmin = isBlocked === "true";
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDateTime;
    }
  }

  try {
    const transporters = await TransporterModel.find(query)
      .select(
        "userId uuid companyName phoneNumber contactPersonName address fleetSize bio isVerifiedByAdmin isBlockedByAdmin rating totalRating createdAt"
      )
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance when we don't need mongoose documents

    // Create CSV content
    const csvHeaders = [
      "User ID",
      "UUID",
      "Company Name",
      "Phone Number",
      "Contact Person Name",
      "City",
      "State",
      "Fleet Size",
      "Bio",
      "Verified",
      "Blocked",
      "Rating",
      "Total Ratings",
      "Registration Date",
    ];

    const csvRows = transporters.map((transporter) => [
      transporter.userId || "",
      transporter.uuid || "",
      transporter.companyName || "",
      transporter.phoneNumber || "",
      transporter.contactPersonName || "",
      transporter.address?.city || "",
      transporter.address?.state || "",
      transporter.fleetSize || "",
      (transporter.bio || "").replace(/"/g, '""'), // Escape quotes in bio
      transporter.isVerifiedByAdmin ? "Yes" : "No",
      transporter.isBlockedByAdmin ? "Yes" : "No",
      transporter.rating || "0",
      transporter.totalRating || "0",
      new Date(transporter.createdAt).toLocaleString(),
    ]);

    // Convert to CSV format
    const csvContent = [
      csvHeaders.map((header) => `"${header}"`).join(","),
      ...csvRows.map((row) => row.map((field) => `"${field}"`).join(",")),
    ].join("\n");

    // Set response headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=transporters.csv"
    );

    console.log("ppppp");
    console.log(csvContent);
    return res.send(csvContent);
  } catch (error) {
    console.error("Error downloading transporters:", error);
    return res
      .status(500)
      .json({ status: false, message: "Error generating download file" });
  }
}

export async function getAllDrivers(req, res) {
  let {
    page = 1,
    limit = 10,
    search = "",
    isVerified,
    isBlocked,
    startDate,
    endDate,
    download,
  } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid pagination parameters" });
  }

  const skip = (page - 1) * limit;
  const query = {};

  // Apply search on fullName, mobileNumber, drivingLicenceNumber
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: "i" } },
      { mobileNumber: { $regex: search, $options: "i" } },
      { "documents.drivingLicenceNumber": { $regex: search, $options: "i" } },
    ];
  }

  // Filter: isVerifiedByAdmin
  if (isVerified !== undefined) {
    query.isVerifiedByAdmin = isVerified === "true";
  }

  // Filter: isBlockedByAdmin
  if (isBlocked !== undefined) {
    query.isBlockedByAdmin = isBlocked === "true";
  }

  // Date range filter
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set end time to end of day

    query.createdAt = {
      $gte: start,
      $lte: end,
    };
  }

  try {
    // If download is requested, return all records without pagination
    if (download === "true") {
      const drivers = await DriversModel.find(query)
        .select(
          "fullName uuid userId mobileNumber address experience documents.drivingLicenceNumber isVerifiedByAdmin isBlockedByAdmin rating totalRating languageSpoken bio profilePhoto vehicleType servicesCities gender createdAt"
        )
        .sort({ createdAt: -1 });

      // Generate CSV content
      const csvContent = generateCSV(drivers);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="drivers.csv"'
      );
      return res.send(csvContent);
    }

    // Regular paginated response
    const [drivers, total] = await Promise.all([
      DriversModel.find(query)
        .select(
          "fullName uuid userId mobileNumber address experience documents.drivingLicenceNumber isVerifiedByAdmin isBlockedByAdmin rating totalRating languageSpoken bio profilePhoto vehicleType servicesCities gender createdAt"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DriversModel.countDocuments(query),
    ]);

    const formattedDrivers = drivers.map((driver) => ({
      id: driver._id,
      userId: driver.userId,
      uuid: driver.uuid,
      profilePhoto: driver.profilePhoto,
      fullName: driver.fullName,
      mobileNumber: driver.mobileNumber,
      location: `${driver.address?.city || ""}, ${driver.address?.state || ""}`,
      experience: driver.experience,
      drivingLicense: driver.documents?.drivingLicenceNumber,
      isVerifiedByAdmin: driver.isVerifiedByAdmin,
      isBlockedByAdmin: driver.isBlockedByAdmin,
      createdAt: driver.createdAt,
      extraFields: {
        languageSpoken: driver.languageSpoken,
        bio: driver.bio,
        rating: driver.rating,
        totalRating: driver.totalRating,
        vehicleType: driver.vehicleType,
        servicesCities: driver.servicesCities,
        gender: driver.gender,
      },
    }));

    return res.json({
      status: true,
      message: "Drivers fetched successfully",
      data: {
        drivers: formattedDrivers,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
}

export async function getAllIndependentCarOwners(req, res) {
  let {
    page = 1,
    limit = 10,
    search = "",
    isVerified,
    isBlocked,
    startDate,
    endDate,
    download,
  } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid pagination parameters" });
  }

  const skip = (page - 1) * limit;
  const query = {};

  // Apply search on name, phoneNumber, drivingLicenseNumber
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
      { "documents.drivingLicenseNumber": { $regex: search, $options: "i" } },
      { "documents.aadharCardNumber": { $regex: search, $options: "i" } },
    ];
  }

  // Filter: isVerifiedByAdmin
  if (isVerified !== undefined) {
    query["documentVerificationStatus.isVerifiedByAdmin"] =
      isVerified === "true";
  }

  // Filter: isBlockedByAdmin
  if (isBlocked !== undefined) {
    query.isBlockedByAdmin = isBlocked === "true";
  }

  // Date range filter
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set end time to end of day

    query.createdAt = {
      $gte: start,
      $lte: end,
    };
  }

  try {
    // If download is requested, return all records without pagination
    if (download === "true") {
      const carOwners = await IndependentCarOwnerModel.find(query)
        .select(
          "name uuid userId phoneNumber address documents.drivingLicenseNumber documents.aadharCardNumber documentVerificationStatus isBlockedByAdmin rating totalRating about photo fleetSize createdAt"
        )
        .sort({ createdAt: -1 });

      // Generate CSV content
      const csvContent = generateCarOwnerCSV(carOwners);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="independent_car_owners.csv"'
      );
      return res.send(csvContent);
    }

    // Regular paginated response
    const [carOwners, total] = await Promise.all([
      IndependentCarOwnerModel.find(query)
        .select(
          "name uuid userId phoneNumber address documents.drivingLicenseNumber documents.aadharCardNumber documentVerificationStatus isBlockedByAdmin rating totalRating about photo fleetSize createdAt"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      IndependentCarOwnerModel.countDocuments(query),
    ]);

    const formattedCarOwners = carOwners.map((owner) => ({
      id: owner._id,
      userId: owner.userId,
      uuid: owner.uuid,
      photo: owner.photo,
      name: owner.name,
      phoneNumber: owner.phoneNumber,
      location: `${owner.address?.city || ""}, ${owner.address?.state || ""}`,
      drivingLicense: owner.documents?.drivingLicenseNumber,
      aadharNumber: owner.documents?.aadharCardNumber,
      isVerifiedByAdmin: owner.documentVerificationStatus?.isVerifiedByAdmin,
      isBlockedByAdmin: owner.isBlockedByAdmin,
      createdAt: owner.createdAt,
      extraFields: {
        about: owner.about,
        rating: owner.rating,
        totalRating: owner.totalRating,
        fleetSize: owner.fleetSize,
        documentVerification: {
          aadhaar: owner.documentVerificationStatus?.aadharVerified,
          drivingLicense:
            owner.documentVerificationStatus?.drivingLicenseVerified,
        },
      },
    }));

    return res.json({
      status: true,
      message: "Independent Car Owners fetched successfully",
      data: {
        carOwners: formattedCarOwners,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching Independent Car Owners:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
}

// Helper function to generate CSV for Independent Car Owners
function generateCarOwnerCSV(carOwners) {
  const headers = [
    "Name",
    "Phone Number",
    "UUID",
    "City",
    "State",
    "Driving License",
    "Aadhaar Number",
    "Fleet Cars",
    "Fleet Minivans",
    "Is Verified",
    "Is Blocked",
    "Rating",
    "Created At",
  ];

  const csvRows = [headers.join(",")];

  carOwners.forEach((owner) => {
    const row = [
      `"${owner.name || ""}"`,
      `"${owner.phoneNumber || ""}"`,
      `"${owner.uuid || ""}"`,
      `"${owner.address?.city || ""}"`,
      `"${owner.address?.state || ""}"`,
      `"${owner.documents?.drivingLicenseNumber || ""}"`,
      `"${owner.documents?.aadharCardNumber || ""}"`,
      owner.fleetSize?.cars || 0,
      owner.fleetSize?.minivans || 0,
      owner.documentVerificationStatus?.isVerifiedByAdmin ? "Yes" : "No",
      owner.isBlockedByAdmin ? "Yes" : "No",
      owner.rating || 0,
      owner.createdAt ? new Date(owner.createdAt).toLocaleDateString() : "",
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}

export async function searchUsers(req, res) {
  try {
    const { userType, q } = req.query;

    let users = [];

    // Case-insensitive partial match on uuid
    const searchQuery = q ? { uuid: { $regex: q, $options: "i" } } : {};

    if (userType === "user") {
      const result = await UserModel.find(searchQuery).exec();
      users = result.map((u) => ({
        id: u._id,
        uuid: u.uuid,
        name: `${u.firstName} ${u.lastName}` || "",
        type: "user",
      }));
    } else if (userType === "driver") {
      const result = await DriversModel.find(searchQuery).exec();
      users = result.map((u) => ({
        id: u._id,
        uuid: u.uuid,
        name: u.fullName || "",
        type: "driver",
      }));
    } else if (userType === "transporter") {
      const result = await TransporterModel.find(searchQuery).exec();
      users = result.map((u) => ({
        id: u._id,
        name: u.companyName || "",
        type: "transporter",
        uuid: u.uuid,
      }));
    } else if (userType === "rickshaw") {
      // Search for rickshaw vehicles specifically
      const rickshawQuery = { ...searchQuery, vehicleType: "RICKSHAW" };
      const result = await VehicleModel.find(rickshawQuery).exec();
      users = result.map((u) => ({
        id: u._id,
        name: u.details?.fullName || "",
        type: "rickshaw",
        uuid: u.uuid,
      }));
    } else if (userType === "e_rickshaw") {
      // Search for e-rickshaw vehicles specifically
      const eRickshawQuery = { ...searchQuery, vehicleType: "E_RICKSHAW" };
      const result = await VehicleModel.find(eRickshawQuery).exec();
      users = result.map((u) => ({
        id: u._id,
        name: u.details?.fullName || "",
        type: "e_rickshaw",
        uuid: u.uuid,
      }));
    }

    return res.json({
      status: true,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
}
export async function getAllTransporters(req, res) {
  let {
    page = 1,
    limit = 10,
    search = "",
    isVerified,
    isBlocked,
    startDate,
    endDate,
    download,
  } = req.query;
  console.log(req.query);

  // For download, we don't need pagination
  if (download === "true") {
    return await downloadTransportersList(req, res);
  }

  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid pagination parameters" });
  }

  const skip = (page - 1) * limit;
  const query = {};

  // Search functionality
  if (search) {
    console.log("YES SEARCH FILTER");
    query.$or = [
      { companyName: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
      { contactPersonName: { $regex: search, $options: "i" } },
    ];
  }

  // Filter: isVerifiedByAdmin
  if (isVerified !== undefined) {
    query.isVerifiedByAdmin = isVerified === "true";
  }

  // Filter: isBlockedByAdmin
  if (isBlocked !== undefined && isBlocked.toString().trim().length > 0) {
    console.log(`YES isBlocked FILTER ${isBlocked}`);
    query.isBlockedByAdmin = isBlocked === "true";
  }

  // Date range filter
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate);
      console.log(`YES startDate FILTER ${startDate}`);
    }
    if (endDate) {
      // Add 23:59:59 to include the entire end date
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDateTime;
      console.log(`YES endDate FILTER ${endDate}`);
    }
  }

  try {
    const [transporters, total] = await Promise.all([
      TransporterModel.find(query)
        .select(
          "userId uuid companyName phoneNumber contactPersonName address fleetSize bio photo isVerifiedByAdmin isBlockedByAdmin rating totalRating createdAt"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TransporterModel.countDocuments(query),
    ]);

    const formattedTransporters = transporters.map((transporter) => ({
      id: transporter._id,
      userId: transporter.userId,
      uuid: transporter.uuid,
      companyName: transporter.companyName,
      photo: transporter.photo,
      phoneNumber: transporter.phoneNumber,
      contactPersonName: transporter.contactPersonName,
      address: `${transporter.address?.city || ""}, ${transporter.address?.state || ""}`,
      fleetSize: transporter.fleetSize,
      bio: transporter.bio,
      isVerifiedByAdmin: transporter.isVerifiedByAdmin,
      isBlockedByAdmin: transporter.isBlockedByAdmin,
      rating: transporter.rating,
      totalRating: transporter.totalRating,
      createdAt: transporter.createdAt,
    }));

    return res.json({
      status: true,
      message: "Transporters fetched successfully",
      data: {
        transporters: formattedTransporters,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching transporters:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
}
export async function getAllTransportersPendingVehicle(req, res) {
  let { page = 1, limit = 10, search = "", isVerified, isBlocked } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid pagination parameters" });
  }

  const skip = (page - 1) * limit;
  const matchQuery = {};

  // Search filters
  if (search) {
    matchQuery.$or = [
      { companyName: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
      { contactPersonName: { $regex: search, $options: "i" } },
    ];
  }

  if (isVerified !== undefined) {
    matchQuery.isVerifiedByAdmin = isVerified === "true";
  }

  if (isBlocked !== undefined && isBlocked.toString().trim().length > 0) {
    matchQuery.isBlockedByAdmin = isBlocked === "true";
  }

  try {
    const transporterAgg = await TransporterModel.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "vehicles",
          localField: "userId",
          foreignField: "userId",
          as: "vehicles",
        },
      },
      {
        $addFields: {
          totalVehicle: { $size: "$vehicles" },
          pendingVehicle: {
            $size: {
              $filter: {
                input: "$vehicles",
                as: "vehicle",
                cond: { $eq: ["$$vehicle.isVerifiedByAdmin", false] },
              },
            },
          },
        },
      },
      // 👇 Filter out transporters with no pending vehicles
      {
        $match: {
          pendingVehicle: { $gt: 0 },
        },
      },
      {
        $project: {
          userId: 1,
          uuid: 1,
          companyName: 1,
          phoneNumber: 1,
          contactPersonName: 1,
          fleetSize: 1,
          bio: 1,
          photo: 1,
          isVerifiedByAdmin: 1,
          isBlockedByAdmin: 1,
          rating: 1,
          totalRating: 1,
          totalVehicle: 1,
          pendingVehicle: 1,
          createdAt: 1,
          address: {
            $concat: [
              { $ifNull: ["$address.city", ""] },
              ", ",
              { $ifNull: ["$address.state", ""] },
            ],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    const total = await TransporterModel.countDocuments(matchQuery);

    const formatted = transporterAgg.map((transporter) => ({
      id: transporter._id,
      userId: transporter.userId,
      uuid: transporter.uuid,
      companyName: transporter.companyName,
      phoneNumber: transporter.phoneNumber,
      contactPersonName: transporter.contactPersonName,
      address: transporter.address,
      fleetSize: transporter.fleetSize,
      bio: transporter.bio,
      photo: transporter.photo,
      isVerifiedByAdmin: transporter.isVerifiedByAdmin,
      isBlockedByAdmin: transporter.isBlockedByAdmin,
      rating: transporter.rating,
      totalRating: transporter.totalRating,
      totalVehicle: transporter.totalVehicle,
      pendingVehicle: transporter.pendingVehicle,
      createdAt: transporter.createdAt,
    }));

    return res.json({
      status: true,
      message: "Transporters fetched successfully",
      data: {
        transporters: formatted,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching transporters:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
}

export async function getAllRickshawE(req, res) {
  let {
    page = 1,
    limit = 10,
    search = "",
    isVerified,
    isBlocked,
    type,
    startDate,
    endDate,
    download,
  } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
    return res
      .status(400)
      .json({ status: false, message: "Invalid pagination parameters" });
  }

  const query = {};

  // ✅ Handle type filter: RICKSHAW, E_RICKSHAW or both
  if (type && ["RICKSHAW", "E_RICKSHAW"].includes(type.toUpperCase())) {
    query.vehicleType = type.toUpperCase();
  } else {
    query.vehicleType = { $in: ["RICKSHAW", "E_RICKSHAW"] };
  }

  // ✅ Handle search (search in user full name, mobile, userId)
  if (search) {
    query.$or = [
      { "details.fullName": { $regex: search, $options: "i" } },
      { "details.mobileNumber": { $regex: search, $options: "i" } },
      { "details.userId": { $regex: search, $options: "i" } },
    ];
  }

  // ✅ Filter: isVerifiedByAdmin
  if (isVerified !== undefined) {
    query.isVerifiedByAdmin = isVerified === "true";
  }

  // ✅ Filter: isBlockedByAdmin
  if (isBlocked !== undefined) {
    query.isBlockedByAdmin = isBlocked === "true";
  }

  // ✅ Date range filter
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Set end time to end of day

    query.createdAt = {
      $gte: start,
      $lte: end,
    };
  }

  try {
    // If download is requested, return all records without pagination
    if (download === "true") {
      const vehicles = await VehicleModel.find(query).sort({ createdAt: -1 });

      // Generate CSV content
      const csvContent = generateRickshawCSV(vehicles);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="rickshaws.csv"'
      );
      return res.send(csvContent);
    }

    // Regular paginated response
    const [vehicles, total] = await Promise.all([
      VehicleModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      VehicleModel.countDocuments(query),
    ]);

    const formatted = vehicles.map((entity) => ({
      id: entity._id,
      userId: entity.userId,
      uuid: entity.uuid,
      fullName: entity.details?.fullName ?? "",
      mobileNumber: entity.details?.mobileNumber ?? "",
      profilePhoto: entity.details?.profilePhoto ?? "",
      languageSpoken: entity.details?.languageSpoken ?? [],
      address: `${entity.details?.address?.city || ""}, ${entity.details?.address?.state || ""}`,
      experience: entity.details?.experience,
      bio: entity.details?.bio,
      isVerifiedByAdmin: entity.isVerifiedByAdmin,
      isBlockedByAdmin: entity.isBlockedByAdmin,
      rating: entity.details?.rating ?? 0,
      totalRating: entity.details?.totalRating ?? 0,
      vehicleType: entity.vehicleType,
      createdAt: entity.createdAt,
    }));

    return res.json({
      status: true,
      message: "Rickshaw/E_Rickshaw fetched successfully",
      data: {
        rickshaws: formatted,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching rickshaws:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
}

export async function createPlan(req, res) {
  try {
    const {
      name,
      mrp,
      price,
      planFor,
      featureTitle,
      features,
      validity,
      maxVehicles = 0,
    } = req.body;

    // Validation
    if (
      !name ||
      !mrp ||
      !price ||
      !planFor ||
      !featureTitle ||
      !features ||
      !validity
    ) {
      return res.status(400).json({
        status: false,
        message: "All required fields must be provided",
      });
    }

    // Check if plan with same name already exists (and not deleted)
    const existingPlan = await plansModel.findOne({
      name: name.trim(),
      isDeleted: false,
    });

    if (existingPlan) {
      return res.status(400).json({
        status: false,
        message: "Plan with this name already exists",
      });
    }

    const plan = new plansModel({
      name: name.trim(),
      mrp,
      price,
      planFor,
      featureTitle: featureTitle.trim(),
      features,
      validity,
      maxVehicles,
    });

    await plan.save();

    return res.status(201).json({
      status: true,
      message: "Subscription Plan created successfully",
      data: plan,
    });
  } catch (error) {
    console.error("Error creating plan:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
}
export async function getPlans(req, res) {
  try {
    const plans = await plansModel.find({ isDeleted: false }).exec();
    const registrationFee = await RegistrationFeeModel.findOne({}).exec();
    return res.json({
      status: true,
      message: "Subscription Plans fetched successfully",
      data: { plans, registrationFee },
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
}
export async function editPlan(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      mrp,
      price,
      featureTitle,
      features,
      validity,
      planFor,
      maxVehicles,
    } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid plan ID",
      });
    }

    // Check if plan exists and is not deleted
    const existingPlan = await plansModel.findOne({
      _id: id,
      isDeleted: false,
    });
    if (!existingPlan) {
      return res.status(404).json({
        status: false,
        message: "Plan not found",
      });
    }

    // Check if another plan with same name exists (excluding current plan)
    if (name && name.trim() !== existingPlan.name) {
      const duplicatePlan = await plansModel.findOne({
        name: name.trim(),
        isDeleted: false,
        _id: { $ne: id },
      });

      if (duplicatePlan) {
        return res.status(400).json({
          status: false,
          message: "Plan with this name already exists",
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (mrp !== undefined) updateData.mrp = mrp;
    if (price !== undefined) updateData.price = price;
    if (featureTitle) updateData.featureTitle = featureTitle.trim();
    if (features) updateData.features = features;
    if (validity !== undefined) updateData.validity = validity;
    if (planFor) updateData.planFor = planFor;
    if (maxVehicles !== undefined) updateData.maxVehicles = maxVehicles;

    const updatedPlan = await plansModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.json({
      status: true,
      message: "Subscription Plan updated successfully",
      data: updatedPlan,
    });
  } catch (error) {
    console.error("Error updating plan:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
}

export async function editRegistrationFee(req, res) {
  try {
    const body = req.body;
    console.log(body);
    return res.json({
      status: true,
      message: "Subscription Fee updated successfully",
    });
  } catch (error) {
    console.error("Error updating plan:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
}
export async function deletePlan(req, res) {
  try {
    const { id, status } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid plan ID",
      });
    }

    // Check if plan exists and is not already deleted
    const existingPlan = await plansModel.findOne({
      _id: id,
      isDeleted: false,
    });
    if (!existingPlan) {
      return res.status(404).json({
        status: false,
        message: "Plan not found",
      });
    }

    // Soft delete: mark as deleted instead of removing from database
    const deletedPlan = await plansModel.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );

    return res.json({
      status: true,
      message: "Subscription Plan deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
}

// Get last 500 transactions
export async function getLast500Transactions(req, res) {
  try {
    const transactions = await SubscriptionsModel.aggregate([
      // Sort by newest first
      { $sort: { createdAt: -1 } },
      // Limit to 500
      { $limit: 500 },
      // Lookup user details
      {
        $lookup: {
          from: "users", // collection name in MongoDB (usually lowercase plural of model)
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      // Lookup plan details
      {
        $lookup: {
          from: "plans",
          localField: "planId",
          foreignField: "_id",
          as: "plan",
        },
      },
      { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      // Project the final shape
      {
        $project: {
          _id: 1,
          userId: "$user._id",
          uuid: "$user.uuid",
          userName: { $ifNull: ["$user.name", "Unknown User"] },
          userEmail: { $ifNull: ["$user.email", "N/A"] },
          planName: { $ifNull: ["$plan.name", "Unknown Plan"] },
          amount: { $divide: ["$amount", 100] },
          currency: 1,
          status: 1,
          orderId: 1,
          paymentId: 1,
          couponCode: 1,
          couponDiscountAmount: 1,
          startDate: 1,
          endDate: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return res.json({
      status: true,
      message: "Transactions fetched successfully",
      data: transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
}

// Get plan by ID
export async function getPlanById(req, res) {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid plan ID",
      });
    }

    const plan = await plansModel.findOne({ _id: id, isDeleted: false });

    if (!plan) {
      return res.status(404).json({
        status: false,
        message: "Plan not found",
      });
    }

    return res.json({
      status: true,
      message: "Plan fetched successfully",
      data: plan,
    });
  } catch (error) {
    console.error("Error fetching plan:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
}

export async function createRole(req, res, next) {
  try {
    const { name, email, role, permissions, password } = req.body;

    const admin = await AdminModel.findOne({ email }).exec();
    if (admin) {
      return res
        .status(400)
        .json({ status: false, message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new AdminModel({
      name,
      email,
      role,
      permissions,
      password: hashedPassword,
    });
    await newAdmin.save();

    return res.json({
      status: true,
      message: "Admin role created successfully",
    });
  } catch (error) {
    next(error);
  }
}
export async function getRoles(req, res, next) {
  try {
    const admins = await AdminModel.find({
      deleted: false,
      role: { $ne: "SUPER_ADMIN" },
    }).exec();
    return res.json({
      status: true,
      message: "Admins fetched successfully",
      data: admins,
    });
  } catch (error) {
    next(error);
  }
}
export async function editRole(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, role, permissions, password } = req.body;

    const updatedAdmin = await AdminModel.findByIdAndUpdate(
      id,
      { name, email, role, permissions, password },
      { new: true }
    );

    if (!updatedAdmin) {
      return res
        .status(404)
        .json({ status: false, message: "Admin not found" });
    }

    return res.json({
      status: true,
      message: "Admin updated successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    next(error);
  }
}
export async function deleteRole(req, res, next) {
  try {
    const { id } = req.params;
    const deletedAdmin = await AdminModel.findByIdAndUpdate(
      id,
      { deleted: true },
      { new: true }
    );

    if (!deletedAdmin) {
      return res
        .status(404)
        .json({ status: false, message: "Admin not found" });
    }

    return res.json({
      status: true,
      message: "Admin soft-deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}
export async function toggleUserStatus(req, res) {
  try {
    const { id, status } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid user ID",
      });
    }

    const user = await AdminModel.findOne({ _id: id, deleted: false });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const updatedUser = await AdminModel.findByIdAndUpdate(
      id,
      { status: status === "active" ? "blocked" : "active" },
      { new: true }
    );

    return res.json({
      status: true,
      message: `User status updated to ${updatedUser.status}`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
}

export async function getAllNotifications(req, res) {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const templates = await NotificationTemplate.find({}).exec();

    const notifications = await NotificationsModel.find({ userId: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .exec();

    const total = await NotificationsModel.countDocuments({ userId: null });

    const history = notifications.map((notification) => {
      const deliveryStats = notification.deliveryStatus || {
        sent: 0,
        delivered: 0,
        failed: 0,
      };
      const recipientCount = notification.recipientCount || 0;

      let status = "sent";
      if (deliveryStats.failed > 0 && deliveryStats.delivered === 0) {
        status = "failed";
      } else if (deliveryStats.failed > 0) {
        status = "partial";
      } else if (deliveryStats.delivered > 0) {
        status = "delivered";
      }

      return {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        image: notification.image,
        kind: notification.kind,
        time: notification.createdAt,
        sentAt: notification.sentAt,
        targetAudience: notification.targetAudience || "ALL",
        recipientType: notification.recipientType || "ALL_USERS",
        recipients: recipientCount,
        status: status,
        deliveryStats: {
          sent: deliveryStats.sent,
          delivered: deliveryStats.delivered,
          failed: deliveryStats.failed,
        },
        messageType: notification.messageType || "CUSTOM",
        templateUsed: notification.templateUsed,
      };
    });

    return res.json({
      status: true,
      message: "All Notification & Templates",
      data: {
        templates: templates,
        history: history,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
export async function sendNotification(req, res) {
  try {
    const {
      targetAudience,
      recipientType,
      selectedUserIds = [],
      messageType,
      templateId,
      title,
      message,
    } = req.body;

    // Validation
    if (!targetAudience || !recipientType || !messageType) {
      return res.status(400).json({
        status: false,
        message:
          "Missing required fields: targetAudience, recipientType, messageType",
      });
    }

    if (messageType === "CUSTOM" && (!title || !message)) {
      return res.status(400).json({
        status: false,
        message: "Title and message are required for custom notifications",
      });
    }

    if (messageType === "TEMPLATE" && !templateId) {
      return res.status(400).json({
        status: false,
        message: "Template ID is required for template notifications",
      });
    }

    if (
      recipientType === "SELECTED_USERS" &&
      (!selectedUserIds || selectedUserIds.length === 0)
    ) {
      return res.status(400).json({
        status: false,
        message:
          "Selected user IDs are required when recipientType is SELECTED_USERS",
      });
    }

    // Get notification content
    let notificationTitle = title;
    let notificationMessage = message;
    let usedTemplate = null;

    if (messageType === "TEMPLATE") {
      usedTemplate = await NotificationTemplate.findById(templateId);
      if (!usedTemplate) {
        return res.status(404).json({
          status: false,
          message: "Notification template not found",
        });
      }
      notificationTitle = usedTemplate.name;
      notificationMessage = usedTemplate.message;
    }

    // Get target users based on audience and recipient type
    const targetUsers = await getTargetUsers(
      targetAudience,
      recipientType,
      selectedUserIds
    );

    if (targetUsers.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No users found matching the specified criteria",
      });
    }

    // Create notification record in database
    const notification = new NotificationsModel({
      userId: null, // Admin broadcast notification
      title: notificationTitle,
      message: notificationMessage,
      kind: "admin",
      targetAudience,
      recipientType,
      selectedUserIds:
        recipientType === "SELECTED_USERS" ? selectedUserIds : [],
      recipientCount: targetUsers.length,
      templateUsed: usedTemplate ? usedTemplate._id : null,
      messageType,
      sendType: "push",
    });

    await notification.save();

    // Send push notifications using dedicated admin endpoint
    let deliveryStats = {
      sent: 0,
      delivered: 0,
      failed: 0,
    };

    try {
      // Call dedicated admin notification endpoint
      const response = await fetch(
        `${process.env.PROTOCOL || 'http'}://${process.env.HOST}:${process.env.NOTIFICATION_SERVICE_PORT || "3003"}/admin/send-push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            targetAudience,
            recipientType,
            selectedUserIds:
              recipientType === "SELECTED_USERS" ? selectedUserIds : [],
            title: notificationTitle,
            message: notificationMessage,
            image: null, // Can be extended for image support
            notificationId: notification._id,
          }),
        }
      );

      const notificationResult = await response.json();

      if (notificationResult.success && notificationResult.deliveryStats) {
        deliveryStats = notificationResult.deliveryStats;
      } else if (notificationResult.summary) {
        // Fallback: calculate delivery stats from summary
        notificationResult.summary.forEach((batch) => {
          if (batch.successCount) deliveryStats.delivered += batch.successCount;
          if (batch.failureCount) deliveryStats.failed += batch.failureCount;
        });
        deliveryStats.sent = deliveryStats.delivered + deliveryStats.failed;
      } else {
        // No FCM tokens available
        deliveryStats = { sent: 0, delivered: 0, failed: 0 };
      }
    } catch (error) {
      console.error("Error calling admin notification service:", error);
      // Set failed stats if service call fails
      const tokenCount = targetUsers.filter((user) => user.fcmToken).length;
      deliveryStats = { sent: tokenCount, delivered: 0, failed: tokenCount };
    }

    // Update notification with delivery stats
    notification.deliveryStatus = deliveryStats;
    await notification.save();

    // Save individual notification records for users (for their notification history)
    const userNotifications = targetUsers.map((user) => ({
      userId: user._id,
      title: notificationTitle,
      message: notificationMessage,
      kind: "admin",
      isRead: false,
    }));

    if (userNotifications.length > 0) {
      await NotificationsModel.insertMany(userNotifications);
    }

    return res.json({
      status: true,
      message: "Notification sent successfully",
      data: {
        notificationId: notification._id,
        recipientCount: targetUsers.length,
        tokensFound: targetUsers.filter((user) => user.fcmToken).length,
        deliveryStats,
      },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// Helper function to get target users based on criteria
async function getTargetUsers(targetAudience, recipientType, selectedUserIds) {
  let query = {};

  // If specific users are selected, return only those
  if (recipientType === "SELECTED_USERS" && selectedUserIds.length > 0) {
    return await UserModel.find({ _id: { $in: selectedUserIds } })
      .select("_id fcmToken")
      .exec();
  }

  // Filter by target audience type
  switch (targetAudience.toUpperCase()) {
    case "USERS":
      // Regular users who are not registered as drivers, transporters, etc.
      query = {
        isRegisteredAsDriver: false,
        isRegisteredAsTransporter: false,
        isRegisterAsERickshaw: false,
        isRegisterAsRickshaw: false,
        isBlockedByAdmin: false,
      };
      break;

    case "DRIVERS":
      query = {
        isRegisteredAsDriver: true,
        isBlockedByAdmin: false,
      };
      break;

    case "TRANSPORTERS":
      query = {
        isRegisteredAsTransporter: true,
        isBlockedByAdmin: false,
      };
      break;

    case "RICKSHAW":
      query = {
        isRegisterAsRickshaw: true,
        isBlockedByAdmin: false,
      };
      break;

    case "E_RICKSHAW":
      query = {
        isRegisterAsERickshaw: true,
        isBlockedByAdmin: false,
      };
      break;

    case "ALL":
    default:
      query = {
        isBlockedByAdmin: false,
      };
      break;
  }

  return await UserModel.find(query).select("_id fcmToken").exec();
}

export async function getSingleDashboard(req, res) {
  try {
    const { id, type } = req.params;
    const upperType = type.toString().toUpperCase();

    if (
      ![
        "DRIVER",
        "TRANSPORTER",
        "INDEPENDENT_CAR_OWNER",
        "RICKSHAW",
        "E_RICKSHAW",
      ].includes(upperType)
    ) {
      return res.status(400).json({ status: false, message: "Invalid Type" });
    }

    const { profile, vehicle, activity } = await getProfileDataByType(
      upperType,
      id
    );
    const { activePlan, subscriptionHistory } = await getSubscriptionData(id);

    const ratings = await ReviewRatingModel.find({ to: id }).exec();

    return res.json({
      status: true,
      message: `Single ${upperType} Dashboard`,
      data: {
        profile: { ...profile, activePlan },
        vehicles: vehicle,
        ratings,
        activity,
        subscriptionHistory,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
}

export async function toggleEntity(req, res) {
  try {
    const { userId, id, status, toggleType, userType } = req.body;

    if (
      !userId ||
      !id ||
      typeof status !== "boolean" ||
      !toggleType ||
      !userType
    ) {
      return res
        .status(400)
        .json({ message: "Missing or invalid parameters." });
    }

    let Model;
    switch (userType.toUpperCase()) {
      case "DRIVER":
        Model = DriversModel;
        break;
      case "TRANSPORTER":
        Model = TransporterModel;
        break;
      case "RICKSHAW":
      case "E_RICKSHAW":
        Model = VehicleModel;
        break;
      default:
        return res.status(400).json({ message: "Invalid userType." });
    }

    let updateKey;
    if (toggleType === "verified") {
      updateKey = "isVerifiedByAdmin";
    } else if (toggleType === "blocked") {
      updateKey = "isBlockedByAdmin";
    } else {
      return res.status(400).json({ message: "Invalid toggleType." });
    }

    const updated = await Model.findOneAndUpdate(
      { _id: id, userId },
      { [updateKey]: status },
      { new: true }
    );
    console.log(updateKey);
    if (toggleType === "blocked") {
      await UserModel.findOneAndUpdate(
        { _id: userId },
        {
          isBlockedByAdmin: status,
          message: status === true ? "Blocked By Admin" : "",
        }
      ).exec();
    }

    if (!updated) {
      return res.status(404).json({ message: "Entity not found." });
    }

    res.status(200).json({
      message: `${userType} ${toggleType} operation successful.`,
      data: updated,
    });
  } catch (err) {
    console.error("Error in toggleEntity:", err);
    res.status(500).json({ message: "Internal server error." });
  }
}

export async function toggleVehicle(req, res) {
  const { vehicleId, status, toggleType } = req.body;

  let updateKey;
  if (toggleType === "verified") {
    updateKey = "isVerifiedByAdmin";
  } else if (toggleType === "blocked") {
    updateKey = "isBlockedByAdmin";
  } else {
    return res.status(400).json({ message: "Invalid toggleType." });
  }

  const updated = await VehicleModel.findOneAndUpdate(
    { _id: vehicleId },
    { [updateKey]: status },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ message: "Entity not found." });
  }

  res.status(200).json({
    message: `${toggleType} operation successful.`,
    data: updated,
  });
}

export async function getSupport(req, res) {
  try {
    let support = await SupportModel.findOne();
    return res.status(200).json({
      status: true,
      message: "Support Data",
      data: support,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to get support data",
      error: error.message,
    });
  }
}
export async function updateSupport(req, res) {
  try {
    const { emails, contact } = req.body;

    let support = await SupportModel.findOne();
    if (!support) {
      // If no document exists, create a new one
      support = new SupportModel({ emails, contact });
    } else {
      support.emails = emails;
      support.contact = contact;
    }

    await support.save();

    return res.status(200).json({
      status: true,
      message: "Support Updated",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to update support data",
      error: error.message,
    });
  }
}

async function getProfileDataByType(type, id) {
  let entity;
  let profile = {};
  let vehicle = [];
  let activity = {
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

  const now = dayjs();
  const response = await ActivityModel.find({ to: id }).exec();
  response.forEach((item) => {
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

  if (type === "DRIVER") {
    entity = await DriversModel.findOne({ userId: id }).exec();
    if (!entity) throw new Error("Driver not found");

    profile = {
      id: entity._id,
      userId: entity.userId,
      uuid: entity.uuid,
      name: entity.fullName,
      email: entity?.email ?? "",
      phone: entity.mobileNumber,
      joinDate: entity.createdAt,
      avatar: entity.profilePhoto,
      rating: entity.rating,
      totalReviews: entity.totalRating,
      location: `${entity.address?.addressLine ?? ""}, ${entity.address?.city ?? ""} ${entity.address?.state ?? ""} ${entity.address?.pincode ?? ""} ${entity.address?.country ?? ""}`,
      experience: entity.experience,
      bio: entity.bio,
      minimumCharges: entity.minimumCharges,
      isVerifiedByAdmin: entity.isVerifiedByAdmin,
      isBlockedByAdmin: entity.isBlockedByAdmin,
      dob: entity.dob,
      gender: entity.gender,
      languageSpoken: entity.languageSpoken,
      servicesCities: entity.servicesCities,
      vehicleType: entity.vehicleType,
      documents: entity.documents,
    };
  } else if (type === "TRANSPORTER") {
    entity = await TransporterModel.findOne({ userId: id }).exec();
    if (!entity) throw new Error("Transporter not found");

    profile = {
      id: entity._id,
      userId: entity.userId,
      uuid: entity.uuid,
      companyName: entity.companyName,
      phoneNumber: entity.phoneNumber,
      location: `${entity.address?.addressLine ?? ""}, ${entity.address?.city ?? ""} ${entity.address?.state ?? ""} ${entity.address?.pincode ?? ""} ${entity.address?.country ?? ""}`,
      addressType: entity.addressType,
      fleetSize: entity.fleetSize,
      contactPersonName: entity.contactPersonName,
      points: entity.points,
      photo: entity.photo,
      bio: entity.bio,
      documents: entity.documents,
      rating: entity.rating,
      totalRating: entity.totalRating,
      isVerifiedByAdmin: entity.isVerifiedByAdmin,
      isBlockedByAdmin: entity.isBlockedByAdmin,
      joinDate: entity.createdAt,
    };
    vehicle = await VehicleModel.find({ userId: id }, { details: 0 }).exec();
  } else if (type === "INDEPENDENT_CAR_OWNER") {
    entity = await IndependentCarOwnerModel.findOne({ userId: id }).exec();
    if (!entity) throw new Error("Independent Car Owner not found");

    profile = {
      id: entity._id,
      userId: entity.userId,
      uuid: entity.uuid,
      name: entity.name,
      phone: entity.phoneNumber,
      joinDate: entity.createdAt,
      avatar: entity.photo,
      rating: entity.rating,
      totalReviews: entity.totalRating,
      location: `${entity.address?.addressLine ?? ""}, ${entity.address?.city ?? ""} ${entity.address?.state ?? ""} ${entity.address?.pincode ?? ""} ${entity.address?.country ?? ""}`,
      about: entity.about,
      fleetSize: entity.fleetSize,
      isVerifiedByAdmin: entity.documentVerificationStatus?.isVerifiedByAdmin,
      isBlockedByAdmin: entity.isBlockedByAdmin,
      documents: entity.documents,
      documentVerificationStatus: entity.documentVerificationStatus,
    };
    // Independent Car Owners may also have vehicles listed
    vehicle = await VehicleModel.find({ userId: id }, { details: 0 }).exec();
  } else if (["RICKSHAW", "E_RICKSHAW"].includes(type)) {
    entity = await VehicleModel.findOne({
      userId: id,
      vehicleType: type,
    }).exec();
    if (!entity) throw new Error(`${type} not found`);

    profile = {
      id: entity._id,
      userId: entity.userId,
      uuid: entity.uuid,
      fullName: entity.details.fullName,
      mobileNumber: entity.details.mobileNumber,
      profilePhoto: entity.details.profilePhoto,
      languageSpoken: entity.details.languageSpoken,
      bio: entity.details.bio,
      joinDate: entity.createdAt,
      experience: entity.details.experience,
      rating: entity.details.rating,
      totalRating: entity.details.totalRating,
      address: `${entity.details.address?.addressLine ?? ""}, ${entity.details.address?.city ?? ""} ${entity.details.address?.state ?? ""} ${entity.details.address?.pincode ?? ""} ${entity.details.address?.country ?? ""}`,
      isVerifiedByAdmin: entity.isVerifiedByAdmin,
      isBlockedByAdmin: entity.isBlockedByAdmin,
      documents: entity.documents,
    };
    vehicle = [entity];
  } else {
    throw new Error("Invalid Type");
  }

  return { profile, vehicle, activity };
}
async function getSubscriptionData(userId) {
  const subscriptions = await SubscriptionsModel.find({ userId })
    .sort({ createdAt: -1 })
    .exec();

  const planIds = subscriptions.map((sub) => sub.planId);
  const plans = await Plans.find({ _id: { $in: planIds } }).exec();

  const planMap = new Map();
  plans.forEach((plan) => planMap.set(plan._id.toString(), plan));

  const now = new Date();
  const activeSubscription = subscriptions.find(
    (sub) =>
      sub.status === "active" && sub.startDate <= now && sub.endDate >= now
  );

  let activePlan = null;
  if (activeSubscription) {
    const plan = planMap.get(activeSubscription.planId.toString());
    activePlan = {
      name: plan?.name ?? "Unknown Plan",
      type: "Monthly",
      startDate: activeSubscription.startDate,
      planFor: activeSubscription?.plan?.planFor ?? "",
      maxVehicles: activeSubscription?.plan?.maxVehicles ?? 6,
      endDate: activeSubscription.endDate,
      amount: activeSubscription.amount,
      status: activeSubscription.status,
      method: activeSubscription.paymentId ? "Online" : "N/A",
    };
  }

  const subscriptionHistory = subscriptions.map((sub) => {
    const plan = planMap.get(sub.planId.toString());
    return {
      id: sub.orderId,
      date: sub.startDate,
      type: "Plan Purchase",
      plan: plan?.name ?? "Unknown Plan",
      amount: sub.amount,
      status:
        sub.status === "active" || sub.status === "created"
          ? "Completed"
          : sub.status,
      method: sub.paymentId ? "Online" : "N/A",
    };
  });

  return { activePlan, subscriptionHistory };
}

export async function getLegalDocs(req, res) {
  try {
    const document = await LegalModel.find({}).exec();
    return res.json({
      status: true,
      message: "All Legal Docs",
      data: document,
    });
  } catch (error) {
    console.error("Error fetching legal content:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
export async function editLegalDocs(req, res) {
  try {
    const { id } = req.params;
    const { language, title, content, faqItems } = req.body;

    // Validate input
    if (!id || !language || !title) {
      return res
        .status(400)
        .json({ status: false, message: "Missing required fields" });
    }

    const document = await LegalModel.findById(id);
    if (!document) {
      return res
        .status(404)
        .json({ status: false, message: "Document not found" });
    }

    // Check if version exists
    const versionIndex = document.versions.findIndex(
      (v) => v.language === language
    );

    const updateData = {
      language, // Make sure language is included in the update data
      title,
      lastUpdated: new Date(),
    };

    if (document.name === "FAQ") {
      // Validate and sort FAQ items by order
      if (!faqItems || !Array.isArray(faqItems)) {
        return res
          .status(400)
          .json({ status: false, message: "FAQ items required" });
      }

      const validatedFaqItems = faqItems
        .filter((item) => item.question && item.answer)
        .map((item, index) => ({
          question: item.question,
          answer: item.answer,
          order: item.order !== undefined ? item.order : index,
        }))
        .sort((a, b) => a.order - b.order);

      updateData.faqItems = validatedFaqItems;
    } else {
      if (!content) {
        return res
          .status(400)
          .json({ status: false, message: "Content required" });
      }
      updateData.content = content;
    }

    if (versionIndex >= 0) {
      // Update existing version - preserve the existing language field
      document.versions[versionIndex] = {
        ...document.versions[versionIndex],
        ...updateData,
        language: document.versions[versionIndex].language, // Keep original language value
      };
    } else {
      // Add new version
      document.versions.push({
        language, // Explicitly set language
        ...updateData,
      });
    }

    await document.save();

    return res.json({
      status: true,
      message: "Document updated successfully",
      data: document,
    });
  } catch (error) {
    console.error("Error updating legal document:", error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
}

export async function getContent(req, res) {
  const content = await ContainerModel.find({});
  res.json(content);
}
export async function editContent(req, res) {
  try {
    const content = req.body;
    console.log(content);
    await ContainerModel.deleteMany({
      containerFor: { $in: ["Banner", "Advertisement"] },
    });
    await ContainerModel.insertMany(content);
    return res.status(200).json({
      status: true,
      message: "Content updated successfully",
    });
  } catch (error) {
    console.error("Error updating legal document:", error);
    return res.status(500).json({ status: false, message: "Server error" });
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

function generateCSV(drivers) {
  const headers = [
    "UUID",
    "User ID",
    "Full Name",
    "Mobile Number",
    "Location (City)",
    "Location (State)",
    "Experience (Years)",
    "Driving License",
    "Verified Status",
    "Blocked Status",
    "Rating",
    "Total Reviews",
    "Language Spoken",
    "Bio",
    "Vehicle Type",
    "Service Cities",
    "Gender",
    "Registration Date",
  ];

  const csvRows = [];
  csvRows.push(headers.join(","));

  drivers.forEach((driver) => {
    const row = [
      driver.uuid || "",
      driver.userId || "",
      `"${driver.fullName || ""}"`,
      driver.mobileNumber || "",
      `"${driver.address?.city || ""}"`,
      `"${driver.address?.state || ""}"`,
      driver.experience || "",
      driver.documents?.drivingLicenceNumber || "",
      driver.isVerifiedByAdmin ? "Verified" : "Unverified",
      driver.isBlockedByAdmin ? "Blocked" : "Unblocked",
      driver.rating || 0,
      driver.totalRating || 0,
      `"${driver.languageSpoken || ""}"`,
      `"${(driver.bio || "").replace(/"/g, '""')}"`, // Escape quotes in bio
      `"${driver.vehicleType || ""}"`,
      `"${driver.servicesCities?.join("; ") || ""}"`,
      `"${driver.gender || ""}"`,
      driver.createdAt
        ? new Date(driver.createdAt).toISOString().split("T")[0]
        : "",
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}
// Haversine Distance Management
export async function getHaversineSettings(req, res) {
  try {
    const settings = await HaversineModel.find().sort({ category: 1 });

    return res.status(200).json({
      status: true,
      message: "Haversine settings retrieved successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Error getting haversine settings:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve haversine settings",
      error: error.message,
    });
  }
}

export async function getHaversineCategories(req, res) {
  try {
    return res.status(200).json({
      status: true,
      message: "Valid haversine categories retrieved successfully",
      data: VALID_HAVERSINE_CATEGORIES,
    });
  } catch (error) {
    console.error("Error getting haversine categories:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve haversine categories",
      error: error.message,
    });
  }
}

export async function updateHaversineSettings(req, res) {
  try {
    const { category, distance } = req.body;

    if (!category || !distance) {
      return res.status(400).json({
        status: false,
        message: "Category and distance are required",
      });
    }

    if (!VALID_HAVERSINE_CATEGORIES.includes(category)) {
      return res.status(400).json({
        status: false,
        message: `Invalid category. Valid categories are: ${VALID_HAVERSINE_CATEGORIES.join(", ")}`,
      });
    }

    if (distance <= 0) {
      return res.status(400).json({
        status: false,
        message: "Distance must be greater than 0",
      });
    }

    // Check if setting exists for this category
    const existingSetting = await HaversineModel.findOne({ category });

    let result;
    if (existingSetting) {
      // Update existing setting
      result = await HaversineModel.findOneAndUpdate(
        { category },
        { distance },
        { new: true }
      );
    } else {
      // Create new setting
      result = new HaversineModel({ category, distance });
      await result.save();
    }

    return res.status(200).json({
      status: true,
      message: `Haversine setting for ${category} updated successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Error updating haversine settings:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to update haversine settings",
      error: error.message,
    });
  }
}

export async function deleteHaversineSettings(req, res) {
  try {
    const { category } = req.params;

    const result = await HaversineModel.findOneAndDelete({ category });

    if (!result) {
      return res.status(404).json({
        status: false,
        message: "Haversine setting not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: `Haversine setting for ${category} deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting haversine settings:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to delete haversine settings",
      error: error.message,
    });
  }
}

function generateRickshawCSV(vehicles) {
  const headers = [
    "UUID",
    "User ID",
    "Full Name",
    "Mobile Number",
    "Address (City)",
    "Address (State)",
    "Experience",
    "Bio",
    "Vehicle Type",
    "Verified Status",
    "Blocked Status",
    "Rating",
    "Total Reviews",
    "Language Spoken",
    "Registration Date",
  ];

  const csvRows = [];
  csvRows.push(headers.join(","));

  vehicles.forEach((vehicle) => {
    const row = [
      vehicle.uuid || "",
      vehicle.userId || "",
      `"${vehicle.details?.fullName || ""}"`,
      vehicle.details?.mobileNumber || "",
      `"${vehicle.details?.address?.city || ""}"`,
      `"${vehicle.details?.address?.state || ""}"`,
      vehicle.details?.experience || "",
      `"${(vehicle.details?.bio || "").replace(/"/g, '""')}"`, // Escape quotes in bio
      vehicle.vehicleType || "",
      vehicle.isVerifiedByAdmin ? "Verified" : "Unverified",
      vehicle.isBlockedByAdmin ? "Blocked" : "Unblocked",
      vehicle.details?.rating || 0,
      vehicle.details?.totalRating || 0,
      `"${vehicle.details?.languageSpoken?.join("; ") || ""}"`,
      vehicle.createdAt
        ? new Date(vehicle.createdAt).toISOString().split("T")[0]
        : "",
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}

// Registration Fee Management Functions
export async function createRegistrationFee(req, res) {
  try {
    const { category, grossPrice, earlyBirdDiscountPercentage } = req.body;

    if (!category || !grossPrice || earlyBirdDiscountPercentage === undefined) {
      return res.status(400).json({
        status: false,
        message:
          "Category, grossPrice, and earlyBirdDiscountPercentage are required",
      });
    }

    // Calculate discount price and final price
    const earlyBirdDiscountPrice =
      (grossPrice * earlyBirdDiscountPercentage) / 100;
    const finalPrice = grossPrice - earlyBirdDiscountPrice;

    // Check if registration fee already exists for this category
    const existingFee = await RegistrationFeeModel.findOne({ category });
    if (existingFee) {
      return res.status(400).json({
        status: false,
        message: `Registration fee for ${category} already exists`,
      });
    }

    const registrationFee = new RegistrationFeeModel({
      category,
      grossPrice,
      earlyBirdDiscountPercentage,
      earlyBirdDiscountPrice,
      finalPrice,
    });

    await registrationFee.save();

    return res.status(201).json({
      status: true,
      message: "Registration fee created successfully",
      data: registrationFee,
    });
  } catch (error) {
    console.error("Error creating registration fee:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

export async function getRegistrationFees(req, res) {
  try {
    const registrationFees = await RegistrationFeeModel.find({});

    return res.json({
      status: true,
      message: "Registration fees retrieved successfully",
      data: registrationFees,
    });
  } catch (error) {
    console.error("Error fetching registration fees:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

export async function updateRegistrationFee(req, res) {
  try {
    const { id } = req.params;
    const { grossPrice, earlyBirdDiscountPercentage, isActive } = req.body;

    const registrationFee = await RegistrationFeeModel.findById(id);
    if (!registrationFee) {
      return res.status(404).json({
        status: false,
        message: "Registration fee not found",
      });
    }

    if (grossPrice !== undefined) {
      registrationFee.grossPrice = grossPrice;
    }
    if (earlyBirdDiscountPercentage !== undefined) {
      registrationFee.earlyBirdDiscountPercentage = earlyBirdDiscountPercentage;
    }
    if (isActive !== undefined) {
      registrationFee.isActive = isActive;
    }

    // Recalculate discount and final price
    registrationFee.earlyBirdDiscountPrice =
      (registrationFee.grossPrice *
        registrationFee.earlyBirdDiscountPercentage) /
      100;
    registrationFee.finalPrice =
      registrationFee.grossPrice - registrationFee.earlyBirdDiscountPrice;

    await registrationFee.save();

    return res.json({
      status: true,
      message: "Registration fee updated successfully",
      data: registrationFee,
    });
  } catch (error) {
    console.error("Error updating registration fee:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

export async function deleteRegistrationFee(req, res) {
  try {
    const { id } = req.params;

    const registrationFee = await RegistrationFeeModel.findById(id);
    if (!registrationFee) {
      return res.status(404).json({
        status: false,
        message: "Registration fee not found",
      });
    }

    registrationFee.isDeleted = true;
    await registrationFee.save();

    return res.json({
      status: true,
      message: "Registration fee deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting registration fee:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// Enhanced Plan Management for Subscription Packages
export async function createSubscriptionPlan(req, res) {
  try {
    const {
      name,
      planFor,
      subscriptionGrossPricePerMonth,
      durationInMonths,
      earlyBirdDiscountPercentage,
      features,
      maxVehicles,
    } = req.body;

    if (
      !name ||
      !planFor ||
      !subscriptionGrossPricePerMonth ||
      !durationInMonths ||
      earlyBirdDiscountPercentage === undefined
    ) {
      return res.status(400).json({
        status: false,
        message:
          "Name, planFor, subscriptionGrossPricePerMonth, durationInMonths, and earlyBirdDiscountPercentage are required",
      });
    }

    // Calculate pricing
    const subscriptionGrossPriceTotal =
      subscriptionGrossPricePerMonth * durationInMonths;
    const earlyBirdDiscountPrice =
      (subscriptionGrossPriceTotal * earlyBirdDiscountPercentage) / 100;
    const subscriptionFinalPrice =
      subscriptionGrossPriceTotal - earlyBirdDiscountPrice;

    const plan = new Plans({
      name,
      planFor,
      subscriptionGrossPricePerMonth,
      durationInMonths,
      subscriptionGrossPriceTotal,
      earlyBirdDiscountPercentage,
      earlyBirdDiscountPrice,
      subscriptionFinalPrice,
      features: features || [
        "Early Bird Discount Applied",
        "Full Platform Access",
        "Priority Support",
      ],
      maxVehicles: maxVehicles || 0,
      planType: "SUBSCRIPTION",
    });

    await plan.save();

    return res.status(201).json({
      status: true,
      message: "Subscription plan created successfully",
      data: plan,
    });
  } catch (error) {
    console.error("Error creating subscription plan:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

export async function getSubscriptionPlans(req, res) {
  try {
    const { planFor, durationInMonths } = req.query;

    let query = { planType: "SUBSCRIPTION" };
    if (planFor) query.planFor = planFor;
    if (durationInMonths) query.durationInMonths = parseInt(durationInMonths);

    const plans = await Plans.find(query).sort({
      planFor: 1,
      durationInMonths: 1,
    });

    return res.json({
      status: true,
      message: "Subscription plans retrieved successfully",
      data: plans,
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

export async function updateSubscriptionPlan(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      planFor,
      subscriptionGrossPricePerMonth,
      durationInMonths,
      earlyBirdDiscountPercentage,
      features,
      maxVehicles,
      isActive,
    } = req.body;

    // Find the plan
    const existingPlan = await Plans.findById(id);
    if (!existingPlan) {
      return res.status(404).json({
        status: false,
        message: "Subscription plan not found",
      });
    }

    // Check if it's actually a subscription plan
    if (existingPlan.planType !== "SUBSCRIPTION") {
      return res.status(400).json({
        status: false,
        message: "This is not a subscription plan",
      });
    }

    // Prepare update object with existing values as defaults
    const updateData = {
      name: name || existingPlan.name,
      planFor: planFor || existingPlan.planFor,
      subscriptionGrossPricePerMonth:
        subscriptionGrossPricePerMonth ||
        existingPlan.subscriptionGrossPricePerMonth,
      durationInMonths: durationInMonths || existingPlan.durationInMonths,
      earlyBirdDiscountPercentage:
        earlyBirdDiscountPercentage !== undefined
          ? earlyBirdDiscountPercentage
          : existingPlan.earlyBirdDiscountPercentage,
      features: features || existingPlan.features,
      maxVehicles:
        maxVehicles !== undefined ? maxVehicles : existingPlan.maxVehicles,
      isActive: isActive !== undefined ? isActive : existingPlan.isActive,
    };

    // Recalculate pricing if relevant fields changed
    if (
      subscriptionGrossPricePerMonth ||
      durationInMonths ||
      earlyBirdDiscountPercentage !== undefined
    ) {
      const subscriptionGrossPriceTotal =
        updateData.subscriptionGrossPricePerMonth * updateData.durationInMonths;
      const earlyBirdDiscountPrice =
        (subscriptionGrossPriceTotal * updateData.earlyBirdDiscountPercentage) /
        100;
      const subscriptionFinalPrice =
        subscriptionGrossPriceTotal - earlyBirdDiscountPrice;

      updateData.subscriptionGrossPriceTotal = subscriptionGrossPriceTotal;
      updateData.earlyBirdDiscountPrice = earlyBirdDiscountPrice;
      updateData.subscriptionFinalPrice = subscriptionFinalPrice;

      // Update legacy fields for compatibility
      updateData.mrp = subscriptionGrossPriceTotal;
      updateData.price = subscriptionFinalPrice;
      updateData.validity = updateData.durationInMonths;
      updateData.featureTitle = updateData.name;
    }

    // Update the plan
    const updatedPlan = await Plans.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.json({
      status: true,
      message: "Subscription plan updated successfully",
      data: updatedPlan,
    });
  } catch (error) {
    console.error("Error updating subscription plan:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

export async function deleteSubscriptionPlan(req, res) {
  try {
    const { id } = req.params;

    // Find the plan
    const plan = await Plans.findById(id);
    if (!plan) {
      return res.status(404).json({
        status: false,
        message: "Subscription plan not found",
      });
    }

    // Check if it's actually a subscription plan
    if (plan.planType !== "SUBSCRIPTION") {
      return res.status(400).json({
        status: false,
        message: "This is not a subscription plan",
      });
    }

    // Check if there are active subscriptions using this plan
    const activeSubscriptions = await SubscriptionsModel.countDocuments({
      planId: id,
      status: "active",
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        status: false,
        message: `Cannot delete plan. ${activeSubscriptions} active subscriptions are using this plan`,
      });
    }

    // Soft delete - mark as deleted instead of hard delete
    const deletedPlan = await Plans.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
      { new: true }
    );

    return res.json({
      status: true,
      message: "Subscription plan deleted successfully",
      data: {
        id: deletedPlan._id,
        name: deletedPlan.name,
        deletedAt: deletedPlan.deletedAt,
      },
    });
  } catch (error) {
    console.error("Error deleting subscription plan:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

// Bulk creation function for initial setup based on Excel data
export async function createInitialPlansAndFees(req, res) {
  try {
    // Create registration fees for all categories
    const registrationFees = [
      { category: "DRIVER", grossPrice: 1000, earlyBirdDiscountPercentage: 90 },
      {
        category: "E_RICKSHAW",
        grossPrice: 1000,
        earlyBirdDiscountPercentage: 90,
      },
      {
        category: "RICKSHAW",
        grossPrice: 1000,
        earlyBirdDiscountPercentage: 90,
      },
      {
        category: "TRANSPORTER",
        grossPrice: 1000,
        earlyBirdDiscountPercentage: 90,
      },
    ];

    for (const feeData of registrationFees) {
      const existingFee = await RegistrationFeeModel.findOne({
        category: feeData.category,
      });
      if (!existingFee) {
        const earlyBirdDiscountPrice =
          (feeData.grossPrice * feeData.earlyBirdDiscountPercentage) / 100;
        const finalPrice = feeData.grossPrice - earlyBirdDiscountPrice;

        await RegistrationFeeModel.create({
          ...feeData,
          earlyBirdDiscountPrice,
          finalPrice,
        });
      }
    }

    // Create subscription plans for all categories and durations
    const planCategories = [
      { category: "DRIVER", monthlyPrice: 400 },
      { category: "E_RICKSHAW", monthlyPrice: 400 },
      { category: "RICKSHAW", monthlyPrice: 400 },
      { category: "TRANSPORTER", monthlyPrice: 900 },
    ];

    const durations = [
      { months: 1, discountPercent: 75 },
      { months: 3, discountPercent: 80 },
      { months: 6, discountPercent: 85 },
      { months: 12, discountPercent: 90 },
    ];

    for (const categoryData of planCategories) {
      for (const duration of durations) {
        const planName = `${categoryData.category} - ${duration.months} Month${duration.months > 1 ? "s" : ""} Subscription Package with Early Bird`;

        const existingPlan = await Plans.findOne({
          name: planName,
          planFor: categoryData.category,
          durationInMonths: duration.months,
        });

        if (!existingPlan) {
          const subscriptionGrossPriceTotal =
            categoryData.monthlyPrice * duration.months;
          const earlyBirdDiscountPrice =
            (subscriptionGrossPriceTotal * duration.discountPercent) / 100;
          const subscriptionFinalPrice =
            subscriptionGrossPriceTotal - earlyBirdDiscountPrice;

          await Plans.create({
            name: planName,
            planFor: categoryData.category,
            subscriptionGrossPricePerMonth: categoryData.monthlyPrice,
            durationInMonths: duration.months,
            subscriptionGrossPriceTotal,
            earlyBirdDiscountPercentage: duration.discountPercent,
            earlyBirdDiscountPrice,
            subscriptionFinalPrice,
            planType: "SUBSCRIPTION",
          });
        }
      }
    }

    return res.json({
      status: true,
      message: "Initial plans and registration fees created successfully",
    });
  } catch (error) {
    console.error("Error creating initial plans and fees:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
