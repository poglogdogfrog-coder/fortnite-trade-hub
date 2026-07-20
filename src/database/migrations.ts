import { Pool } from 'pg';
import { query } from '@/config/database';

export const runMigrations = async () => {
  try {
    console.log('Starting database migrations...');
    
    // Read and execute schema
    const fs = require('fs');
    const schemaSQL = fs.readFileSync('./src/database/schema.sql', 'utf8');
    await query(schemaSQL);
    
    console.log('✅ Database schema created successfully');
    
    // Create indexes
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_trades_created_at ON trades(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_user_reviews_created_at ON user_reviews(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_item_price_history_updated_at ON item_price_history(recorded_at DESC)',
    ];
    
    for (const indexQuery of indexQueries) {
      await query(indexQuery);
    }
    
    console.log('✅ All indexes created');
    
    // Create views for common queries
    const viewQueries = [
      `CREATE OR REPLACE VIEW active_trades AS
       SELECT * FROM trades WHERE status = 'pending' AND expires_at > NOW()`,
      
      `CREATE OR REPLACE VIEW user_trust_ranking AS
       SELECT 
         ur.user_id,
         ur.trust_score,
         ur.trust_tier,
         ur.total_completed_trades,
         ROW_NUMBER() OVER (ORDER BY ur.trust_score DESC) as rank
       FROM user_reputation ur`,
      
      `CREATE OR REPLACE VIEW market_movers_24h AS
       SELECT 
         i.id,
         i.name,
         i.game_name,
         i.current_price,
         i.last_24h_volume,
         ROUND(((i.current_price - (SELECT price FROM item_price_history WHERE item_id = i.id ORDER BY recorded_at DESC LIMIT 1 OFFSET 24))::numeric / (SELECT price FROM item_price_history WHERE item_id = i.id ORDER BY recorded_at DESC LIMIT 1 OFFSET 24)::numeric * 100), 2) as price_change_percent
       FROM items i
       ORDER BY price_change_percent DESC
       LIMIT 20`,
    ];
    
    for (const viewQuery of viewQueries) {
      await query(viewQuery);
    }
    
    console.log('✅ Database views created');
    console.log('✅ All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

if (require.main === module) {
  runMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}
