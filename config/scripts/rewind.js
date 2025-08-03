// scripts/rewind.mjs
import { execSync } from 'child_process';

const serviceMap = {
    0: "admin-service",
    1: "api-gateway",
    2: "chat-service",
    3: "driver-transporter-service",
    4: "notification-service",
    5: "payment-service",
    6: "rating-review-service",
    7: "user-service",
    8: "vehicle-listing-service",
    9: "auth-service",
};

const args = process.argv.slice(2);

if (args.length < 1) {
    console.error("❌ Please provide a service number (1–8) or service name.");
    console.log("\n🔢 Service Index:");
    for (const [key, value] of Object.entries(serviceMap)) {
        console.log(`  ${key}: ${value}`);
    }
    process.exit(1);
}

const input = args[0].toLowerCase();
const service = serviceMap[input] || input;

try {
    console.log(`\n🔁 Rewinding service: ${service}...`);
    execSync(`npx turbo run dev --filter=${service}`, { stdio: 'inherit' });
} catch (err) {
    console.error("❌ Failed to rewind:", err.message);
    process.exit(1);
}
