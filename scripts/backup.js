#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/backup.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class DatabaseBackup {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'beo_tarefas',
      username: process.env.DB_USER || 'beo_user',
      password: process.env.DB_PASSWORD || 'beo_password',
      backupDir: process.env.BACKUP_DIR || './backups',
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30
    };
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `backup_${timestamp}.sql`;
    const filepath = path.join(this.config.backupDir, filename);
    const compressedFilepath = `${filepath}.gz`;

    try {
      logger.info('Starting database backup', { timestamp, filename });

      // Ensure backup directory exists
      if (!fs.existsSync(this.config.backupDir)) {
        fs.mkdirSync(this.config.backupDir, { recursive: true });
        logger.info('Created backup directory', { directory: this.config.backupDir });
      }

      // Create PostgreSQL dump
      const dumpCommand = `pg_dump -h ${this.config.host} -p ${this.config.port} -U ${this.config.username} -d ${this.config.database} --no-password --format=custom --compress=9 --verbose --file="${filepath}.backup"`;

      logger.info('Executing pg_dump command');
      execSync(dumpCommand, {
        env: { ...process.env, PGPASSWORD: this.config.password },
        stdio: 'inherit'
      });

      // Compress the backup
      logger.info('Compressing backup file');
      execSync(`gzip "${filepath}.backup"`, { stdio: 'inherit' });

      // Verify backup integrity
      await this.verifyBackup(compressedFilepath);

      // Calculate backup size
      const stats = fs.statSync(compressedFilepath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      logger.info('Backup completed successfully', {
        filename: path.basename(compressedFilepath),
        size: `${sizeMB}MB`,
        filepath: compressedFilepath
      });

      // Clean up old backups
      await this.cleanupOldBackups();

      return {
        success: true,
        filename: path.basename(compressedFilepath),
        size: `${sizeMB}MB`,
        path: compressedFilepath
      };

    } catch (error) {
      logger.error('Backup failed', {
        error: error.message,
        filename,
        filepath
      });

      // Clean up failed backup files
      try {
        if (fs.existsSync(filepath + '.backup')) {
          fs.unlinkSync(filepath + '.backup');
        }
        if (fs.existsSync(compressedFilepath)) {
          fs.unlinkSync(compressedFilepath);
        }
      } catch (cleanupError) {
        logger.error('Failed to cleanup after backup failure', { error: cleanupError.message });
      }

      throw error;
    }
  }

  async verifyBackup(filepath) {
    try {
      logger.info('Verifying backup integrity', { filepath });

      // Test if the compressed file can be read
      execSync(`gzip -t "${filepath}"`, { stdio: 'inherit' });

      logger.info('Backup integrity verification passed');
    } catch (error) {
      logger.error('Backup integrity verification failed', { error: error.message });
      throw new Error(`Backup verification failed: ${error.message}`);
    }
  }

  async cleanupOldBackups() {
    try {
      logger.info('Starting cleanup of old backups', { retentionDays: this.config.retentionDays });

      const files = fs.readdirSync(this.config.backupDir)
        .filter(file => file.endsWith('.sql.gz') || file.endsWith('.backup.gz'))
        .map(file => ({
          name: file,
          path: path.join(this.config.backupDir, file),
          stats: fs.statSync(path.join(this.config.backupDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      let deletedCount = 0;
      for (const file of files.slice(this.config.retentionDays)) {
        if (file.stats.mtime < cutoffDate) {
          fs.unlinkSync(file.path);
          logger.info('Deleted old backup', {
            filename: file.name,
            age: Math.floor((Date.now() - file.stats.mtime) / (1000 * 60 * 60 * 24)) + ' days'
          });
          deletedCount++;
        }
      }

      logger.info('Cleanup completed', { deletedCount, remainingFiles: files.length - deletedCount });

    } catch (error) {
      logger.error('Cleanup failed', { error: error.message });
    }
  }

  async restoreBackup(backupFile) {
    try {
      logger.info('Starting database restore', { backupFile });

      const filepath = path.isAbsolute(backupFile)
        ? backupFile
        : path.join(this.config.backupDir, backupFile);

      if (!fs.existsSync(filepath)) {
        throw new Error(`Backup file not found: ${filepath}`);
      }

      // Decompress if needed
      let restoreFile = filepath;
      if (filepath.endsWith('.gz')) {
        const decompressedFile = filepath.replace('.gz', '');
        execSync(`gzip -d -c "${filepath}" > "${decompressedFile}"`, { stdio: 'inherit' });
        restoreFile = decompressedFile;
      }

      // Restore database
      const restoreCommand = `pg_restore -h ${this.config.host} -p ${this.config.port} -U ${this.config.username} -d ${this.config.database} --no-password --clean --if-exists --verbose "${restoreFile}"`;

      execSync(restoreCommand, {
        env: { ...process.env, PGPASSWORD: this.config.password },
        stdio: 'inherit'
      });

      // Clean up decompressed file if it was created
      if (restoreFile !== filepath && restoreFile.endsWith('.backup')) {
        fs.unlinkSync(restoreFile);
      }

      logger.info('Database restore completed successfully', { backupFile });

      return { success: true, restoredFile: backupFile };

    } catch (error) {
      logger.error('Database restore failed', {
        error: error.message,
        backupFile
      });
      throw error;
    }
  }

  async listBackups() {
    try {
      if (!fs.existsSync(this.config.backupDir)) {
        return [];
      }

      const files = fs.readdirSync(this.config.backupDir)
        .filter(file => file.endsWith('.sql.gz') || file.endsWith('.backup.gz'))
        .map(file => {
          const filepath = path.join(this.config.backupDir, file);
          const stats = fs.statSync(filepath);
          return {
            filename: file,
            size: (stats.size / (1024 * 1024)).toFixed(2) + 'MB',
            created: stats.mtime.toISOString(),
            age: Math.floor((Date.now() - stats.mtime) / (1000 * 60 * 60 * 24)) + ' days ago'
          };
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      return files;

    } catch (error) {
      logger.error('Failed to list backups', { error: error.message });
      return [];
    }
  }
}

// CLI interface
async function main() {
  const backup = new DatabaseBackup();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'create':
        const result = await backup.createBackup();
        console.log('✅ Backup created successfully:', result);
        break;

      case 'restore':
        const backupFile = process.argv[3];
        if (!backupFile) {
          console.error('❌ Please specify a backup file to restore');
          process.exit(1);
        }
        const restoreResult = await backup.restoreBackup(backupFile);
        console.log('✅ Database restored successfully:', restoreResult);
        break;

      case 'list':
        const backups = await backup.listBackups();
        console.log('📋 Available backups:');
        backups.forEach(backup => {
          console.log(`  ${backup.filename} - ${backup.size} - ${backup.age}`);
        });
        break;

      case 'cleanup':
        await backup.cleanupOldBackups();
        console.log('✅ Cleanup completed');
        break;

      default:
        console.log('Usage: node backup.js <command>');
        console.log('Commands:');
        console.log('  create  - Create a new backup');
        console.log('  restore <file> - Restore from backup file');
        console.log('  list    - List available backups');
        console.log('  cleanup - Remove old backups');
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

module.exports = DatabaseBackup;