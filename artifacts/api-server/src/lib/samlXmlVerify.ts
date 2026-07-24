import { createHash, X509Certificate } from 'crypto';
import { SignedXml } from 'xml-crypto';
import { DOMParser } from '@xmldom/xmldom';

const DSIG_NS = 'http://www.w3.org/2000/09/xmldsig#';

function normalizePem(cert: string): string {
  const trimmed = cert.trim();
  if (trimmed.includes('BEGIN CERTIFICATE')) return trimmed;
  const b64 = trimmed.replace(/\s/g, '');
  const lines = b64.match(/.{1,64}/g) ?? [b64];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
}

function certFingerprintSha256(pem: string): string {
  const x509 = new X509Certificate(normalizePem(pem));
  return createHash('sha256').update(x509.raw).digest('hex');
}

function extractEmbeddedCertPem(xml: string): string | null {
  const match = xml.match(/<(?:ds:)?X509Certificate[^>]*>([\s\S]*?)<\/(?:ds:)?X509Certificate>/i);
  if (!match?.[1]) return null;
  const b64 = match[1].replace(/\s/g, '');
  if (!b64) return null;
  const lines = b64.match(/.{1,64}/g) ?? [b64];
  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
}

function hasSignatureElement(xml: string): boolean {
  return /<(?:[\w]+:)?Signature[\s>]/i.test(xml);
}

/**
 * Verify SAML Response/Assertion XML signature against configured IdP cert.
 * When idpCertPem is set, requires a valid xml-dsig and matching cert fingerprint.
 */
export function verifySamlXmlSignature(
  xml: string,
  idpCertPem: string,
): { ok: true } | { ok: false; error: string } {
  if (!idpCertPem.trim()) return { ok: true };

  if (!hasSignatureElement(xml)) {
    return { ok: false, error: 'SAML response missing XML signature' };
  }

  const trustedFp = certFingerprintSha256(idpCertPem);
  const embedded = extractEmbeddedCertPem(xml);
  if (embedded) {
    try {
      const embeddedFp = certFingerprintSha256(embedded);
      if (embeddedFp !== trustedFp) {
        return { ok: false, error: 'SAML signing certificate does not match SAML_IDP_CERT' };
      }
    } catch {
      return { ok: false, error: 'Invalid X509Certificate in SAML signature' };
    }
  }

  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const signatures = doc.getElementsByTagNameNS(DSIG_NS, 'Signature');
    if (!signatures.length) {
      return { ok: false, error: 'No ds:Signature element found' };
    }

    const sig = new SignedXml({
      publicCert: normalizePem(idpCertPem),
    });
    const valid = sig.checkSignature(xml);
    if (!valid) {
      return { ok: false, error: 'XML signature verification failed' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'SAML signature verify error' };
  }
}
