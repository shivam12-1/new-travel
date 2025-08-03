import express from "express";
import { VehicleListingService } from "./handler.js";
import { asyncWrapper } from "../utils/index.js";
import { vehicleListingValidation } from "./utils/validator.js";

const vehicleRoutes = express.Router();

vehicleRoutes.get(
  "/vehicle",
  asyncWrapper(VehicleListingService.getAllVehicle)
);
vehicleRoutes.post(
  "/add-vehicle",
  vehicleListingValidation,
  asyncWrapper(VehicleListingService.registerVehicle)
);
vehicleRoutes.put(
  "/edit-vehicle/:id",
  vehicleListingValidation,
  asyncWrapper(VehicleListingService.editVehicle)
);
vehicleRoutes.delete(
  "/delete-vehicle/:id",
  asyncWrapper(VehicleListingService.deleteVehicle)
);

export default vehicleRoutes;
