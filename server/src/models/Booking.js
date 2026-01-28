const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    property_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },
    customer_name: {
        type: String,
        required: true,
        trim: true
    },
    customer_email: {
        type: String,
        trim: true,
        lowercase: true,
        default: null
    },
    customer_phone: {
        type: String,
        trim: true,
        default: null
    },
    check_in_date: {
        type: Date,
        required: true
    },
    check_out_date: {
        type: Date,
        required: true
    },
    check_in_time: {
        type: String,
        default: '14:00'
    },
    check_out_time: {
        type: String,
        default: '11:00'
    },
    total_amount: {
        type: Number,
        default: null
    },
    is_paid: {
        type: Boolean,
        default: false
    },
    color: {
        type: String,
        required: true
    },
    notes: {
        type: String,
        default: null
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Virtual for property
bookingSchema.virtual('property', {
    ref: 'Property',
    localField: 'property_id',
    foreignField: '_id',
    justOne: true
});

module.exports = mongoose.model('Booking', bookingSchema);
