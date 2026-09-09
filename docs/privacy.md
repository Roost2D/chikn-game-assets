<script setup>
import { legalOperator } from './.vitepress/legal-operator.mjs'
</script>

# Privacy notice / Datenschutzerklärung

This notice explains how personal data is handled when you visit the Chikn Game Assets documentation and showcase at `roost2d.github.io/chikn-game-assets/`.

## Controller / Verantwortlicher

<address>
  <strong>{{ legalOperator.name }}</strong><template v-if="legalOperator.legalForm">, {{ legalOperator.legalForm }}</template><br>
  <template v-if="legalOperator.representative">Represented by / Vertreten durch: {{ legalOperator.representative }}<br></template>
  <template v-if="legalOperator.owner">Owner / Inhaber: {{ legalOperator.owner }}<br><br></template>
  <template v-if="legalOperator.addressSupplement">{{ legalOperator.addressSupplement }}<br></template>
  {{ legalOperator.streetAddress }}<br>
  {{ legalOperator.postalCode }} {{ legalOperator.locality }}<br>
  {{ legalOperator.country }}<br>
  Email: <a :href="`mailto:${legalOperator.privacyEmail}`">{{ legalOperator.privacyEmail }}</a>
</address>

## Hosting and server requests

The site is hosted with GitHub Pages, a service provided by GitHub. When your browser requests a page or asset, GitHub receives technical request data needed to deliver and protect the service. GitHub states that a visitor's IP address is logged and stored for security purposes. Other technical data may include the requested address, date and time, browser or device information, and referring page.

The purpose is to deliver the site reliably, diagnose failures, and protect it and its visitors against abuse. To the extent the operator determines this processing, the legal basis is Article 6(1)(f) GDPR. The legitimate interests are secure, stable, and efficient public delivery of this open-source documentation and showcase.

The operator does not receive or manage GitHub Pages server logs. GitHub determines the storage periods for infrastructure data under its own policies. GitHub may process data in the United States and other countries and describes the safeguards it uses for international transfers, including the EU Standard Contractual Clauses and the EU–US Data Privacy Framework, in the [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

Provider details:

- GitHub B.V., Prins Bernhardplein 200, Amsterdam 1097JB, Netherlands
- GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, California 94107, USA

See also GitHub's [General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) and [cookie information](https://docs.github.com/en/site-policy/privacy-policies/github-cookies).

## What the project website processes

The project website has no accounts, contact form, newsletter, advertising, payment flow, or analytics. It does not fingerprint visitors or embed remote fonts and social widgets. The showcase fetches its asset catalog from the same site. Character recipes, image exports, and animation-sheet exports are created locally in your browser and are downloaded directly to your device; the website does not upload or retain them.

The documentation theme reads and, when you choose an appearance, writes the local-storage key `vitepress-theme-appearance` so it can retain your light or dark theme preference. This value stays in your browser, is not sent to the project operator, and remains until you clear the site's stored data or change the preference. This storage is used only to provide the appearance setting you request. The standalone showcase does not use cookies or browser storage.

Because the project has not added non-essential cookies or comparable device storage, it does not display a consent banner. GitHub may use storage for its own platform purposes as described in its cookie information linked above. If the project's use changes, this notice and the consent behavior must be updated before the new technology is enabled.

## External links

The documentation links to GitHub, Chikn, and other external sites. Data is sent to an external provider only after you follow such a link. The destination provider is responsible for the processing on its site.

## Recipients and retention

Technical data may be received by GitHub as the hosting provider and by service providers used by GitHub. The project operator does not create a visitor profile or retain a separate copy of hosting logs. Locally generated downloads remain under your control.

## Your rights

Subject to the conditions in the GDPR, you may request access to personal data (Article 15), rectification (Article 16), erasure (Article 17), restriction (Article 18), and data portability (Article 20). You may object to processing based on legitimate interests under Article 21. You may also lodge a complaint with a data-protection supervisory authority, especially in the EU member state of your habitual residence, place of work, or the place of the alleged infringement.

Send requests concerning processing controlled by the project operator to <a :href="`mailto:${legalOperator.privacyEmail}`">{{ legalOperator.privacyEmail }}</a>. Requests about data controlled by GitHub can be directed to GitHub using the contact routes in its privacy statement.

No automated decision-making or profiling under Article 22 GDPR takes place through this website.

## Changes to this notice

This notice will be updated when the site's hosting, data flows, or legal operator details change. The current version is dated 9 September 2026.
