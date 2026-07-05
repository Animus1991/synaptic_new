import { config } from '../config';
import { verifySamlXmlSignature } from './samlXmlVerify';

export type SamlAcsResult =
  | { ok: true; email: string; nameId?: string; sessionIndex?: string }
  | { ok: false; error: string };

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

function extractAttributeEmail(xml: string): string | undefined {
  const attrRe =
    /<(?:saml2?:)?Attribute[^>]*(?:Name|FriendlyName)="(?:email|mail|Email|emailAddress)"[^>]*>[\s\S]*?<(?:saml2?:)?AttributeValue[^>]*>([^<]+)</i;
  const m = xml.match(attrRe);
  return m?.[1]?.trim();
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
  return { ok: true, email, nameId, sessionIndex };
}

export function buildSamlAcsRedirect(email: string, relayState?: string): string {
  const url = new URL(config.clientAppUrl);
  url.pathname = '/';
  url.searchParams.set('saml', '1');
  url.searchParams.set('saml_email', email);
  if (relayState?.trim()) url.searchParams.set('relay_state', relayState.trim());
  return url.toString();
}
