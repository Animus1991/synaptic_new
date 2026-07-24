import { describe, it, expect } from 'vitest';
import { verifySamlXmlSignature } from './samlXmlVerify';

const unsignedAssertion = `<?xml version="1.0"?>
<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
  <saml:Subject><saml:NameID>user@test.edu</saml:NameID></saml:Subject>
</saml:Assertion>`;

describe('verifySamlXmlSignature', () => {
  it('skips verification when IdP cert not configured', () => {
    expect(verifySamlXmlSignature(unsignedAssertion, '')).toEqual({ ok: true });
  });

  it('rejects unsigned XML when IdP cert is required', () => {
    const fakeCert = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHBfpEaYjQKMA0GCSqGSIb3DQEBCwUAMBQxEzARBgNVBAMMCnRl
c3QtaWRwLWNhMB4XDTI1MDEwMTAwMDAwMFoXDTM1MDEwMTAwMDAwMFowFDETMBEG
A1UEAwwKdGVzdC1pZHAtY2EwXDANBgkqhkiG9w0BAQEFAANLADBIAkEAyFakeKey
ForUnitTestOnlyNotARealCert1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZab
cde0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
-----END CERTIFICATE-----`;
    const result = verifySamlXmlSignature(unsignedAssertion, fakeCert);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/signature/i);
  });
});
