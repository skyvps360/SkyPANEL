/**
 * DNS Record Utilities
 * Helper functions for DNS record management and filtering
 */

export interface DnsRecord {
  id: string;
  name: string;
  type: string;
  content: string;
  ttl: string;
  prio: string;
  disabled: string;
  ordername?: string;
  auth?: string;
}

/**
 * Determines if a DNS record is a default InterServer record that shouldn't count toward user limits
 *
 * When InterServer creates a domain, it automatically adds several default records:
 * - 1 SOA record (Start of Authority)
 * - 3+ NS records (nameserver records - though these get replaced with SkyPANEL nameservers)
 * - Multiple A records (pointing to the IP address provided during domain creation):
 *   - Root domain A record (domainname)
 *   - Wildcard A record (*.domainname)
 *   - Localhost subdomain A record (localhost.domainname)
 * - MX records (default mail exchange records):
 *   - MX pointing to mail.domainname
 *   - MX pointing to the bare domain itself
 *
 * These default records should not count toward the user's DNS plan record limits.
 * Only user-created records should count.
 */
export function isDefaultInterServerRecord(record: DnsRecord, domainName: string): boolean {
  // Normalize domain name (remove trailing dot if present)
  const normalizedDomain = domainName.replace(/\.$/, '');

  // SOA records are always auto-created by InterServer
  if (record.type === 'SOA') {
    return true;
  }

  // NS records are auto-created and managed by the system
  // (InterServer creates default ones, we replace them with SkyPANEL nameservers)
  if (record.type === 'NS') {
    return true;
  }

  // Default A records created by InterServer
  if (record.type === 'A') {
    const recordName = record.name.replace(/\.$/, ''); // Remove trailing dot

    // Root domain A record (bare domain)
    if (recordName === normalizedDomain) {
      return true;
    }

    // Wildcard A record (*.domain)
    if (recordName === `*.${normalizedDomain}`) {
      return true;
    }

    // Localhost subdomain A record (localhost.domain)
    if (recordName === `localhost.${normalizedDomain}`) {
      return true;
    }
  }

  // Default MX records created by InterServer
  if (record.type === 'MX') {
    const recordContent = record.content.replace(/\.$/, ''); // Remove trailing dot

    // MX record pointing to mail.domain
    if (recordContent === `mail.${normalizedDomain}`) {
      return true;
    }

    // MX record pointing to the bare domain itself
    if (recordContent === normalizedDomain) {
      return true;
    }
  }

  // All other records are considered user-created
  return false;
}

/**
 * Filters out default InterServer records from a list of DNS records
 * Returns only user-created records that should count toward plan limits
 */
export function filterUserCreatedRecords(records: DnsRecord[], domainName: string): DnsRecord[] {
  return records.filter(record => !isDefaultInterServerRecord(record, domainName));
}

/**
 * Counts user-created DNS records (excluding default InterServer records)
 */
export function countUserCreatedRecords(records: DnsRecord[], domainName: string): number {
  return filterUserCreatedRecords(records, domainName).length;
}

/**
 * Gets usage statistics for DNS records
 */
export function getDnsRecordUsageStats(records: DnsRecord[], domainName: string) {
  const totalRecords = records.length;
  const userCreatedRecords = filterUserCreatedRecords(records, domainName);
  const defaultRecords = totalRecords - userCreatedRecords.length;

  return {
    total: totalRecords,
    userCreated: userCreatedRecords.length,
    default: defaultRecords,
    records: userCreatedRecords
  };
}
