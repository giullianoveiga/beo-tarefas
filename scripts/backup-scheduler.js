#!/usr/bin/env node

const cron = require('node-cron');
const { DatabaseBackup } = require('./backup');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/backup-scheduler.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class BackupScheduler {
  constructor() {
    this.backup = new DatabaseBackup();
    this.schedules = [];
  }

  // Schedule daily backup at specified time
  scheduleDailyBackup(hour = 2, minute = 0) {
    const cronExpression = `${minute} ${hour} * * *`;

    logger.info('Scheduling daily backup', { cronExpression, hour, minute });

    const job = cron.schedule(cronExpression, async () => {
      try {
        logger.info('Starting scheduled daily backup');
        const result = await this.backup.createBackup();
        logger.info('Scheduled daily backup completed', result);
      } catch (error) {
        logger.error('Scheduled daily backup failed', { error: error.message });
      }
    }, {
      scheduled: false // Don't start immediately
    });

    this.schedules.push({ type: 'daily', job, cronExpression });
    return job;
  }

  // Schedule weekly backup (every Sunday at specified time)
  scheduleWeeklyBackup(hour = 3, minute = 0) {
    const cronExpression = `${minute} ${hour} * * 0`;

    logger.info('Scheduling weekly backup', { cronExpression, hour, minute });

    const job = cron.schedule(cronExpression, async () => {
      try {
        logger.info('Starting scheduled weekly backup');
        const result = await this.backup.createBackup();
        logger.info('Scheduled weekly backup completed', result);
      } catch (error) {
        logger.error('Scheduled weekly backup failed', { error: error.message });
      }
    }, {
      scheduled: false
    });

    this.schedules.push({ type: 'weekly', job, cronExpression });
    return job;
  }

  // Schedule backup every N hours
  scheduleHourlyBackup(intervalHours = 6) {
    const cronExpression = `0 */${intervalHours} * * *`;

    logger.info('Scheduling hourly backup', { cronExpression, intervalHours });

    const job = cron.schedule(cronExpression, async () => {
      try {
        logger.info('Starting scheduled hourly backup');
        const result = await this.backup.createBackup();
        logger.info('Scheduled hourly backup completed', result);
      } catch (error) {
        logger.error('Scheduled hourly backup failed', { error: error.message });
      }
    }, {
      scheduled: false
    });

    this.schedules.push({ type: 'hourly', job, cronExpression });
    return job;
  }

  // Start all scheduled backups
  startAll() {
    logger.info('Starting all backup schedules');

    this.schedules.forEach(schedule => {
      schedule.job.start();
      logger.info(`Started ${schedule.type} backup schedule`, { cronExpression: schedule.cronExpression });
    });
  }

  // Stop all scheduled backups
  stopAll() {
    logger.info('Stopping all backup schedules');

    this.schedules.forEach(schedule => {
      schedule.job.stop();
      logger.info(`Stopped ${schedule.type} backup schedule`);
    });
  }

  // Get status of all schedules
  getStatus() {
    return this.schedules.map(schedule => ({
      type: schedule.type,
      cronExpression: schedule.cronExpression,
      running: schedule.job.running
    }));
  }

  // Manual backup trigger
  async triggerManualBackup() {
    try {
      logger.info('Manual backup triggered');
      const result = await this.backup.createBackup();
      logger.info('Manual backup completed', result);
      return result;
    } catch (error) {
      logger.error('Manual backup failed', { error: error.message });
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const scheduler = new BackupScheduler();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'start':
        // Start default schedules
        scheduler.scheduleDailyBackup(2, 0); // Daily at 2:00 AM
        scheduler.scheduleWeeklyBackup(3, 0); // Weekly at 3:00 AM on Sunday
        scheduler.startAll();
        console.log('✅ Backup scheduler started');

        // Keep the process running
        process.on('SIGINT', () => {
          console.log('🛑 Stopping backup scheduler...');
          scheduler.stopAll();
          process.exit(0);
        });

        process.on('SIGTERM', () => {
          console.log('🛑 Stopping backup scheduler...');
          scheduler.stopAll();
          process.exit(0);
        });

        // Keep alive
        setInterval(() => {
          console.log('📅 Backup scheduler running...', new Date().toISOString());
        }, 3600000); // Log every hour

        break;

      case 'manual':
        const result = await scheduler.triggerManualBackup();
        console.log('✅ Manual backup completed:', result);
        break;

      case 'status':
        const status = scheduler.getStatus();
        console.log('📊 Backup scheduler status:');
        status.forEach(item => {
          console.log(`  ${item.type}: ${item.running ? '🟢 Running' : '🔴 Stopped'} (${item.cronExpression})`);
        });
        break;

      case 'stop':
        scheduler.stopAll();
        console.log('✅ All backup schedules stopped');
        break;

      default:
        console.log('Usage: node backup-scheduler.js <command>');
        console.log('Commands:');
        console.log('  start   - Start automated backup schedules');
        console.log('  manual  - Trigger manual backup');
        console.log('  status  - Show scheduler status');
        console.log('  stop    - Stop all backup schedules');
        break;
    }
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BackupScheduler;