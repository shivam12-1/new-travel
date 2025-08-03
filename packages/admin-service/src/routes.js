import express from 'express';
import {
    createPlan,
    createRole,
    deletePlan,
    deleteRole, downloadUsers, editContent,
    editLegalDocs,
    editPlan, editRegistrationFee,
    editRole,
    editUsers,
    getAllDrivers,
    getAllIndependentCarOwners,
    getAllNotifications, getAllRickshawE,
    getAllTransporters, getAllTransportersPendingVehicle,
    getAllUsers, getContent,
    getLast500Transactions, getLegalDocs,
    getPlanById,
    getPlans,
    getRoles, getSingleDashboard, getSupport,
    home, searchUsers,
    sendNotification, toggleEntity, toggleUserStatus, toggleVehicle, updateSupport,
    getHaversineSettings, getHaversineCategories, updateHaversineSettings, deleteHaversineSettings,
    createRegistrationFee, getRegistrationFees, updateRegistrationFee, deleteRegistrationFee,
    createSubscriptionPlan, getSubscriptionPlans, updateSubscriptionPlan, deleteSubscriptionPlan, createInitialPlansAndFees
} from "./handler.js";
const adminRouter = express.Router();



adminRouter.get('/',home);

adminRouter.get('/users',getAllUsers);
adminRouter.get('/users/download',downloadUsers);
adminRouter.patch('/users/:id/block-toggle',editUsers);
adminRouter.get('/drivers',getAllDrivers);
adminRouter.get('/independent-car-owners',getAllIndependentCarOwners);
adminRouter.get('/transporters',getAllTransporters);
adminRouter.get('/transporters_verification',getAllTransportersPendingVehicle);
adminRouter.get('/rickshaw_e_rickshaw',getAllRickshawE);


adminRouter.get('/dashboard/:type/:id',getSingleDashboard);
adminRouter.put('/toggle_entity',toggleEntity);
adminRouter.put('/toggle_vehicle',toggleVehicle);



adminRouter.post('/roles', createRole);
adminRouter.get('/roles', getRoles);
adminRouter.put('/roles/:id', editRole);
adminRouter.delete('/roles/:id', deleteRole);
adminRouter.put('/roles/:id/toggle-status/:status', toggleUserStatus);


// Plans CRUD routes
adminRouter.post('/plans', createPlan);
adminRouter.get('/plans', getPlans);
adminRouter.get('/plans/:id', getPlanById);
adminRouter.put('/plans/:id', editPlan);
adminRouter.delete('/plans/:id', deletePlan);
adminRouter.get('/transactions/last500', getLast500Transactions);
adminRouter.put('/registration_fee', editRegistrationFee);

adminRouter.get('/notifications',getAllNotifications);
adminRouter.post('/notification',sendNotification);
adminRouter.get('/search-users', searchUsers);



adminRouter.get('/support',getSupport);
adminRouter.put('/support',updateSupport);


adminRouter.get('/legal',getLegalDocs);
adminRouter.put('/legal/:id/version',editLegalDocs);


adminRouter.get('/content',getContent);
adminRouter.put('/content',editContent);

// Haversine distance management routes
adminRouter.get('/haversine',getHaversineSettings);
adminRouter.get('/haversine/categories',getHaversineCategories);
adminRouter.put('/haversine',updateHaversineSettings);
adminRouter.delete('/haversine/:category',deleteHaversineSettings);

// Registration Fee management routes
adminRouter.post('/registration-fees', createRegistrationFee);
adminRouter.get('/registration-fees', getRegistrationFees);
adminRouter.put('/registration-fees/:id', updateRegistrationFee);
adminRouter.delete('/registration-fees/:id', deleteRegistrationFee);

// Enhanced subscription plan routes
adminRouter.post('/subscription-plans', createSubscriptionPlan);
adminRouter.get('/subscription-plans', getSubscriptionPlans);
adminRouter.put('/subscription-plans/:id', updateSubscriptionPlan);
adminRouter.delete('/subscription-plans/:id', deleteSubscriptionPlan);

// Bulk initialization route
adminRouter.post('/initialize-plans-and-fees', createInitialPlansAndFees);

export default adminRouter;