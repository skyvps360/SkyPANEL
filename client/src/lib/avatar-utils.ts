import md5 from 'md5';

/**
 * OAuth account interface for user accounts
 */
export interface UserOAuthAccount {
  id: number;
  userId: number;
  providerName: string;
  providerUserId: string;
  providerUserEmail?: string;
  providerUserName?: string;
  providerUsername?: string;
  providerEmail?: string;
  providerAvatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get Gravatar URL for an email address
 * @param email The user's email address
 * @param size The desired image size in pixels (default: 80)
 * @param defaultImage The default image to use if no Gravatar exists ('mp', 'identicon', 'monsterid', 'wavatar', 'retro', 'robohash', 'blank')
 * @returns The Gravatar URL
 */
export function getGravatarUrl(email: string | undefined, size = 80, defaultImage = 'mp'): string {
  if (!email) return `https://gravatar.com/avatar/?s=${size}&d=${defaultImage}`;
  
  // Convert email to lowercase and trim whitespace
  const normalizedEmail = email.trim().toLowerCase();
  
  // Create MD5 hash of the email
  const hash = md5(normalizedEmail);
  
  // Return the Gravatar URL
  return `https://gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
}

/**
 * Get Discord avatar URL with proper sizing
 * @param discordAvatarUrl The raw Discord avatar URL from OAuth
 * @param size The desired image size in pixels (default: 80)
 * @returns The properly sized Discord avatar URL
 */
export function getDiscordAvatarUrl(discordAvatarUrl: string, size = 80): string {
  // Discord avatar URLs from OAuth typically come in format:
  // https://cdn.discordapp.com/avatars/{user.id}/{avatar.hash}.png
  // We can append ?size= parameter to get the right size
  const url = new URL(discordAvatarUrl);
  url.searchParams.set('size', size.toString());
  return url.toString();
}

/**
 * Get the best available user avatar with priority: Discord > Gravatar > Initials
 * @param user The user object
 * @param oauthAccounts The user's OAuth accounts (optional)
 * @param size The desired image size in pixels (default: 80)
 * @returns Object with avatar URL and type for rendering
 */
export function getUserAvatar(
  user: { 
    email?: string; 
    fullName?: string; 
    username?: string;
  }, 
  oauthAccounts?: UserOAuthAccount[] | null,
  size = 80
): { 
  src: string | null; 
  type: 'discord' | 'gravatar' | 'initials';
  fallback: string;
} {
  const fallback = getUserInitials(user.fullName || user.username);

  // 1. Try Discord avatar first if available
  if (oauthAccounts && oauthAccounts.length > 0) {
    const discordAccount = oauthAccounts.find(
      account => account.providerName === 'discord' && 
                 account.isActive && 
                 account.providerAvatarUrl
    );
    
    if (discordAccount?.providerAvatarUrl) {
      try {
        return {
          src: getDiscordAvatarUrl(discordAccount.providerAvatarUrl, size),
          type: 'discord',
          fallback
        };
      } catch (error) {
        console.warn('Failed to process Discord avatar URL:', error);
      }
    }
  }

  // 2. Fall back to Gravatar if email is available
  if (user.email) {
    return {
      src: getGravatarUrl(user.email, size, 'mp'),
      type: 'gravatar',
      fallback
    };
  }

  // 3. Final fallback to initials
  return {
    src: null,
    type: 'initials',
    fallback
  };
}

/**
 * Get user initials from their name
 * @param fullName The user's full name
 * @returns The user's initials (up to 2 characters)
 */
export function getUserInitials(fullName: string | undefined): string {
  if (!fullName) return "U";
  return fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
} 