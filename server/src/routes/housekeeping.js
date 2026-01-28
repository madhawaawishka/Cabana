const express = require('express');
const Housekeeping = require('../models/Housekeeping');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper to transform housekeeping for frontend
const transformHousekeeping = (h, property = null, booking = null) => ({
    id: h._id.toString(),
    property_id: h.property_id.toString(),
    booking_id: h.booking_id.toString(),
    is_clean: h.is_clean,
    cleaned_by: h.cleaned_by?.toString() || null,
    cleaned_at: h.cleaned_at,
    verified_by_owner: h.verified_by_owner,
    created_at: h.created_at,
    property: property ? {
        id: property._id.toString(),
        name: property.name
    } : undefined,
    booking: booking ? {
        id: booking._id.toString(),
        customer_name: booking.customer_name,
        check_out_date: booking.check_out_date
    } : undefined
});

// Get all housekeeping for user's properties
router.get('/', auth, async (req, res) => {
    try {
        // Get user's property IDs
        const properties = await Property.find({ owner_id: req.user._id });
        const propertyIds = properties.map(p => p._id);
        const propertyMap = {};
        properties.forEach(p => { propertyMap[p._id.toString()] = p; });

        const housekeepingItems = await Housekeeping.find({ property_id: { $in: propertyIds } })
            .sort({ created_at: -1 });

        // Get all related bookings
        const bookingIds = housekeepingItems.map(h => h.booking_id);
        const bookings = await Booking.find({ _id: { $in: bookingIds } });
        const bookingMap = {};
        bookings.forEach(b => { bookingMap[b._id.toString()] = b; });

        const transformed = housekeepingItems.map(h =>
            transformHousekeeping(
                h,
                propertyMap[h.property_id.toString()],
                bookingMap[h.booking_id.toString()]
            )
        );

        res.json({ data: transformed });
    } catch (error) {
        console.error('Error fetching housekeeping:', error);
        res.status(500).json({ error: 'Failed to fetch housekeeping' });
    }
});

// Update housekeeping status
router.patch('/:id', auth, async (req, res) => {
    try {
        const housekeeping = await Housekeeping.findById(req.params.id);

        if (!housekeeping) {
            return res.status(404).json({ error: 'Housekeeping not found' });
        }

        // Verify property belongs to user
        const property = await Property.findOne({
            _id: housekeeping.property_id,
            owner_id: req.user._id
        });

        if (!property) {
            return res.status(404).json({ error: 'Housekeeping not found' });
        }

        const { is_clean, verified_by_owner } = req.body;

        if (is_clean !== undefined) {
            housekeeping.is_clean = is_clean;
            housekeeping.cleaned_by = is_clean ? req.user._id : null;
            housekeeping.cleaned_at = is_clean ? new Date() : null;
        }

        if (verified_by_owner !== undefined) {
            housekeeping.verified_by_owner = verified_by_owner;
        }

        await housekeeping.save();

        const booking = await Booking.findById(housekeeping.booking_id);
        res.json({ data: transformHousekeeping(housekeeping, property, booking) });
    } catch (error) {
        console.error('Error updating housekeeping:', error);
        res.status(500).json({ error: 'Failed to update housekeeping' });
    }
});

module.exports = router;
