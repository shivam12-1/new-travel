import UserModel from "../models/UserModel.js";
import { v4 as uuidv4 } from 'uuid';
import DriversModel from "../models/DriversModel.js";
import VehicleModel from "../models/VehiclesModel.js";
import NotificationsModel from "../models/NotificationsModel.js";
import ActivityModel from "../models/ActivityModel.js";
import {ActivityTypes} from "../utils/index.js";
import TransporterModel from "../models/TransporterModel.js";
import IndependentCarOwnerModel from "../models/IndependentCarOwnerModel.js";
import {UserServiceError} from "./utils/myutils.js";
import {deleteFromS3, moderateImage, processImageBuffer, uploadToS3, validateProfilePhoto} from "./utils/cloud_handler.js";
import ContainerModel from "../models/ContainerModel.js";
import HaversineModel from "../models/HarversineModel.js";
import {calculateDistance, filterByDistance, approximateDistanceBetweenCities, isWithinServiceArea} from "./utils/haversine.js";



export class UserService{

    static async home(req,res){
        const {fcmToken:token}=req.body;
        const id=req.headers['x-user-id'];

        if(token){
            await UserModel.findByIdAndUpdate(id, { fcmToken:token });
        }
        const data=await ContainerModel.find({}).exec();
        const ads = data.filter(item => item.containerFor === "Advertisement");
        const banners = data.filter(item => item.containerFor === "Banner");
        const output = [
            banners[0]?.image || "",
            ...ads.map(item => item.image),
        ];
        const user=await UserModel.findById(id,{},{}).exec();
        console.log(`CALLED ${(user?.isRegisteredAsDriver || user?.isRegisteredAsTransporter)}`);
        return res.json({status:true,message:'Home',data:{
                banners:output,
                showDashboard:(user?.isRegisteredAsDriver || user?.isRegisteredAsTransporter || user?.isRegisteredAsIndependentCarOwner || user?.isRegisterAsERickshaw || user?.isRegisterAsRickshaw) ??false,
            }});
    };
    static async search(req, res) {
        const { 
            pincode, 
            lat, 
            lng, 
            searchType, 
            page = 1, 
            limit = 10, 
            filters
        } = req.body;
        const userId = req.headers['x-user-id'] || null;
        const skip = (page - 1) * limit;

        // Get admin-configured distance for the search type
        let maxDistance = 50; // Default fallback
        try {
            const haversineConfig = await HaversineModel.findOne({ category: searchType }).exec();
            if (haversineConfig) {
                maxDistance = haversineConfig.distance;
            }
        } catch (error) {
            console.log('Error fetching Haversine config, using default distance:', error);
        }

        // If no lat/lng provided and user is authenticated, try to use stored location
        let searchLat = lat;
        let searchLng = lng;
        
        if (!lat && !lng && userId && userId !== 'INTER_SERVICE_COMMUNICATION') {
            try {
                const user = await UserModel.findById(userId, 'lat lng').exec();
                if (user && user.lat && user.lng) {
                    searchLat = user.lat;
                    searchLng = user.lng;
                }
            } catch (error) {
                console.log('Error fetching user location:', error);
                // Continue without location - won't affect search functionality
            }
        }

        let data = [];
        let total = 0;

        // Helper function to add distance information to results (DEPRECATED)
        // This function is no longer used as we calculate distances using actual coordinates
        const addDistanceInfo = (items, userLat, userLng) => {
            // This function is kept for backward compatibility but should not be used
            // Distance calculation is now handled directly in the main search logic
            return items;
        };

        // Helper function to filter and sort vehicle-based results by distance
        const filterVehiclesByDistance = async (vehicleData, userLat, userLng, maxDist) => {
            if (!userLat || !userLng) return vehicleData;
            
            // Get user coordinates for each vehicle owner
            const userIds = vehicleData.map(item => item.userId);
            const usersWithCoords = await UserModel.find({
                _id: { $in: userIds }
            }, '_id lat lng').exec();
            
            const userCoordsMap = {};
            usersWithCoords.forEach(user => {
                userCoordsMap[user._id.toString()] = {
                    lat: user.lat,
                    lng: user.lng
                };
            });
            
            return vehicleData.map(item => {
                // Calculate distance using ONLY actual user coordinates
                let distance = null;
                const ownerCoords = userCoordsMap[item.userId];
                
                if (ownerCoords && ownerCoords.lat && ownerCoords.lng) {
                    distance = calculateDistance(userLat, userLng, ownerCoords.lat, ownerCoords.lng);
                }
                // No fallback to city coordinates - if no user coordinates, no distance
                
                return {
                    ...item,
                    distance: distance,
                    distanceText: distance ? `${distance.toFixed(1)} km` : 'Distance not available'
                };
            }).filter(item => {
                // Only include items with valid coordinates within distance OR items without coordinates
                return item.distance === null || item.distance <= maxDist;
            }).sort((a, b) => {
                // Sort by distance - items with coordinates come first, sorted by distance
                if (a.distance === null && b.distance === null) return 0;
                if (a.distance === null) return 1;
                if (b.distance === null) return -1;
                return a.distance - b.distance;
            });
        };

        try {
            if (searchType === 'DRIVER') {
                // Fetch all drivers first (without pagination for distance filtering)
                const allDrivers = await DriversModel.find({
                    userId: { $ne: userId },
                    isBlockedByAdmin: false
                }).exec();

                // Transform driver data
                let driverData = allDrivers.map(driver => ({
                    id: driver._id,
                    userId: driver.userId,
                    bio: driver.bio,
                    minimumCharges: driver.minimumCharges,
                    userType:"DRIVER",
                    servicesLocations: driver.servicesCities,
                    languageSpoken: driver.languageSpoken,
                    address: driver.address,
                    name: driver.fullName,
                    image: driver.profilePhoto,
                    rating: driver.rating,
                    experience: driver.experience,
                    number: driver.mobileNumber,
                    vehicleType: driver.vehicleType,
                    isVerified: driver.isVerifiedByAdmin,
                }));

                // Apply filters
                if (filters && Object.keys(filters).length > 0) {
                    driverData = applyFilters(driverData, filters);
                }

                // Apply distance filtering and sorting if lat/lng provided
                if (searchLat && searchLng) {
                    // Get user coordinates for all drivers
                    const driverUserIds = driverData.map(driver => driver.userId);
                    const driversWithCoords = await UserModel.find({
                        _id: { $in: driverUserIds }
                    }, '_id lat lng').exec();
                    
                    const driverCoordsMap = {};
                    driversWithCoords.forEach(user => {
                        driverCoordsMap[user._id.toString()] = {
                            lat: user.lat,
                            lng: user.lng
                        };
                    });
                    
                    // Calculate distances and filter using ONLY actual coordinates
                    driverData = driverData.map(driver => {
                        let distance = null;
                        const driverCoords = driverCoordsMap[driver.userId];
                        
                        if (driverCoords && driverCoords.lat && driverCoords.lng) {
                            distance = calculateDistance(searchLat, searchLng, driverCoords.lat, driverCoords.lng);
                        }
                        // No fallback to service cities - if no coordinates, no distance
                        
                        return {
                            ...driver,
                            distance: distance,
                            distanceText: distance ? `${distance.toFixed(1)} km` : 'Distance not available'
                        };
                    }).filter(driver => {
                        // Only include drivers with valid coordinates within distance OR drivers without coordinates
                        return driver.distance === null || driver.distance <= maxDistance;
                    }).sort((a, b) => {
                        // Sort by distance - drivers with coordinates come first, sorted by distance
                        if (a.distance === null && b.distance === null) return 0;
                        if (a.distance === null) return 1;
                        if (b.distance === null) return -1;
                        return a.distance - b.distance;
                    });
                }

                // Apply pagination after filtering
                total = driverData.length;
                data = driverData.slice(skip, skip + parseInt(limit));
            }
            else if (searchType === 'INDEPENDENT_CAR_OWNER') {
                // Fetch all Independent Car Owners first (without pagination for distance filtering)
                const allCarOwners = await IndependentCarOwnerModel.find({
                    userId: { $ne: userId },
                    isBlockedByAdmin: false,
                    'documentVerificationStatus.isVerifiedByAdmin': true
                }).exec();

                // Transform Independent Car Owner data
                let carOwnerData = allCarOwners.map(owner => ({
                    id: owner._id,
                    userId: owner.userId,
                    bio: owner.about,
                    minimumCharges: 0, // Can be set from vehicle listings
                    userType: "INDEPENDENT_CAR_OWNER",
                    servicesLocations: [owner.address.city], // Using city as service location
                    languageSpoken: [], // Can be added to model if needed
                    address: owner.address,
                    name: owner.name,
                    image: owner.photo,
                    rating: owner.rating,
                    experience: 0, // Experience not applicable for car owners
                    number: owner.phoneNumber,
                    vehicleType: [], // Will be populated from vehicle listings
                    isVerified: owner.documentVerificationStatus.isVerifiedByAdmin,
                    fleetSize: owner.fleetSize,
                    documentVerified: {
                        aadhaar: owner.documentVerificationStatus.aadharVerified,
                        drivingLicense: owner.documentVerificationStatus.drivingLicenseVerified
                    }
                }));

                // Apply filters
                if (filters && Object.keys(filters).length > 0) {
                    carOwnerData = applyFilters(carOwnerData, filters);
                }

                // Apply distance filtering and sorting if lat/lng provided
                if (searchLat && searchLng) {
                    // Get user coordinates for all car owners
                    const carOwnerUserIds = carOwnerData.map(owner => owner.userId);
                    const ownersWithCoords = await UserModel.find({
                        _id: { $in: carOwnerUserIds }
                    }, '_id lat lng').exec();
                    
                    const ownerCoordsMap = {};
                    ownersWithCoords.forEach(user => {
                        ownerCoordsMap[user._id.toString()] = {
                            lat: user.lat,
                            lng: user.lng
                        };
                    });
                    
                    // Calculate distances and filter using ONLY actual coordinates
                    carOwnerData = carOwnerData.map(owner => {
                        let distance = null;
                        const ownerCoords = ownerCoordsMap[owner.userId];
                        
                        if (ownerCoords && ownerCoords.lat && ownerCoords.lng) {
                            distance = calculateDistance(searchLat, searchLng, ownerCoords.lat, ownerCoords.lng);
                        }
                        
                        return {
                            ...owner,
                            distance: distance,
                            distanceText: distance ? `${distance.toFixed(1)} km` : 'Distance not available'
                        };
                    }).filter(owner => {
                        // Only include owners with valid coordinates within distance OR owners without coordinates
                        return owner.distance === null || owner.distance <= maxDistance;
                    }).sort((a, b) => {
                        // Sort by distance - owners with coordinates come first, sorted by distance
                        if (a.distance === null && b.distance === null) return 0;
                        if (a.distance === null) return 1;
                        if (b.distance === null) return -1;
                        return a.distance - b.distance;
                    });
                }

                // Apply pagination after filtering
                total = carOwnerData.length;
                data = carOwnerData.slice(skip, skip + parseInt(limit));
            }
            else if (searchType === 'RICKSHAW') {
                // Get all unique user IDs with their vehicles (no pagination initially)
                const allUserData = await VehicleModel.aggregate([
                    {
                        $match: {
                            $and: [
                                { userId: { $ne: userId } },
                                { isBlockedByAdmin: false },
                                {
                                    $or: [
                                        { vehicleType: 'RICKSHAW' }
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        $group: {
                            _id: "$userId",
                            vehicles: { $push: "$$ROOT" },
                            userDetails: { $first: "$details" }
                        }
                    }
                ]);

                // Filter out blocked users
                const userIds = allUserData.map(item => item._id);
                const activeUsers = await UserModel.find({
                    _id: { $in: userIds },
                    isBlockedByAdmin: false
                }, '_id').exec();
                
                const activeUserIds = activeUsers.map(user => user._id.toString());
                const filteredUserData = allUserData.filter(userData => 
                    activeUserIds.includes(userData._id.toString())
                );

                let rickshawData = filteredUserData.map(userData => ({
                    name: userData.userDetails.fullName,
                    image: userData.userDetails.profilePhoto,
                    bio: userData.userDetails.bio,
                    rating: userData.userDetails.rating ?? 4,
                    phoneNumber: userData.userDetails.mobileNumber,
                    userId: userData._id.toString(),
                    userType:"RICKSHAW",
                    id: userData.vehicles[0]._id, // Using first vehicle's ID as reference
                    isVerified: userData.vehicles[0].isVerifiedByAdmin,
                    vehicles: userData.vehicles.map(vehicle => ({
                        id: vehicle._id,
                        images: vehicle.images,
                        video: vehicle.videos,
                        milage: vehicle.milage,
                        vehicleName: vehicle.vehicleName,
                        fuelType: vehicle.fuelType,
                        minimumCharges: vehicle.minimumChargePerHour,
                        isPriceNegotiable: vehicle.isPriceNegotiable,
                        seatingCapacity: vehicle.seatingCapacity,
                        vehicleType: vehicle.vehicleType,
                        airConditioning: vehicle.airConditioning,
                        servedLocation: vehicle.servedLocation,
                    }))
                }));

                // Apply filters
                if (filters && Object.keys(filters).length > 0) {
                    rickshawData = applyVehicleFilters(rickshawData, filters);
                }

                // Apply distance filtering if lat/lng provided
                if (searchLat && searchLng) {
                    rickshawData = await filterVehiclesByDistance(rickshawData, searchLat, searchLng, maxDistance);
                }

                // Apply pagination after filtering
                total = rickshawData.length;
                data = rickshawData.slice(skip, skip + parseInt(limit));
            }
            else if(searchType === 'E_RICKSHAW'){
                // Get all unique user IDs with their vehicles (no pagination initially)
                const allUserData = await VehicleModel.aggregate([
                    {
                        $match: {
                            $and: [
                                { userId: { $ne: userId } },
                                { isBlockedByAdmin: false },
                                {
                                    $or: [
                                        { vehicleType: 'E_RICKSHAW' }
                                    ]
                                }
                            ]
                        }
                    },
                    {
                        $group: {
                            _id: "$userId",
                            vehicles: { $push: "$$ROOT" },
                            userDetails: { $first: "$details" }
                        }
                    }
                ]);

                // Filter out blocked users
                const eRickshawUserIds = allUserData.map(item => item._id);
                const activeERickshawUsers = await UserModel.find({
                    _id: { $in: eRickshawUserIds },
                    isBlockedByAdmin: false
                }, '_id').exec();
                
                const activeERickshawUserIds = activeERickshawUsers.map(user => user._id.toString());
                const filteredERickshawUserData = allUserData.filter(userData => 
                    activeERickshawUserIds.includes(userData._id.toString())
                );

                let eRickshawData = filteredERickshawUserData.map(userData => ({
                    name: userData.userDetails.fullName,
                    image: userData.userDetails.profilePhoto,
                    bio: userData.userDetails.bio,
                    rating: userData.userDetails.rating ?? 4,
                    phoneNumber: userData.userDetails.mobileNumber,
                    userId: userData._id.toString(),
                    userType:"E_RICKSHAW",
                    id: userData.vehicles[0]._id, // Using first vehicle's ID as reference
                    isVerified: userData.vehicles[0].isVerifiedByAdmin,
                    vehicles: userData.vehicles.map(vehicle => ({
                        id: vehicle._id,
                        images: vehicle.images,
                        video: vehicle.videos,
                        milage: vehicle.milage,
                        vehicleName: vehicle.vehicleName,
                        fuelType: vehicle.fuelType,
                        minimumCharges: vehicle.minimumChargePerHour,
                        isPriceNegotiable: vehicle.isPriceNegotiable,
                        seatingCapacity: vehicle.seatingCapacity,
                        vehicleType: vehicle.vehicleType,
                        airConditioning: vehicle.airConditioning,
                        servedLocation: vehicle.servedLocation,
                    }))
                }));

                // Apply filters
                if (filters && Object.keys(filters).length > 0) {
                    eRickshawData = applyVehicleFilters(eRickshawData, filters);
                }

                // Apply distance filtering if lat/lng provided
                if (searchLat && searchLng) {
                    eRickshawData = await filterVehiclesByDistance(eRickshawData, searchLat, searchLng, maxDistance);
                }

                // Apply pagination after filtering
                total = eRickshawData.length;
                data = eRickshawData.slice(skip, skip + parseInt(limit));
            }
            else {
                let aggregateSearch;
                if(searchType==="CAR"){
                    aggregateSearch = {$nin: ['RICKSHAW', 'E_RICKSHAW','BUS']}
                }
                else if(searchType==="ALL_VEHICLES"){
                        aggregateSearch={ $nin: ['E_RICKSHAW']}
                }else{
                    aggregateSearch= searchType
                }
                // For other vehicle types, get unique user IDs first with pagination
                const totalUsersWithVehicles = await VehicleModel.aggregate([
                    {
                        $match: {
                            vehicleType: aggregateSearch,
                            userId: { $ne: userId },
                            isBlockedByAdmin: false
                        }
                    },
                    {
                        $group: {
                            _id: "$userId"
                        }
                    },
                    {
                        $count: "total"
                    }
                ]);


                total = totalUsersWithVehicles.length > 0 ? totalUsersWithVehicles[0].total : 0;

                // Get paginated user IDs who have the specified vehicle type
                const paginatedUserIds = await VehicleModel.aggregate([
                    {
                        $match: {
                            vehicleType: aggregateSearch,
                            userId: { $ne: userId },
                            isBlockedByAdmin: false
                        }
                    },
                    {
                        $group: {
                            _id: "$userId"
                        }
                    },
                    {
                        $skip: skip
                    },
                    {
                        $limit: parseInt(limit)
                    }
                ]);


                const userIds = paginatedUserIds.map(item => item._id);

                if (userIds.length > 0) {
                    // Filter out blocked users
                    const activeUsers = await UserModel.find({
                        _id: { $in: userIds },
                        isBlockedByAdmin: false
                    }, '_id').exec();
                    
                    const activeUserIds = activeUsers.map(user => user._id);

                    // Get vehicles for these active users
                    const vehicles = await VehicleModel.find({
                        vehicleType: aggregateSearch,
                        userId: { $in: activeUserIds },
                        isBlockedByAdmin: false
                    }).exec();

                    // Get transporter details for these users
                    const transporters = await TransporterModel.find({
                        userId: { $in: activeUserIds },
                        isBlockedByAdmin: false
                    }).exec();

                    // Create a map of transporters by userId for quick lookup
                    const transporterMap = {};
                    transporters.forEach(transporter => {
                        transporterMap[transporter.userId.toString()] = transporter;
                    });

                    const rikshwaMap={};
                    vehicles.forEach(vehicle => {
                        rikshwaMap[vehicle.userId.toString()] = vehicle;
                    })

                    // Group vehicles by userId
                    const groupedVehicles = {};
                    vehicles.forEach(vehicle => {
                        const userIdStr = vehicle.userId.toString();
                        if (!groupedVehicles[userIdStr]) {
                            groupedVehicles[userIdStr] = [];
                        }
                        groupedVehicles[userIdStr].push(vehicle);
                    });


                    // Build response data
                    for (const userIdStr of Object.keys(groupedVehicles)) {

                        const transporter = transporterMap[userIdStr];
                        const rickshaw=rikshwaMap[userIdStr];
                        if (transporter) {
                            const vehiclesList = groupedVehicles[userIdStr].map(vehicle => ({
                                id: vehicle._id,
                                images: vehicle.images,
                                video: vehicle.videos,
                                milage: vehicle.milage,
                                vehicleName: vehicle.vehicleName,
                                fuelType: vehicle.fuelType,
                                minimumCharges: vehicle.minimumChargePerHour,
                                isPriceNegotiable: vehicle.isPriceNegotiable,
                                seatingCapacity: vehicle.seatingCapacity,
                                vehicleType: vehicle.vehicleType,
                                airConditioning: vehicle.airConditioning,
                            }));
                            data.push({
                                name: transporter.companyName,
                                image: transporter.photo,
                                bio: transporter.bio,
                                rating: transporter.rating ?? 3,
                                phoneNumber: transporter.phoneNumber,
                                userId: transporter.userId,
                                id: transporter._id,
                                userType:"TRANSPORTER",
                                isVerified: transporter.isVerifiedByAdmin ?? true,
                                vehicles: vehiclesList
                            });

                        } else {
                            const rickshawVehiclesList = groupedVehicles[userIdStr].map(vehicle => ({
                                id: vehicle._id,
                                images: vehicle.images,
                                video: vehicle.videos,
                                milage: vehicle.milage,
                                vehicleName: vehicle.vehicleName,
                                fuelType: vehicle.fuelType,
                                minimumCharges: vehicle.minimumChargePerHour,
                                isPriceNegotiable: vehicle.isPriceNegotiable,
                                seatingCapacity: vehicle.seatingCapacity,
                                vehicleType: vehicle.vehicleType,
                                airConditioning: vehicle.airConditioning,
                            }));
                            data.push({
                                name: rickshaw.details.fullName,
                                image: rickshaw.details.profilePhoto,
                                bio: rickshaw.details.bio,
                                rating: rickshaw.details.rating ?? 3,
                                phoneNumber: rickshaw.details.mobileNumber,
                                userId: rickshaw.userId,
                                id: rickshaw._id,
                                isVerified: rickshaw.isVerifiedByAdmin ?? true,
                                vehicles: rickshawVehiclesList
                            });
                        }
                    }
                }

                // Apply filters
                if (filters && Object.keys(filters).length > 0) {
                    data = applyVehicleFilters(data, filters);
                }

                // Apply distance filtering if lat/lng provided for general vehicle search
                if (searchLat && searchLng) {
                    data = await filterVehiclesByDistance(data, searchLat, searchLng, maxDistance);
                    total = data.length;
                    data = data.slice(skip, skip + parseInt(limit));
                }
            }

            // Calculate pagination info
            const pages = Math.ceil(total / limit);

            return res.json({
                status: true,
                message: `Search ${searchType}`,
                data: data,
                pagination: {
                    total,
                    page: Number(page),
                    pages,
                    limit: Number(limit),
                    hasNext: page < pages,
                    hasPrev: page > 1
                },
                searchParams: {
                    maxDistance: searchLat && searchLng ? maxDistance : null,
                    coordinates: searchLat && searchLng ? { lat: searchLat, lng: searchLng } : null,
                    distanceFilterApplied: Boolean(searchLat && searchLng),
                    locationSource: searchLat && searchLng ? 
                        (lat && lng ? 'request' : 'stored') : 'none'
                }
            });

        } catch (error) {
            console.error('Search error:', error);
            return res.status(500).json({
                status: false,
                message: 'An error occurred while searching',
                error: error.message
            });
        }
    }
    static async filter(req, res) {
        const {searchType } = req.query;
            let filters;
            if (searchType === 'DRIVER') {
                 filters = [
                    {
                         name: 'Price',
                         multiple: false,
                         values: [
                             'low',      // ≤ ₹500
                             'medium',   // ₹500-1000
                             'high'      // ≥ ₹1000
                         ]
                     },
                    {
                         name: 'Vehicle Type',
                         multiple: true,
                         values: [
                             'Car',
                             'Sedan',
                             'SUV',
                             'Hatchback',
                             'Bus',
                             'Van',
                             'Rickshaw',
                             'E_Rickshaw'
                         ]
                     },
                    {
                        name: 'Age',
                        multiple: false,
                        values: [
                            '18-25',
                            '26-35',
                            '36-50',
                            '50+'
                        ]
                    },
                    {
                        name: 'Experience',
                        multiple: false,
                        values: [
                            '0-1 years',
                            '1-3 years',
                            '3-5 years',
                            '5+ years'
                        ]
                    },
                    {
                        name: 'Language',
                        multiple: true,
                        values: [
                            'English',
                            'Hindi',
                            'Tamil',
                            'Telugu',
                            'Kannada',
                            'Malayalam',
                            'Bengali',
                            'Marathi',
                            'Gujarati',
                            'Punjabi'
                        ]
                    },
                ];
            }
            else if (searchType === 'RICKSHAW' || searchType === 'E_RICKSHAW') {
                filters = [
                    {
                        name: 'Price',
                        multiple: false,
                        values: [
                            'low',      // ≤ ₹300
                            'medium',   // ₹300-600
                            'high'      // ≥ ₹600
                        ]
                    },
                    {
                        name: 'Vehicle Type',
                        multiple: false,
                        values: [
                            'low',      // ≤ ₹300
                            'medium',   // ₹300-600
                            'high'      // ≥ ₹600
                        ]
                    },
                    {
                        name: 'Ac/Non Ac',
                        multiple: false,
                        values: [
                            'ac',
                            'non-ac'
                        ]
                    },
                    {
                        name: 'Sitting Capacity',
                        multiple: false,
                        values: [
                            '5',
                            '7',
                            '9',
                            '10+'
                        ]
                    },
                ];

            }
            else {
                filters = [
                    {
                        name: 'Price',
                        multiple: false,
                        values: [
                            'low',      // ≤ ₹300
                            'medium',   // ₹300-600
                            'high'      // ≥ ₹600
                        ]
                    },
                    {
                        name: 'Vehicle Type',
                        multiple: false,
                        values: [
                            'low',      // ≤ ₹300
                            'medium',   // ₹300-600
                            'high'      // ≥ ₹600
                        ]
                    },
                    {
                        name: 'Ac/Non Ac',
                        multiple: false,
                        values: [
                            'ac',
                            'non-ac'
                        ]
                    },
                    {
                        name: 'Sitting Capacity',
                        multiple: false,
                        values: [
                            '5',
                            '7',
                            '9',
                            '10+'
                        ]
                    },
                ];
            }

            return res.json({
            status: true,
            message: `Filters of ${searchType}`,
            data: filters
        });

    }
    static async myProfile(req,res){
        const userId=req.headers['x-user-id'];
        const user=await UserModel.findOne({_id:userId},{},{}).exec();
        if(!user){
            throw new UserServiceError("No user Found",404);
        }
        let displayName,displayImage,userType,id;
        if(user?.isRegisteredAsTransporter){
            const transporter=await TransporterModel.findOne({userId:userId}).exec();
            displayName = transporter.companyName;
            displayImage = transporter.photo;
            userType="TRANSPORTER";
            id = transporter._id;
        }
        else if(user?.isRegisteredAsDriver){
            const driver=await DriversModel.findOne({userId:userId}).exec();
            displayName = driver.fullName;
            displayImage = driver.profilePhoto;
            userType="DRIVER";
            id=driver._id
        }
        else if(user?.isRegisteredAsIndependentCarOwner){
            const carOwner=await IndependentCarOwnerModel.findOne({userId:userId}).exec();
            displayName = carOwner.name;
            displayImage = carOwner.photo;
            userType="INDEPENDENT_CAR_OWNER";
            id=carOwner._id
        }
        else if(user?.isRegisterAsRickshaw || user?.isRegisterAsERickshaw){
            const vehicle=await VehicleModel.findOne({userId:userId}).exec();
            displayName = vehicle.details.fullName;
            displayImage = vehicle.details.profilePhoto;
            userType=user?.isRegisterAsRickshaw?"RICKSHAW":"E_RICKSHAW";
            id=vehicle._id
        }
        else{
            displayName = `${user?.firstName} ${user?.lastName}`;
            displayImage = user?.image??'';
            userType="USER";
            id=user._id
        }
        return res.json({status:true,message:'Profile',data:{
                userId:userId,
                id:id,
                displayName:displayName,
                firstName:user?.firstName ?? '',
                lastName:user?.lastName??'',
                number:user?.mobileNumber??'',
                email:user?.email??'',
                image:displayImage,
                language:user?.language??'',
                userType:userType,
                lat:user?.lat ?? null,
                lng:user?.lng ?? null,
            }})
    };
    static async updateProfile(req,res){
        const id=req.headers['x-user-id'];
        const { firstName, lastName, email,language,image } = req.body;
        const updates = {};

        if (firstName) updates.firstName = firstName;
        if (lastName) updates.lastName = lastName;
        if (email) updates.email = email;
        if(language) updates.language=language;
        if (image) updates.image = image;

        const result = await UserModel.updateOne({ _id: id }, { $set: updates }).exec();

        if (result.nModified === 0) {
            throw new UserServiceError("User not found or no changes made",400);
        }

        return res.json({ status: true, message: 'Profile updated successfully' });
    };
    
    static async updateLocation(req, res) {
        const id = req.headers['x-user-id'];
        const { lat, lng } = req.body;

        if (!id) {
            throw new UserServiceError("User ID not provided", 400);
        }

        // Update user location
        const result = await UserModel.updateOne(
            { _id: id },
            { $set: { lat: parseFloat(lat), lng: parseFloat(lng) } }
        ).exec();

        if (result.matchedCount === 0) {
            throw new UserServiceError("User not found", 404);
        }

        if (result.modifiedCount === 0) {
            throw new UserServiceError("Location not updated - same values provided", 400);
        }

        return res.json({ 
            status: true, 
            message: 'Location updated successfully',
            data: {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            }
        });
    };
    static async notification(req,res){
        const id=req.headers['x-user-id'];
        const notifications = await NotificationsModel.find({
            $or: [{ userId: id }, { userId: null }],
        },{date:'$createdAt',title:1,message:1,image:1,_id:0,id:"$_id"}).exec();
        res.json({
            status: true,
            message: 'Notifications',
            data:notifications
        });
    };
    static async support(req,res){
        res.json({
            status: true,
            message: 'Support',
            data: '<h1>Support Page</h1>',
        });
    };
    static async activity(req,res){
        const userId = req.headers['x-user-id'];
        const {id,activity,TYPE}=req.body;
        const data=new ActivityModel({
            userId:userId,
            to:id,
            activityFor:TYPE,
            activity:ActivityTypes.find(e=>e===activity)
        });
        await data.save();
        return res.json({status:true,message:'activity logged successfully'});
    };
    static async searchSingle(req,res){
        const {type}=req.query;
        const {id}=req.params;
        let data;
        if(type==='DRIVER'){
            const e=await DriversModel.findOne({userId:id});
            data= {
                    address:e.address,
                    userId:e.userId,
                    id:e._id,
                    vehicleType:e.vehicleType,
                    servicesCities:e.servicesCities,
                    fullName:e.fullName,
                    mobileNumber:e.mobileNumber,
                    profilePhoto:e.profilePhoto,
                    languageSpoken:e.languageSpoken,
                    bio:e.bio,
                    experience:e.experience,
                    minimumCharges:e.minimumCharges,
                    dob:e.dob,
                    gender:e.gender,
                    rating:e.rating,
                    isVerifiedByAdmin:e.isVerifiedByAdmin,
                };
        }else if(type==='INDEPENDENT_CAR_OWNER'){
            const carOwner = await IndependentCarOwnerModel.findOne({userId:id});
            data = {
                id: carOwner._id,
                userId: carOwner.userId,
                name: carOwner.name,
                phoneNumber: carOwner.phoneNumber,
                about: carOwner.about,
                address: carOwner.address,
                photo: carOwner.photo,
                fleetSize: carOwner.fleetSize,
                rating: carOwner.rating,
                isVerifiedByAdmin: carOwner.documentVerificationStatus?.isVerifiedByAdmin,
                documentVerification: {
                    aadhaar: carOwner.documentVerificationStatus?.aadharVerified,
                    drivingLicense: carOwner.documentVerificationStatus?.drivingLicenseVerified
                }
            };
        }else{
            const vehicles=await VehicleModel.find({userId:id});
            const transporter=await TransporterModel.findOne({userId:id});
            data={
                transporter:{
                    id:transporter._id,
                    userId:transporter.userId,
                    companyName:transporter.companyName,
                    phoneNumber:transporter.phoneNumber,
                    address:transporter.address,
                    addressType:transporter.addressType,
                    fleetSize:transporter.fleetSize,
                    counts:transporter.counts,
                    contactPersonName:transporter.contactPersonName,
                    bio:transporter.bio,
                    photo:transporter.photo,
                    rating:transporter.rating,
                    isVerifiedByAdmin:transporter.isVerifiedByAdmin,
                },
                vehicles:vehicles.map(e=>{
                    return {
                        vehicleId:e._id,
                        userId:e.userId,
                        vehicleOwnership:e.vehicleOwnership,
                        vehicleName:e.vehicleName,
                        vehicleModelName:e.vehicleModelName,
                        manufacturing:e.manufacturing,
                        maxPower:e.maxPower,
                        maxSpeed:e.maxSpeed,
                        fuelType:e.fuelType,
                        first2Km:e.first2Km,
                        milage:e.milage,
                        registrationDate:e.registrationDate,
                        airConditioning:e.airConditioning,
                        vehicleType:e.vehicleType,
                        seatingCapacity:e.seatingCapacity,
                        vehicleNumber:e.vehicleNumber,
                        vehicleSpecifications:e.vehicleSpecifications,
                        servedLocation:e.servedLocation,
                        minimumChargePerHour:e.minimumChargePerHour,
                        currency:e.currency,
                        images:e.images,
                        videos:e.videos,
                        isPriceNegotiable:e.isPriceNegotiable,
                        isVerifiedByAdmin:e.isVerifiedByAdmin,

                    }
                })
            }
        }
        return res.json({status:true,message:`Single Profile of ${type}`,data});
    };
    static async getStateAndCity(req,res){
        const response=await fetch("https://gist.githubusercontent.com/apartyagi/5b3f60ca4fc13632b7543f28757514f1/raw/e3afdd6ca40670a134eaa6516a4d2cf68bb87ec4/indian_state_city_ut_list.json");
        const list = await response.json();
        return res.json({status:true,message:'State and City',data:list })
    };

    static async getCityStateByPincode(req, res) {
        try {
            const { pincode } = req.params;
            
            if (!pincode || !/^\d{6}$/.test(pincode)) {
                return res.status(400).json({
                    status: false,
                    message: 'Invalid pincode format. Must be 6 digits.',
                    data: null
                });
            }

            // Import the utility function
            const { getCityStateFromPincode } = await import('shared-package/utils/pincodeUtils.js');
            const result = await getCityStateFromPincode(pincode);

            if (result.success) {
                return res.json({
                    status: true,
                    message: 'Location details found',
                    data: result.data
                });
            } else {
                return res.status(404).json({
                    status: false,
                    message: result.error || 'Location not found for this pincode',
                    data: null
                });
            }

        } catch (error) {
            console.error('Error in getCityStateByPincode:', error);
            return res.status(500).json({
                status: false,
                message: 'Internal server error',
                data: null
            });
        }
    };

    static async validatePhoto(req, res) {
        try {
            const file = req.file;
            
            if (!file) {
                return res.status(400).json({
                    status: false,
                    message: 'Photo file is required',
                    data: null
                });
            }

            // Validate file type
            const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedMimeTypes.includes(file.mimetype)) {
                return res.status(400).json({
                    status: false,
                    message: 'Invalid file type. Only JPEG and PNG are allowed',
                    data: null
                });
            }

            // Process and validate the photo
            const processedBuffer = await processImageBuffer(file.buffer, file.mimetype);
            const validationResult = await validateProfilePhoto(processedBuffer);

            if (validationResult.isValid) {
                return res.json({
                    status: true,
                    message: 'Photo validation successful',
                    data: {
                        isValid: true,
                        faceDetails: validationResult.faceDetails,
                        confidence: validationResult.faceConfidence
                    }
                });
            } else {
                return res.status(400).json({
                    status: false,
                    message: 'Photo validation failed',
                    data: {
                        isValid: false,
                        issues: validationResult.issues,
                        confidence: validationResult.faceConfidence || 0
                    }
                });
            }

        } catch (error) {
            console.error('Error in validatePhoto:', error);
            return res.status(500).json({
                status: false,
                message: 'Photo validation service error',
                data: null
            });
        }
    };

    static async uploadMedia(req, res) {
        try {
            const file = req.file;
            const { type, kind } = req.body;

            if (!kind) throw new UserServiceError("Kind is required", 400);
            if (!file) throw new UserServiceError("File is required", 400);

            // Validate file type
            const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedMimeTypes.includes(file.mimetype)) {
                throw new UserServiceError("Invalid file type. Only JPEG and PNG are allowed", 400);
            }

            // Process the image buffer
            console.log(`Processing ${file.originalname} (${file.mimetype})`);
            const processedImage = await processImageBuffer(file.buffer, file.mimetype);

            // Generate filename with correct extension
            const fileName = `${uuidv4()}.${processedImage.extension}`;
            const key = `${kind}/${fileName}`;

            console.log(`Uploading ${fileName} to S3`);
            const fileUrl = await uploadToS3(
                processedImage.buffer,
                key,
                processedImage.contentType
            );
            console.log('Upload successful:', fileUrl);

            // Add a longer delay to ensure S3 consistency
            console.log('Waiting for S3 consistency...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Moderate the image
            console.log('Starting image moderation...');
            const violations = await moderateImage(key);

            if (violations.length > 0) {
                console.log('Image moderation failed:', violations.map(v => v.Name));
                await deleteFromS3(key);
                return res.status(400).json({
                    status: false,
                    message: `Image rejected due to: ${violations.map((v) => v.Name).join(", ")}`,
                });
            }

            console.log('Image moderation passed');
            return res.json({
                status: true,
                url: fileUrl,
                type,
            });

        } catch (error) {
            console.error('Upload error:', error);

            // Clean up if there was an error after upload
            if (error.key) {
                try {
                    await deleteFromS3(error.key);
                } catch (cleanupError) {
                    console.error('Cleanup error:', cleanupError);
                }
            }

            // Handle specific errors
            if (error.message.includes('Image processing failed') ||
                error.message.includes('Image dimensions')) {
                return res.status(400).json({
                    status: false,
                    message: error.message,
                });
            }

            if (error instanceof UserServiceError) {
                return res.status(error.statusCode || 400).json({
                    status: false,
                    message: error.message,
                });
            }

            return res.status(500).json({
                status: false,
                message: "Internal server error during file upload",
            });
        }
    }
    static async getApplicationSecrets(req, res) {
        const GOOGLE_KEY = process.env.GOOGLE_GCP_API_KEY;
        return res.status(200).json({status:true,message:"Application secrets",data:{GOOGLE_KEY}});
    }
    static async deleteAccountOfUser(req, res) {
        const id = req.headers['x-user-id'];

        if (!id) {
            throw new UserServiceError("User ID not provided", 400);
        }

        const user = await UserModel.findById(id).exec();

        if (!user) {
            throw new UserServiceError("No user found", 404);
        }

        if (user.isDeleted) {
            throw new UserServiceError("User already deleted", 400);
        }

        user.isDeleted = true;
        await user.save();

        return res.status(200).json({ status: true, message: "Account deleted" });
    }
    static async prefAccountOfUser(req, res) {
        const id = req.headers['x-user-id'];
        console.log(id);
        const { whatsapp, phone } = req.body;

        if (!id) {
            throw new UserServiceError("User ID not provided", 400);
        }

        const user = await UserModel.findById(id).exec();


        console.log(user);

        if (!user) {
            throw new UserServiceError("No user found", 404);
        }


            const lo=await UserModel.updateOne(
                { _id: id },
                {
                    $set: {
                        preferencesWhatsapp: whatsapp,
                        preferencesPhone: phone
                    }
                },
                {new:true}
            );
            console.log(lo);

        return res.status(200).json({
            status: true,
            message: "Account Preferences updated",
        });
    }
    static async getAccountPreferences(req, res) {
        const id = req.headers['x-user-id'];

        if (!id) {
            throw new UserServiceError("User ID not provided", 400);
        }

        const user = await UserModel.findById(id).exec();

        if (!user) {
            throw new UserServiceError("No user found", 404);
        }

        return res.status(200).json({
            status: true,
            message: "Fetched account preferences successfully",
            data: {
                whatsapp: user.preferencesWhatsapp,
                phone: user.preferencesPhone
            }
        });
    }
}

// Filter helper functions
function applyFilters(driverData, filters) {
    let filteredData = [...driverData];

    // Price filter (price: "low" or "high")
    if (filters.price) {
        if (filters.price === "low") {
            filteredData.sort((a, b) => a.minimumCharges - b.minimumCharges);
        } else if (filters.price === "high") {
            filteredData.sort((a, b) => b.minimumCharges - a.minimumCharges);
        }
    }

    // Vehicle type filter
    if (filters.vehicleType && filters.vehicleType.length > 0) {
        filteredData = filteredData.filter(driver => {
            return driver.vehicleType && driver.vehicleType.some(type => 
                filters.vehicleType.includes(type)
            );
        });
    }

    return filteredData;
}

function applyVehicleFilters(vehicleData, filters) {
    let filteredData = [...vehicleData];

    // Price filter (price: "low" or "high")
    if (filters.price) {
        if (filters.price === "low") {
            filteredData.sort((a, b) => {
                const aMinPrice = Math.min(...a.vehicles.map(v => v.minimumCharges || 999999));
                const bMinPrice = Math.min(...b.vehicles.map(v => v.minimumCharges || 999999));
                return aMinPrice - bMinPrice;
            });
        } else if (filters.price === "high") {
            filteredData.sort((a, b) => {
                const aMaxPrice = Math.max(...a.vehicles.map(v => v.minimumCharges || 0));
                const bMaxPrice = Math.max(...b.vehicles.map(v => v.minimumCharges || 0));
                return bMaxPrice - aMaxPrice;
            });
        }
    }

    // Vehicle type filter
    if (filters.vehicleType && filters.vehicleType.length > 0) {
        filteredData = filteredData.filter(item => {
            return item.vehicles.some(vehicle => 
                filters.vehicleType.includes(vehicle.vehicleType)
            );
        });
    }

    // AC/Non-AC filter
    if (filters.airConditioning && filters.airConditioning.length > 0) {
        filteredData = filteredData.filter(item => {
            return item.vehicles.some(vehicle => 
                filters.airConditioning.includes(vehicle.airConditioning)
            );
        });
    }

    // Seating capacity filter
    if (filters.seatingCapacity && filters.seatingCapacity.length > 0) {
        filteredData = filteredData.filter(item => {
            return item.vehicles.some(vehicle => {
                const capacity = vehicle.seatingCapacity;
                return filters.seatingCapacity.some(filterCapacity => {
                    if (filterCapacity === "10+") {
                        return capacity >= 10;
                    } else {
                        return capacity === parseInt(filterCapacity);
                    }
                });
            });
        });
    }

    return filteredData;
}