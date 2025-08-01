import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addEmailTemplatesTable() {
  try {
    console.log('Starting email templates table migration...');
    
    // Create email_templates table
    console.log('Creating email_templates table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "email_templates" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "subject" text NOT NULL,
        "htmlContent" text NOT NULL,
        "textContent" text,
        "type" text NOT NULL,
        "isActive" boolean DEFAULT true NOT NULL,
        "variables" json DEFAULT '[]'::json,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL,
        "createdBy" integer,
        "updatedBy" integer,
        CONSTRAINT "email_templates_name_unique" UNIQUE("name"),
        CONSTRAINT "email_templates_type_unique" UNIQUE("type")
      );
    `);
    
    // Create index for type for faster lookups
    console.log('Creating index on type...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "email_templates_type_idx" ON "email_templates" ("type");
    `);
    
    // Create index for active status
    console.log('Creating index on isActive...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "email_templates_is_active_idx" ON "email_templates" ("isActive");
    `);
    
    // Insert default email templates
    console.log('Inserting default email templates...');
    
    // Password Reset Template
    await db.execute(sql`
      INSERT INTO "email_templates" ("name", "description", "subject", "htmlContent", "textContent", "type", "variables")
      VALUES (
        'Password Reset',
        'Template for password reset emails sent to users',
        '{{company_name}} Password Reset Code',
        '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for your {{company_name}} account.</p>
          <p>Your password reset code is: <strong style="font-size: 18px; letter-spacing: 2px;">{{reset_code}}</strong></p>
          <p>This code will expire in <strong>5 minutes</strong>. If you did not request this password reset, please ignore this email.</p>
          <p>Thank you,<br>{{company_name}} Team</p>
        </div>',
        'Hello,

You have requested to reset your password for your {{company_name}} account.

Your password reset code is: {{reset_code}}

This code will expire in 5 minutes. If you did not request this password reset, please ignore this email.

Thank you,
{{company_name}} Team',
        'password_reset',
        '["company_name", "reset_code"]'::json
      ) ON CONFLICT (type) DO NOTHING;
    `);

    // Email Verification Template
    await db.execute(sql`
      INSERT INTO "email_templates" ("name", "description", "subject", "htmlContent", "textContent", "type", "variables")
      VALUES (
        'Email Verification',
        'Template for email verification sent to new users',
        'Verify your {{company_name}} account',
        '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Hello {{username}},</p>
          <p>Thank you for creating an account with {{company_name}}!</p>
          <p>Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verification_url}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
          </div>
          <p>If you did not create an account, please ignore this email.</p>
          <p>Thank you,<br>{{company_name}} Team</p>
        </div>',
        'Hello {{username}},

Thank you for creating an account with {{company_name}}!

Please verify your email address by visiting: {{verification_url}}

If you did not create an account, please ignore this email.

Thank you,
{{company_name}} Team',
        'email_verification',
        '["username", "company_name", "verification_url"]'::json
      ) ON CONFLICT (type) DO NOTHING;
    `);

    // Username Reminder Template
    await db.execute(sql`
      INSERT INTO "email_templates" ("name", "description", "subject", "htmlContent", "textContent", "type", "variables")
      VALUES (
        'Username Reminder',
        'Template for username reminder emails',
        'Your {{company_name}} username reminder',
        '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Username Reminder</h2>
          <p>Hello,</p>
          <p>You have requested a username reminder for your {{company_name}} account.</p>
          <p>Your username is: <strong>{{username}}</strong></p>
          <p>If you did not request this username reminder, please ignore this email.</p>
          <p>Thank you,<br>{{company_name}} Team</p>
        </div>',
        'Hello,

You have requested a username reminder for your {{company_name}} account.

Your username is: {{username}}

If you did not request this username reminder, please ignore this email.

Thank you,
{{company_name}} Team',
        'forgot_username',
        '["username", "company_name"]'::json
      ) ON CONFLICT (type) DO NOTHING;
    `);

    // Welcome Email Template
    await db.execute(sql`
      INSERT INTO "email_templates" ("name", "description", "subject", "htmlContent", "textContent", "type", "variables")
      VALUES (
        'Welcome Email',
        'Template for welcome emails sent to new users',
        'Welcome to {{company_name}}!',
        '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to {{company_name}}!</h2>
          <p>Hello {{username}},</p>
          <p>Welcome to {{company_name}}! We are excited to have you as part of our community.</p>
          <p>Here are some quick links to get you started:</p>
          <ul>
            <li><a href="{{dashboard_url}}">Dashboard</a></li>
            <li><a href="{{support_url}}">Support Center</a></li>
            <li><a href="{{docs_url}}">Documentation</a></li>
          </ul>
          <p>If you have any questions, feel free to contact our support team at {{support_email}}.</p>
          <p>Thank you,<br>{{company_name}} Team</p>
        </div>',
        'Hello {{username}},

Welcome to {{company_name}}! We are excited to have you as part of our community.

Here are some quick links to get you started:
- Dashboard: {{dashboard_url}}
- Support Center: {{support_url}}
- Documentation: {{docs_url}}

If you have any questions, feel free to contact our support team at {{support_email}}.

Thank you,
{{company_name}} Team',
        'welcome_email',
        '["username", "company_name", "dashboard_url", "support_url", "docs_url", "support_email"]'::json
      ) ON CONFLICT (type) DO NOTHING;
    `);
    
    console.log('✅ Email templates table created successfully with default templates!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create email templates table:', error);
    process.exit(1);
  }
}

// Run the migration
addEmailTemplatesTable();