export class ChatServiceError extends Error {
    constructor(message, status,data=null) {
        super(message);
        this.status = status;
        this.data=data
    }
}

export const ChatTypes = Object.freeze([
    'TEXT',
    'AUDIO',
    'VIDEO',
    'IMAGE',
    'DOCUMENT',
])