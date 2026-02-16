import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      enum: ['seminar', 'workshop', 'assignment', 'exam', 'other'],
      required: true,
      index: true,
    },
    department: String,
    subject: String,
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    location: String,
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizerName: {
      type: String,
      required: true,
    },
    attendees: {
      type: Number,
      default: 0,
    },
    registeredUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ startDate: 1, isPublished: 1 });
eventSchema.index({ title: 'text', description: 'text' });

export const Event = mongoose.model('Event', eventSchema);
