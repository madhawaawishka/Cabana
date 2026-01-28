const express = require('express');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Housekeeping = require('../models/Housekeeping');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper to transform booking for frontend
const transformBooking = (b, property = null) => ({
    id: b._id.toString(),
    property_id: b.property_id.toString(),
    customer_name: b.customer_name,
    customer_email: b.customer_email,
    customer_phone: b.customer_phone,
    check_in_date: b.check_in_date,
    check_out_date: b.check_out_date,
    check_in_time: b.check_in_time,
    check_out_time: b.check_out_time,
    total_amount: b.total_amount,
    is_paid: b.is_paid,
    color: b.color,
    notes: b.notes,
    created_at: b.created_at,
    property: property ? {
        id: property._id.toString(),
        name: property.name,
        photo_url: property.photo_url
    } : undefined
});

// Get all bookings for user's properties
router.get('/', auth, async (req, res) => {
    try {
        // Get user's property IDs
        const properties = await Property.find({ owner_id: req.user._id });
        const propertyIds = properties.map(p => p._id);

        const bookings = await Booking.find({ property_id: { $in: propertyIds } })
            .sort({ check_in_date: 1 });

        const transformed = bookings.map(b => transformBooking(b));
        res.json({ data: transformed });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Get bookings for a specific property
router.get('/property/:propertyId', auth, async (req, res) => {
    try {
        // Verify property belongs to user
        const property = await Property.findOne({
            _id: req.params.propertyId,
            owner_id: req.user._id
        });

        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }

        const bookings = await Booking.find({ property_id: property._id })
            .sort({ check_in_date: 1 });

        const transformed = bookings.map(b => transformBooking(b));
        res.json({ data: transformed });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Get single booking
router.get('/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Verify booking's property belongs to user
        const property = await Property.findOne({
            _id: booking.property_id,
            owner_id: req.user._id
        });

        if (!property) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json({ data: transformBooking(booking, property) });
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});

// Create booking
router.post('/', auth, async (req, res) => {
    try {
        const {
            property_id,
            customer_name,
            customer_email,
            customer_phone,
            check_in_date,
            check_out_date,
            check_in_time,
            check_out_time,
            total_amount,
            is_paid,
            color,
            notes
        } = req.body;

        // Verify property belongs to user
        const property = await Property.findOne({
            _id: property_id,
            owner_id: req.user._id
        });

        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }

        const booking = new Booking({
            property_id,
            customer_name,
            customer_email: customer_email || null,
            customer_phone: customer_phone || null,
            check_in_date,
            check_out_date,
            check_in_time: check_in_time || '14:00',
            check_out_time: check_out_time || '11:00',
            total_amount: total_amount || null,
            is_paid: is_paid || false,
            color,
            notes: notes || null
        });

        await booking.save();

        // Create housekeeping entry
        const housekeeping = new Housekeeping({
            property_id: booking.property_id,
            booking_id: booking._id,
            is_clean: false
        });
        await housekeeping.save();

        res.status(201).json({ data: transformBooking(booking) });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// Update booking
router.patch('/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Verify booking's property belongs to user
        const property = await Property.findOne({
            _id: booking.property_id,
            owner_id: req.user._id
        });

        if (!property) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const updates = req.body;
        Object.keys(updates).forEach(key => {
            booking[key] = updates[key];
        });

        await booking.save();

        res.json({ data: transformBooking(booking) });
    } catch (error) {
        console.error('Error updating booking:', error);
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

// Delete booking
router.delete('/:id', auth, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Verify booking's property belongs to user
        const property = await Property.findOne({
            _id: booking.property_id,
            owner_id: req.user._id
        });

        if (!property) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Delete related housekeeping entries
        await Housekeeping.deleteMany({ booking_id: booking._id });

        // Delete related notifications
        const Notification = require('../models/Notification');
        await Notification.deleteMany({ booking_id: booking._id });

        await booking.deleteOne();

        res.json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ error: 'Failed to delete booking' });
    }
});

module.exports = router;
