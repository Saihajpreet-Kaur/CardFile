import mongoose from 'mongoose';
import { LIST_COLORS, LIST_LIMITS } from '../constants/index.js';

const contactListSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: [true, 'name is required'], trim: true, maxlength: LIST_LIMITS.NAME_MAX },
    description: { type: String, trim: true, maxlength: LIST_LIMITS.DESCRIPTION_MAX, default: '' },
    color: { type: String, enum: LIST_COLORS, default: 'blue' },
  },
  { timestamps: true },
);

contactListSchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 }, name: 'unique_list_name_per_user' },
);

contactListSchema.post('findOneAndDelete', async (list) => {
  if (list) await mongoose.model('Contact').updateMany({ lists: list._id }, { $pull: { lists: list._id } });
});

const ContactList = mongoose.model('ContactList', contactListSchema);

export default ContactList;

