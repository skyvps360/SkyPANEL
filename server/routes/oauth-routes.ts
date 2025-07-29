import { Router } from 'express';
import { OAuthService } from '../services/auth/oauth-service';
import { storage } from '../storage';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const router = Router();
const oauthService = new OAuthService();

// Get OAuth providers (admin only)
router.get('/providers', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const providers = await oauthService.getProviders();
    return res.json(providers);
  } catch (error: any) {
    console.error('Error getting OAuth providers:', error);
    return res.status(500).json({ message: 'An error occurred while getting OAuth providers' });
  }
});

// Get enabled OAuth providers (for regular users)
router.get('/providers/enabled', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const providers = await oauthService.getEnabledProviders();
    return res.json({ providers });
  } catch (error: any) {
    console.error('Error getting enabled OAuth providers:', error);
    return res.status(500).json({ message: 'An error occurred while getting enabled OAuth providers' });
  }
});

// Get enabled OAuth providers (public - for login page)
router.get('/providers/enabled/public', async (req, res) => {
  try {
    const providers = await oauthService.getEnabledProviders();
    return res.json({ providers });
  } catch (error: any) {
    console.error('Error getting enabled OAuth providers:', error);
    return res.status(500).json({ message: 'An error occurred while getting enabled OAuth providers' });
  }
});

// Update OAuth provider configuration (admin only)
router.put('/providers/:providerName', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { providerName } = req.params;
    const schema = z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      redirectUrl: z.string().url().optional(),
      scope: z.string().optional(),
      enabled: z.boolean().optional(),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }

    const { enabled, ...config } = validationResult.data;

    // Update provider configuration
    if (Object.keys(config).length > 0) {
      await oauthService.updateProvider(providerName, config);
    }

    // Update provider status if provided
    if (enabled !== undefined) {
      await oauthService.setProviderStatus(providerName, enabled);
    }

    const updatedProvider = await oauthService.getProvider(providerName);
    return res.json(updatedProvider);
  } catch (error: any) {
    console.error('Error updating OAuth provider:', error);
    return res.status(500).json({ message: 'An error occurred while updating OAuth provider' });
  }
});

// Get OAuth analytics (admin only)
router.get('/analytics', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const analytics = await oauthService.getOAuthAnalytics();
    return res.json(analytics);
  } catch (error: any) {
    console.error('Error getting OAuth analytics:', error);
    return res.status(500).json({ message: 'An error occurred while getting OAuth analytics' });
  }
});

// Get user's OAuth accounts
router.get('/accounts', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const accounts = await oauthService.getUserOAuthAccounts(req.user.id);
    return res.json(accounts);
  } catch (error: any) {
    console.error('Error getting user OAuth accounts:', error);
    return res.status(500).json({ message: 'An error occurred while getting OAuth accounts' });
  }
});

// Unlink OAuth account
router.delete('/accounts/:providerName', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { providerName } = req.params;
    
    // Log the unlink activity
    await oauthService.logOAuthActivity({
      userId: req.user.id,
      providerName,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    await oauthService.unlinkOAuthAccount(req.user.id, providerName);
    return res.json({ message: 'OAuth account unlinked successfully' });
  } catch (error: any) {
    console.error('Error unlinking OAuth account:', error);
    return res.status(500).json({ message: 'An error occurred while unlinking OAuth account' });
  }
});

// Initiate OAuth login
router.get('/login/:providerName', async (req, res) => {
  try {
    const { providerName } = req.params;
    const { redirect } = req.query;

    const provider = await oauthService.getProvider(providerName);
    if (!provider || !provider.enabled) {
      return res.status(400).json({ message: 'OAuth provider not available' });
    }

    const state = oauthService.generateState();
    const redirectUrl = redirect ? decodeURIComponent(redirect as string) : '/dashboard';

    // Store state in session for validation
    if (!req.session) {
      req.session = {};
    }
    req.session.oauthState = state;
    req.session.oauthRedirect = redirectUrl;
    
    // If user is already logged in, preserve their session for linking
    if (req.user) {
      req.session.userId = req.user.id;
      // Force save the session before redirecting
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session:', err);
        }
      });
    }

    // Build OAuth URL based on provider
    let authUrl: string;
    const scope = provider.scope || '';

    switch (providerName) {
      case 'discord':
        authUrl = `https://discord.com/api/oauth2/authorize?client_id=${provider.clientId}&redirect_uri=${encodeURIComponent(provider.redirectUrl)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
        break;
      case 'github':
        authUrl = `https://github.com/login/oauth/authorize?client_id=${provider.clientId}&redirect_uri=${encodeURIComponent(provider.redirectUrl)}&scope=${encodeURIComponent(scope)}&state=${state}`;
        break;
      case 'google':
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${provider.clientId}&redirect_uri=${encodeURIComponent(provider.redirectUrl)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
        break;
      case 'linkedin':
        authUrl = `https://www.linkedin.com/oauth/v2/authorization?client_id=${provider.clientId}&redirect_uri=${encodeURIComponent(provider.redirectUrl)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
        break;
      default:
        return res.status(400).json({ message: 'Unsupported OAuth provider' });
    }

    return res.json({ authUrl });
  } catch (error: any) {
    console.error('Error initiating OAuth login:', error);
    return res.status(500).json({ message: 'An error occurred while initiating OAuth login' });
  }
});

// OAuth callback
router.get('/callback/:providerName', async (req, res) => {
  try {
    const { providerName } = req.params;
    const { code, state, error } = req.query;

    console.log('OAuth callback debug:', {
      providerName,
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      session: {
        hasSession: !!req.session,
        userId: req.session?.userId,
        oauthState: req.session?.oauthState,
        oauthRedirect: req.session?.oauthRedirect
      }
    });

    if (error) {
      console.error('OAuth error:', error);
      return res.redirect('/auth?error=oauth_error');
    }

    if (!code || !state) {
      return res.redirect('/auth?error=invalid_callback');
    }

    // Validate state parameter
    if (!req.session?.oauthState || !oauthService.validateState(state as string) || req.session.oauthState !== state) {
      console.log('State validation failed:', {
        hasOAuthState: !!req.session?.oauthState,
        stateValid: oauthService.validateState(state as string),
        stateMatch: req.session?.oauthState === state
      });
      return res.redirect('/auth?error=invalid_state');
    }

    const provider = await oauthService.getProvider(providerName);
    if (!provider || !provider.enabled) {
      return res.redirect('/auth?error=provider_not_available');
    }

    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(providerName, code as string, provider);
    if (!tokenResponse.success) {
      console.error('Token exchange failed:', tokenResponse.error);
      return res.redirect('/auth?error=token_exchange_failed');
    }

    // Get user info from provider
    console.log('Getting user info from provider:', providerName);
    const userInfo = await getUserInfoFromProvider(providerName, tokenResponse.accessToken);
    if (!userInfo.success) {
      console.error('Failed to get user info:', userInfo.error);
      return res.redirect('/auth?error=user_info_failed');
    }
    
    if (userInfo.userInfo) {
      console.log('User info received from provider:', userInfo.userInfo);
    } else {
      console.log('User info is undefined');
    }

    // Check if user is already linked to this OAuth account
    console.log('Checking for existing OAuth account:', {
      providerName,
      providerUserId: userInfo.userInfo.id,
      userInfo: userInfo.userInfo
    });
    
    const existingAccount = await oauthService.findUserByOAuthProvider(providerName, userInfo.userInfo.id);
    console.log('Existing account found:', existingAccount);
    
    if (existingAccount) {
      // User is logging in with OAuth
      const user = await storage.getUser(existingAccount.userId);
      if (!user) {
        return res.redirect('/auth?error=user_not_found');
      }

      // Log the login
      await oauthService.logOAuthActivity({
        userId: user.id,
        providerName,
        providerUserId: userInfo.userInfo?.id,
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Log the user in using Passport
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Error logging in user:', loginErr);
          return res.redirect('/auth?error=login_failed');
        }
        
        const redirectUrl = req.session.oauthRedirect || '/dashboard';
        delete req.session.oauthState;
        delete req.session.oauthRedirect;

        // Add success parameter for OAuth login
        const finalRedirectUrl = redirectUrl.includes('?') 
          ? `${redirectUrl}&success=oauth_login` 
          : `${redirectUrl}?success=oauth_login`;

        return res.redirect(finalRedirectUrl);
      });
    } else {
      // User needs to link their account
      console.log('Linking OAuth account - session debug:', {
        hasSession: !!req.session,
        userId: req.session?.userId,
        existingAccount: existingAccount
      });
      
      if (!req.session?.userId) {
        // Not logged in, redirect to login page
        console.log('No userId in session, redirecting to login');
        return res.redirect('/auth?error=link_required');
      }

      // Link the OAuth account
      if (!userInfo.userInfo) {
        console.error('User info is undefined');
        return res.redirect('/auth?error=user_info_failed');
      }

      await oauthService.linkOAuthAccount(
        req.session.userId,
        providerName,
        userInfo.userInfo,
        {
          accessToken: tokenResponse.accessToken,
          refreshToken: tokenResponse.refreshToken,
          expiresAt: tokenResponse.expiresAt,
        }
      );

      // Log the link
      await oauthService.logOAuthActivity({
        userId: req.session.userId,
        providerName,
        providerUserId: userInfo.userInfo.id,
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const redirectUrl = req.session.oauthRedirect || '/dashboard';
      delete req.session.oauthState;
      delete req.session.oauthRedirect;

      // Add success parameter for OAuth account linking
      const finalRedirectUrl = redirectUrl.includes('?') 
        ? `${redirectUrl}&success=oauth_linked` 
        : `${redirectUrl}?success=oauth_linked`;

      return res.redirect(finalRedirectUrl);
    }
  } catch (error: any) {
    console.error('Error in OAuth callback:', error);
    return res.redirect('/auth?error=callback_error');
  }
});

// Helper function to exchange code for token
async function exchangeCodeForToken(providerName: string, code: string, provider: any) {
  try {
    const tokenUrl = getTokenUrl(providerName);
    const body = new URLSearchParams({
      client_id: provider.clientId!,
      client_secret: provider.clientSecret!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: provider.redirectUrl!,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    return { success: false, error: error };
  }
}

// Helper function to get user info from provider
async function getUserInfoFromProvider(providerName: string, accessToken: string) {
  try {
    const userInfoUrl = getUserInfoUrl(providerName);
    const response = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get user info:', errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    const userInfo = parseUserInfo(providerName, data);
    return { success: true, userInfo };
  } catch (error) {
    console.error('Get user info error:', error);
    return { success: false, error: error };
  }
}

// Helper function to get token URL for provider
function getTokenUrl(providerName: string): string {
  switch (providerName) {
    case 'discord':
      return 'https://discord.com/api/oauth2/token';
    case 'github':
      return 'https://github.com/login/oauth/access_token';
    case 'google':
      return 'https://oauth2.googleapis.com/token';
    case 'linkedin':
      return 'https://www.linkedin.com/oauth/v2/accessToken';
    default:
      throw new Error(`Unsupported provider: ${providerName}`);
  }
}

// Helper function to get user info URL for provider
function getUserInfoUrl(providerName: string): string {
  switch (providerName) {
    case 'discord':
      return 'https://discord.com/api/users/@me';
    case 'github':
      return 'https://api.github.com/user';
    case 'google':
      return 'https://www.googleapis.com/oauth2/v2/userinfo';
    case 'linkedin':
      return 'https://api.linkedin.com/v2/me';
    default:
      throw new Error(`Unsupported provider: ${providerName}`);
  }
}

// Helper function to parse user info from provider response
function parseUserInfo(providerName: string, data: any) {
  switch (providerName) {
    case 'discord':
      return {
        id: data.id,
        email: data.email,
        name: data.username,
        avatar: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : undefined,
      };
    case 'github':
      return {
        id: data.id.toString(),
        email: data.email,
        name: data.login,
        avatar: data.avatar_url,
      };
    case 'google':
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        avatar: data.picture,
      };
    case 'linkedin':
      return {
        id: data.id,
        email: data.emailAddress,
        name: `${data.localizedFirstName} ${data.localizedLastName}`,
        avatar: undefined,
      };
    default:
      throw new Error(`Unsupported provider: ${providerName}`);
  }
}

export default router; 