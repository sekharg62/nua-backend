import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

interface Migration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

// Migration tracking collection
const MigrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  executedAt: { type: Date, default: Date.now }
});

const MigrationModel = mongoose.model('Migration', MigrationSchema);

// Define migrations
const migrations: Migration[] = [
  {
    name: '001_create_indexes',
    up: async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');
      
      // User indexes
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('users').createIndex({ createdAt: -1 });
      
      // File indexes
      await db.collection('files').createIndex({ owner: 1, createdAt: -1 });
      await db.collection('files').createIndex({ filename: 1 });
      await db.collection('files').createIndex({ mimeType: 1 });
      
      // Share indexes
      await db.collection('shares').createIndex({ file: 1, sharedWith: 1 });
      await db.collection('shares').createIndex({ shareLink: 1 }, { unique: true, sparse: true });
      await db.collection('shares').createIndex({ owner: 1 });
      await db.collection('shares').createIndex({ expiresAt: 1 });
      await db.collection('shares').createIndex({ file: 1, shareType: 1, isActive: 1 });
      
      // Audit log indexes
      await db.collection('auditlogs').createIndex({ user: 1, createdAt: -1 });
      await db.collection('auditlogs').createIndex({ file: 1, createdAt: -1 });
      await db.collection('auditlogs').createIndex({ action: 1, createdAt: -1 });
      await db.collection('auditlogs').createIndex({ createdAt: -1 });
      
      console.log('✅ Created all indexes');
    },
    down: async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');
      
      await db.collection('users').dropIndexes();
      await db.collection('files').dropIndexes();
      await db.collection('shares').dropIndexes();
      await db.collection('auditlogs').dropIndexes();
      
      console.log('✅ Dropped all indexes');
    }
  },
  {
    name: '002_add_ttl_expired_shares',
    up: async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');
      
      // Add TTL index on expiresAt to auto-cleanup expired shares after 30 days
      // Note: This doesn't delete immediately on expiry, just marks for cleanup
      // The isActive check in queries handles the immediate access control
      try {
        await db.collection('shares').createIndex(
          { expiresAt: 1 },
          { 
            expireAfterSeconds: 2592000, // 30 days after expiry
            partialFilterExpression: { expiresAt: { $exists: true, $ne: null } }
          }
        );
        console.log('✅ Added TTL index for expired shares');
      } catch (error) {
        // Index might already exist
        console.log('TTL index may already exist, skipping');
      }
    },
    down: async () => {
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');
      
      try {
        await db.collection('shares').dropIndex('expiresAt_1');
        console.log('✅ Dropped TTL index');
      } catch {
        console.log('TTL index may not exist, skipping');
      }
    }
  }
];

async function runMigrations(): Promise<void> {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nua-fileshare';
  
  try {
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');
    
    const command = process.argv[2];
    
    if (command === 'down') {
      // Run down migrations in reverse order
      for (let i = migrations.length - 1; i >= 0; i--) {
        const migration = migrations[i];
        const executed = await MigrationModel.findOne({ name: migration.name });
        
        if (executed) {
          console.log(`Rolling back: ${migration.name}`);
          await migration.down();
          await MigrationModel.deleteOne({ name: migration.name });
          console.log(`✅ Rolled back: ${migration.name}`);
        }
      }
    } else {
      // Run up migrations
      for (const migration of migrations) {
        const executed = await MigrationModel.findOne({ name: migration.name });
        
        if (!executed) {
          console.log(`Running: ${migration.name}`);
          await migration.up();
          await MigrationModel.create({ name: migration.name });
          console.log(`✅ Completed: ${migration.name}`);
        } else {
          console.log(`⏭️  Skipping (already executed): ${migration.name}`);
        }
      }
    }
    
    console.log('\n✨ All migrations completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runMigrations();

