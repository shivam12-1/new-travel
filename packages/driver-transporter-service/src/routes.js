import express from "express";
import { DriverTransporterService } from "./handler.js";
import { asyncWrapper } from "../utils/index.js";
import {
  completeValidation,
  updatedDriverRegistrationValidation,
  transporterRegistrationValidation,
  autoRickshawRegistrationValidation,
  eRickshawRegistrationValidation,
  independentCarOwnerValidation,
} from "./utils/validator.js";

const driverTransporterRoute = express.Router();

// Updated registration routes with new validations
driverTransporterRoute.post(
  "/become-driver",
  updatedDriverRegistrationValidation,
  asyncWrapper(DriverTransporterService.becomeDriver)
);
driverTransporterRoute.post(
  "/become-transporter",
  transporterRegistrationValidation,
  asyncWrapper(DriverTransporterService.becomeTransporter)
);
driverTransporterRoute.post(
  "/become-transporter-rickshaw",
  autoRickshawRegistrationValidation,
  asyncWrapper(DriverTransporterService.becomeTransporterRiksha)
);
driverTransporterRoute.post(
  "/become-transporter-e-rickshaw",
  eRickshawRegistrationValidation,
  asyncWrapper(DriverTransporterService.becomeTransporterERiksha)
);
driverTransporterRoute.post(
  "/become-independent-car-owner",
  independentCarOwnerValidation,
  asyncWrapper(DriverTransporterService.becomeIndependentCarOwner)
);
driverTransporterRoute.get(
  "/home-",
  asyncWrapper(DriverTransporterService.dashboard)
);

driverTransporterRoute.get(
  "/profile",
  asyncWrapper(DriverTransporterService.getProfile)
);
driverTransporterRoute.put(
  "/profile",
  asyncWrapper(DriverTransporterService.updateProfile)
);

driverTransporterRoute.get(
  "/subscriptions",
  asyncWrapper(DriverTransporterService.subscriptions)
);
driverTransporterRoute.post(
  "/verify",
  completeValidation,
  asyncWrapper(DriverTransporterService.verifyEndPoint)
);

// Registration fee and plans endpoints
driverTransporterRoute.get(
  "/registration-plans/:category",
  asyncWrapper(DriverTransporterService.getRegistrationAndPlans)
);
driverTransporterRoute.get(
  "/registration-status/:category",
  asyncWrapper(DriverTransporterService.checkRegistrationStatus)
);

export default driverTransporterRoute;
