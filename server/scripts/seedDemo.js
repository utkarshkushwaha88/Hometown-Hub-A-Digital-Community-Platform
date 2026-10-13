import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  User, Community, Membership, Post, Event, Notification
} from '../src/models/index.js';

if (!process.env.MONGODB_URI) {
  console.error('Set MONGODB_URI in server/.env before seeding demo data.');
  process.exit(1);
}

const DEMO_EMAIL = 'demo@hometownhub.local';
const DEMO_PASSWORD = 'DemoPass123!';
const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

try {
  await mongoose.connect(process.env.MONGODB_URI);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  let demoUser = await User.findOne({ email: DEMO_EMAIL });
  if (!demoUser) {
    demoUser = await User.create({
      name: 'Kunal Demo',
      username: 'kunal-demo',
      email: DEMO_EMAIL,
      passwordHash,
      hometown: 'Varanasi',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      country: 'India',
      bio: 'Exploring local stories and building stronger communities.',
      interests: ['Culture', 'Technology', 'Community events'],
      role: 'user',
      accountStatus: 'active',
    });
    console.log('Created demo user.');
  } else {
    demoUser.passwordHash = passwordHash;
    demoUser.accountStatus = 'active';
    await demoUser.save();
    console.log('Updated existing demo user password/status.');
  }

  const communityData = [
    {
      name: 'Varanasi Connect',
      slug: 'varanasi-connect',
      description: 'A friendly space for local stories, cultural events, neighborhood updates, and the traditions that make Varanasi special.',
      category: 'Culture',
      location: { city: 'Varanasi', state: 'Uttar Pradesh', country: 'India' },
      avatar: image('photo-1561361513-2d000a50f0dc'),
      coverImage: image('photo-1561361513-2d000a50f0dc'),
      rules: ['Be respectful to neighbors.', 'Share accurate local information.', 'Keep discussions relevant to the community.'],
    },
    {
      name: 'Lucknow Neighbours',
      slug: 'lucknow-neighbours',
      description: 'Meet neighbors, share helpful local updates, discover food and cultural events, and make Lucknow feel closer.',
      category: 'Local living',
      location: { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India' },
      avatar: image('photo-1599661046827-dacff0c0f09a'),
      coverImage: image('photo-1599661046827-dacff0c0f09a'),
      rules: ['Be kind and constructive.', 'Do not post private information.', 'No spam or harassment.'],
    },
    {
      name: 'Campus to Hometown',
      slug: 'campus-to-hometown',
      description: 'A community for students, alumni, and friends to share opportunities and stay connected to home.',
      category: 'Education',
      location: { city: 'Kanpur', state: 'Uttar Pradesh', country: 'India' },
      avatar: image('photo-1523050854058-8df90110c9f1'),
      coverImage: image('photo-1523050854058-8df90110c9f1'),
      rules: ['Share genuine opportunities.', 'Be supportive of students.', 'Respect every member.'],
    },
    {
      name: 'Clean & Green Neighborhoods',
      slug: 'clean-green-neighborhoods',
      description: 'Coordinate local clean-ups, tree planting, recycling drives, and practical ways to improve shared spaces.',
      category: 'Community initiatives',
      location: { city: 'Prayagraj', state: 'Uttar Pradesh', country: 'India' },
      avatar: image('photo-1441974231531-c6227db76b6e'),
      coverImage: image('photo-1441974231531-c6227db76b6e'),
      rules: ['Keep plans inclusive.', 'Share clear event details.', 'Leave public spaces cleaner than you found them.'],
    },
  ];

  const communities = [];
  for (const item of communityData) {
    const community = await Community.findOneAndUpdate(
      { slug: item.slug },
      { $set: { ...item, owner: demoUser._id, visibility: 'public', status: 'approved' } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    communities.push(community);
    await Membership.findOneAndUpdate(
      { user: demoUser._id, community: community._id },
      { $set: { role: 'owner', status: 'approved', joinedAt: new Date(), reviewedAt: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  const postData = [
    {
      slug: 'varanasi-connect',
      content: 'Welcome to Varanasi Connect! Use this space to share neighborhood updates, local recommendations, cultural stories, and upcoming community activities. What is one place in the city everyone should visit?',
      category: 'Announcement',
      isPinned: true,
    },
    {
      slug: 'varanasi-connect',
      content: 'A small reminder to keep our ghats and public spaces clean. If you know about a local clean-up initiative, share the details here so neighbors can participate.',
      category: 'Community initiatives',
    },
    {
      slug: 'lucknow-neighbours',
      content: 'What are your favorite local places for an evening walk or family outing in Lucknow? Add recommendations and practical tips for newcomers.',
      category: 'Discussion',
    },
    {
      slug: 'campus-to-hometown',
      content: 'Students and recent graduates: share internships, learning resources, and campus events that could help someone from our hometown community.',
      category: 'Education',
    },
    {
      slug: 'clean-green-neighborhoods',
      content: 'Let us plan a neighborhood clean-up this month. Comment with a suitable location and time, and invite neighbors who would like to help.',
      category: 'Initiative',
    },
  ];

  for (const item of postData) {
    const community = communities.find((c) => c.slug === item.slug);
    await Post.findOneAndUpdate(
      { community: community._id, author: demoUser._id, content: item.content },
      { $set: { ...item, community: community._id, author: demoUser._id, status: 'active' } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
  }

  const future = (days, hour = 10) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const eventData = [
    {
      community: communities[0],
      title: 'Ganga Ghat Community Walk',
      description: 'Join neighbors for a relaxed morning walk and a conversation about preserving the heritage and cleanliness of our shared spaces.',
      category: 'Community',
      startDate: future(5, 7),
      endDate: future(5, 9),
      venue: 'Assi Ghat',
      location: communities[0].location,
      coverImage: image('photo-1561361513-2d000a50f0dc'),
      capacity: 80,
    },
    {
      community: communities[1],
      title: 'Lucknow Local Meet-up',
      description: 'Meet nearby residents, exchange local recommendations, and suggest ideas for future community activities.',
      category: 'Meet-up',
      startDate: future(9, 17),
      endDate: future(9, 19),
      venue: 'Janeshwar Mishra Park',
      location: communities[1].location,
      coverImage: image('photo-1599661046827-dacff0c0f09a'),
      capacity: 50,
    },
    {
      community: communities[3],
      title: 'Neighborhood Clean-up Drive',
      description: 'Bring gloves and reusable water bottles for a community clean-up. Volunteers of all ages are welcome.',
      category: 'Volunteering',
      startDate: future(12, 8),
      endDate: future(12, 10),
      venue: 'Community meeting point',
      location: communities[3].location,
      coverImage: image('photo-1441974231531-c6227db76b6e'),
      capacity: 100,
    },
  ];

  for (const item of eventData) {
    await Event.findOneAndUpdate(
      { community: item.community._id, title: item.title },
      { $set: { ...item, organizer: demoUser._id, status: 'scheduled' } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
  }

  const notificationData = [
    {
      type: 'welcome',
      title: 'Welcome to Hometown Hub',
      message: 'Your demo account is ready. Explore communities, read local posts, and check out upcoming events.',
    },
    {
      type: 'community_update',
      title: 'New community posts are waiting',
      message: 'There are fresh conversations and local initiatives in the communities you joined.',
    },
  ];
  for (const item of notificationData) {
    await Notification.findOneAndUpdate(
      { recipient: demoUser._id, type: item.type, title: item.title },
      { $set: { ...item, recipient: demoUser._id, isRead: false } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }

  console.log('\nDemo data seeded successfully.');
  console.log('Demo login email: ' + DEMO_EMAIL);
  console.log('Demo login password: ' + DEMO_PASSWORD);
  console.log(`Communities: ${communities.length}; sample posts: ${postData.length}; upcoming events: ${eventData.length}; notifications: ${notificationData.length}`);
  console.log('Log in through the application to access protected endpoints.');
} catch (error) {
  console.error('Demo seeding failed:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
