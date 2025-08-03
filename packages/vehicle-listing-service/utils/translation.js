import { TranslationServiceClient } from '@google-cloud/translate';


// console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);
// if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
//     throw new Error(
//         'GOOGLE_APPLICATION_CREDENTIALS is not set. Please set this environment variable to your GCP service account JSON path.'
//     );
// }


const client = new TranslationServiceClient();


export async function translateText(text, targetLanguage,projectId) {
    const location = 'global';

    const request = {
        parent: `projects/${projectId}/locations/${location}`,
        contents: [text],
        mimeType: 'text/plain', // Keep this if you're sending raw text
        targetLanguageCode: targetLanguage,
    };

    try {
        const [response] = await client.translateText(request);
        return response.translations[0].translatedText;
    } catch (error) {
        console.error(`Translation failed: ${error.message}`);
        return text; // Fallback to original text if translation fails
    }
}
