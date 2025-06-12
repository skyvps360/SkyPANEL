/**
 * Script to create an admin user for SkyVPS360 Client Portal
 * 
 * Usage: npx tsx scripts/create-admin-user.ts
 * This script will prompt for admin user details and create the user in the database
 */

import * as readline from 'readline';
import { db } from '../server/db';
import { users } from '../shared/schema';
import * as bcrypt from 'bcrypt';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for input
const prompt = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function createAdminUser() {
  console.log('🚀 SkyVPS360 Admin User Creation\n');
  
  try {
    // Get admin user details
    const username = await prompt('Enter admin username: ');
    const email = await prompt('Enter admin email: ');
    const fullName = await prompt('Enter admin full name: ');
    const password = await prompt('Enter admin password (min 8 characters): ');
    
    // Validate input
    if (!username || !email || !fullName || !password) {
      console.error('❌ All fields are required');
      return;
    }
    
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      return;
    }
    
    if (!email.includes('@')) {
      console.error('❌ Please enter a valid email address');
      return;
    }
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(function(builder) {
      return builder.where('username', '=', username).orWhere('email', '=', email);
    });
    
    if (existingUser.length > 0) {
      console.error('❌ A user with this username or email already exists');
      return;
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Insert the admin user
    const [newUser] = await db.insert(users).values({
      username,
      email,
      fullName,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      credits: 1000, // Give admin some initial credits
    }).returning();
    
    console.log('\n✅ Admin user created successfully!');
    console.log(`Username: ${newUser.username}`);
    console.log(`Email: ${newUser.email}`);
    console.log(`Role: ${newUser.role}`);
    console.log('\nYou can now log in to the dashboard with these credentials.');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    rl.close();
  }
}

// Execute the function
createAdminUser();