import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { VirtFusionApi } from "./routes_new";
import { EmailVerificationService } from "./email-verification-service";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Password must be at least 8 characters
        if (!password || password.length < 8) {
          return done(null, false, { message: 'Password must be at least 8 characters long' });
        }
        
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        // Verify password
        const isValidPassword = await comparePasswords(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        // Check if email is verified - note that we still log in the user but mark their verification status
        // The front-end will redirect them to the verification page if needed
        const needsVerification = !user.isVerified;
        
        // All password checks passed - allow login even if unverified
        // This allows the user to access the verification page after login
        return done(null, user);
      } catch (error) {
        console.error('Error in authentication:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        // User no longer exists in the database
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error, null);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate password strength
      if (!req.body.password || req.body.password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      // Check if email is provided
      if (!req.body.email) {
        return res.status(400).json({ error: 'Email address is required.' });
      }

      // Check if user with this username already exists
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Check if user with this email already exists
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Create user in local database (unverified)
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        isVerified: false, // Start with unverified account
      });

      // Send verification email
      const verificationResult = await EmailVerificationService.sendVerificationEmail(
        user.id,
        req.body.email
      );

      // Log verification email status
      if (verificationResult.success) {
        console.log(`Verification email sent to ${req.body.email}`);
      } else {
        console.error(`Failed to send verification email to ${req.body.email}:`, verificationResult.message);
      }

      // VirtFusion account creation has been moved to the email verification process
      // This ensures we only create accounts for users who have verified their email
      console.log(`User created locally. VirtFusion account will be created after email verification.`);

      // Log the user in but include verification status in response
      req.login(user, (err) => {
        if (err) return next(err);
        // Create a response object with all user properties plus verification status
        const response = {
          ...user,
          emailVerificationSent: verificationResult.success,
          message: "Registration successful. Please check your email to verify your account."
        };
        
        console.log(`User registered successfully with ID ${user.id}, verification email sent: ${verificationResult.success}`);
        res.status(201).json(response);
      });
    } catch (error) {
      console.error('Error in registration process:', error);
      return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        // Special handling for unverified users
        if (info && info.needsVerification) {
          return res.status(403).json({
            error: info.message,
            needsVerification: true,
            userId: info.userId,
            email: info.email
          });
        }
        
        // Handle other authentication failures
        return res.status(401).json({ 
          error: info && info.message ? info.message : 'Authentication failed' 
        });
      }
      
      // User authenticated successfully, log them in
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
  
  // Email verification endpoints
  app.post("/api/verify-email", async (req, res) => {
    try {
      const { userId, verificationCode } = req.body;
      
      if (!userId || !verificationCode) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID and verification code are required' 
        });
      }
      
      const result = await EmailVerificationService.verifyEmail(userId, verificationCode);
      
      if (result.success) {
        // If the user is logged in, update their session to show verified status
        if (req.isAuthenticated() && req.user && req.user.id === userId) {
          req.user.isVerified = true;
        }
        
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An error occurred while verifying your email' 
      });
    }
  });
  
  app.post("/api/resend-verification", async (req, res) => {
    try {
      const { userId, email } = req.body;
      
      if (!userId || !email) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID and email are required' 
        });
      }
      
      // Verify the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if email matches
      if (user.email !== email) {
        return res.status(400).json({
          success: false,
          message: 'Email does not match user record'
        });
      }
      
      // Check if already verified
      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }
      
      // Resend verification email
      const result = await EmailVerificationService.resendVerificationEmail(userId, email);
      return res.status(result.success ? 200 : 400).json(result);
      
    } catch (error) {
      console.error('Error resending verification email:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An error occurred while resending verification email' 
      });
    }
  });
}
