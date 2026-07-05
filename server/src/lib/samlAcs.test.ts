import { describe, it, expect } from 'vitest';
import { parseSamlAcsResponse, buildSamlAcsRedirect } from './samlAcs';

const sampleAssertion = `<?xml version="1.0"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
    <saml:Subject><saml:NameID>teacher@school.edu</saml:NameID></saml:Subject>
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#"/>
  </saml:Assertion>
</samlp:Response>`;

describe('samlAcs', () => {
  it('extracts email from NameID', () => {
    const encoded = Buffer.from(sampleAssertion, 'utf8').toString('base64');
    const result = parseSamlAcsResponse({ SAMLResponse: encoded });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.email).toBe('teacher@school.edu');
  });

  it('rejects missing SAMLResponse', () => {
    expect(parseSamlAcsResponse({}).ok).toBe(false);
  });

  it('builds client redirect with saml_email', () => {
    const url = buildSamlAcsRedirect('user@test.edu', '/dashboard');
    expect(url).toContain('saml_email=user%40test.edu');
    expect(url).toContain('relay_state=%2Fdashboard');
  });
});
