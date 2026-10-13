import { Router } from 'express';
import { ContentCategory, ContentTag } from '../models/index.js';
import { asyncHandler } from '../middleware/auth.js';

const router = Router();
router.get('/tags', asyncHandler(async (req, res) => {
  const tags = await ContentTag.find({ active: true }).sort({ name: 1 }).select('name slug');
  res.json({ tags });
}));

router.get('/', asyncHandler(async (req, res) => {
  const filter = { active: true };
  if (['post', 'event', 'community'].includes(req.query.type)) filter.type = req.query.type;
  const categories = await ContentCategory.find(filter).sort({ type: 1, name: 1 }).select('name slug type');
  res.json({ categories });
}));
export default router;
