import { Router } from 'express';
import { z } from 'zod';
import { ChatMessage, Community, Membership } from '../models/index.js';
import { asyncHandler, requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function requireMember(communityId, userId) {
  const community = await Community.findOne({_id: communityId, status:'approved'});
  if (!community) return { error: 'Community not found or not approved', status:404 };
  const isOwner = String(community.owner) === String(userId);
  const isModerator = community.moderators.some(id => String(id) === String(userId));
  const membership = await Membership.findOne({community:communityId,user:userId,status:'approved'});
  if (!isOwner && !isModerator && !membership) return { error:'Only approved community members can use this chat', status:403 };
  return { community };
}

// List communities where the current user can chat.
router.get('/communities', asyncHandler(async(req,res)=>{
  const memberships = await Membership.find({user:req.user._id,status:'approved'}).select('community');
  const ids = memberships.map(m=>m.community);
  const communities = await Community.find({
    status:'approved',
    $or:[{_id:{$in:ids}},{owner:req.user._id},{moderators:req.user._id}]
  }).select('name slug avatar coverImage location owner moderators').sort({name:1});
  res.json({communities});
}));

router.get('/:communityId/messages', asyncHandler(async(req,res)=>{
  const access = await requireMember(req.params.communityId, req.user._id);
  if(access.error) return res.status(access.status).json({message:access.error});
  const limit = Math.min(100, Math.max(1, Number(req.query.limit)||50));
  const before = req.query.before ? new Date(req.query.before) : null;
  const filter = {community:req.params.communityId};
  if(before && !Number.isNaN(before.getTime())) filter.createdAt={$lt:before};
  const messages = await ChatMessage.find(filter).sort({createdAt:-1}).limit(limit)
    .populate('sender','name username avatar');
  res.json({messages:messages.reverse()});
}));

router.post('/:communityId/messages', asyncHandler(async(req,res)=>{
  const parsed = z.object({content:z.string().trim().min(1).max(2000)}).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({message:'Message must contain 1–2000 characters'});
  const access = await requireMember(req.params.communityId, req.user._id);
  if(access.error) return res.status(access.status).json({message:access.error});
  const message = await ChatMessage.create({community:req.params.communityId,sender:req.user._id,content:parsed.data.content});
  await message.populate('sender','name username avatar');
  res.status(201).json({message});
}));

export default router;
