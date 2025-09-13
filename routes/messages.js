const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Room = require('../models/Room');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/messages/:roomId
// @desc    Get messages for a room
// @access  Private
router.get('/:roomId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Check if user is member of the room
    const room = await Room.findOne({
      _id: req.params.roomId,
      'members.user': req.userId,
      isActive: true
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found or access denied' });
    }

    const messages = await Message.find({
      room: req.params.roomId,
      isDeleted: false
    })
    .populate('sender', 'username avatar')
    .populate('replyTo')
    .populate('reactions.user', 'username')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip(skip);

    const totalMessages = await Message.countDocuments({
      room: req.params.roomId,
      isDeleted: false
    });

    res.json({
      messages: messages.reverse(),
      totalPages: Math.ceil(totalMessages / limit),
      currentPage: page,
      totalMessages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', auth, [
  body('content')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message content must be less than 2000 characters'),
  body('roomId')
    .notEmpty()
    .withMessage('Room ID is required'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'system'])
    .withMessage('Invalid message type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, roomId, messageType = 'text', attachments = [], replyTo } = req.body;

    // Check if user is member of the room
    const room = await Room.findOne({
      _id: roomId,
      'members.user': req.userId,
      isActive: true
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found or access denied' });
    }

    // Validate that content or attachments are provided
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ message: 'Message content or attachments required' });
    }

    const message = new Message({
      content,
      sender: req.userId,
      room: roomId,
      messageType,
      attachments,
      replyTo
    });

    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('replyTo');

    // Update room's last message
    await Room.findByIdAndUpdate(roomId, {
      lastMessage: message._id
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/messages/:id
// @desc    Edit a message
// @access  Private
router.put('/:id', auth, [
  body('content')
    .notEmpty()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;

    const message = await Message.findOne({
      _id: req.params.id,
      sender: req.userId,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found or access denied' });
    }

    // Check if message is too old to edit (24 hours)
    const hoursSinceCreation = (new Date() - message.createdAt) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(400).json({ message: 'Message is too old to edit' });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();
    await message.populate('sender', 'username avatar');

    res.json({
      message: 'Message updated successfully',
      data: message
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      sender: req.userId,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found or access denied' });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';

    await message.save();

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/:id/reactions
// @desc    Add reaction to a message
// @access  Private
router.post('/:id/reactions', auth, [
  body('emoji')
    .notEmpty()
    .withMessage('Emoji is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { emoji } = req.body;

    const message = await Message.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      reaction => reaction.user.toString() === req.userId.toString() && reaction.emoji === emoji
    );

    if (existingReaction) {
      return res.status(400).json({ message: 'Already reacted with this emoji' });
    }

    message.reactions.push({
      user: req.userId,
      emoji
    });

    await message.save();
    await message.populate('reactions.user', 'username');

    res.json({
      message: 'Reaction added successfully',
      data: message
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:id/reactions/:emoji
// @desc    Remove reaction from a message
// @access  Private
router.delete('/:id/reactions/:emoji', auth, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Remove user's reaction with this emoji
    message.reactions = message.reactions.filter(
      reaction => !(reaction.user.toString() === req.userId.toString() && reaction.emoji === req.params.emoji)
    );

    await message.save();
    await message.populate('reactions.user', 'username');

    res.json({
      message: 'Reaction removed successfully',
      data: message
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/search/:roomId
// @desc    Search messages in a room
// @access  Private
router.get('/search/:roomId', auth, async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Check if user is member of the room
    const room = await Room.findOne({
      _id: req.params.roomId,
      'members.user': req.userId,
      isActive: true
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found or access denied' });
    }

    const messages = await Message.find({
      room: req.params.roomId,
      isDeleted: false,
      content: { $regex: q, $options: 'i' }
    })
    .populate('sender', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip(skip);

    const totalMessages = await Message.countDocuments({
      room: req.params.roomId,
      isDeleted: false,
      content: { $regex: q, $options: 'i' }
    });

    res.json({
      messages: messages.reverse(),
      totalPages: Math.ceil(totalMessages / limit),
      currentPage: page,
      totalMessages,
      query: q
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
