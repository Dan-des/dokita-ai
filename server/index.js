require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const { seedInitialData } = require('./services/seedService');

// Route Handlers
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const hospitalRoutes = require('./routes/hospital');
const feedbackRoutes = require('./routes/feedback');
const whatsappRoutes = require('./routes/whatsapp');
const { router: reminderRoutes, dispatchDueReminders } = require('./routes/reminder');

const app = express();

// Configure dynamic CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.includes('vercel.app') || origin.includes('localhost') || !process.env.ALLOWED_ORIGINS) {
        return callback(null, true);
      }
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });
}

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'DokitaAI Medical Platform & Triage Engine',
    aiProvider: process.env.AI_PROVIDER || 'gemini',
    nodeEnv: process.env.NODE_ENV || 'development',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/webhook', whatsappRoutes);
app.use('/api/reminders', reminderRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found on DokitaAI server.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
});

const startServer = async (customPort) => {
  try {
    await connectDB();
    await seedInitialData();

    const PORT = customPort || process.env.PORT || 5000;

    // Start background push notification scheduler if not in serverless runtime
    if (!process.env.VERCEL) {
      setInterval(async () => {
        try {
          await dispatchDueReminders();
        } catch (schedErr) {
          console.error('[Background Scheduler Error]', schedErr.message);
        }
      }, 60000);
      console.log('⏰ Background push notification scheduler initialized (60s tick)');
    }

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🏥 DokitaAI API Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🤖 AI Provider: ${process.env.AI_PROVIDER || 'gemini'}`);
      console.log(`💬 WhatsApp Webhook: http://localhost:${PORT}/api/webhook/whatsapp`);
      console.log(`====================================================`);
    });
    return server;
  } catch (error) {
    console.error('Fatal Server Initialization Error:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
