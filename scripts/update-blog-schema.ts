import { pool } from '../server/db';

async function updateBlogSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Starting blog schema update...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Create blog_categories table
    console.log('Creating blog_categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    // Add new columns to blog_posts table
    console.log('Adding columns to blog_posts table...');
    
    // Check if author column exists
    const checkAuthorColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts' AND column_name = 'author'
    `);
    
    if (checkAuthorColumn.rowCount === 0) {
      console.log('Adding author column...');
      await client.query('ALTER TABLE blog_posts ADD COLUMN author TEXT');
    }
    
    // Check if featured_image_url column exists
    const checkImageColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts' AND column_name = 'featured_image_url'
    `);
    
    if (checkImageColumn.rowCount === 0) {
      console.log('Adding featured_image_url column...');
      await client.query('ALTER TABLE blog_posts ADD COLUMN featured_image_url TEXT');
    }
    
    // Check if excerpt column exists
    const checkExcerptColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts' AND column_name = 'excerpt'
    `);
    
    if (checkExcerptColumn.rowCount === 0) {
      console.log('Adding excerpt column...');
      await client.query('ALTER TABLE blog_posts ADD COLUMN excerpt TEXT');
    }
    
    // Check if tags column exists
    const checkTagsColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts' AND column_name = 'tags'
    `);
    
    if (checkTagsColumn.rowCount === 0) {
      console.log('Adding tags column...');
      await client.query('ALTER TABLE blog_posts ADD COLUMN tags TEXT');
    }
    
    // Check if category_id column exists
    const checkCategoryColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blog_posts' AND column_name = 'category_id'
    `);
    
    if (checkCategoryColumn.rowCount === 0) {
      console.log('Adding category_id column...');
      await client.query(`
        ALTER TABLE blog_posts 
        ADD COLUMN category_id INTEGER REFERENCES blog_categories(id) ON DELETE SET NULL
      `);
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Blog schema update completed successfully!');
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error updating blog schema:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Execute the function
updateBlogSchema()
  .then(() => {
    console.log('Schema update complete. Exiting.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to update schema:', error);
    process.exit(1);
  });