import mongoose from 'mongoose';

export const LegalNames = [
    'PRIVACY_POLICY',
    'TERMS_AND_CONDITIONS',
    'LEGAL_DISCLAIMER',
    'DRIVER_AGREEMENT',
    'TRANSPORTER_AGREEMENT',
    'E_RICKSHAW_AGREEMENT',
    'RICKSHAW_AGREEMENT',
    'ABOUT_US',
    'FAQ_POLICY',
    'FAQ'
];

export const SupportedLanguages = ['en', 'hi', 'ta', 'te', 'kn', 'mr', 'gu', 'bn', 'ml'];

const LegalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        enum: LegalNames,
        unique: true
    },
    versions: [{
        language: {
            type: String,
            required: true,
            enum: SupportedLanguages
        },
        title: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: function() {
                return this.parent().name !== 'FAQ';
            }
        },
        faqItems: [{
            question: String,
            answer: String,
            order: { type: Number, default: 0 }
        }],
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

const LegalModel = mongoose.model('Legal', LegalSchema);

export default LegalModel;