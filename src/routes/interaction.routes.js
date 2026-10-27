import { Router } from 'express';
import * as interactionController from '../controllers/interaction.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createInteractionRules,
  deleteInteractionRules,
  listInteractionsRules,
} from '../validators/interaction.validator.js';

// Mounted at /api/contacts/:id/interactions - mergeParams gives access to :id
const router = Router({ mergeParams: true });

router
  .route('/')
  .get(listInteractionsRules, validate, interactionController.listInteractions)
  .post(createInteractionRules, validate, interactionController.addInteraction);

router.delete(
  '/:interactionId',
  deleteInteractionRules,
  validate,
  interactionController.deleteInteraction,
);

export default router;
