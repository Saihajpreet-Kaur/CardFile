
import mongoose from 'mongoose';
import { INTERACTION_TYPES } from '../constants/index.js';

const { ObjectId } = mongoose.Schema.Types;

const interactionSchema = new mongoose.Schema(
  {
    contactId: { type: ObjectId, ref: 'Contact', required: true },
    userId: { type: ObjectId, ref: 'User', required: true },
    type: { type: String, enum: INTERACTION_TYPES, required: true },
    note: { type: String, trim: true, required: true, maxlength: 1000 },
    date: { type: Date, default: Date.now },
    followUpDate: { type: Date, default: null },
    followUpDone: { type: Boolean, default: false },
  },
  { timestamps: true },
);

interactionSchema.index({ contactId: 1, date: -1 });
interactionSchema.index({ userId: 1, followUpDone: 1, followUpDate: 1 });

const Interaction = mongoose.model('Interaction', interactionSchema);

export default Interaction;
