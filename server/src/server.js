import 'dotenv/config'; import app from './app.js'; import { connectDB } from './config/db.js';
const port=process.env.PORT||5000;try{await connectDB();app.listen(port,()=>console.log(`Hometown Hub API listening on ${port}`));}catch(err){console.error('Server startup failed:',err.message);process.exit(1)}
