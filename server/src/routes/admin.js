import { Router } from 'express'; import { z } from 'zod'; import { User, Community, Post, Comment, Event, EventRegistration, Membership, Report, AuditLog, ContentCategory, ContentTag, DailyActiveUser } from '../models/index.js'; import { notify } from '../services/notify.js'; import { asyncHandler, requireAuth } from '../middleware/auth.js';
const router=Router();router.use(requireAuth,(req,res,next)=>req.user.role==='admin'?next():res.status(403).json({message:`Admin permission required. Current account role: ${req.user.role}. Run npm run seed:admin with the intended ADMIN_EMAIL, then log out and log in again.`}));
router.get('/me',asyncHandler(async(req,res)=>res.json({user:{_id:req.user._id,email:req.user.email,name:req.user.name,role:req.user.role}})));router.get('/overview',asyncHandler(async(req,res)=>{const [totalUsers,totalCommunities,pendingCommunities,totalPosts,totalEvents,pendingReports,activeUsers]=await Promise.all([User.countDocuments(),Community.countDocuments({status:'approved'}),Community.countDocuments({status:'pending'}),Post.countDocuments({status:'active'}),Event.countDocuments(),Report.countDocuments({status:'pending'}),User.countDocuments({accountStatus:'active'})]);res.json({totalUsers,activeUsers,totalCommunities,pendingCommunities,totalPosts,totalEvents,pendingReports});}));router.get('/analytics',asyncHandler(async(req,res)=>{
  const today=new Date();
  today.setUTCHours(0,0,0,0);
  const windowStart=new Date(today);
  windowStart.setUTCDate(windowStart.getUTCDate()-29); // 30 UTC calendar days including today
  const previousStart=new Date(windowStart);
  previousStart.setUTCDate(previousStart.getUTCDate()-30);

  const [users,communities,posts,dailyActivityRows,dailyActiveUsersToday,postStats,currentCommunityCount,previousCommunityCount,recentEvents]=await Promise.all([
    User.aggregate([
      {$match:{createdAt:{$gte:windowStart}}},
      {$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt',timezone:'UTC'}},count:{$sum:1}}},
      {$sort:{_id:1}}
    ]),
    Community.aggregate([
      {$match:{createdAt:{$gte:windowStart},status:'approved'}},
      {$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt',timezone:'UTC'}},count:{$sum:1}}},
      {$sort:{_id:1}}
    ]),
    Post.aggregate([
      {$match:{createdAt:{$gte:windowStart},status:'active'}},
      {$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$createdAt',timezone:'UTC'}},count:{$sum:1}}},
      {$sort:{_id:1}}
    ]),
    DailyActiveUser.aggregate([
      {$match:{day:{$gte:windowStart,$lte:today}}},
      {$group:{_id:{$dateToString:{format:'%Y-%m-%d',date:'$day',timezone:'UTC'}},count:{$sum:1}}},
      {$sort:{_id:1}}
    ]),
    DailyActiveUser.countDocuments({day:today}),
    Post.aggregate([
      {$match:{createdAt:{$gte:windowStart},status:'active'}},
      {$lookup:{from:Comment.collection.name,let:{postId:'$_id'},pipeline:[
        {$match:{$expr:{$and:[{$eq:['$post','$$postId']},{$eq:['$status','active']}]}}},
        {$limit:1}
      ],as:'activeComments'}},
      {$project:{engaged:{$or:[
        {$gt:[{$size:{$ifNull:['$likes',[]]}},0]},
        {$gt:[{$size:'$activeComments'},0]}
      ]}}},
      {$group:{_id:null,totalPosts:{$sum:1},engagedPosts:{$sum:{$cond:['$engaged',1,0]}}}}
    ]),
    Community.countDocuments({status:'approved',createdAt:{$gte:windowStart}}),
    Community.countDocuments({status:'approved',createdAt:{$gte:previousStart,$lt:windowStart}}),
    Event.find({createdAt:{$gte:windowStart},status:{$ne:'cancelled'}}).select('_id community').lean()
  ]);

  const dailyActiveMap=new Map(dailyActivityRows.map(row=>[row._id,row.count]));
  const dailyActiveUsers=[];
  for(let offset=0;offset<30;offset++){
    const day=new Date(windowStart);
    day.setUTCDate(day.getUTCDate()+offset);
    const key=day.toISOString().slice(0,10);
    dailyActiveUsers.push({_id:key,count:dailyActiveMap.get(key)||0});
  }

  const totalPosts=postStats[0]?.totalPosts||0;
  const engagedPosts=postStats[0]?.engagedPosts||0;
  const postEngagementRate=totalPosts?Math.round((engagedPosts/totalPosts)*1000)/10:0;

  let eventRegistrations=0;
  let eligibleParticipationSlots=0;
  if(recentEvents.length){
    const eventIds=recentEvents.map(event=>event._id);
    const communityIds=[...new Map(recentEvents.map(event=>[String(event.community),event.community])).values()];
    const [registrations,membershipCounts]=await Promise.all([
      EventRegistration.aggregate([
        {$match:{event:{$in:eventIds},status:'registered'}},
        {$group:{_id:'$event',count:{$sum:1}}}
      ]),
      Membership.aggregate([
        {$match:{community:{$in:communityIds},status:'approved'}},
        {$group:{_id:'$community',count:{$sum:1}}}
      ])
    ]);
    eventRegistrations=registrations.reduce((sum,row)=>sum+row.count,0);
    const membersByCommunity=new Map(membershipCounts.map(row=>[String(row._id),row.count]));
    eligibleParticipationSlots=recentEvents.reduce((sum,event)=>sum+(membersByCommunity.get(String(event.community))||0),0);
  }
  const eventParticipationRate=eligibleParticipationSlots?Math.round((eventRegistrations/eligibleParticipationSlots)*1000)/10:0;
  const communityGrowthRate=previousCommunityCount?Math.round(((currentCommunityCount-previousCommunityCount)/previousCommunityCount)*1000)/10:null;

  res.json({
    windowDays:30,
    timeZone:'UTC',
    trackingNote:'Daily active-user history is collected from the date this version is deployed; days before deployment may show zero because activity was not recorded.',
    users,communities,posts,dailyActiveUsers,
    kpis:{
      dailyActiveUsers:dailyActiveUsersToday,
      postEngagementRate:{rate:postEngagementRate,engagedPosts,totalPosts},
      eventParticipationRate:{rate:eventParticipationRate,registrations:eventRegistrations,eligibleParticipationSlots,events:recentEvents.length},
      communityGrowthRate:{rate:communityGrowthRate,currentPeriod:currentCommunityCount,previousPeriod:previousCommunityCount}
    }
  });
}));router.get('/users',asyncHandler(async(req,res)=>{const page=Math.max(1,Number(req.query.page)||1),limit=Math.min(100,Number(req.query.limit)||25),filter={};if(req.query.search)filter.$or=[{name:{$regex:String(req.query.search),$options:'i'}},{email:{$regex:String(req.query.search),$options:'i'}}];const [users,total]=await Promise.all([User.find(filter).select('-passwordHash').sort({createdAt:-1}).skip((page-1)*limit).limit(limit),User.countDocuments(filter)]);res.json({users,total,page,limit});}));router.patch('/users/:id/status',asyncHandler(async(req,res)=>{const v=z.object({accountStatus:z.enum(['active','suspended'])}).parse(req.body);if(String(req.user._id)===req.params.id)return res.status(400).json({message:'You cannot suspend your own account'});const user=await User.findByIdAndUpdate(req.params.id,{$set:{accountStatus:v.accountStatus}},{new:true}).select('-passwordHash');if(!user)return res.status(404).json({message:'User not found'});await AuditLog.create({actor:req.user._id,action:'user.status_changed',targetType:'user',targetId:user._id,metadata:{accountStatus:v.accountStatus}});res.json({user});}));router.get('/communities/pending',asyncHandler(async(req,res)=>{const communities=await Community.find({status:'pending'}).sort({createdAt:1}).populate('owner','name email');res.json({communities});}));router.patch('/communities/:id/approval',asyncHandler(async(req,res)=>{const v=z.object({status:z.enum(['approved','rejected'])}).parse(req.body);const community=await Community.findById(req.params.id).populate('owner','name email');if(!community)return res.status(404).json({message:'Community not found'});if(!['pending','approved','rejected'].includes(community.status))return res.status(409).json({message:`Community cannot be reviewed from status: ${community.status}`});community.status=v.status;await community.save();await AuditLog.create({actor:req.user._id,action:'community.approval',targetType:'community',targetId:community._id,metadata:{status:v.status}});await notify(community.owner._id,'community_decision',`Community ${v.status}`,`Your community “${community.name}” was ${v.status} by the platform administrator.`,community._id,'community');res.json({community});}));router.get('/reports',asyncHandler(async(req,res)=>{const filter={};if(req.query.status)filter.status=req.query.status;const reports=await Report.find(filter).sort({createdAt:-1}).limit(100).populate('reporter','name email');res.json({reports});}));
router.get('/moderator-candidates/:communityId',asyncHandler(async(req,res)=>{const community=await Community.findOne({_id:req.params.communityId,status:'approved'});if(!community)return res.status(404).json({message:'Community not found'});const memberships=await Membership.find({community:community._id,status:'approved',role:'member'}).populate('user','name email accountStatus').sort({createdAt:-1}).limit(500);res.json({memberships});}));
router.get('/categories',asyncHandler(async(req,res)=>{const filter={};if(['post','event','community'].includes(req.query.type))filter.type=req.query.type;const categories=await ContentCategory.find(filter).sort({type:1,name:1});res.json({categories});}));
router.post('/categories',asyncHandler(async(req,res)=>{const v=z.object({name:z.string().trim().min(2).max(60),type:z.enum(['post','event','community'])}).parse(req.body);const slug=v.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,60);if(!slug)return res.status(400).json({message:'Category name must contain letters or numbers'});const category=await ContentCategory.create({...v,slug,createdBy:req.user._id});await AuditLog.create({actor:req.user._id,action:'category.created',targetType:'category',targetId:category._id,metadata:{name:category.name,type:category.type}});res.status(201).json({category});}));
router.patch('/categories/:id',asyncHandler(async(req,res)=>{const v=z.object({active:z.boolean().optional(),name:z.string().trim().min(2).max(60).optional()}).refine(value=>Object.keys(value).length>0,{message:'Provide a category update'}).parse(req.body);const category=await ContentCategory.findById(req.params.id);if(!category)return res.status(404).json({message:'Category not found'});if(v.name){category.name=v.name;category.slug=v.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,60)}if(v.active!==undefined)category.active=v.active;await category.save();await AuditLog.create({actor:req.user._id,action:'category.updated',targetType:'category',targetId:category._id,metadata:v});res.json({category});}));
router.get('/tags',asyncHandler(async(req,res)=>{const tags=await ContentTag.find().sort({name:1});res.json({tags});}));
router.post('/tags',asyncHandler(async(req,res)=>{const v=z.object({name:z.string().trim().min(2).max(40)}).parse(req.body);const slug=v.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,40);if(!slug)return res.status(400).json({message:'Tag must contain letters or numbers'});const tag=await ContentTag.create({...v,slug,createdBy:req.user._id});await AuditLog.create({actor:req.user._id,action:'tag.created',targetType:'tag',targetId:tag._id,metadata:{name:tag.name}});res.status(201).json({tag});}));
router.patch('/tags/:id',asyncHandler(async(req,res)=>{const v=z.object({active:z.boolean().optional(),name:z.string().trim().min(2).max(40).optional()}).refine(value=>Object.keys(value).length>0,{message:'Provide a tag update'}).parse(req.body);const tag=await ContentTag.findById(req.params.id);if(!tag)return res.status(404).json({message:'Tag not found'});if(v.name){tag.name=v.name;tag.slug=v.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,40)}if(v.active!==undefined)tag.active=v.active;await tag.save();await AuditLog.create({actor:req.user._id,action:'tag.updated',targetType:'tag',targetId:tag._id,metadata:v});res.json({tag});}));
router.get('/moderators',asyncHandler(async(req,res)=>{const moderators=await Membership.find({role:'moderator',status:'approved'}).populate('user','name email').populate('community','name slug');res.json({moderators});}));
router.post('/moderators',asyncHandler(async(req,res)=>{const v=z.object({userId:z.string().regex(/^[a-f\d]{24}$/i),communityId:z.string().regex(/^[a-f\d]{24}$/i)}).parse(req.body);const m=await Membership.findOneAndUpdate({user:v.userId,community:v.communityId,status:'approved'},{$set:{role:'moderator'}},{new:true});if(!m)return res.status(404).json({message:'Approved community membership not found'});await Community.updateOne({_id:v.communityId},{$addToSet:{moderators:v.userId}});await AuditLog.create({actor:req.user._id,action:'moderator.assigned',targetType:'community',targetId:v.communityId,metadata:{userId:v.userId}});res.status(201).json({membership:m});}));router.delete('/moderators/:id',asyncHandler(async(req,res)=>{const m=await Membership.findById(req.params.id);if(!m||m.role!=='moderator')return res.status(404).json({message:'Moderator assignment not found'});m.role='member';await m.save();await Community.updateOne({_id:m.community},{$pull:{moderators:m.user}});await AuditLog.create({actor:req.user._id,action:'moderator.revoked',targetType:'community',targetId:m.community,metadata:{userId:String(m.user)}});res.json({message:'Moderator role revoked'});}));router.get('/audit-logs',asyncHandler(async(req,res)=>{const logs=await AuditLog.find().sort({createdAt:-1}).limit(100).populate('actor','name email');res.json({logs});}));export default router;
