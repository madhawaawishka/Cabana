const express = require('express');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all properties for current user
router.get('/', auth, async (req, res) => {
    try {
        const properties = await Property.find({ owner_id: req.user._id })
            .sort({ created_at: -1 });

        // Transform _id to id for frontend compatibility
        const transformed = properties.map(p => ({
            id: p._id.toString(),
            owner_id: p.owner_id.toString(),
            name: p.name,
            photo_url: p.photo_url,
            created_at: p.created_at
        }));

        res.json({ data: transformed });
    } catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ error: 'Failed to fetch properties' });
    }
});

// Get single property with bookings
router.get('/:id', auth, async (req, res) => {
    try {
        const property = await Property.findOne({
            _id: req.params.id,
            owner_id: req.user._id
        });

        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }

        // Get bookings for this property
        const bookings = await Booking.find({ property_id: property._id })
            .sort({ check_in_date: -1 });

        const transformedBookings = bookings.map(b => ({
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
            created_at: b.created_at
        }));

        res.json({
            data: {
                id: property._id.toString(),
                owner_id: property.owner_id.toString(),
                name: property.name,
                photo_url: property.photo_url,
                created_at: property.created_at,
                bookings: transformedBookings
            }
        });
    } catch (error) {
        console.error('Error fetching property:', error);
        res.status(500).json({ error: 'Failed to fetch property' });
    }
});

// Create property
router.post('/', auth, async (req, res) => {
    try {
        const { name, photo_url } = req.body;

        const property = new Property({
            owner_id: req.user._id,
            name,
            photo_url: photo_url || null
        });

        await property.save();

        res.status(201).json({
            data: {
                id: property._id.toString(),
                owner_id: property.owner_id.toString(),
                name: property.name,
                photo_url: property.photo_url,
                created_at: property.created_at
            }
        });
    } catch (error) {
        console.error('Error creating property:', error);
        res.status(500).json({ error: 'Failed to create property' });
    }
});

// Update property
router.patch('/:id', auth, async (req, res) => {
    try {
        const property = await Property.findOneAndUpdate(
            { _id: req.params.id, owner_id: req.user._id },
            { $set: req.body },
            { new: true }
        );

        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }

        res.json({
            data: {
                id: property._id.toString(),
                owner_id: property.owner_id.toString(),
                name: property.name,
                photo_url: property.photo_url,
                created_at: property.created_at
            }
        });
    } catch (error) {
        console.error('Error updating property:', error);
        res.status(500).json({ error: 'Failed to update property' });
    }
});

// Delete property (cascades to bookings, housekeeping)
router.delete('/:id', auth, async (req, res) => {
    try {
        const property = await Property.findOneAndDelete({
            _id: req.params.id,
            owner_id: req.user._id
        });

        if (!property) {
            return res.status(404).json({ error: 'Property not found' });
        }

        // Delete related bookings and housekeeping entries
        const Housekeeping = require('../models/Housekeeping');
        await Booking.deleteMany({ property_id: property._id });
        await Housekeeping.deleteMany({ property_id: property._id });

        res.json({ message: 'Property deleted successfully' });
    } catch (error) {
        console.error('Error deleting property:', error);
        res.status(500).json({ error: 'Failed to delete property' });
    }
});

module.exports = router;
