const mongoose = require('mongoose');

const { Schema, model, Types } = mongoose;

const userSchema = new Schema({
  username: {
    type: String,
    index: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  googleId: {
    type: String,
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  profession: {
    type: String,
    enum: ['Engineer', 'Designer', 'Other'],
    default: 'Other'
  },
  education: {
    type: [String],
    default: []
  },
  followers: {
    type: [Types.ObjectId],
    ref: 'User',
    default: []
  },
  following: {
    type: [Types.ObjectId],
    ref: 'User',
    default: []
  },
  settings: {
    type: Types.ObjectId,
    ref: 'UserSettings'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active'
  },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  }
}, {
  timestamps: true
});

module.exports = model('User', userSchema);