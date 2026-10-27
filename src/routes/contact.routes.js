import { Router } from 'express';
import * as contactController from '../controllers/contact.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { uploadCsv, uploadImage } from '../middlewares/upload.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  contactIdRule,
  createContactRules,
  exportContactsRules,
  listContactsRules,
  updateContactRules,
} from '../validators/contact.validator.js';
import interactionRoutes from './interaction.routes.js';

const router = Router();

// Every contact route needs a logged-in user
router.use(protect);

router
  .route('/')
  .get(listContactsRules, validate, contactController.listContacts)
  .post(createContactRules, validate, contactController.createContact);

// Fixed paths must be registered before "/:id", otherwise "export" would be read as an id
router.get('/export', exportContactsRules, validate, contactController.exportContacts);
router.get('/recent', contactController.getRecentlyViewed);
router.post('/import', uploadCsv, contactController.importContacts);

router
  .route('/:id')
  .get(contactIdRule, validate, contactController.getContact)
  .put(updateContactRules, validate, contactController.updateContact)
  .delete(contactIdRule, validate, contactController.moveToTrash);

router.patch('/:id/favourite', contactIdRule, validate, contactController.toggleFavourite);
router.patch('/:id/restore', contactIdRule, validate, contactController.restoreContact);
router.delete('/:id/permanent', contactIdRule, validate, contactController.deletePermanently);
router.post('/:id/photo', contactIdRule, validate, uploadImage, contactController.uploadPhoto);

router.use('/:id/interactions', interactionRoutes);

export default router;
