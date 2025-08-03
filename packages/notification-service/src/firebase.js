import admin from "firebase-admin";
import { readFile } from "fs/promises";


const serviceAccount = JSON.parse(await readFile(new URL("../firebase.json",import.meta.url), "utf-8"));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export default admin;
