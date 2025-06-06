/**
 * DNS Record Types and Validation
 * Based on InterServer API specification
 */

export interface DnsRecordType {
  value: string;
  label: string;
  description: string;
  category: string;
  requiresPriority?: boolean;
  contentValidation?: RegExp;
  contentPlaceholder?: string;
  contentDescription?: string;
}

// All DNS record types supported by InterServer API
export const DNS_RECORD_TYPES: DnsRecordType[] = [
  // Basic Records
  {
    value: "A",
    label: "A - IPv4 Address",
    description: "Maps a domain name to an IPv4 address",
    category: "Basic",
    contentValidation: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    contentPlaceholder: "192.168.1.1",
    contentDescription: "IPv4 address (e.g., 192.168.1.1)"
  },
  {
    value: "AAAA",
    label: "AAAA - IPv6 Address",
    description: "Maps a domain name to an IPv6 address",
    category: "Basic",
    contentValidation: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
    contentPlaceholder: "2001:db8::1",
    contentDescription: "IPv6 address (e.g., 2001:db8::1)"
  },
  {
    value: "CNAME",
    label: "CNAME - Canonical Name",
    description: "Creates an alias for another domain name",
    category: "Basic",
    contentPlaceholder: "example.com",
    contentDescription: "Target domain name"
  },
  {
    value: "MX",
    label: "MX - Mail Exchange",
    description: "Specifies mail servers for the domain",
    category: "Mail",
    requiresPriority: true,
    contentPlaceholder: "mail.example.com",
    contentDescription: "Mail server hostname"
  },
  {
    value: "TXT",
    label: "TXT - Text Record",
    description: "Stores arbitrary text data",
    category: "Basic",
    contentPlaceholder: "v=spf1 include:_spf.google.com ~all",
    contentDescription: "Text content (often used for verification)"
  },
  {
    value: "NS",
    label: "NS - Name Server",
    description: "Delegates a subdomain to other name servers",
    category: "Basic",
    contentPlaceholder: "ns1.example.com",
    contentDescription: "Name server hostname"
  },
  {
    value: "PTR",
    label: "PTR - Pointer Record",
    description: "Maps an IP address to a domain name (reverse DNS)",
    category: "Basic",
    contentPlaceholder: "example.com",
    contentDescription: "Target domain name"
  },
  {
    value: "SRV",
    label: "SRV - Service Record",
    description: "Defines services available in the domain",
    category: "Advanced",
    requiresPriority: true,
    contentPlaceholder: "10 5 443 target.example.com",
    contentDescription: "Priority Weight Port Target"
  },

  // Security Records
  {
    value: "CAA",
    label: "CAA - Certificate Authority Authorization",
    description: "Specifies which certificate authorities can issue certificates",
    category: "Security",
    contentPlaceholder: "0 issue \"letsencrypt.org\"",
    contentDescription: "Flags Tag Value"
  },
  {
    value: "DNSKEY",
    label: "DNSKEY - DNS Public Key",
    description: "Contains public key for DNSSEC",
    category: "Security",
    contentPlaceholder: "256 3 8 AwEAAa...",
    contentDescription: "Flags Protocol Algorithm PublicKey"
  },
  {
    value: "DS",
    label: "DS - Delegation Signer",
    description: "Holds the name of a delegated zone's DNSKEY",
    category: "Security",
    contentPlaceholder: "12345 8 2 1234567890ABCDEF...",
    contentDescription: "KeyTag Algorithm DigestType Digest"
  },
  {
    value: "RRSIG",
    label: "RRSIG - Resource Record Signature",
    description: "Contains cryptographic signature for DNSSEC",
    category: "Security",
    contentPlaceholder: "A 8 3 86400 20230101000000 20221201000000 12345 example.com. ...",
    contentDescription: "TypeCovered Algorithm Labels OriginalTTL SignatureExpiration SignatureInception KeyTag SignerName Signature"
  },
  {
    value: "NSEC",
    label: "NSEC - Next Secure",
    description: "Part of DNSSEC, indicates which records exist",
    category: "Security",
    contentPlaceholder: "host.example.com. A MX RRSIG NSEC",
    contentDescription: "NextDomainName TypeBitMaps"
  },
  {
    value: "NSEC3",
    label: "NSEC3 - Next Secure v3",
    description: "Hashed version of NSEC for DNSSEC",
    category: "Security",
    contentPlaceholder: "1 0 12 aabbccdd 2t7b4g4vsa5smi47k61mv5bv1a22bojr A RRSIG",
    contentDescription: "HashAlgorithm Flags Iterations Salt NextHashedOwnerName TypeBitMaps"
  },
  {
    value: "NSEC3PARAM",
    label: "NSEC3PARAM - NSEC3 Parameters",
    description: "Parameters for NSEC3 records",
    category: "Security",
    contentPlaceholder: "1 0 12 aabbccdd",
    contentDescription: "HashAlgorithm Flags Iterations Salt"
  },
  {
    value: "TLSA",
    label: "TLSA - Transport Layer Security Authentication",
    description: "Associates TLS certificate with domain name",
    category: "Security",
    contentPlaceholder: "3 1 1 1234567890ABCDEF...",
    contentDescription: "CertificateUsage Selector MatchingType CertificateAssociationData"
  },
  {
    value: "SSHFP",
    label: "SSHFP - SSH Fingerprint",
    description: "Contains SSH public key fingerprints",
    category: "Security",
    contentPlaceholder: "2 1 123456789abcdef67890123456789abcdef67890",
    contentDescription: "Algorithm FingerprintType Fingerprint"
  },

  // Advanced Records
  {
    value: "ALIAS",
    label: "ALIAS - Alias Record",
    description: "Similar to CNAME but can coexist with other records",
    category: "Advanced",
    contentPlaceholder: "example.com",
    contentDescription: "Target domain name"
  },
  {
    value: "AFSDB",
    label: "AFSDB - AFS Database",
    description: "Location of AFS database servers",
    category: "Advanced",
    requiresPriority: true,
    contentPlaceholder: "1 afsdb.example.com",
    contentDescription: "Subtype Hostname"
  },
  {
    value: "CERT",
    label: "CERT - Certificate",
    description: "Stores certificates and related revocation lists",
    category: "Advanced",
    contentPlaceholder: "1 0 0 ...",
    contentDescription: "Type KeyTag Algorithm Certificate"
  },
  {
    value: "DHCID",
    label: "DHCID - DHCP Identifier",
    description: "Used with DHCP to prevent conflicts",
    category: "Advanced",
    contentPlaceholder: "AAIBY2/AuCccgoJbsaxcQc9TUapptP69lOjxfNuVAA2kjEA=",
    contentDescription: "DHCP identifier data"
  },
  {
    value: "DNAME",
    label: "DNAME - Delegation Name",
    description: "Creates aliases for entire subtrees",
    category: "Advanced",
    contentPlaceholder: "example.com",
    contentDescription: "Target domain name"
  },
  {
    value: "HINFO",
    label: "HINFO - Host Information",
    description: "Provides information about host CPU and OS",
    category: "Advanced",
    contentPlaceholder: "\"PC-Intel-700mhz\" \"Linux\"",
    contentDescription: "CPU OS"
  },
  {
    value: "IPSECKEY",
    label: "IPSECKEY - IPsec Key",
    description: "IPsec public key storage",
    category: "Advanced",
    contentPlaceholder: "10 1 2 192.0.2.38 AQNRU3mG7TVTO2BkR47usntb102uFJtugbo6BSGvgqt4AQ==",
    contentDescription: "Precedence GatewayType Algorithm Gateway PublicKey"
  },
  {
    value: "KX",
    label: "KX - Key Exchanger",
    description: "Used with some cryptographic systems",
    category: "Advanced",
    requiresPriority: true,
    contentPlaceholder: "10 kx.example.com",
    contentDescription: "Preference Exchanger"
  },
  {
    value: "LOC",
    label: "LOC - Location",
    description: "Geographical location information",
    category: "Advanced",
    contentPlaceholder: "52 22 23.000 N 4 53 32.000 E -2.00m 0.00m 10000m 10m",
    contentDescription: "Latitude Longitude Altitude Size HorizontalPrecision VerticalPrecision"
  },
  {
    value: "NAPTR",
    label: "NAPTR - Name Authority Pointer",
    description: "Used for URI resolution",
    category: "Advanced",
    contentPlaceholder: "100 50 \"s\" \"z3950+I2L+I2C\" \"\" _z3950._tcp.gatech.edu.",
    contentDescription: "Order Preference Flags Services Regexp Replacement"
  },
  {
    value: "RP",
    label: "RP - Responsible Person",
    description: "Information about responsible person",
    category: "Advanced",
    contentPlaceholder: "admin.example.com. txt.example.com.",
    contentDescription: "MailboxDomainName TxtDomainName"
  },
  {
    value: "SPF",
    label: "SPF - Sender Policy Framework",
    description: "Email authentication (deprecated, use TXT)",
    category: "Mail",
    contentPlaceholder: "v=spf1 include:_spf.google.com ~all",
    contentDescription: "SPF policy data"
  },

  // Legacy/Specialized Records
  {
    value: "A6",
    label: "A6 - IPv6 Address (Legacy)",
    description: "Legacy IPv6 address record",
    category: "Legacy",
    contentPlaceholder: "0 2001:db8::1",
    contentDescription: "PrefixLength IPv6Address PrefixName"
  },
  {
    value: "CDNSKEY",
    label: "CDNSKEY - Child DNSKEY",
    description: "Child copy of DNSKEY record",
    category: "Security",
    contentPlaceholder: "256 3 8 AwEAAa...",
    contentDescription: "Flags Protocol Algorithm PublicKey"
  },
  {
    value: "CDS",
    label: "CDS - Child DS",
    description: "Child copy of DS record",
    category: "Security",
    contentPlaceholder: "12345 8 2 1234567890ABCDEF...",
    contentDescription: "KeyTag Algorithm DigestType Digest"
  },
  {
    value: "DLV",
    label: "DLV - DNSSEC Lookaside Validation",
    description: "DNSSEC lookaside validation (deprecated)",
    category: "Legacy",
    contentPlaceholder: "12345 8 2 1234567890ABCDEF...",
    contentDescription: "KeyTag Algorithm DigestType Digest"
  },
  {
    value: "EUI48",
    label: "EUI48 - 48-bit Extended Unique Identifier",
    description: "48-bit MAC address",
    category: "Advanced",
    contentPlaceholder: "00-00-5e-00-53-2a",
    contentDescription: "48-bit identifier"
  },
  {
    value: "EUI64",
    label: "EUI64 - 64-bit Extended Unique Identifier",
    description: "64-bit MAC address",
    category: "Advanced",
    contentPlaceholder: "00-00-5e-ef-00-00-53-2a",
    contentDescription: "64-bit identifier"
  },
  {
    value: "KEY",
    label: "KEY - Public Key (Legacy)",
    description: "Legacy public key record",
    category: "Legacy",
    contentPlaceholder: "256 3 8 AwEAAa...",
    contentDescription: "Flags Protocol Algorithm PublicKey"
  },
  {
    value: "MAILA",
    label: "MAILA - Mail Agent (Obsolete)",
    description: "Obsolete mail agent record",
    category: "Legacy",
    contentPlaceholder: "mail.example.com",
    contentDescription: "Mail agent hostname"
  },
  {
    value: "MAILB",
    label: "MAILB - Mailbox (Obsolete)",
    description: "Obsolete mailbox record",
    category: "Legacy",
    contentPlaceholder: "mailbox.example.com",
    contentDescription: "Mailbox hostname"
  },
  {
    value: "MBOXFW",
    label: "MBOXFW - Mailbox Forward",
    description: "Mailbox forwarding record",
    category: "Mail",
    contentPlaceholder: "forward@example.com",
    contentDescription: "Forward email address"
  },
  {
    value: "MINFO",
    label: "MINFO - Mailbox Information",
    description: "Mailbox or mail list information",
    category: "Mail",
    contentPlaceholder: "admin.example.com. errors.example.com.",
    contentDescription: "ResponsibleMailbox ErrorsMailbox"
  },
  {
    value: "MR",
    label: "MR - Mail Rename",
    description: "Mail rename domain name",
    category: "Mail",
    contentPlaceholder: "newname.example.com",
    contentDescription: "New mailbox name"
  },
  {
    value: "OPENPGPKEY",
    label: "OPENPGPKEY - OpenPGP Key",
    description: "OpenPGP public key",
    category: "Security",
    contentPlaceholder: "mQENBE...",
    contentDescription: "OpenPGP public key data"
  },
  {
    value: "OPT",
    label: "OPT - Option",
    description: "EDNS option record",
    category: "Advanced",
    contentPlaceholder: "",
    contentDescription: "EDNS option data"
  },
  {
    value: "RKEY",
    label: "RKEY - Resource Key",
    description: "Resource record key",
    category: "Security",
    contentPlaceholder: "256 3 8 AwEAAa...",
    contentDescription: "Flags Protocol Algorithm PublicKey"
  },
  {
    value: "SIG",
    label: "SIG - Signature (Legacy)",
    description: "Legacy signature record",
    category: "Legacy",
    contentPlaceholder: "A 8 3 86400 20230101000000 20221201000000 12345 example.com. ...",
    contentDescription: "TypeCovered Algorithm Labels OriginalTTL SignatureExpiration SignatureInception KeyTag SignerName Signature"
  },
  {
    value: "TKEY",
    label: "TKEY - Transaction Key",
    description: "Transaction key for secure dynamic updates",
    category: "Security",
    contentPlaceholder: "gss-tsig. 1234567890 1234567890 3 0 ...",
    contentDescription: "Algorithm Inception Expiration Mode Error KeyData OtherData"
  },
  {
    value: "TSIG",
    label: "TSIG - Transaction Signature",
    description: "Transaction signature for secure transfers",
    category: "Security",
    contentPlaceholder: "hmac-sha256. 1234567890 300 32 ...",
    contentDescription: "Algorithm TimeSigned Fudge MACSize MAC OriginalID Error OtherLen OtherData"
  },
  {
    value: "URL",
    label: "URL - Uniform Resource Locator",
    description: "URL redirection record",
    category: "Advanced",
    contentPlaceholder: "https://example.com/path",
    contentDescription: "Target URL"
  },
  {
    value: "WKS",
    label: "WKS - Well Known Services",
    description: "Well-known services (obsolete)",
    category: "Legacy",
    contentPlaceholder: "192.0.2.1 6 21 23 25 53 80",
    contentDescription: "Address Protocol Services"
  }
];

// Group record types by category
export const DNS_RECORD_CATEGORIES = {
  "Basic": DNS_RECORD_TYPES.filter(type => type.category === "Basic"),
  "Mail": DNS_RECORD_TYPES.filter(type => type.category === "Mail"),
  "Security": DNS_RECORD_TYPES.filter(type => type.category === "Security"),
  "Advanced": DNS_RECORD_TYPES.filter(type => type.category === "Advanced"),
  "Legacy": DNS_RECORD_TYPES.filter(type => type.category === "Legacy")
};

// Get all valid record type values
export const VALID_DNS_RECORD_TYPES = DNS_RECORD_TYPES.map(type => type.value);

// Helper functions
export function getDnsRecordType(value: string): DnsRecordType | undefined {
  return DNS_RECORD_TYPES.find(type => type.value === value);
}

export function validateDnsRecordContent(type: string, content: string): boolean {
  const recordType = getDnsRecordType(type);
  if (!recordType || !recordType.contentValidation) {
    return true; // No validation rule, assume valid
  }
  return recordType.contentValidation.test(content);
}

export function getContentPlaceholder(type: string): string {
  const recordType = getDnsRecordType(type);
  return recordType?.contentPlaceholder || "";
}

export function getContentDescription(type: string): string {
  const recordType = getDnsRecordType(type);
  return recordType?.contentDescription || "Record content";
}

export function requiresPriority(type: string): boolean {
  const recordType = getDnsRecordType(type);
  return recordType?.requiresPriority || false;
}

/**
 * Validates DNS record name format
 * Supports @ symbol notation for root domain and subdomain references
 */
export function validateRecordName(name: string): boolean {
  // Allow "@" for root domain
  if (name === '@') return true;
  // Allow empty string for root domain
  if (name.trim() === '') return true;

  const trimmed = name.trim();

  // Allow @ symbol notation formats:
  // - "subdomain.@" for subdomain of root domain
  // - "subdomain@" for subdomain of root domain (alternative notation)
  if (trimmed.includes('@')) {
    // Check for valid @ symbol usage patterns
    if (trimmed === '@') return true; // Root domain
    if (trimmed.endsWith('.@')) {
      // Format: "subdomain.@" - validate the subdomain part
      const subdomain = trimmed.slice(0, -2);
      return validateSubdomainPart(subdomain);
    }
    if (trimmed.endsWith('@')) {
      // Format: "subdomain@" - validate the subdomain part
      const subdomain = trimmed.slice(0, -1);
      return validateSubdomainPart(subdomain);
    }
    // Invalid @ symbol usage
    return false;
  }

  // Regular subdomain validation
  return validateSubdomainPart(trimmed);
}

/**
 * Validates a subdomain part (without @ symbols)
 */
function validateSubdomainPart(subdomain: string): boolean {
  if (!subdomain || subdomain.trim() === '') return false;

  const trimmed = subdomain.trim();

  // Basic validation: only alphanumeric, dots, and hyphens allowed
  if (!/^[a-zA-Z0-9.-]+$/.test(trimmed)) return false;

  // Cannot start or end with hyphen or dot
  if (trimmed.startsWith('-') || trimmed.endsWith('-') ||
      trimmed.startsWith('.') || trimmed.endsWith('.')) return false;

  // Cannot have consecutive dots
  if (trimmed.includes('..')) return false;

  // Each label (part between dots) must be valid
  const labels = trimmed.split('.');
  for (const label of labels) {
    // Each label must be 1-63 characters
    if (label.length === 0 || label.length > 63) return false;
    // Cannot start or end with hyphen
    if (label.startsWith('-') || label.endsWith('-')) return false;
    // Must contain at least one character
    if (!/^[a-zA-Z0-9-]+$/.test(label)) return false;
  }

  return true;
}

/**
 * Processes record name for InterServer API
 * Converts @ symbol notation to full domain names
 */
export function processRecordName(recordName: string, domainName: string): string {
  const trimmed = recordName.trim();

  // Convert "@" to domain name for root domain
  if (trimmed === '@' || trimmed === '') {
    return domainName;
  }

  // Convert "subdomain.@" to "subdomain.domain.com"
  if (trimmed.endsWith('.@')) {
    const subdomain = trimmed.slice(0, -2);
    return `${subdomain}.${domainName}`;
  }

  // Convert "subdomain@" to "subdomain.domain.com"
  if (trimmed.endsWith('@')) {
    const subdomain = trimmed.slice(0, -1);
    return `${subdomain}.${domainName}`;
  }

  // Return as-is for regular subdomain names
  return trimmed;
}


