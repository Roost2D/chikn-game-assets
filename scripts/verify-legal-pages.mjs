import { readFile } from 'node:fs/promises';
import { legalOperator } from '../docs/.vitepress/legal-operator.mjs';

const errors = [];
const requiredFields = ['name', 'streetAddress', 'postalCode', 'locality', 'country', 'email', 'supportEmail', 'privacyEmail'];

if (!legalOperator.readyForPublication) errors.push('legalOperator.readyForPublication must be true');
if (!['individual', 'organization'].includes(legalOperator.operatorType)) errors.push('operatorType must be individual or organization');
for (const field of requiredFields) {
  const value = legalOperator[field];
  if (typeof value !== 'string' || !value.trim() || /\[[^\]]+\]/.test(value)) errors.push(`${field} must contain a public value, not a placeholder`);
}
if (legalOperator.operatorType === 'organization') {
  if (!legalOperator.legalForm.trim()) errors.push('legalForm is required for an organization');
  if (!legalOperator.representative.trim()) errors.push('representative is required for an organization');
}
if (legalOperator.operatorType === 'individual' && !legalOperator.owner.trim()) errors.push('owner is required for an individual business operator');
for (const field of ['email', 'supportEmail', 'privacyEmail']) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(legalOperator[field])) errors.push(`${field} must be a valid public contact address`);
}

const [imprint, privacy, showcase] = await Promise.all([
  readFile(new URL('../docs/imprint.md', import.meta.url), 'utf8'),
  readFile(new URL('../docs/privacy.md', import.meta.url), 'utf8'),
  readFile(new URL('../apps/showcase/index.html', import.meta.url), 'utf8'),
]);

for (const [name, content] of [['imprint', imprint], ['privacy', privacy]]) {
  if (!content.includes('legalOperator')) errors.push(`${name} does not use the canonical operator record`);
}
for (const disclosure of ['GitHub Pages', 'Article 6(1)(f) GDPR', 'vitepress-theme-appearance', 'Your rights']) {
  if (!privacy.includes(disclosure)) errors.push(`privacy notice is missing ${disclosure}`);
}
for (const href of ['../imprint.html', '../privacy.html']) {
  if (!showcase.includes(`href="${href}"`)) errors.push(`showcase is missing ${href}`);
}

if (errors.length) {
  console.error(`Legal page verification failed:\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Verified publishable imprint, privacy notice, and showcase legal links.');
}
