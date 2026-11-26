import mongoose from 'mongoose';
import { CONTACT_LIMITS, PHONE_REGEX } from '../constants/index.js';

const { ObjectId } = mongoose.Schema.Types;

const contactSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: 'User', required: true },
    firstName: {
      type: String,
      required: [true, 'firstName is required'],
      trim: true,
      maxlength: CONTACT_LIMITS.NAME_MAX,
    },
    lastName: { type: String, trim: true, maxlength: CONTACT_LIMITS.NAME_MAX, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: (value) => value === '' || PHONE_REGEX.test(value),
        message: 'Phone must contain 7-15 digits (optional leading +)',
      },
    },
    company: { type: String, trim: true, maxlength: CONTACT_LIMITS.TEXT_MAX, default: '' },
    designation: { type: String, trim: true, maxlength: CONTACT_LIMITS.TEXT_MAX, default: '' },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) => tags.length <= CONTACT_LIMITS.TAGS_MAX_COUNT,
        message: `At most ${CONTACT_LIMITS.TAGS_MAX_COUNT} tags are allowed`,
      },
    },
    notes: { type: String, maxlength: CONTACT_LIMITS.NOTES_MAX, default: '' },
    photoUrl: { type: String, default: '' },
    // Referencing (not embedding): a contact can be in many lists and a list has many contacts
    lists: [{ type: ObjectId, ref: 'ContactList' }],
    isFavourite: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    lastViewedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/* ---------------------------------------------------------------- indexes */
// Compound unique indexes: the same email / phone can exist only once per user.
// partialFilterExpression skips empty values, so many contacts may have no email.
contactSchema.index(
  { userId: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $gt: '' } }, name: 'unique_email_per_user' },
);
contactSchema.index(
  { userId: 1, phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $gt: '' } }, name: 'unique_phone_per_user' },
);
// Indexes that match the list page's queries: owner + active/trash + sort or filter field
contactSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 }, { name: 'list_by_created' });
contactSchema.index({ userId: 1, isDeleted: 1, firstName: 1 }, { name: 'list_by_name' });
contactSchema.index({ userId: 1, isDeleted: 1, tags: 1 }, { name: 'filter_by_tag' });
contactSchema.index({ userId: 1, lists: 1 }, { name: 'filter_by_list' });
contactSchema.index({ userId: 1, lastViewedAt: -1 }, { name: 'recently_viewed' });

/* ---------------------------------------------------------------- virtuals */
contactSchema.virtual('fullName').get(function fullName() {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

/* ---------------------------------------------------------------- statics */
/** Only finds a contact that belongs to the given user (active or in trash). */
contactSchema.statics.findOwned = function findOwned(userId, contactId) {
  return this.findOne({ _id: contactId, userId });
};

/* ---------------------------------------------------------------- middleware */
// Document middleware: tidy tags before every save (lower-case, no blanks, no repeats)
contactSchema.pre('save', function cleanTags() {
  this.tags = [...new Set(this.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
});

// Query middleware: a permanently deleted contact takes its interaction history with it
contactSchema.post('findOneAndDelete', async (contact) => {
  if (contact) await mongoose.model('Interaction').deleteMany({ contactId: contact._id });
});

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
