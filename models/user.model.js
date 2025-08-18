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
  phone: {
    type: Number
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
  profileCoverImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  profession: {
    type: String,
    enum: ['nurse', 'doctor', 'scientist', 'professor', 'artist', 'chef', 'manager', 'pilot', 'firefighter', 'developer', 'other']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  relationship: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed', 'separated', 'other'],
  },
  relationshipDescription: {
    type: String,
  },
  professionSymbol: {
     iconUrl: { type: String, default: '' },
    name: { type: String, default: '' }
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
  dateOfBirth: { type: Date },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned', 'deleted'],
    default: 'active'
  },
  resetPasswordToken: {
    type: String,
  },
  countryOfOrigin: {
    code: { type: String, default: '' },
    name: { type: String, default: '' }
  },
  currentCountry: {
    code: { type: String, default: '' },
    name: { type: String, default: '' }
  },
  entryYear: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  }
}, {
  timestamps: true
});

module.exports = model('User', userSchema);