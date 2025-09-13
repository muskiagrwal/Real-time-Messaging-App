const express = require('express');
const { body, validationResult } = require('express-validator');
const Room = require('../models/Room');
const User = require('../models/User');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/rooms
// @desc    Get all rooms for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find({
      'members.user': req.userId,
      isActive: true
    })
    .populate('createdBy', 'username avatar')
    .populate('members.user', 'username avatar isOnline')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/rooms/available
// @desc    Get all public rooms available to join
// @access  Private
router.get('/available', auth, async (req, res) => {
  try {
    const rooms = await Room.find({
      type: 'public',
      isActive: true,
      'members.user': { $ne: req.userId } // Exclude rooms user is already in
    })
    .populate('createdBy', 'username avatar')
    .populate('members.user', 'username avatar isOnline')
    .populate('lastMessage')
    .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    console.error('Get available rooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private
router.post('/', auth, [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Room name must be between 1 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description must be less than 200 characters'),
  body('type')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('Type must be either public or private')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, type = 'public' } = req.body;

    const room = new Room({
      name,
      description,
      type,
      createdBy: req.userId,
      members: [{
        user: req.userId,
        role: 'admin'
      }]
    });

    await room.save();
    await room.populate('createdBy', 'username avatar');
    await room.populate('members.user', 'username avatar isOnline');

    res.status(201).json({
      message: 'Room created successfully',
      room
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/rooms/:id
// @desc    Get room by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      'members.user': req.userId,
      isActive: true
    })
    .populate('createdBy', 'username avatar')
    .populate('members.user', 'username avatar isOnline')
    .populate('lastMessage');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/rooms/:id
// @desc    Update room
// @access  Private (Admin only)
router.put('/:id', auth, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Room name must be between 1 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description must be less than 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const room = await Room.findOne({
      _id: req.params.id,
      'members.user': req.userId,
      'members.role': 'admin',
      isActive: true
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found or insufficient permissions' });
    }

    const { name, description } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const updatedRoom = await Room.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
    .populate('createdBy', 'username avatar')
    .populate('members.user', 'username avatar isOnline')
    .populate('lastMessage');

    res.json({
      message: 'Room updated successfully',
      room: updatedRoom
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/rooms/:id/join
// @desc    Join a room
// @access  Private
router.post('/:id/join', auth, async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is already a member
    const isMember = room.members.some(member => 
      member.user.toString() === req.userId.toString()
    );

    if (isMember) {
      return res.status(400).json({ message: 'Already a member of this room' });
    }

    // Add user to room
    room.members.push({
      user: req.userId,
      role: 'member'
    });

    await room.save();
    await room.populate('members.user', 'username avatar isOnline');

    res.json({
      message: 'Successfully joined room',
      room
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/rooms/:id/leave
// @desc    Leave a room
// @access  Private
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      'members.user': req.userId,
      isActive: true
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is admin
    const member = room.members.find(member => 
      member.user.toString() === req.userId.toString()
    );

    if (member.role === 'admin') {
      return res.status(400).json({ 
        message: 'Admin cannot leave room. Transfer ownership first.' 
      });
    }

    // Remove user from room
    room.members = room.members.filter(member => 
      member.user.toString() !== req.userId.toString()
    );

    await room.save();

    res.json({ message: 'Successfully left room' });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/rooms/:id/members
// @desc    Add member to room
// @access  Private (Admin/Moderator only)
router.post('/:id/members', auth, [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.body;

    const room = await Room.findOne({
      _id: req.params.id,
      'members.user': req.userId,
      'members.role': { $in: ['admin', 'moderator'] },
      isActive: true
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found or insufficient permissions' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const isMember = room.members.some(member => 
      member.user.toString() === userId
    );

    if (isMember) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    // Add user to room
    room.members.push({
      user: userId,
      role: 'member'
    });

    await room.save();
    await room.populate('members.user', 'username avatar isOnline');

    res.json({
      message: 'User added to room successfully',
      room
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/rooms/:id/members/:userId
// @desc    Remove member from room
// @access  Private (Admin/Moderator only)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id,
      'members.user': req.userId,
      'members.role': { $in: ['admin', 'moderator'] },
      isActive: true
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found or insufficient permissions' });
    }

    // Check if trying to remove admin
    const memberToRemove = room.members.find(member => 
      member.user.toString() === req.params.userId
    );

    if (memberToRemove && memberToRemove.role === 'admin') {
      return res.status(400).json({ message: 'Cannot remove admin from room' });
    }

    // Remove user from room
    room.members = room.members.filter(member => 
      member.user.toString() !== req.params.userId
    );

    await room.save();

    res.json({ message: 'User removed from room successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/rooms/direct
// @desc    Create or get direct message room
// @access  Private
router.post('/direct', auth, [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if direct room already exists
    let room = await Room.findOne({
      type: 'direct',
      $and: [
        { 'members.user': req.userId },
        { 'members.user': userId }
      ],
      isActive: true
    })
    .populate('members.user', 'username avatar isOnline')
    .populate('lastMessage');

    if (room) {
      return res.json({
        message: 'Direct room found',
        room
      });
    }

    // Create new direct room
    room = new Room({
      name: `Direct Message`,
      type: 'direct',
      createdBy: req.userId,
      members: [
        { user: req.userId, role: 'member' },
        { user: userId, role: 'member' }
      ]
    });

    await room.save();
    await room.populate('members.user', 'username avatar isOnline');

    res.status(201).json({
      message: 'Direct room created successfully',
      room
    });
  } catch (error) {
    console.error('Create direct room error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
