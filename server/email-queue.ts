import { emailService } from './email';
import { storage } from './storage';
import { User, InsertEmailLog } from '@shared/schema';
import { getMaintenanceToken } from './middleware';

/**
 * Email Queue Manager for sending emails in the background
 * Implements a simple in-memory queue with sequential processing
 */
export class EmailQueueManager {
  private static instance: EmailQueueManager;
  private queue: QueueItem[] = [];
  private processing: boolean = false;

  private constructor() {}

  /**
   * Get the singleton instance of EmailQueueManager
   * @returns The EmailQueueManager instance
   */
  public static getInstance(): EmailQueueManager {
    if (!EmailQueueManager.instance) {
      EmailQueueManager.instance = new EmailQueueManager();
    }
    return EmailQueueManager.instance;
  }

  /**
   * Add a maintenance notification email to the queue for all admin users
   * @param enabledBy The name of the admin who enabled maintenance mode
   * @param message The maintenance message
   * @param estimatedCompletion The estimated completion time (optional)
   * @returns A promise that resolves when all emails are queued
   */
  public async queueMaintenanceNotifications(
    enabledBy: string,
    message: string,
    estimatedCompletion?: string
  ): Promise<void> {
    try {
      console.log('Queuing maintenance notification emails to all admins');
      
      // Get all admin users
      const adminUsers = await storage.getAdminUsers();
      
      if (!adminUsers || adminUsers.length === 0) {
        console.log('No admin users found to notify about maintenance mode');
        return;
      }
      
      console.log(`Found ${adminUsers.length} admin users to notify about maintenance mode`);
      
      // Queue an email for each admin
      for (const admin of adminUsers) {
        this.queueEmail({
          type: 'maintenance_notification',
          recipientEmail: admin.email,
          recipientName: admin.fullName || admin.username,
          data: {
            enabledBy,
            message,
            estimatedCompletion
          }
        });
      }
      
      // Start processing if not already running
      this.processQueue();
      
    } catch (error) {
      console.error('Error queuing maintenance notification emails:', error);
    }
  }

  /**
   * Add an email to the queue
   * @param item The queue item to add
   */
  private queueEmail(item: QueueItem): void {
    this.queue.push(item);
    console.log(`Email queued: ${item.type} to ${item.recipientEmail}`);
  }
  
  /**
   * Get user ID by email address
   * @param email The email address to look up
   * @returns The user ID if found, null otherwise
   */
  private async getUserIdByEmail(email: string): Promise<number | null> {
    try {
      const user = await storage.getUserByEmail(email);
      return user ? user.id : null;
    } catch (error) {
      console.error(`Error looking up user by email ${email}:`, error);
      return null;
    }
  }

  /**
   * Process the email queue sequentially
   */
  private async processQueue(): Promise<void> {
    // If already processing, return
    if (this.processing) {
      return;
    }
    
    this.processing = true;
    console.log(`Starting to process email queue with ${this.queue.length} items`);
    
    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        if (!item) continue;
        
        console.log(`Processing email: ${item.type} to ${item.recipientEmail}`);
        
        try {
          await this.sendEmail(item);
          console.log(`Successfully sent email: ${item.type} to ${item.recipientEmail}`);
          
          // Small delay to prevent overwhelming the email server
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error sending email: ${item.type} to ${item.recipientEmail}`, error);
        }
      }
    } finally {
      this.processing = false;
      console.log('Email queue processing complete');
    }
  }

  /**
   * Send an email based on the queue item type
   * @param item The queue item to process
   */
  private async sendEmail(item: QueueItem): Promise<boolean> {
    switch (item.type) {
      case 'maintenance_notification':
        return this.sendMaintenanceNotification(
          item.recipientEmail,
          item.recipientName,
          item.data.enabledBy,
          item.data.message,
          item.data.estimatedCompletion
        );
      default:
        console.warn(`Unknown email type: ${item.type}`);
        return false;
    }
  }

  /**
   * Send a maintenance notification email
   * @param email The recipient's email address
   * @param recipientName The recipient's name
   * @param enabledBy The name of the admin who enabled maintenance mode
   * @param message The maintenance message
   * @param estimatedCompletion The estimated completion time (optional)
   * @returns Success status
   */
  private async sendMaintenanceNotification(
    email: string,
    recipientName: string,
    enabledBy: string,
    message: string,
    estimatedCompletion?: string
  ): Promise<boolean> {
    try {
      // Get company name from settings
      const companyName = await emailService['getCompanyName']();

      // Get the current maintenance bypass token
      const maintenanceToken = getMaintenanceToken();
      
      // Format the estimated completion time if provided
      let completionText = '';
      if (estimatedCompletion) {
        try {
          const completionDate = new Date(estimatedCompletion);
          completionText = completionDate.toLocaleString();
        } catch (e) {
          completionText = estimatedCompletion;
        }
      }
      
      // Create email content
      const textContent = 
        `Hello ${recipientName},\n\n` +
        `This is an automated notification that maintenance mode has been enabled for the ${companyName} system.\n\n` +
        `Enabled by: ${enabledBy}\n` +
        `Message: ${message}\n` +
        (completionText ? `Estimated completion: ${completionText}\n\n` : '\n') +
        `During maintenance, only administrators can access the system.\n\n` +
        `IMPORTANT: Your maintenance bypass token is: ${maintenanceToken}\n` +
        `Use this token to access the system during maintenance by entering it on the /maintenance page.\n\n` +
        `Thank you,\n` +
        `${companyName} System`;
        
      const htmlContent = 
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">` +
        `<h2 style="color: #333;">System Maintenance Notification</h2>` +
        `<p>Hello ${recipientName},</p>` +
        `<p>This is an automated notification that <strong>maintenance mode</strong> has been enabled for the ${companyName} system.</p>` +
        `<div style="background-color: #f8f9fa; border-left: 4px solid #5661b3; padding: 15px; margin: 20px 0;">` +
        `<p><strong>Enabled by:</strong> ${enabledBy}</p>` +
        `<p><strong>Message:</strong> ${message}</p>` +
        (completionText ? `<p><strong>Estimated completion:</strong> ${completionText}</p>` : '') +
        `</div>` +
        `<p>During maintenance, only administrators can access the system.</p>` +
        `<div style="background-color: #e9f5ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">` +
        `<p><strong>IMPORTANT: Your maintenance bypass token is:</strong></p>` +
        `<p style="font-family: monospace; font-size: 16px; background-color: #f0f0f0; padding: 8px; border-radius: 4px;">${maintenanceToken}</p>` +
        `<p>Use this token to access the system during maintenance by entering it on the /maintenance page.</p>` +
        `</div>` +
        `<p>Thank you,<br>${companyName} System</p>` +
        `</div>`;
      
      // Prepare email data
      const mailOptions = {
        from: `"${emailService['settings'].fromName || companyName}" <${emailService['settings'].fromEmail || 'noreply@example.com'}>`,
        to: email,
        subject: `[${companyName}] System Maintenance Mode Enabled`,
        text: textContent,
        html: htmlContent
      };
      
      // Send the email via the email service's transporter
      if (emailService['transporter']) {
        try {
          const info = await emailService['transporter'].sendMail(mailOptions);
          console.log('Maintenance notification email sent:', info.messageId);
          
          // Log the email in the database
          await storage.logEmail({
            recipientEmail: email,
            recipientName: recipientName,
            subject: mailOptions.subject,
            type: 'maintenance_notification',
            status: 'sent',
            messageId: info.messageId,
            // Find the user ID by email
            userId: await this.getUserIdByEmail(email),
            metadata: {
              enabledBy,
              message,
              estimatedCompletion,
              maintenanceToken
            }
          });
          
          return true;
        } catch (error) {
          console.error('Error sending maintenance notification email:', error);
          
          // Log the failed email
          await storage.logEmail({
            recipientEmail: email,
            recipientName: recipientName,
            subject: mailOptions.subject,
            type: 'maintenance_notification',
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error),
            userId: await this.getUserIdByEmail(email),
            metadata: {
              enabledBy,
              message,
              estimatedCompletion
            }
          });
          
          return false;
        }
      } else {
        console.error('Transporter is null, cannot send maintenance notification email');
        
        // Log the failed email due to null transporter
        await storage.logEmail({
          recipientEmail: email,
          recipientName: recipientName,
          subject: mailOptions.subject,
          type: 'maintenance_notification',
          status: 'failed',
          errorMessage: 'Email transporter not initialized',
          userId: await this.getUserIdByEmail(email),
          metadata: {
            enabledBy,
            message,
            estimatedCompletion
          }
        });
        
        return false;
      }
    } catch (error) {
      console.error('Error sending maintenance notification email:', error);
      return false;
    }
  }
}

/**
 * Email queue item types
 */
type QueueItem = {
  type: 'maintenance_notification';
  recipientEmail: string;
  recipientName: string;
  data: {
    enabledBy: string;
    message: string;
    estimatedCompletion?: string;
  };
};

export const emailQueueManager = EmailQueueManager.getInstance();