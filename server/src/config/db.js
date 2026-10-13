import mongoose from 'mongoose';
import { DailyActiveUser } from '../models/index.js';
export async function connectDB(){if(!process.env.MONGODB_URI)throw new Error('MONGODB_URI is required');mongoose.set('strictQuery',true);await mongoose.connect(process.env.MONGODB_URI);await DailyActiveUser.init();console.log('MongoDB connected');}
