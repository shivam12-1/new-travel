export class NotificationServiceError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
