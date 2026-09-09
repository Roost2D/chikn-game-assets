<script setup>
import { legalOperator } from './.vitepress/legal-operator.mjs'
</script>

# Imprint / Impressum

Information pursuant to § 5 of the German Digital Services Act (Digitale-Dienste-Gesetz, DDG) and § 18(1) of the German Interstate Media Treaty (Medienstaatsvertrag, MStV).

## Provider / Diensteanbieter

<address>
  <strong>{{ legalOperator.name }}</strong><template v-if="legalOperator.legalForm">, {{ legalOperator.legalForm }}</template><br>
  <template v-if="legalOperator.representative">Represented by / Vertreten durch: {{ legalOperator.representative }}<br></template>
  <template v-if="legalOperator.owner">Owner / Inhaber: {{ legalOperator.owner }}<br><br></template>
  <template v-if="legalOperator.addressSupplement">{{ legalOperator.addressSupplement }}<br></template>
  {{ legalOperator.streetAddress }}<br>
  {{ legalOperator.postalCode }} {{ legalOperator.locality }}<br>
  {{ legalOperator.country }}
</address>

## Contact / Kontakt

General / Allgemein: <a :href="`mailto:${legalOperator.email}`">{{ legalOperator.email }}</a><br>
Support: <a :href="`mailto:${legalOperator.supportEmail}`">{{ legalOperator.supportEmail }}</a><br>
Privacy / Datenschutz: <a :href="`mailto:${legalOperator.privacyEmail}`">{{ legalOperator.privacyEmail }}</a><br>
<template v-if="legalOperator.phone">Telephone / Telefon: {{ legalOperator.phone }}<br></template>

<template v-if="legalOperator.registerName || legalOperator.registerNumber">

## Register entry / Registereintrag

Register: {{ legalOperator.registerName }}  
Registration number / Registernummer: {{ legalOperator.registerNumber }}

</template>
<template v-if="legalOperator.vatId">

## VAT identification number / Umsatzsteuer-ID

USt-IdNr. pursuant to § 27a UStG / gemäß § 27a UStG: **{{ legalOperator.vatId }}**

</template>

## Consumer dispute resolution / Verbraucherstreitbeilegung

The provider is neither willing nor obliged to participate in dispute-resolution proceedings before a consumer arbitration board unless required by law.

Der Anbieter ist weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen, soweit keine gesetzliche Pflicht besteht.

## Project and content responsibility

This website is operated by the provider named above as part of the independent Roost2D open-source project. Roost2D is not Chikn and does not represent the Chikn rights-holder.

The Chikn™, chikn™, Roostr™ and FarmLand™ visual and audio assets remain owned by Chikn and are made available under the [Chikn Community Asset Pack Non-Commercial Licence](https://github.com/Roost2D/chikn-game-assets/blob/main/CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md). The [rights and attribution page](/rights) explains the separate ownership and licence boundaries for code, metadata, project artwork, and protected Chikn content.

Questions about this website or possible rights infringements can be sent to <a :href="`mailto:${legalOperator.supportEmail}`">{{ legalOperator.supportEmail }}</a>. Security vulnerabilities should be reported through the project's [security policy](https://github.com/Roost2D/chikn-game-assets/security/policy).

Last updated: 9 September 2026.
