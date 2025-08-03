export const genereate4DigitOTP = ()=>{
    if(process.env.NODEV_ENV==='dev') return 1212;
    return Math.floor(1000 + Math.random() * 9000);
}

export async function sendTransOtp(phoneNumber, otp) {
    try {
        const a=process.env.NODEV_ENV==='dev';
        if(a) return;
        const authorization = process.env.FAST_2_SMS_KEY;

        const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
                "authorization": authorization,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                route: "dlt",
                sender_id: "BUNTI",
                message: "183856", // Template ID
                variables_values: otp,
                numbers: phoneNumber,
            }),
        });

        const data = await response.json();
        console.log(data);
        return data;

    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
}


export class AuthServiceError extends Error {
    constructor(message, status,data=null) {
        super(message);
        this.status = status;
        this.data=data
    }
}

export const asyncWrapper = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
