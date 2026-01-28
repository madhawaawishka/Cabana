const express = require('express');
const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper to transform invoice for frontend
const transformInvoice = (i, booking = null) => ({
    id: i._id.toString(),
    booking_id: i.booking_id.toString(),
    invoice_number: i.invoice_number,
    amount: i.amount,
    tax: i.tax,
    total: i.total,
    custom_fields: i.custom_fields,
    status: i.status,
    pdf_url: i.pdf_url,
    created_at: i.created_at,
    booking: booking ? {
        id: booking._id.toString(),
        customer_name: booking.customer_name
    } : undefined
});

// Get invoice for a booking
router.get('/booking/:bookingId', auth, async (req, res) => {
    try {
        const invoice = await Invoice.findOne({ booking_id: req.params.bookingId });

        if (!invoice) {
            return res.json({ data: null });
        }

        // Verify booking's property belongs to user
        const booking = await Booking.findById(invoice.booking_id);
        if (!booking) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const property = await Property.findOne({
            _id: booking.property_id,
            owner_id: req.user._id
        });

        if (!property) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json({ data: transformInvoice(invoice, booking) });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// Get single invoice
router.get('/:id', auth, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Verify booking's property belongs to user
        const booking = await Booking.findById(invoice.booking_id);
        if (!booking) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const property = await Property.findOne({
            _id: booking.property_id,
            owner_id: req.user._id
        });

        if (!property) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json({ data: transformInvoice(invoice, booking) });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// Create invoice
router.post('/', auth, async (req, res) => {
    try {
        const {
            booking_id,
            invoice_number,
            amount,
            tax,
            total,
            custom_fields,
            pdf_url
        } = req.body;

        // Verify booking's property belongs to user
        const booking = await Booking.findById(booking_id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const property = await Property.findOne({
            _id: booking.property_id,
            owner_id: req.user._id
        });

        if (!property) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const invoice = new Invoice({
            booking_id,
            invoice_number,
            amount,
            tax: tax || 0,
            total,
            custom_fields: custom_fields || [],
            pdf_url: pdf_url || null
        });

        await invoice.save();

        res.status(201).json({ data: transformInvoice(invoice, booking) });
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

// Update invoice
router.patch('/:id', auth, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);

        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Verify booking's property belongs to user
        const booking = await Booking.findById(invoice.booking_id);
        if (!booking) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const property = await Property.findOne({
            _id: booking.property_id,
            owner_id: req.user._id
        });

        if (!property) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const updates = req.body;
        Object.keys(updates).forEach(key => {
            invoice[key] = updates[key];
        });

        await invoice.save();

        res.json({ data: transformInvoice(invoice, booking) });
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).json({ error: 'Failed to update invoice' });
    }
});

module.exports = router;
