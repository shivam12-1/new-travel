export function greet(name) {
    return `Hello, ${name}`;
}

export const VehicleTypes = Object.freeze([
    'CAR',
    'SUV',
    'RICKSHAW',
    'VAN',
    'MINIVAN',
    'BUS',
    'E_RICKSHAW',
    'Other'
]);

export const FuelTypes = Object.freeze([
    'Petrol',
    'Diesel',
    'Electric',
    'CNG',
    'Battery',
    'N/A'
]);

export const AirConditioningTypes = Object.freeze([
    'AC',
    'Non-AC',
    'Automatic',
    'None'
]);

export const ServiceTypes = Object.freeze([
    'DRIVER',
    'TRANSPORTER',
    'INDEPENDENT_CAR_OWNER',
    'RICKSHAW',
    'E_RICKSHAW'
])

export const ActivityTypes = Object.freeze([
    'WHATSAPP',
    'MESSAGE',
    'CHAT',
    'PHONE',
    'CLICK'
])


export const ElasticActivityTypes = Object.freeze({
    ADMIN: 'AdminActivity',
    AUTH: 'AuthActivity',
    CHAT: 'ChatActivity',
    DRIVER_TRANSPORTER: 'DriverTransporterActivity',
    NOTIFICATION: 'NotificationActivity',
    PAYMENT: 'PaymentActivity',
    RATING_REVIEW: 'RatingAndReviewActivity',
    VEHICLE_LISTING: 'VehicleListingActivity',
    ERROR: 'ErrorActivity',
    SHARED: 'SharedActivity',
});


export const LegalNames=Object.freeze([
    'PRIVACY_POLICY',
    'TERMS_AND_CONDITIONS',
    'LEGAL_DISCLAIMER',
    'DRIVER_AGREEMENT',
    'TRANSPORTER_AGREEMENT',
    'INDEPENDENT_CAR_OWNER_AGREEMENT',
    'E_RICKSHAW_AGREEMENT',
    'RICKSHAW_AGREEMENT',
    'ABOUT_US',
    'FAQ_POLICY',
    'FAQ',
])

export const asyncWrapper = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};