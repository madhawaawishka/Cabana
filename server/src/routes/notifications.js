const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper to transform notification for frontend
const transformNotification = (n) => ({
    id: n._id.toString(),
    user_id: n.user_id.toString(),
    booking_id: n.booking_id?.toString() || null,
    type: n.type,
    title: n.title,
    message: n.message,
    is_read: n.is_read,
    scheduled_for: n.scheduled_for,
    created_at: n.created_at
});

// Get all due notifications for current user
router.get('/', auth, async (req, res) => {
    try {
        const now = new Date();

        const notifications = await Notification.find({
            user_id: req.user._id,
            $or: [
                { scheduled_for: null },
                { scheduled_for: { $lte: now } }
            ]
        }).sort({ created_at: -1 });

        const transformed = notifications.map(n => transformNotification(n));
        res.json({ data: transformed });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
    try {
        const now = new Date();

        const count = await Notification.countDocuments({
            user_id: req.user._id,
            is_read: false,
            $or: [
                { scheduled_for: null },
                { scheduled_for: { $lte: now } }
            ]
        });

        res.json({ count });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

// Create notification
router.post('/', auth, async (req, res) => {
    try {
        const {
            booking_id,
            type,
            title,
            message,
            scheduled_for
        } = req.body;

        const notification = new Notification({
            user_id: req.user._id,
            booking_id: booking_id || null,
            type,
            title,
            message,
            scheduled_for: scheduled_for || null
        });

        await notification.save();

        res.status(201).json({ data: transformNotification(notification) });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user._id },
            { is_read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ data: transformNotification(notification) });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all notifications as read
router.patch('/read-all', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { user_id: req.user._id, is_read: false },
            { is_read: true }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            user_id: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// Delete notifications by booking ID
router.delete('/booking/:bookingId', auth, async (req, res) => {
    try {
        await Notification.deleteMany({
            booking_id: req.params.bookingId,
            user_id: req.user._id
        });

        res.json({ message: 'Notifications deleted' });
    } catch (error) {
        console.error('Error deleting notifications:', error);
        res.status(500).json({ error: 'Failed to delete notifications' });
    }
});

module.exports = router;
