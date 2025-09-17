-- Create database and user for the application
-- This file will be executed when the PostgreSQL container starts for the first time
-- Create the application database (if not exists)
-- Note: The database is already created via environment variables in docker-compose.yml
-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Create indexes for better performance
-- These will be created when the application runs and creates the schema
-- Optional: Create a backup user with limited privileges
-- GRANT CONNECT ON DATABASE beo_tarefas TO backup_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;
-- Log the initialization
DO $$ BEGIN RAISE NOTICE 'PostgreSQL database initialized for B&O Tarefas application';
END $$;