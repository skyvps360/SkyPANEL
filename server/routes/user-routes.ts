import { Router } from 'express';
import { storage } from "../storage";
import { AuthService } from "../auth-service";
import { EmailVerificationService } from "../email-verification-service";
import { hashPassword } from "../auth";
import { z } from 'zod';

const router = Router();

// Get current user
router.get('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove sensitive information
    const { password, ...userWithoutPassword } = user;
    
    return res.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Error getting current user:', error);
    return res.status(500).json({ message: 'An error occurred while getting user information' });
  }
});

// Update current user
router.put('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    
    const schema = z.object({
      name: z.string().optional(),
      email: z.string().email('Invalid email address').optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional(),
      company: z.string().optional(),
      preferences: z.record(z.any()).optional()
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    // If email is being updated, check if it's already in use
    if (validationResult.data.email) {
      const existingUser = await storage.getUserByEmail(validationResult.data.email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ message: 'Email address is already in use' });
      }
    }
    
    await storage.updateUser(userId, validationResult.data);
    
    const updatedUser = await storage.getUser(userId);
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove sensitive information
    const { password, ...userWithoutPassword } = updatedUser;
    
    return res.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'An error occurred while updating user information' });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    
    const schema = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters')
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { currentPassword, newPassword } = validationResult.data;
    
    // Verify current password
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const isPasswordValid = await AuthService.verifyPassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    await storage.updateUser(userId, { password: hashedPassword });
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error changing password:', error);
    return res.status(500).json({ message: 'An error occurred while changing password' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email('Invalid email address')
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { email } = validationResult.data;
    
    // Check if user exists
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal that the user doesn't exist for security reasons
      return res.json({ success: true });
    }
    
    // Generate reset token
    const resetToken = await AuthService.generatePasswordResetToken(user.id);
    
    // Send reset email
    await EmailVerificationService.sendPasswordResetEmail(email, resetToken);
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error requesting password reset:', error);
    return res.status(500).json({ message: 'An error occurred while processing your request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const schema = z.object({
      token: z.string().min(1, 'Token is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters')
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { token, newPassword } = validationResult.data;
    
    // Verify token
    const userId = await AuthService.verifyPasswordResetToken(token);
    if (!userId) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    await storage.updateUser(userId, { password: hashedPassword });
    
    // Invalidate token
    await AuthService.invalidatePasswordResetToken(token);
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ message: 'An error occurred while resetting password' });
  }
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      company: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional()
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { email, password, ...userData } = validationResult.data;
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Email address is already in use' });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const user = await storage.createUser({
      email,
      password: hashedPassword,
      ...userData,
      isAdmin: false,
      isActive: true
    });
    
    // Generate verification token
    const verificationToken = await EmailVerificationService.generateVerificationToken(user.id);
    
    // Send verification email
    await EmailVerificationService.sendVerificationEmail(email, verificationToken);
    
    // Remove sensitive information
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(201).json(userWithoutPassword);
  } catch (error: any) {
    console.error('Error registering user:', error);
    return res.status(500).json({ message: 'An error occurred while registering user' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const schema = z.object({
      token: z.string().min(1, 'Token is required')
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { token } = validationResult.data;
    
    // Verify token
    const userId = await EmailVerificationService.verifyToken(token);
    if (!userId) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Update user
    await storage.updateUser(userId, { emailVerified: true });
    
    // Invalidate token
    await EmailVerificationService.invalidateToken(token);
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error verifying email:', error);
    return res.status(500).json({ message: 'An error occurred while verifying email' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }
    
    // Generate verification token
    const verificationToken = await EmailVerificationService.generateVerificationToken(userId);
    
    // Send verification email
    await EmailVerificationService.sendVerificationEmail(user.email, verificationToken);
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error resending verification email:', error);
    return res.status(500).json({ message: 'An error occurred while resending verification email' });
  }
});

// Get user SSH keys
router.get('/ssh-keys', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const sshKeys = await storage.virtFusionService.getUserSshKeys(userId);
    
    return res.json(sshKeys);
  } catch (error: any) {
    console.error('Error getting SSH keys:', error);
    return res.status(500).json({ message: 'An error occurred while getting SSH keys' });
  }
});

// Add SSH key
router.post('/ssh-keys', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    
    const schema = z.object({
      name: z.string().min(1, 'Name is required'),
      publicKey: z.string().min(1, 'Public key is required')
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { name, publicKey } = validationResult.data;
    
    const result = await storage.virtFusionService.addSshKey({
      userId,
      name,
      publicKey
    });
    
    return res.status(201).json(result);
  } catch (error: any) {
    console.error('Error adding SSH key:', error);
    return res.status(500).json({ message: 'An error occurred while adding SSH key' });
  }
});

// Delete SSH key
router.delete('/ssh-keys/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const keyId = parseInt(req.params.id);
    if (isNaN(keyId)) {
      return res.status(400).json({ message: 'Invalid SSH key ID' });
    }
    
    // Verify ownership
    const key = await storage.virtFusionService.getSshKey(keyId);
    if (!key || key.userId !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to delete this SSH key' });
    }
    
    await storage.virtFusionService.deleteSshKey(keyId);
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting SSH key:', error);
    return res.status(500).json({ message: 'An error occurred while deleting SSH key' });
  }
});

export default router;