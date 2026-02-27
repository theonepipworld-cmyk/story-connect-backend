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
    _id: { type: mongoose.Schema.Types.ObjectId },
    iconUrl: { type: String, default: '' },
    name: { type: String, default: '' }
  },
  education: {
    type: [String],
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
    enum: ['active', 'inactive', 'banned', 'deleted', 'suspended'],
    default: 'active'
  },
  resetPasswordToken: {
    type: String,
  },
  countryOfOrigin: {
    _id: { type: mongoose.Schema.Types.ObjectId },
    code: { type: String, default: '' },
    name: { type: String, default: '' }
  },
  currentCountry: {
    _id: { type: mongoose.Schema.Types.ObjectId },
    code: { type: String, default: '' },
    name: { type: String, default: '' }
  },
  entryYear: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  manualProfession: {
    type: String
  },
  device_token: {
    type: String,
    required: false,
  },
  language: {
    type: String,
    enum: ['en', 'fr', 'es', 'cr'],
    default: 'en'
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  isPushNotification: {
    type: Boolean,
    default: true
  },
  accountState: {
    type: String,
    enum: ['normal', 'warning', 'suspended'],
    default: 'normal'
  },
  dateOfSuspend: {
    type: Date
  },


}, {
  timestamps: true
});

module.exports = model('User', userSchema);