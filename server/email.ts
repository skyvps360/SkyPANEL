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
   * Render an email template with variables
   * @param template The email template
   * @param variables Key-value pairs of variables to replace
   * @returns Rendered template with variables replaced
   */
  public async renderTemplate(template: any, variables: Record<string, string> = {}): Promise<{
    subject: string;
    htmlContent: string;
    textContent: string;
  }> {
    // Get common variables from settings
    const commonVars = await this.getCommonVariables();
    
    // Merge provided variables with common variables (provided variables take precedence)
    const allVariables = { ...commonVars, ...variables };
    
    // Replace variables in template content
    const subject = this.replaceVariables(template.subject, allVariables);
    const htmlContent = this.replaceVariables(template.htmlContent, allVariables);
    const textContent = template.textContent ? this.replaceVariables(template.textContent, allVariables) : '';
    
    return {
      subject,
      htmlContent,
      textContent
    };
  }

  /**
   * Replace variables in content using {{variable}} syntax
   * @param content The content to process
   * @param variables Key-value pairs of variables to replace
   * @returns Content with variables replaced
   */
  private replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    
    // Replace {{variable}} patterns
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value || '');
    });
    
    return result;
  }

  /**
   * Get common variables that can be used in all email templates
   * @returns Common variables object
   */
  private async getCommonVariables(): Promise<Record<string, string>> {
    const companyName = await this.getCompanyName();
    
    return {
      company_name: companyName,
      support_email: this.settings.supportEmail || 'support@example.com',
      frontend_url: this.settings.frontendUrl || 'https://example.com',
      dashboard_url: `${this.settings.frontendUrl || 'https://example.com'}/dashboard`,
      support_url: `${this.settings.frontendUrl || 'https://example.com'}/support`,
      docs_url: `${this.settings.frontendUrl || 'https://example.com'}/docs`,
    };
  }

  /**
   * Send email using template
   * @param templateType The template type to use
   * @param to Recipient email address
   * @param variables Variables to replace in the template
   * @param userId Optional user ID for logging
   * @returns Success status
   */
  public async sendTemplatedEmail(
    templateType: string,
    to: string,
    variables: Record<string, string> = {},
    userId?: number
  ): Promise<boolean> {
    try {
      // Initialize if not already initialized
      if (!this.transporter) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('Email service not initialized - cannot send templated email');
          return false;
        }
      }
      
      // Check if email is enabled
      if (this.settings.enabled === false) {
        console.warn('Email sending is disabled - not sending templated email');
        return false;
      }

      // Get template from database
      const template = await storage.getEmailTemplateByType(templateType);
      if (!template) {
        console.error(`Email template not found for type: ${templateType}`);
        return false;
      }

      if (!template.isActive) {
        console.error(`Email template is inactive for type: ${templateType}`);
        return false;
      }

      // Render template with variables
      const renderedTemplate = await this.renderTemplate(template, variables);

      const companyName = await this.getCompanyName();
      
      // Prepare email data using nodemailer format
      const mailOptions = {
        from: `"${this.settings.fromName || companyName}" <${this.settings.fromEmail || 'noreply@skyvps360.xyz'}>`,
        to,
        subject: renderedTemplate.subject,
        html: renderedTemplate.htmlContent,
        text: renderedTemplate.textContent || undefined
      };
      
      // Send the email
      if (this.transporter) {
        try {
          const info = await this.transporter.sendMail(mailOptions);
          console.log(`Templated email sent (${templateType}):`, info.messageId);
          
          // Log preview URL in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
          }
          
          // Log the email to the database
          await this.logEmailToDatabase(
            templateType,
            to,
            renderedTemplate.subject,
            'sent',
            info.messageId,
            undefined,
            userId,
            { variables, templateId: template.id }
          );
          
          return true;
        } catch (sendError: any) {
          console.error(`Error sending templated email (${templateType}):`, sendError);
          
          // Log the failed email
          await this.logEmailToDatabase(
            templateType,
            to,
            renderedTemplate.subject,
            'failed',
            undefined,
            sendError.message,
            userId,
            { variables, templateId: template.id }
          );
          
          return false;
        }
      } else {
        console.error('Transporter is null, cannot send email');
        
        // Log the failed email attempt
        await this.logEmailToDatabase(
          templateType,
          to,
          renderedTemplate.subject,
          'failed',
          undefined,
          'Email transporter not initialized',
          userId,
          { variables, templateId: template.id }
        );
        
        return false;
      }
    } catch (error) {
      console.error(`Error sending templated email (${templateType}):`, error);
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
      // Use template system only - no hardcoded fallback
      const templateSuccess = await this.sendTemplatedEmail('password_reset', email, {
        reset_code: resetCode
      });
      
      if (templateSuccess) {
        console.log('Password reset email sent using template system');
        return true;
      }
      
      console.error('Failed to send password reset email: template system failed and no fallback available');
      return false;
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
      // Use template system only - no hardcoded fallback
      const templateSuccess = await this.sendTemplatedEmail('username_reminder', email, {
        username: username
      });

      if (templateSuccess) {
        console.log('Username reminder email sent using template system');
        return true;
      }

      console.error('Failed to send username reminder email: template system failed and no fallback available');
      return false;
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
      // Try to use template system first
      const templateSuccess = await this.sendTemplatedEmail('email_verification', email, {
        verification_code: verificationCode,
        expiry_time: '24 hours'
      });

      if (templateSuccess) {
        console.log('Email verification sent using template system');
        return true;
      }

      console.error('Failed to send email verification: template system failed and no fallback available');
      return false;
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
      // Try to use template system first
      const templateSuccess = await this.sendTemplatedEmail('admin_password_reset', email, {
        temporary_password: temporaryPassword,
        admin_name: adminName
      });

      if (templateSuccess) {
        console.log('Admin password reset email sent using template system');
        return true;
      }

      console.error('Failed to send admin password reset email: template system failed and no fallback available');
      return false;
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
  /**
   * Send a test email to verify email configuration
   * @param to Recipient email address  
   * @returns Success status
   */
  public async sendTestEmail(to: string): Promise<boolean> {
    try {
      // Try to use template system first
      const templateSuccess = await this.sendTemplatedEmail('test_email', to, {
        test_timestamp: new Date().toLocaleString(),
        admin_email: to
      });

      if (templateSuccess) {
        console.log('Test email sent using template system');
        return true;
      }

      console.error('Failed to send test email: template system failed and no fallback available');
      return false;
    } catch (error: any) {
      console.error('Error in sendTestEmail:', error);
      return false;
    }
  }

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


}

export const emailService = EmailService.getInstance();