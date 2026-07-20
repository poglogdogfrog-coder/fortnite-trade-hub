import { query } from '@/config/database';
import { v4 as uuidv4 } from 'uuid';

export const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database...');
    
    // Create sample Fortnite items
    const fortniteSkins = [
      { name: 'Skin - Superhero', rarity: 'epic', type: 'skin', price: 2000, drop_chance: 0.02 },
      { name: 'Skin - Legendary Knight', rarity: 'legendary', type: 'skin', price: 2500, drop_chance: 0.005 },
      { name: 'Emote - Take the L', rarity: 'rare', type: 'emote', price: 500, drop_chance: 0.05 },
      { name: 'Pickaxe - Infinity Blade', rarity: 'epic', type: 'pickaxe', price: 1500, drop_chance: 0.015 },
      { name: 'Glider - Dragon Wings', rarity: 'legendary', type: 'glider', price: 2000, drop_chance: 0.01 },
      { name: 'V-Bucks Bundle - 1000', rarity: 'common', type: 'currency', price: 10, drop_chance: 0.3 },
      { name: 'V-Bucks Bundle - 5000', rarity: 'uncommon', type: 'currency', price: 45, drop_chance: 0.1 },
      { name: 'Backbling - Shield', rarity: 'rare', type: 'backbling', price: 800, drop_chance: 0.04 },
      { name: 'Wrap - Neon Pink', rarity: 'uncommon', type: 'wrap', price: 300, drop_chance: 0.08 },
    ];
    
    for (const skin of fortniteSkins) {
      await query(
        `INSERT INTO items (name, description, game_name, item_type, rarity, rarity_hex_color, drop_chance, current_price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT DO NOTHING`,
        [skin.name, `High-quality ${skin.type}`, 'Fortnite', skin.type, skin.rarity, '#FF8000', skin.drop_chance, skin.price]
      );
    }
    
    console.log('✅ Sample Fortnite items created');
    
    // Create admin user
    const adminId = uuidv4();
    await query(
      `INSERT INTO users (id, username, email, verified_account, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [adminId, 'admin', 'admin@tradehub.local', true]
    );
    
    // Assign admin role
    await query(
      `INSERT INTO staff_roles (user_id, role, is_active, assigned_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT DO NOTHING`,
      [adminId, 'super_user']
    );
    
    // Create reputation for admin
    await query(
      `INSERT INTO user_reputation (user_id, trust_score, trust_tier, total_completed_trades)
       VALUES ($1, $2, $3, 100)
       ON CONFLICT DO NOTHING`,
      [adminId, 5.0, 'trusted_legend']
    );
    
    console.log('✅ Admin user created');
    
    // Create sample users for testing
    for (let i = 1; i <= 10; i++) {
      const userId = uuidv4();
      await query(
        `INSERT INTO users (id, username, email, verified_account, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT DO NOTHING`,
        [userId, `trader_${i}`, `trader${i}@example.com`, true]
      );
      
      // Add reputation
      await query(
        `INSERT INTO user_reputation (user_id, trust_score, trust_tier)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [userId, Math.random() * 5, ['novice', 'experienced', 'master'][Math.floor(Math.random() * 3)]]
      );
      
      // Add fraud scores
      await query(
        `INSERT INTO user_ai_fraud_scores (user_id, fraud_risk_score, account_age_days)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [userId, Math.random() * 0.3, 30 + Math.floor(Math.random() * 300)]
      );
    }
    
    console.log('✅ Sample users created');
    
    // Create price history for items
    const itemsResult = await query('SELECT id FROM items LIMIT 5');
    for (const item of itemsResult.rows) {
      for (let i = 0; i < 7; i++) {
        const priceVariation = (Math.random() - 0.5) * 200;
        await query(
          `INSERT INTO item_price_history (item_id, price, volume, recorded_at)
           VALUES ($1, $2, $3, NOW() - INTERVAL '$4 days')
           ON CONFLICT DO NOTHING`,
          [item.id, 1000 + priceVariation, Math.floor(Math.random() * 1000), i]
        );
      }
    }
    
    console.log('✅ Price history created');
    console.log('🌱 Database seeding completed!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};

if (require.main === module) {
  seedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}
