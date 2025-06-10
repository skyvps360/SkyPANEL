import { describe, it, expect } from 'vitest';
import { isDefaultInterServerRecord, DnsRecord } from '../shared/dns-record-utils';

describe('DNS Record Utils', () => {
  const domainName = 'example.com';

  describe('isDefaultInterServerRecord', () => {
    it('should identify SOA records as default', () => {
      const record: DnsRecord = {
        id: '1',
        name: 'example.com',
        type: 'SOA',
        content: 'ns1.example.com admin.example.com 2023010101 10800 3600 604800 3600',
        ttl: '3600',
        prio: '0',
        disabled: '0'
      };
      
      expect(isDefaultInterServerRecord(record, domainName)).toBe(true);
    });

    it('should identify NS records as default', () => {
      const record: DnsRecord = {
        id: '2',
        name: 'example.com',
        type: 'NS',
        content: 'ns1.example.com',
        ttl: '3600',
        prio: '0',
        disabled: '0'
      };
      
      expect(isDefaultInterServerRecord(record, domainName)).toBe(true);
    });

    it('should identify root domain A record as default', () => {
      const record: DnsRecord = {
        id: '3',
        name: 'example.com',
        type: 'A',
        content: '192.168.1.1',
        ttl: '3600',
        prio: '0',
        disabled: '0'
      };
      
      expect(isDefaultInterServerRecord(record, domainName)).toBe(true);
    });

    it('should identify wildcard A record as default', () => {
      const record: DnsRecord = {
        id: '4',
        name: '*.example.com',
        type: 'A',
        content: '192.168.1.1',
        ttl: '3600',
        prio: '0',
        disabled: '0'
      };
      
      expect(isDefaultInterServerRecord(record, domainName)).toBe(true);
    });

    it('should identify localhost A record as default', () => {
      const record: DnsRecord = {
        id: '5',
        name: 'localhost.example.com',
        type: 'A',
        content: '192.168.1.1',
        ttl: '3600',
        prio: '0',
        disabled: '0'
      };
      
      expect(isDefaultInterServerRecord(record, domainName)).toBe(true);
    });

    it('should identify MX record pointing to mail.domain as default', () => {
      const record: DnsRecord = {
        id: '6',
        name: 'example.com',
        type: 'MX',
        content: 'mail.example.com',
        ttl: '3600',
        prio: '10',
        disabled: '0'
      };
      
      expect(isDefaultInterServerRecord(record, domainName)).toBe(true);
    });

    it('should identify MX record pointing to bare domain as default', () => {
      const record: DnsRecord = {
        id: '7',
        name: 'example.com',
        type: 'MX',
        content: 'example.com',
        ttl: '3600',
        prio: '20',
        disabled: '0'
      };
      
      expect(isDefaultInterServerRecord(record, domainName)).toBe(true);
    });

    it('should not identify custom A record as default', () => {
      const record: DnsRecord = {
        id: '8',
        name: 'custom.example.com',
        type: 'A',
        content: '192.168.1.2',
        ttl: '3600',
        prio: '0',
        disabled: '0'
      };
      
      expect(isDefaultInterServerRecord(record, domainName)).toBe(false);
    });

    it('should not identify custom MX record as default', () => {
      const record: DnsRecord = {
        id: '9',
        name: 'example.com',
        type: 'MX',
        content: 'custom-mail.example.com',
        ttl: '3600',
        prio: '30',
        disabled: '0'
      };
      
      expect(isDefaultInterServerRecord(record, domainName)).toBe(false);
    });
  });
});