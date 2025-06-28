import 'dotenv/config';  // Import dotenv at the very top to load environment variables first
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes_new";
import adminLegalRoutes from './routes/admin-legal';
import { setupVite, serveStatic, log } from "./vite";
import { discordBotService } from "./discord-bot-service";
import { emailService } from "./email";
import { emailQueueManager } from "./email-queue";
import { betterStackService } from "./betterstack-service";
import { geminiService } from "./gemini-service";
import { cronService } from "./services/cron-service";
import slaRoutes from './routes/sla-routes';
import publicSlaRoutes from './routes/public-sla-routes';
// Blog comments routes removed
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cookieParser from "cookie-parser";
import { maintenanceMiddleware, getMaintenanceStatus } from "./middleware";
import { setupAuth } from "./auth";
import cors from "cors";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Configure CORS middleware to allow cross-origin requests
app.use(cors({
  origin: true, // Allow requests from any origin
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Serve static files from client/public folder
app.use('/js', express.static(path.join(__dirname, '../client/public/js')));
app.use(express.static(path.join(__dirname, '../client/public')));

// NoVNC serving removed

// Setup authentication first so req.isAuthenticated() is available 
setupAuth(app);

// Apply maintenance middleware after authentication is set up
app.use(maintenanceMiddleware);

// Blog comments routes removed

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  app.use(adminLegalRoutes);
  app.use('/api/sla', slaRoutes);
  app.use('/api/sla-plans', publicSlaRoutes);

  // Routes for Terms of Service and Privacy Policy pages
  // These are now handled by React components through client-side routing
  // The static HTML files have been removed

  // Serve static JS files with correct MIME type
  app.get('/js/:filename', (req, res) => {
    // SECURITY: Validate filename to prevent path traversal
    const filename = req.params.filename;
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
      console.warn('Blocked request for invalid JS filename:', filename);
      return res.status(400).send('Invalid filename');
    }
    const jsDir = path.resolve(process.cwd(), 'public', 'js');
    const filePath = path.resolve(jsDir, filename);
    // Ensure the resolved path is within the intended directory
    if (!filePath.startsWith(jsDir)) {
      console.warn('Blocked path traversal attempt:', filePath);
      return res.status(400).send('Invalid path');
    }
    console.log(`Serving JS file: ${filePath}`);
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error serving JS file:', err);
        res.status(404).send('File not found');
      }
    });
  });
  
  // For maintenance mode - let React router handle the maintenance page
  // React will fetch maintenance status and render the maintenance page component
  
  // Add a redirect for the misspelled URL to the correct maintenance URL
  app.get('/maintaince', (req, res) => {
    return res.redirect('/maintenance');
  });
  
  // Explicitly handle maintenance page route to ensure it's served by React router 
  app.get('/maintenance', (req, res, next) => {
    // Log that we're sending the maintenance page via React router
    console.log('Serving React maintenance page component');
    
    // Pass control to Vite middleware which will handle the React app
    next();
  });
  
  // Catch maintenance page with query parameters too
  app.get('/maintenance*', (req, res, next) => {
    console.log(`Serving React maintenance page with params: ${req.url}`);
    // Pass control to Vite middleware which will handle the React app
    next();
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    log("Setting up Vite development server");
    await setupVite(app, server);
  } else {
    log("Setting up static file serving for production");
    serveStatic(app);
  }

  // Serve the app on the configured PORT (from .env) or default to 5000
  // this serves both the API and the client.
  const port = process.env.PORT || 5000;
  const host = process.env.HOST || "0.0.0.0"; // Allow external connections on VPS
  server.listen(
    {
      port,
      host,
      reusePort: false,
    },
    async () => {
      log(`serving on port ${port}`);
      
      // Initialize email service first
      try {
        log('Initializing email service...');
        const emailInitialized = await emailService.initialize();
        if (emailInitialized) {
          log('Email service initialized successfully');
          
          // The email queue manager uses the email service, so only initialize it if email service is working
          log('Email queue system is ready to process background notifications');
        } else {
          log('Email service initialization failed - emails will not be sent');
        }
      } catch (error) {
        log(`Error initializing email service: ${error}`);
      }
      
      // Initialize Discord bot when server starts
      try {
        const success = await discordBotService.initialize();
        if (success) {
          log('Discord bot initialized successfully');
        } else {
          log('Discord bot not initialized (disabled or configuration missing)');
        }
      } catch (error) {
        log(`Error initializing Discord bot: ${error}`);
      }
      
      // Initialize BetterStack service
      try {
        log('Initializing BetterStack monitoring service...');
        const betterStackInitialized = await betterStackService.initialize();
        if (betterStackInitialized) {
          log('BetterStack monitoring service initialized successfully');
        } else {
          log('BetterStack monitoring service not configured (API key missing)');
        }
      } catch (error) {
        log(`Error initializing BetterStack monitoring: ${error}`);
      }
      
      // Initialize Gemini AI service
      try {
        const geminiInitialized = geminiService.initialize();
        if (geminiInitialized) {
          log('Gemini AI service initialized successfully');
        } else {
          log('Gemini AI features disabled (GOOGLE_AI_API_KEY not configured)');
        }
      } catch (error) {
        log(`Error initializing Gemini AI service: ${error}`);
      }

      // Initialize Cron service for automated billing
      try {
        log('Initializing cron service for automated billing...');
        await cronService.initialize();
        log('Cron service initialized successfully');
      } catch (error) {
        log(`Error initializing cron service: ${error}`);
      }
    },
  );
})();
