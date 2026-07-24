#!/usr/bin/env node
/** Sync store metadata + legal docs from mobile/config/distribution.json (OPS-05). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'mobile/config/distribution.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const site = config.publicSiteUrl.replace(/\/$/, '');
const privacyUrl = `${site}${config.privacyPath.startsWith('/') ? config.privacyPath : `/${config.privacyPath}`}`;

function write(rel, content) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.trim() + '\n', 'utf8');
  console.log(`updated ${rel}`);
}

write('mobile/store/ios/metadata/en-US/privacy_url.txt', privacyUrl);
write('mobile/store/ios/metadata/en-US/marketing_url.txt', site);
write('mobile/store/ios/metadata/en-US/support_url.txt', `${site}/support`);
write('mobile/store/ios/metadata/review_information/email_address.txt', config.reviewEmail);

const androidDesc = fs.readFileSync(
  path.join(root, 'mobile/store/android/metadata/en-US/full_description.txt'),
  'utf8',
);
const androidNext = androidDesc.replace(
  /Privacy policy: https?:\/\/[^\s]+/,
  `Privacy policy: ${privacyUrl}`,
);
write('mobile/store/android/metadata/en-US/full_description.txt', androidNext);

const policyPath = path.join(root, 'docs/legal/PRIVACY_POLICY.md');
let policy = fs.readFileSync(policyPath, 'utf8');
policy = policy
  .replace(/privacy@synapse\.example\.com/g, config.privacyEmail)
  .replace(/https:\/\/synapse\.example\.com[^\s)']*/g, privacyUrl)
  .replace(
    /> Update placeholder domains[^\n]+\n/,
    '> Canonical public URL is driven by `mobile/config/distribution.json`.\n',
  );
fs.writeFileSync(policyPath, policy, 'utf8');
console.log('updated docs/legal/PRIVACY_POLICY.md');

console.log(`\nPublic privacy URL: ${privacyUrl}`);
