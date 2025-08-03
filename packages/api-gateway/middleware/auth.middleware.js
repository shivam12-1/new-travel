import jwt from "jsonwebtoken";

export const apiProtectionMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Assuming "Bearer <token>"

    console.log(token);

    if (!token) {
        return res.status(401).json({ message: 'Access Denied. Token missing.' });
    }
    try {
        if(token==="INTER_SERVICE_COMMUNICATION"){
            req.user = "INTER_SERVICE_COMMUNICATION";
            req.headers['x-user-id'] ="INTER_SERVICE_COMMUNICATION";
            req.headers['x-user-role'] = 'INTER_SERVICE_COMMUNICATION';
            req.headers['x-uuid']='INTER_SERVICE_COMMUNICATION';
        }else{
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            req.headers['x-user-id'] = decoded.id;
            req.headers['x-user-role'] = decoded?.role ?? 'user';
            req.headers['x-uuid']=decoded.uuid;
        }
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
};


export const apiProtectionMiddlewareAdmin = (req, res, next) => {

    const token = req.headers.authorization?.split(' ')[1]; // Assuming "Bearer <token>"

    console.log(token);

    if (!token) {
        return res.status(401).json({ message: 'Access Denied. Token missing. For Admin' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        req.headers['x-admin-id'] = decoded.id;
        req.headers['x-admin-role'] = decoded?.role ?? 'admin';
        req.headers['x-user-permissions'] = decoded?.permission ?? 'view:all';

        console.log({id:decoded.id, role: decoded.role, permissions: decoded.permissions});
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({ message: 'Invalid or expired token. For Admin' });
    }
};