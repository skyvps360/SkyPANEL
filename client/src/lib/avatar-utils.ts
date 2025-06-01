import md5 from 'md5';

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