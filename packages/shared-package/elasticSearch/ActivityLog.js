import { Client } from '@elastic/elasticsearch';
import {ElasticActivityTypes} from "../utils/index.js";

class ActivityLogger {
    constructor() {
        this.client = new Client({
            node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
        });

        this.validTypes = new Set(Object.values(ElasticActivityTypes));
    }

    async log(type, event) {
        if (!this.validTypes.has(type)) {
            console.warn(`[ElasticActivityLogger] Invalid activity type: ${type}`);
            return;
        }

        const activity = {
            ...event,
            timestamp: new Date().toISOString(),
        };

        try {
            await this.client.index({
                index: type.toLowerCase(),
                body: activity,
            });
            console.log(`[ElasticActivityLogger] Logged to ${type}`);
        } catch (err) {
            console.error('[ElasticActivityLogger] Elasticsearch log failed:', err?.meta?.body?.error || err);
        }
    }
}

export const activityLogger = new ActivityLogger();
