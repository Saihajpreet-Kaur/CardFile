import { Router } from 'express';
import * as listController from '../controllers/list.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  changeMembersRules,
  createListRules,
  listIdRule,
  updateListRules,
} from '../validators/list.validator.js';

const router = Router();

router.use(protect);

router.route('/').get(listController.getLists).post(createListRules, validate, listController.createList);

router
  .route('/:id')
  .put(updateListRules, validate, listController.updateList)
  .delete(listIdRule, validate, listController.deleteList);

router.patch('/:id/contacts', changeMembersRules, validate, listController.changeMembers);

export default router;

