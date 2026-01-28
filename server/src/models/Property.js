const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    owner_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    photo_url: {
        type: String,
        default: null
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Virtual for getting bookings
propertySchema.virtual('bookings', {
    ref: 'Booking',
    localField: '_id',
    foreignField: 'property_id'
});

module.exports = mongoose.model('Property', propertySchema);
