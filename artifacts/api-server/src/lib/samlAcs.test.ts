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

  it('builds client redirect with saml_email and auth code', () => {
    const url = buildSamlAcsRedirect('user@test.edu', '/dashboard', {
      authCode: 'abc123',
      orgId: 'org_1',
      provisioned: true,
    });
    expect(url).toContain('saml_email=user%40test.edu');
    expect(url).toContain('relay_state=%2Fdashboard');
    expect(url).toContain('saml_auth_code=abc123');
    expect(url).toContain('saml_org=org_1');
    expect(url).toContain('saml_provisioned=1');
  });

  it('extracts orgId and role attributes', () => {
    const assertion = `<?xml version="1.0"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
    <saml:Subject><saml:NameID>student@school.edu</saml:NameID></saml:Subject>
    <saml:AttributeStatement>
      <saml:Attribute Name="orgId"><saml:AttributeValue>org_test</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="role"><saml:AttributeValue>student</saml:AttributeValue></saml:Attribute>
    </saml:AttributeStatement>
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#"/>
  </saml:Assertion>
</samlp:Response>`;
    const encoded = Buffer.from(assertion, 'utf8').toString('base64');
    const result = parseSamlAcsResponse({ SAMLResponse: encoded });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.email).toBe('student@school.edu');
      expect(result.orgId).toBe('org_test');
      expect(result.role).toBe('student');
    }
  });
});
