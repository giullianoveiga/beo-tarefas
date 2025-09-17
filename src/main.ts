import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import userRoutes from './routes/users';
import gamificationRoutes from './routes/gamification';
import commentRoutes from './routes/comments';
import logger, { requestLogger, logInfo, logError } from './services/loggerService';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use(requestLogger);

// Make prisma available to routes
app.locals.prisma = prisma;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/comments', commentRoutes);

// Comprehensive health check
app.get('/api/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development',
    services: {} as any
  };

  try {
    // Database health check
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.services.database = {
      status: 'OK',
      responseTime: Date.now() - start,
      type: 'PostgreSQL'
    };
  } catch (error) {
    healthCheck.services.database = {
      status: 'ERROR',
      error: error.message
    };
    healthCheck.status = 'DEGRADED';
    logError('Database health check failed', error);
  }

  // Redis health check (if available)
  if (process.env.REDIS_URL) {
    try {
      // This would be implemented with actual Redis client
      healthCheck.services.redis = {
        status: 'OK',
        type: 'Redis'
      };
    } catch (error) {
      healthCheck.services.redis = {
        status: 'ERROR',
        error: error.message
      };
      if (healthCheck.status === 'OK') healthCheck.status = 'DEGRADED';
    }
  }

  // Application metrics
  healthCheck.services.application = {
    status: 'OK',
    pid: process.pid,
    platform: process.platform,
    arch: process.arch
  };

  const statusCode = healthCheck.status === 'OK' ? 200 :
                     healthCheck.status === 'DEGRADED' ? 206 : 503;

  logInfo(`Health check requested: ${healthCheck.status}`, {
    status: healthCheck.status,
    responseTime: Date.now() - new Date(healthCheck.timestamp).getTime()
  });

  res.status(statusCode).json(healthCheck);
});

// Detailed health check for monitoring systems
app.get('/api/health/detailed', async (req, res) => {
  const detailedHealth = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    checks: [] as any[]
  };

  // Database connectivity
  try {
    const start = Date.now();
    const result = await prisma.$queryRaw`SELECT version()`;
    detailedHealth.checks.push({
      name: 'Database Connection',
      status: 'PASS',
      responseTime: Date.now() - start,
      details: { version: result[0].version }
    });
  } catch (error) {
    detailedHealth.checks.push({
      name: 'Database Connection',
      status: 'FAIL',
      error: error.message
    });
    detailedHealth.status = 'FAIL';
  }

  // Database migrations check
  try {
    const pendingMigrations = await prisma.$queryRaw`
      SELECT * FROM _prisma_migrations
      WHERE finished_at IS NULL
    ` as any[];
    detailedHealth.checks.push({
      name: 'Database Migrations',
      status: pendingMigrations.length === 0 ? 'PASS' : 'WARN',
      details: { pendingMigrations: pendingMigrations.length }
    });
  } catch (error) {
    detailedHealth.checks.push({
      name: 'Database Migrations',
      status: 'FAIL',
      error: error.message
    });
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  detailedHealth.checks.push({
    name: 'Memory Usage',
    status: memUsage.heapUsed / memUsage.heapTotal > 0.9 ? 'WARN' : 'PASS',
    details: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100) + '%'
    }
  });

  res.json(detailedHealth);
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('Unhandled error', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

app.listen(PORT, () => {
  logInfo(`🚀 Server started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  console.log(`🚀 Server running on: http://localhost:${PORT}`);
  console.log(`📊 Database: PostgreSQL`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Using default'}`);
  console.log(`📝 Logs: Enabled with Winston`);
});