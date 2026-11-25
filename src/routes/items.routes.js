import { Router } from 'express';
import { getItem, listItems, listItemsQuerySchema } from '../controllers/items.controller.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', validate(listItemsQuerySchema, 'query'), listItems);
router.get('/:id', getItem);

export default router;
