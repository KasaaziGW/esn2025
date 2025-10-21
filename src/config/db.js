import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`Successfully Connected to MongoDB Atlas: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Atlas connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
