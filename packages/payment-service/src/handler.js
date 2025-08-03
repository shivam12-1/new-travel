import SubscriptionsModel from "../models/SubscriptionsModel.js";
import RegistrationFeeModel from "../models/RegistrationFeeModel.js";
import crypto from "crypto";
import Razorpay from "razorpay";
import { PaymentServiceError } from "./utils/myutils.js";
import DriversModel from "../models/DriversModel.js";
import TransporterModel from "../models/TransporterModel.js";
import VehicleModel from "../models/VehiclesModel.js";
import IndependentCarOwnerModel from "../models/IndependentCarOwnerModel.js";

export class PaymentService {
  static async getPlans(req, res, next) {
    const { type } = req.query;
    const userId = req.headers["x-user-id"];
    const planType = type.toString().toUpperCase();
    const latestPlan = await SubscriptionsModel.findOne({
      userId: userId,
      status: "active",
      "plan.planFor": planType,
    }).exec();
    const plans = await Plans.find(
      { isDeleted: false, planFor: planType },
      {
        name: 1,
        features: 1,
        featureTitle: 1,
        mrp: 1,
        price: 1,
        id: "$_id",
        _id: 0,
      }
    ).exec();

    return res.json({
      status: true,
      message: "plans",
      data: {
        plans,
        isPaymentDone: !!latestPlan,
        isRegistrationDone: false,
      },
    });
  }

  static async createOrder(req, res, next) {
    try {
      const { planId } = req.body;
      const userId = req.headers["x-user-id"];

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const plan = await Plans.findById(planId);
      if (!plan) {
        throw new PaymentServiceError("Plan not found", 404);
      }

      // Check if user has already paid registration fee for this category
      const existingRegistration = await SubscriptionsModel.findOne({
        userId,
        category: plan.planFor,
        registrationFeePaid: true,
      });

      // Use subscription final price (not including registration fee)
      const amount = (plan.subscriptionFinalPrice || plan.price) * 100;

      let order;
      if (process.env.PAYMENT_TEST_MODE === "true") {
        // In test mode, create a mock order
        order = {
          id: `test_order_${Date.now()}`,
          amount,
          currency: "INR",
        };
      } else {
        order = await razorpay.orders.create({
          amount,
          currency: "INR",
          receipt: `sub_renewal_${Date.now()}`,
          payment_capture: 1,
        });
      }

      const subscription = await SubscriptionsModel.create({
        userId,
        planId,
        plan,
        category: plan.planFor,
        subscriptionType: "SUBSCRIPTION_ONLY", // This is subscription renewal, not registration
        orderId: order.id,
        subscriptionAmount: plan.subscriptionFinalPrice || plan.price,
        registrationAmount: 0, // No registration fee for renewals
        totalAmount: plan.subscriptionFinalPrice || plan.price,
        amount,
        currency: "INR",
        status: "created",
        hasRegistrationFee: !!existingRegistration, // True if they already paid registration
        registrationFeePaid: !!existingRegistration, // True if they already paid registration
        description: `Subscription renewal: ${plan.name}`,
      });

      res.status(200).json({
        success: true,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount,
        currency: "INR",
        subscriptionId: subscription._id,
        isRenewal: !!existingRegistration,
        breakdown: {
          registrationFee: 0,
          subscriptionFee: plan.subscriptionFinalPrice || plan.price,
          totalAmount: plan.subscriptionFinalPrice || plan.price,
          note: existingRegistration
            ? "Registration fee already paid - renewal only"
            : "New subscription",
        },
      });
    } catch (e) {
      console.log(e);
      throw new PaymentServiceError("Something went wrong", 400);
    }
  }

  static async saveOrder(req, res, next) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const userId = req.headers["x-user-id"];

    // Skip signature verification in test mode
    if (process.env.PAYMENT_TEST_MODE !== "true") {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        throw new PaymentServiceError("Invalid signature", 400);
      }
    }

    const subscription = await SubscriptionsModel.findOne({
      orderId: razorpay_order_id,
      userId,
    });

    if (!subscription) {
      throw new PaymentServiceError("Subscription not found", 404);
    }

    const validityInDays =
      subscription.plan?.durationInMonths * 30 ||
      subscription.plan?.validity ||
      30;
    const planType = subscription.plan?.planFor;

    // Check if user has existing active subscription to extend from
    const now = new Date();
    const existingActiveSubscription = await SubscriptionsModel.findOne({
      userId,
      category: planType,
      status: "active",
      endDate: { $gte: now },
    }).sort({ endDate: -1 });

    // If there's an active subscription, extend from its end date, otherwise from now
    const startFrom = existingActiveSubscription
      ? existingActiveSubscription.endDate
      : now;
    const endDate = new Date(
      startFrom.getTime() + validityInDays * 24 * 60 * 60 * 1000
    );

    // Update subscription
    subscription.paymentId = razorpay_payment_id;
    subscription.paymentSignature = razorpay_signature;
    subscription.status = "active";
    subscription.startDate = new Date();
    subscription.endDate = endDate;
    subscription.paymentStoreTimestamp = new Date();

    await subscription.save();

    if (planType === "DRIVER") {
      await DriversModel.updateOne(
        { userId },
        { $set: { planExpiredDate: endDate } }
      );
    } else if (planType === "TRANSPORTER") {
      await TransporterModel.updateOne(
        { userId },
        { $set: { planExpiredDate: endDate } }
      );
    } else if (planType === "INDEPENDENT_CAR_OWNER") {
      await IndependentCarOwnerModel.updateOne(
        { userId },
        { $set: { planExpiredDate: endDate } }
      );
    } else if (planType === "E_RICKSHAW" || planType === "RICKSHAW") {
      await VehicleModel.updateOne(
        { userId },
        { $set: { "details.planExpiredDate": endDate } }
      );
    }

    res.status(200).json({
      status: true,
      message: "Payment Saved Successfully",
      success: true,
    });
  }

  // Create order for registration fee + optional subscription
  static async createRegistrationOrder(req, res, next) {
    try {
      const { category, planId, subscriptionType } = req.body;
      const userId = req.headers["x-user-id"];

      if (!category || !subscriptionType) {
        throw new PaymentServiceError(
          "Category and subscriptionType are required",
          400
        );
      }

      if (
        !["REGISTRATION_ONLY", "REGISTRATION_WITH_SUBSCRIPTION"].includes(
          subscriptionType
        )
      ) {
        throw new PaymentServiceError("Invalid subscription type", 400);
      }

      // Get registration fee
      const registrationFee = await RegistrationFeeModel.findOne({
        category: category.toUpperCase(),
        isActive: true,
      });

      if (!registrationFee) {
        throw new PaymentServiceError(
          `No registration fee found for ${category}`,
          404
        );
      }

      let totalAmount = registrationFee.finalPrice;
      let plan = null;
      let subscriptionAmount = 0;

      // If including subscription, get plan details
      if (subscriptionType === "REGISTRATION_WITH_SUBSCRIPTION") {
        if (!planId) {
          throw new PaymentServiceError(
            "Plan ID is required for registration with subscription",
            400
          );
        }

        plan = await Plans.findById(planId);
        if (!plan) {
          throw new PaymentServiceError("Plan not found", 404);
        }

        if (plan.planFor !== category.toUpperCase()) {
          throw new PaymentServiceError(
            "Plan category does not match registration category",
            400
          );
        }

        subscriptionAmount = plan.subscriptionFinalPrice || plan.price;
        totalAmount += subscriptionAmount;
      }

      const amount = totalAmount * 100; // Convert to paise because of razor pay

      let order;
      // Check if in test mode
      if (process.env.PAYMENT_TEST_MODE === "true") {
        // Mock order for testing
        order = {
          id: `test_order_${Date.now()}`,
          amount,
          currency: "INR",
          receipt: `reg_${category.toLowerCase()}_${Date.now()}`,
        };
      } else {
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        order = await razorpay.orders.create({
          amount,
          currency: "INR",
          receipt: `reg_${category.toLowerCase()}_${Date.now()}`,
          payment_capture: 1,
        });
      }

      // Create subscription record
      const subscription = await SubscriptionsModel.create({
        userId,
        planId: plan?._id,
        plan: plan || null,
        registrationFeeId: registrationFee._id,
        registrationFee: registrationFee,
        subscriptionType,
        category: category.toUpperCase(),
        orderId: order.id,
        registrationAmount: registrationFee.finalPrice,
        subscriptionAmount,
        totalAmount,
        amount,
        currency: "INR",
        status: "created",
        hasRegistrationFee: true,
        registrationFeePaid: false,
        earlyBirdDiscountApplied: true,
        subscriptionDiscountAmount: plan?.earlyBirdDiscountPrice || 0,
        registrationDiscountAmount: registrationFee.earlyBirdDiscountPrice,
        description:
          subscriptionType === "REGISTRATION_ONLY"
            ? `Registration fee for ${category}`
            : `Registration fee + ${plan.name}`,
      });

      res.status(200).json({
        success: true,
        status: true,
        message: "Payment order created successfully",
        data: {
          razorpayKey: process.env.RAZORPAY_KEY_ID,
          orderId: order.id,
          amount,
          currency: "INR",
          subscriptionId: subscription._id,
          breakdown: {
            registrationFee: registrationFee.finalPrice,
            subscriptionFee: subscriptionAmount,
            totalAmount: totalAmount,
            discountApplied:
              registrationFee.earlyBirdDiscountPrice +
              (plan?.earlyBirdDiscountPrice || 0),
          },
        },
      });
    } catch (e) {
      console.log(e);
      if (e instanceof PaymentServiceError) {
        return res.status(e.statusCode || 500).json({
          status: false,
          message: e.message,
        });
      }
      throw new PaymentServiceError("Something went wrong", 400);
    }
  }

  // Save registration payment
  static async saveRegistrationOrder(req, res, next) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      const userId = req.headers["x-user-id"];

      // Skip signature verification in test mode
      if (process.env.PAYMENT_TEST_MODE !== "true") {
        const expectedSignature = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest("hex");

        if (expectedSignature !== razorpay_signature) {
          throw new PaymentServiceError("Invalid signature", 400);
        }
      }

      const subscription = await SubscriptionsModel.findOne({
        orderId: razorpay_order_id,
        userId,
      });

      if (!subscription) {
        throw new PaymentServiceError("Subscription not found", 404);
      }

      const currentDate = new Date();

      // Update subscription with payment details
      subscription.paymentId = razorpay_payment_id;
      subscription.paymentSignature = razorpay_signature;
      subscription.status = "active";
      subscription.startDate = currentDate;
      subscription.registrationFeePaid = true;
      subscription.registrationFeePaidAt = currentDate;
      subscription.paymentStoreTimestamp = currentDate;

      // Calculate end date based on subscription type
      let totalMonths = 1; // 1 month free for registration fee

      if (
        subscription.subscriptionType === "REGISTRATION_WITH_SUBSCRIPTION" &&
        subscription.plan
      ) {
        // Add subscription months to the free month
        totalMonths += subscription.plan.durationInMonths;
      }

      // Set end date for both registration-only and registration+subscription
      const validityInDays = totalMonths * 30; // Convert months to days
      subscription.endDate = new Date(
        currentDate.getTime() + validityInDays * 24 * 60 * 60 * 1000
      );

      await subscription.save();

      // Update planExpiredDate in respective models
      const endDate = subscription.endDate;
      const planType = subscription.category;

      if (planType === "DRIVER") {
        await DriversModel.updateOne(
          { userId },
          { $set: { planExpiredDate: endDate } }
        );
      } else if (planType === "TRANSPORTER") {
        await TransporterModel.updateOne(
          { userId },
          { $set: { planExpiredDate: endDate } }
        );
      } else if (planType === "INDEPENDENT_CAR_OWNER") {
        await IndependentCarOwnerModel.updateOne(
          { userId },
          { $set: { planExpiredDate: endDate } }
        );
      } else if (planType === "E_RICKSHAW" || planType === "RICKSHAW") {
        await VehicleModel.updateOne(
          { userId },
          { $set: { "details.planExpiredDate": endDate } }
        );
      }

      res.status(200).json({
        status: true,
        message: "Registration payment saved successfully",
        success: true,
        data: {
          subscriptionType: subscription.subscriptionType,
          category: subscription.category,
          registrationFeePaid: true,
          registrationPaidAt: subscription.registrationFeePaidAt,
          hasSubscription:
            subscription.subscriptionType === "REGISTRATION_WITH_SUBSCRIPTION",
          subscriptionEndDate: subscription.endDate,
        },
      });
    } catch (e) {
      console.log(e);
      if (e instanceof PaymentServiceError) {
        return res.status(e.statusCode || 500).json({
          status: false,
          message: e.message,
        });
      }
      throw new PaymentServiceError("Something went wrong", 400);
    }
  }

  // Check payment status for a category
  static async getPaymentStatus(req, res, next) {
    try {
      const { category } = req.params;
      const userId = req.headers["x-user-id"];

      if (!category) {
        throw new PaymentServiceError("Category is required", 400);
      }

      // Check if user has ever paid registration fee for this category
      const registrationPayment = await SubscriptionsModel.findOne({
        userId,
        category: category.toUpperCase(),
        registrationFeePaid: true,
      });

      // Check if user has active subscription
      const now = new Date();
      const activeSubscription = await SubscriptionsModel.findOne({
        userId,
        category: category.toUpperCase(),
        status: "active",
        endDate: { $gte: now }, // Has valid end date
      }).sort({ endDate: -1 });

      const hasRegistrationFee = !!registrationPayment;
      const hasActiveSubscription = !!activeSubscription;

      let paymentRequired = "none";
      let nextAction = "can_register";

      if (!hasRegistrationFee) {
        // Never paid registration fee
        paymentRequired = "registration_required";
        nextAction = "must_pay_registration";
      } else if (!hasActiveSubscription) {
        // Has registration fee but no active subscription
        paymentRequired = "subscription_renewal";
        nextAction = "can_renew_subscription";
      } else {
        // Has both registration and active subscription
        paymentRequired = "none";
        nextAction = "fully_active";
      }

      return res.json({
        status: true,
        message: "Payment status retrieved",
        data: {
          category: category.toUpperCase(),
          hasRegistrationFee,
          registrationPaidAt:
            registrationPayment?.registrationFeePaidAt || null,
          hasActiveSubscription,
          subscriptionEndDate: activeSubscription?.endDate || null,
          subscriptionType: activeSubscription?.subscriptionType || null,
          paymentRequired,
          nextAction,

          needsRenewal: hasRegistrationFee && !hasActiveSubscription,
        },
      });
    } catch (e) {
      console.log(e);
      if (e instanceof PaymentServiceError) {
        return res.status(e.statusCode || 500).json({
          status: false,
          message: e.message,
        });
      }
      throw new PaymentServiceError("Something went wrong", 400);
    }
  }
}
