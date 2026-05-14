import mongoose from 'mongoose';
import dns from 'dns';

// Use Google DNS to resolve SRV records (fixes ISP DNS issues)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGO_URI = 'mongodb+srv://phamhuynhkhanhsecure_db_user:KhanhQuynh123456789@cluster0.89jzw2x.mongodb.net/trading_journal?retryWrites=true&w=majority&appName=Cluster0';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

export default mongoose;
