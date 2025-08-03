import UserModel from "../models/UserModel.js";
import {
  AuthServiceError,
  genereate4DigitOTP,
  sendTransOtp,
} from "./utils/myutils.js";
import AdminModel from "../models/AdminModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import LegalModel from "../models/LegalModel.js";
import SupportModel from "../models/SupportModel.js";

export class AuthService {
  static async sendOtp(req, res, next) {
    const { number, language } = req.body;

    if (!number) {
      throw new AuthServiceError("Phone number is required", 400);
    }

    let user = await UserModel.findOne({ mobileNumber: number }, {}, {}).exec();
    const otp = genereate4DigitOTP();
    await sendTransOtp(number, otp);

    if (!user) {
      user = new UserModel({
        mobileNumber: number,
        otp,
        language: language || "", // Save language if provided
      });
    } else {
      user.otp = otp;
      if (language) {
        user.language = language; // Update language if provided
      }
    }
    await user.save();

    return res.json({
      status: true,
      message: "OTP Sent",
      data: "OTP Sent Successfully",
    });
  }

  static async verifyOtp(req, res, next) {
    const { number, otp } = req.body;

    if (!number || !otp) {
      throw new AuthServiceError("Invalid credentials", 400);
    }

    const user = await UserModel.findOne({ mobileNumber: number }).exec();

    if (!user) {
      throw new AuthServiceError("User not found", 404);
    }

    if (user.otp !== otp) {
      throw new AuthServiceError("Invalid OTP", 400);
    }

    user.otp = null;
    const uuid = await generateUniqueId();
    if (!user?.firstName?.trim()) {
      user.uuid = await generateUniqueId();
    }
    await user.save();

    const token = jwt.sign({ id: user._id, uuid }, process.env.JWT_SECRET);

    return res.status(200).json({
      status: true,
      message: "OTP Verified Successfully",
      data: {
        name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
        isFirstTimeUser: !user?.firstName?.trim(),
        isRegisteredAsDriver: user?.isRegisteredAsDriver ?? false,
        isRegisteredAsTransporter: user?.isRegisteredAsTransporter ?? false,
        isAllowed: !user.isBlockedByAdmin ?? true,
        message: user.message ?? "",
        token: token ?? "",
        language: user.language ?? null,
        fcm: user.fcm ?? "",
      },
    });
  }

  static async adminLogin(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ status: false, message: "Email and password are required" });
      }

      const admin = await AdminModel.findOne({ email }).exec();

      if (!admin) {
        return res
          .status(404)
          .json({ status: false, message: "No account found with this email" });
      }

      const isMatch = await bcrypt.compare(password, admin.password);

      if (!isMatch) {
        return res
          .status(401)
          .json({ status: false, message: "Incorrect password" });
      }

      const token = jwt.sign(
        {
          permissions: admin.permissions,
          role: admin.role,
          name: admin.name,
          email: admin.email,
          id: admin._id,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
      );

      return res.status(200).json({
        status: true,
        message: "Login successful",
        data: { token },
      });
    } catch (e) {
      console.error("Login Error:", e);
      return res.status(500).json({
        status: false,
        message: "An unexpected error occurred. Please try again later.",
        data: e.message,
      });
    }
  }

  static async getLegalDocs(req, res, next) {
    const { TYPE, LANG } = req.query;

    const legal = await LegalModel.findOne({ name: TYPE }).exec();
    const data = legal.versions.find((e) => e.language.toString() === LANG);
    let obj = {};
    if (TYPE === "FAQ") {
      obj = {
        title: data.title,
        content: data.faqItems,
      };
    } else {
      obj = {
        title: data.title,
        content: data.content,
      };
    }

    return res.json({
      status: true,
      message: TYPE,
      data: obj,
    });
  }

  static async getSupport(req, res, next) {
    const support = await SupportModel.find({}, { _id: 0 }).exec();
    return res.json({
      status: true,
      message: "Support",
      data: support[0],
    });
  }
}

async function generateUniqueId(length = 6) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  function generateId(length) {
    let id = "";
    for (let i = 0; i < length; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  let uniqueId;
  let exists = true;

  while (exists) {
    uniqueId = generateId(length);
    exists = await isUserIdAlreadyExists(uniqueId);
  }

  return uniqueId;
}

async function isUserIdAlreadyExists(id) {
  const data = await UserModel.exists({ uuid: id }).exec();
  return data !== null;
}
