import mongoose from "mongoose";

const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose?: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};

const cached = globalWithMongoose.mongoose ?? { conn: null, promise: null };

globalWithMongoose.mongoose = cached;

export async function connectToDatabase() {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    throw new Error("MONGODB_URI is not defined. Add it to your .env.local file.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(mongodbUri).then((mongooseInstance) => mongooseInstance);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

export default connectToDatabase;
