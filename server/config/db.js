const mongoose = require('mongoose');

let mongoMemoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dokita_ai';
  
  try {
    // Attempt standard connection first
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[MongoDB] Connected to database: ${mongoose.connection.host}`);
  } catch (primaryError) {
    console.warn(`[MongoDB] Primary connection to ${uri} failed: ${primaryError.message}`);
    
    // In development or test, fallback seamlessly to in-memory MongoDB instance
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[MongoDB] Initializing MongoMemoryServer fallback for local execution...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoMemoryServer = await MongoMemoryServer.create({
          instance: {
            launchTimeout: 60000,
          },
        });
        const fallbackUri = mongoMemoryServer.getUri();
        await mongoose.connect(fallbackUri);
        console.log(`[MongoDB] Connected to in-memory database: ${fallbackUri}`);
      } catch (memError) {
        console.error(`[MongoDB] In-memory database initialization failed: ${memError.message}`);
        throw memError;
      }
    } else {
      throw primaryError;
    }
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};

module.exports = { connectDB, disconnectDB };
