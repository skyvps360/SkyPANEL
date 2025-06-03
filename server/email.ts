import { storage } from './storage';
import { Settings, InsertEmailLog } from '@shared/schema';
import nodemailer from 'nodemailer';

/**
 * Email service for sending transactional emails
 */
export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;
  private settings: {
    fromEmail?: string;
    fromName?: string;
    enabled?: boolean;
    companyName?: string;
    supportEmail?: string;
    frontendUrl?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpSecure?: boolean;
  } = {};

  private constructor() {}
  
  /**
   * Log an email to the database
   * @param type The type of email (password_reset, email_verification, etc.)
   * @param recipientEmail The recipient's email address
   * @param subject The email subject
   * @param status The email status (sent, failed)
   * @param messageId The message ID returned by the email provider
   * @param errorMessage The error message if the email failed
   * @param userId Optional user ID if the email was sent to a user
   * @param metadata Optional additional data about the email
   * @returns The created email log entry
   */
  private async logEmailToDatabase(
    type: string,
    recipientEmail: string,
    subject: string,
    status: string = 'sent',
    messageId?: string,
    errorMessage?: string,
    userId?: number,
    metadata: any = {}
  ): Promise<void> {
    try {
      console.log(`Logging ${type} email to ${recipientEmail} with status: ${status}`);
      
      // Create the email log entry
      const emailLog: InsertEmailLog = {
        type,
        recipientEmail,
        subject,
        status,
        messageId,
        errorMessage,
        userId,
        metadata
      };
      
      // Log the email in the database
      await storage.logEmail(emailLog);
      console.log(`Successfully logged ${type} email to database`);
    } catch (error) {
      console.error(`Failed to log ${type} email to database:`, error);
      // We don't want to throw here as it would affect the email sending process
    }
  }

  /**
   * Get the singleton instance of EmailService
   * @returns The EmailService instance
   */
  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Initialize the email service with settings from the database
   */
  public async initialize(): Promise<boolean> {
    try {
      // Get email settings from the database
      const settingsArray: Settings[] = await storage.getAllSettings();
      
      // Reset settings
      this.settings = {};
      
      // Process settings
      settingsArray.forEach((setting: Settings) => {
        switch (setting.key) {
          case 'smtp_host':
            this.settings.smtpHost = setting.value;
            break;
          case 'smtp_port':
            this.settings.smtpPort = parseInt(setting.value);
            break;
          case 'smtp_user':
            this.settings.smtpUser = setting.value;
            break;
          case 'smtp_pass':
            this.settings.smtpPass = setting.value;
            break;
          case 'smtp_secure':
            this.settings.smtpSecure = setting.value === 'true';
            break;
          case 'email_from_address':
            this.settings.fromEmail = setting.value;
            break;
          case 'email_from_name':
            this.settings.fromName = setting.value;
            break;
          case 'email_enabled':
            this.settings.enabled = setting.value === 'true';
            break;
          case 'company_name':
            this.settings.companyName = setting.value;
            break;
          case 'support_email':
            this.settings.supportEmail = setting.value;
            break;
          case 'frontend_url':
            this.settings.frontendUrl = setting.value;
            break;
        }
      });
      
      // Use SMTP2GO as default if no SMTP server is configured
      if (!this.settings.smtpHost) {
        this.settings.smtpHost = 'mail.smtp2go.com';
      }
      
      if (!this.settings.smtpPort) {
        this.settings.smtpPort = 2525; // Default SMTP port
      }
      
      // Initialize nodemailer transporter if credentials are available
      if (this.settings.smtpHost && this.settings.smtpUser && this.settings.smtpPass) {
        console.log(`Initializing email service with host: ${this.settings.smtpHost}, port: ${this.settings.smtpPort}`);
        
        this.transporter = nodemailer.createTransport({
          host: this.settings.smtpHost,
          port: this.settings.smtpPort,
          secure: this.settings.smtpSecure ?? false,
          auth: {
            user: this.settings.smtpUser,
            pass: this.settings.smtpPass, // Always use the actual password here
          },
          debug: true, // Enable debug output for troubleshooting
          logger: true  // Log SMTP traffic for debugging
        });
        
        try {
          // Verify the connection
          await this.transporter.verify();
          console.log('Email service initialized successfully');
          return true;
        } catch (error) {
          console.error('Failed to verify email connection:', error);
          console.error('Email settings:', {
            host: this.settings.smtpHost,
            port: this.settings.smtpPort,
            secure: this.settings.smtpSecure ?? false,
            user: this.settings.smtpUser,
            passProvided: this.settings.smtpPass ? 'yes' : 'no'
          });
          // Don't return false yet, try the test account for development
        }
      } else {
        console.warn('Email configuration incomplete. Missing:', {
          host: !this.settings.smtpHost,
          user: !this.settings.smtpUser,
          pass: !this.settings.smtpPass
        });
      }
      
      // For development without real email sending
      if (process.env.NODE_ENV === 'development' && !this.transporter) {
        try {
          console.log('Creating test account for nodemailer in development');
          const testAccount = await nodemailer.createTestAccount();
          
          this.transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
          });
          
          console.log('Email test account created:', testAccount);
          return true;
        } catch (error) {
          console.error('Failed to create test email account:', error);
        }
      }
      
      console.warn('Email service not properly configured - no transporter created');
      return false;
    } catch (error) {
      console.error('Error initializing email service:', error);
      return false;
    }
  }

  /**
   * Send a password reset email
   * @param email The recipient's email address
   * @param resetCode The password reset code
   * @returns Success status
   */
  public async sendPasswordResetEmail(email: string, resetCode: string): Promise<boolean> {
    try {
      // Initialize if not already initialized
      if (!this.transporter) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('Email service not initialized - cannot send password reset email');
          return false;
        }
      }
      
      // Check if email is enabled
      if (this.settings.enabled === false) {
        console.warn('Email sending is disabled - not sending password reset email');
        return false;
      }
      
      const companyName = await this.getCompanyName();
      
      // Create HTML and text content
      const textContent = 
        `Hello,\n\n` +
        `You have requested to reset your password for your ${companyName} account.\n\n` +
        `Your password reset code is: ${resetCode}\n\n` +
        `This code will expire in 5 minutes. If you did not request this password reset, please ignore this email.\n\n` +
        `Thank you,\n` +
        `${companyName} Team`;
        
      const htmlContent = 
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">` +
        `<h2 style="color: #333;">Password Reset</h2>` +
        `<p>Hello,</p>` +
        `<p>You have requested to reset your password for your ${companyName} account.</p>` +
        `<p>Your password reset code is: <strong style="font-size: 18px; letter-spacing: 2px;">${resetCode}</strong></p>` +
        `<p>This code will expire in <strong>5 minutes</strong>. If you did not request this password reset, please ignore this email.</p>` +
        `<p>Thank you,<br>${companyName} Team</p>` +
        `</div>`;
      
      // Prepare email data using nodemailer format
      const mailOptions = {
        from: `"${this.settings.fromName || companyName}" <${this.settings.fromEmail || 'noreply@skyvps360.xyz'}>`,
        to: email,
        subject: `${companyName} Password Reset Code`,
        text: textContent,
        html: htmlContent
      };
      
      // Send the email
      if (this.transporter) {
        try {
          const info = await this.transporter.sendMail(mailOptions);
          console.log('Password reset email sent:', info.messageId);
          
          // Log preview URL in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
          }
          
          // Log the email to the database
          await this.logEmailToDatabase(
            'password_reset',
            email,
            mailOptions.subject,
            'sent',
            info.messageId,
            undefined,
            undefined,
            { resetCode }
          );
          
          return true;
        } catch (sendError: any) {
          console.error('Error sending password reset email:', sendError);
          
          // Log the failed email
          await this.logEmailToDatabase(
            'password_reset',
            email,
            mailOptions.subject,
            'failed',
            undefined,
            sendError.message,
            undefined,
            { resetCode }
          );
          
          return false;
        }
      } else {
        console.error('Transporter is null, cannot send email');
        
        // Log the failed email attempt
        await this.logEmailToDatabase(
          'password_reset',
          email,
          mailOptions.subject,
          'failed',
          undefined,
          'Email transporter not initialized',
          undefined,
          { resetCode }
        );
        
        return false;
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send a forgot username email
   * @param email The recipient's email address
   * @param username The user's username
   * @returns Success status
   */
  public async sendForgotUsernameEmail(email: string, username: string): Promise<boolean> {
    try {
      // Initialize if not already initialized
      if (!this.transporter) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('Email service not initialized - cannot send username reminder email');
          return false;
        }
      }
      
      // Check if email is enabled
      if (this.settings.enabled === false) {
        console.warn('Email sending is disabled - not sending username reminder email');
        return false;
      }
      
      const companyName = await this.getCompanyName();
      
      // Create HTML and text content
      const textContent = 
        `Hello,\n\n` +
        `You have requested a reminder of your username for your ${companyName} account.\n\n` +
        `Your username is: ${username}\n\n` +
        `If you did not request this reminder, please ignore this email.\n\n` +
        `Thank you,\n` +
        `${companyName} Team`;
        
      const htmlContent = 
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">` +
        `<h2 style="color: #333;">Username Reminder</h2>` +
        `<p>Hello,</p>` +
        `<p>You have requested a reminder of your username for your ${companyName} account.</p>` +
        `<p>Your username is: <strong style="font-size: 18px;">${username}</strong></p>` +
        `<p>If you did not request this reminder, please ignore this email.</p>` +
        `<p>Thank you,<br>${companyName} Team</p>` +
        `</div>`;
      
      // Prepare email data using nodemailer format
      const mailOptions = {
        from: `"${this.settings.fromName || companyName}" <${this.settings.fromEmail || 'noreply@skyvps360.xyz'}>`,
        to: email,
        subject: `${companyName} Username Reminder`,
        text: textContent,
        html: htmlContent
      };
      
      // Send the email
      if (this.transporter) {
        try {
          const info = await this.transporter.sendMail(mailOptions);
          console.log('Username reminder email sent:', info.messageId);
          
          // Log preview URL in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
          }
          
          // Log the email to the database
          await this.logEmailToDatabase(
            'username_reminder',
            email,
            mailOptions.subject,
            'sent',
            info.messageId,
            undefined,
            undefined,
            { username }
          );
          
          return true;
        } catch (sendError: any) {
          console.error('Error sending username reminder email:', sendError);
          
          // Log the failed email
          await this.logEmailToDatabase(
            'username_reminder',
            email,
            mailOptions.subject,
            'failed',
            undefined,
            sendError.message,
            undefined,
            { username }
          );
          
          return false;
        }
      } else {
        console.error('Transporter is null, cannot send username reminder email');
        
        // Log the failed email attempt
        await this.logEmailToDatabase(
          'username_reminder',
          email,
          mailOptions.subject,
          'failed',
          undefined,
          'Email transporter not initialized',
          undefined,
          { username }
        );
        
        return false;
      }
    } catch (error) {
      console.error('Error sending username reminder email:', error);
      return false;
    }
  }

  /**
   * Send an email verification code
   * @param email The recipient's email address
   * @param verificationCode The verification code
   * @returns Success status
   */
  public async sendEmailVerificationCode(email: string, verificationCode: string): Promise<boolean> {
    try {
      // Initialize if not already initialized
      if (!this.transporter) {
        console.log('Email transporter not initialized, attempting to initialize now...');
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('Email service failed to initialize - cannot send verification email');
          return false;
        }
        console.log('Email service initialized successfully during verification email attempt');
      }
      
      // Check if email is enabled
      if (this.settings.enabled === false) {
        console.warn('Email sending is disabled in settings - not sending verification email');
        return false;
      }
      
      // Double-check SMTP settings
      if (!this.settings.smtpHost || !this.settings.smtpUser || !this.settings.smtpPass) {
        console.error('Missing SMTP settings:', {
          host: !this.settings.smtpHost,
          user: !this.settings.smtpUser,
          pass: !this.settings.smtpPass
        });
        return false;
      }
      
      const companyName = await this.getCompanyName();
      console.log(`Preparing email verification for ${email} with company name: ${companyName}`);
      
      // Create HTML and text content
      const textContent = 
        `Hello,\n\n` +
        `Thank you for registering at ${companyName}. To verify your email address, please use the following verification code:\n\n` +
        `Verification Code: ${verificationCode}\n\n` +
        `This code will expire in 24 hours. If you did not create this account, please ignore this email.\n\n` +
        `Thank you,\n` +
        `${companyName} Team`;
        
      const htmlContent = 
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">` +
        `<h2 style="color: #333;">Email Verification</h2>` +
        `<p>Hello,</p>` +
        `<p>Thank you for registering at ${companyName}. To verify your email address, please use the following verification code:</p>` +
        `<p style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 5px;">` +
        `<strong style="font-size: 20px; letter-spacing: 2px; color: #333;">${verificationCode}</strong>` +
        `</p>` +
        `<p>This code will expire in <strong>24 hours</strong>. If you did not create this account, please ignore this email.</p>` +
        `<p>Thank you,<br>${companyName} Team</p>` +
        `</div>`;
      
      // Prepare email data using nodemailer format
      const fromEmail = this.settings.fromEmail || 'noreply@skyvps360.xyz';
      const fromName = this.settings.fromName || companyName;
      
      console.log(`Sending verification email from: "${fromName}" <${fromEmail}>`);
      
      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject: `${companyName} Email Verification Code`,
        text: textContent,
        html: htmlContent
      };
      
      // Send the email
      if (this.transporter) {
        try {
          console.log('Attempting to send verification email...');
          const info = await this.transporter.sendMail(mailOptions);
          console.log('Email verification sent successfully:', info.messageId);
          
          // Log preview URL in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
          }
          
          // Log the email to the database
          await this.logEmailToDatabase(
            'email_verification',
            email,
            mailOptions.subject,
            'sent',
            info.messageId,
            undefined,
            undefined,
            { verificationCode }
          );
          
          return true;
        } catch (sendError) {
          console.error('Failed to send verification email:', sendError);
          
          // Try to verify connection - it might have timed out
          try {
            await this.transporter.verify();
            console.log('SMTP connection is still valid despite send error');
          } catch (verifyError) {
            console.error('SMTP connection is invalid, attempting to reinitialize transporter:', verifyError);
            // Re-create transporter and try one more time
            this.transporter = nodemailer.createTransport({
              host: this.settings.smtpHost,
              port: this.settings.smtpPort,
              secure: this.settings.smtpSecure ?? false,
              auth: {
                user: this.settings.smtpUser,
                pass: this.settings.smtpPass
              },
              debug: true
            });
            
            try {
              await this.transporter.verify();
              console.log('Reinitialized SMTP connection, trying to send email again');
              const retryInfo = await this.transporter.sendMail(mailOptions);
              console.log('Email verification sent on second attempt:', retryInfo.messageId);
              return true;
            } catch (finalError) {
              console.error('Failed to send email after reinitializing transporter:', finalError);
              return false;
            }
          }
          return false;
        }
      } else {
        console.error('Transporter is null after initialization attempts, cannot send verification email');
        return false;
      }
    } catch (error) {
      console.error('Unexpected error sending email verification:', error);
      return false;
    }
  }

  /**
   * Get the company name from settings
   * @returns The company name or a default value
   */
  private async getCompanyName(): Promise<string> {
    if (this.settings.companyName) {
      return this.settings.companyName;
    }

    // Attempt to get from database if not already loaded
    const companySetting = await storage.getSetting('company_name');
    if (companySetting) {
      this.settings.companyName = companySetting.value;
      return companySetting.value;
    }

    // Return default value if not found
    return 'SkyVPS360';
  }

  /**
   * Get the frontend URL from settings
   * @returns The frontend URL or a default value
   */
  private async getFrontendUrl(): Promise<string> {
    // First check environment variable
    if (process.env.FRONTEND_URL) {
      return process.env.FRONTEND_URL;
    }

    // Then check settings cache
    if (this.settings.frontendUrl) {
      return this.settings.frontendUrl;
    }

    // Attempt to get from database if not already loaded
    const frontendSetting = await storage.getSetting('frontend_url');
    if (frontendSetting) {
      this.settings.frontendUrl = frontendSetting.value;
      return frontendSetting.value;
    }

    // Return default value if not found
    return 'https://skyvps360.xyz';
  }

  /**
   * Send a notification email when an admin resets a user's password
   * @param email The recipient's email address
   * @param temporaryPassword The temporary password
   * @param adminName The name of the admin who reset the password
   * @returns Success status
   */
  public async sendAdminPasswordResetEmail(email: string, temporaryPassword: string, adminName: string): Promise<boolean> {
    try {
      // Initialize if not already initialized
      if (!this.transporter) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('Email service not initialized - cannot send admin password reset email');
          return false;
        }
      }
      
      // Check if email is enabled
      if (this.settings.enabled === false) {
        console.warn('Email sending is disabled - not sending admin password reset email');
        return false;
      }
      
      const companyName = await this.getCompanyName();
      
      // Create HTML and text content
      const textContent = 
        `Hello,\n\n` +
        `Your password for your ${companyName} account has been reset by an administrator (${adminName}).\n\n` +
        `Your new temporary password is: ${temporaryPassword}\n\n` +
        `Please login with this temporary password and change it immediately for security purposes.\n\n` +
        `Thank you,\n` +
        `${companyName} Team`;
        
      const htmlContent = 
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">` +
        `<h2 style="color: #333;">Password Reset Notification</h2>` +
        `<p>Hello,</p>` +
        `<p>Your password for your ${companyName} account has been reset by an administrator (${adminName}).</p>` +
        `<p>Your new temporary password is: <strong style="font-size: 18px; letter-spacing: 2px;">${temporaryPassword}</strong></p>` +
        `<p>Please login with this temporary password and change it immediately for security purposes.</p>` +
        `<p>Thank you,<br>${companyName} Team</p>` +
        `</div>`;
      
      // Prepare email data using nodemailer format
      const mailOptions = {
        from: `"${this.settings.fromName || companyName}" <${this.settings.fromEmail || 'noreply@skyvps360.xyz'}>`,
        to: email,
        subject: `${companyName} Password Reset Notification`,
        text: textContent,
        html: htmlContent
      };
      
      // Send the email
      if (this.transporter) {
        try {
          const info = await this.transporter.sendMail(mailOptions);
          console.log('Admin password reset email sent:', info.messageId);
          
          // Log preview URL in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
          }
          
          // Log the email to the database
          await this.logEmailToDatabase(
            'admin_password_reset',
            email,
            mailOptions.subject,
            'sent',
            info.messageId,
            undefined,
            undefined, // We don't know the user ID here
            { adminName }  // Don't include the temporary password in the logs for security reasons
          );
          
          return true;
        } catch (sendError: any) {
          console.error('Error sending admin password reset email:', sendError);
          
          // Log the failed email
          await this.logEmailToDatabase(
            'admin_password_reset',
            email,
            mailOptions.subject,
            'failed',
            undefined,
            sendError.message,
            undefined,
            { adminName }
          );
          
          return false;
        }
      } else {
        console.error('Transporter is null, cannot send admin password reset email');
        
        // Log the failed email attempt
        await this.logEmailToDatabase(
          'admin_password_reset',
          email,
          mailOptions.subject,
          'failed',
          undefined,
          'Email transporter not initialized',
          undefined,
          { adminName }
        );
        
        return false;
      }
    } catch (error) {
      console.error('Error sending admin password reset email:', error);
      return false;
    }
  }
  
  /**
   * Send a general notification email
   * @param to Recipient email address
   * @param subject Email subject
   * @param html HTML content of the email
   * @returns Success status
   */
  public async sendNotificationEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      // Initialize if not already initialized
      if (!this.transporter) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('Email service not initialized - cannot send notification email');
          return false;
        }
      }
      
      // Check if email is enabled
      if (this.settings.enabled === false) {
        console.warn('Email sending is disabled - not sending notification email');
        return false;
      }
      
      const companyName = await this.getCompanyName();
      
      // Prepare email data using nodemailer format
      const mailOptions = {
        from: `"${this.settings.fromName || companyName}" <${this.settings.fromEmail || 'noreply@skyvps360.xyz'}>`,
        to,
        subject,
        html
      };
      
      // Send the email
      if (this.transporter) {
        try {
          const info = await this.transporter.sendMail(mailOptions);
          console.log('Notification email sent:', info.messageId);
          
          // Log preview URL in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
          }
          
          // Log the email to the database
          await this.logEmailToDatabase(
            'notification', 
            to, 
            subject, 
            'sent', 
            info.messageId, 
            null, 
            null, 
            { custom: true }
          );
          
          return true;
        } catch (error) {
          console.error('Error sending notification email:', error);
          
          // Log the failure to the database
          await this.logEmailToDatabase(
            'notification', 
            to, 
            subject, 
            'failed', 
            null, 
            error.message || 'Unknown error', 
            null,
            { custom: true, error: error.message }
          );
          
          return false;
        }
      }
      
      console.error('Transporter not available when attempting to send notification email');
      return false;
    } catch (error) {
      console.error('Error in sendNotificationEmail:', error);
      return false;
    }
  }

  // Send chat-to-ticket conversion notification (ENHANCED: Chat-to-ticket conversion feature)
  async sendChatToTicketNotification(
    email: string,
    userName: string,
    ticketId: number,
    ticketSubject: string,
    chatSessionId: number
  ): Promise<boolean> {
    console.log(`Sending chat-to-ticket notification to ${email} for ticket #${ticketId}`);

    const companyName = await this.getCompanyName();
    const supportEmail = this.settings.supportEmail || 'support@skyvps360.xyz';
    const frontendUrl = await this.getFrontendUrl();

    const textContent =
      `Hello ${userName},\n\n` +
      `Your live chat conversation has been converted to a support ticket for better assistance.\n\n` +
      `Ticket Details:\n` +
      `- Ticket ID: #${ticketId}\n` +
      `- Subject: ${ticketSubject}\n` +
      `- Original Chat Session: #${chatSessionId}\n\n` +
      `Your entire chat history has been preserved in the ticket. You can now:\n` +
      `- Reply to this email to add messages to the ticket\n` +
      `- Log into your account to view and manage the ticket\n` +
      `- Continue the conversation through our ticket system\n\n` +
      `Our support team will respond to your ticket as soon as possible.\n\n` +
      `If you have any questions, please contact us at ${supportEmail}.\n\n` +
      `Thank you,\n${companyName} Support Team`;

    const htmlContent =
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">` +
      `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">` +
      `<h1 style="margin: 0; font-size: 28px;">Chat Converted to Ticket</h1>` +
      `<p style="margin: 10px 0 0 0; opacity: 0.9;">Your conversation has been transferred</p>` +
      `</div>` +
      `<div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">` +
      `<p style="color: #333; font-size: 16px; line-height: 1.6;">Hello <strong>${userName}</strong>,</p>` +
      `<p style="color: #333; font-size: 16px; line-height: 1.6;">Your live chat conversation has been converted to a support ticket for better assistance and tracking.</p>` +
      `<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">` +
      `<h3 style="color: #333; margin: 0 0 15px 0;">Ticket Details</h3>` +
      `<p style="margin: 5px 0; color: #555;"><strong>Ticket ID:</strong> #${ticketId}</p>` +
      `<p style="margin: 5px 0; color: #555;"><strong>Subject:</strong> ${ticketSubject}</p>` +
      `<p style="margin: 5px 0; color: #555;"><strong>Original Chat Session:</strong> #${chatSessionId}</p>` +
      `</div>` +
      `<h3 style="color: #333; margin: 25px 0 15px 0;">What happens next?</h3>` +
      `<ul style="color: #555; line-height: 1.8; padding-left: 20px;">` +
      `<li>Your entire chat history has been preserved in the ticket</li>` +
      `<li>You can reply to this email to add messages to the ticket</li>` +
      `<li>Log into your account to view and manage the ticket</li>` +
      `<li>Continue the conversation through our ticket system</li>` +
      `</ul>` +
      `<p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 25px;">Our support team will respond to your ticket as soon as possible.</p>` +
      `<div style="text-align: center; margin: 30px 0;">` +
      `<a href="${frontendUrl}/tickets/${ticketId}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Ticket</a>` +
      `</div>` +
      `<p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions, please contact us at <a href="mailto:${supportEmail}" style="color: #667eea;">${supportEmail}</a>.</p>` +
      `<p style="color: #333; margin-top: 25px;">Thank you,<br><strong>${companyName} Support Team</strong></p>` +
      `</div>` +
      `</div>`;

    // Prepare email data using nodemailer format
    const fromEmail = this.settings.fromEmail || 'noreply@skyvps360.xyz';
    const fromName = this.settings.fromName || companyName;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: `${companyName} - Chat Converted to Ticket #${ticketId}`,
      text: textContent,
      html: htmlContent
    };

    // Send the email
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail(mailOptions);
        console.log('Chat-to-ticket notification email sent:', info.messageId);

        // Log preview URL in development
        if (process.env.NODE_ENV === 'development') {
          console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        }

        // Log the email to the database
        await this.logEmailToDatabase(
          'chat_to_ticket_notification',
          email,
          mailOptions.subject,
          'sent',
          info.messageId,
          undefined,
          undefined,
          { ticketId, chatSessionId, ticketSubject }
        );

        return true;
      } catch (error) {
        console.error('Error sending chat-to-ticket notification email:', error);

        // Log the failure to the database
        await this.logEmailToDatabase(
          'chat_to_ticket_notification',
          email,
          mailOptions.subject,
          'failed',
          null,
          error.message || 'Unknown error',
          null,
          { ticketId, chatSessionId, ticketSubject, error: error.message }
        );

        return false;
      }
    }

    return false;
  }
}

export const emailService = EmailService.getInstance();