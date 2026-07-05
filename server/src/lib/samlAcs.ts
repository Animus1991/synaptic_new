import { config } from '../config';
import { verifySamlXmlSignature } from './samlXmlVerify';

export type SamlAcsSuccess = {
  email: string;
  nameId?: string;
  sessionIndex?: string;
  orgId?: string;
  role?: string;
  displayName?: string;
};

export type SamlAcsResult = { ok: true } & SamlAcsSuccess | { ok: false; error: string };

function decodeSamlXml(samlResponse: string): string | null {
  try {
    const raw = Buffer.from(samlResponse.trim(), 'base64').toString('utf8');
    return raw.includes('<') ? raw : null;
  } catch {
    return null;
  }
}

function extractXmlValue(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<(?:saml2?:)?${tag}[^>]*>([^<]*)</(?:saml2?:)?${tag}>`, 'i');
  const m = xml.match(re);
  return m?.[1]?.trim() || undefined;
}

function extractAttributeValues(xml: string, names: string[]): string[] {
  const values: string[] = [];
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const attrRe = new RegExp(
      `<(?:saml2?:)?Attribute[^>]*(?:Name|FriendlyName)="${escaped}"[^>]*>[\\s\\S]*?<(?:saml2?:)?AttributeValue[^>]*>([^<]+)<`,
      'gi',
    );
    let match: RegExpExecArray | null;
    while ((match = attrRe.exec(xml)) !== null) {
      const value = match[1]?.trim();
      if (value) values.push(value);
    }
  }
  return values;
}

function extractAttributeEmail(xml: string): string | undefined {
  return extractAttributeValues(xml, ['email', 'mail', 'Email', 'emailAddress'])[0];
}

function extractSamlProvisioningClaims(xml: string): Pick<SamlAcsSuccess, 'orgId' | 'role' | 'displayName'> {
  const orgId = extractAttributeValues(xml, ['orgId', 'organizationId', 'synapseOrgId'])[0];
  const role = extractAttributeValues(xml, [
    'role',
    'synapseRole',
    'eduPersonAffiliation',
    'memberOf',
  ])[0];
  const displayName = extractAttributeValues(xml, ['displayName', 'name', 'givenName'])[0];
  return { orgId, role, displayName };
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Parse SAMLResponse POST body (base64 XML) and extract principal email.
 * Production IdPs should also validate XML signatures via SAML_IDP_CERT (optional pilot).
 */
export function parseSamlAcsResponse(body: {
  SAMLResponse?: string;
  RelayState?: string;
}): SamlAcsResult {
  const samlResponse = body.SAMLResponse?.trim();
  if (!samlResponse) return { ok: false, error: 'SAMLResponse missing' };

  const xml = decodeSamlXml(samlResponse);
  if (!xml) return { ok: false, error: 'Invalid SAMLResponse encoding' };

  const idpCert = config.samlIdpCert?.trim() ?? '';
  const sigCheck = verifySamlXmlSignature(xml, idpCert);
  if (!sigCheck.ok) return { ok: false, error: sigCheck.error };

  const nameId =
    extractXmlValue(xml, 'NameID') ??
    xml.match(/<(?:saml2?:)?NameID[^>]*>([^<]+)</i)?.[1]?.trim();
  const attrEmail = extractAttributeEmail(xml);
  const email = [attrEmail, nameId].find((v) => v && looksLikeEmail(v));

  if (!email) {
    return { ok: false, error: 'No email NameID or email attribute in SAML assertion' };
  }

  const sessionIndex = extractXmlValue(xml, 'SessionIndex');
  const provisioning = extractSamlProvisioningClaims(xml);
  return { ok: true, email, nameId, sessionIndex, ...provisioning };
}

export function buildSamlAcsRedirect(
  email: string,
  relayState?: string,
  extras?: { authCode?: string; orgId?: string; provisioned?: boolean },
): string {
  const url = new URL(config.clientAppUrl);
  url.pathname = '/';
  url.searchParams.set('saml', '1');
  url.searchParams.set('saml_email', email);
  if (relayState?.trim()) url.searchParams.set('relay_state', relayState.trim());
  if (extras?.authCode) url.searchParams.set('saml_auth_code', extras.authCode);
  if (extras?.orgId) url.searchParams.set('saml_org', extras.orgId);
  if (extras?.provisioned) url.searchParams.set('saml_provisioned', '1');
  return url.toString();
}
