export class DriverTransPorterServiceError extends Error {
    constructor(message, status,data=null) {
        super(message);
        this.status = status;
        this.data=data;
    }
}
