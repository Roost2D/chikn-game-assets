import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';
import './custom.css';

const repository = 'https://github.com/Roost2D/chikn-game-assets/blob/main/';

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'layout-top': () => h('aside', { class: 'chikn-terms-banner' }, [
      h('strong', 'Community non-commercial assets. '),
      'Chikn™, chikn™, Roostr™ and FarmLand™ assets © Chikn. Used under the Chikn Community Asset Pack Non-Commercial Licence. Commercial licensing: chikn.farm. Apache-2.0 project entries are labelled separately. ',
      h('a', { href: `${repository}CHIKN-COMMUNITY-ASSET-LICENSE_PUBLIC.md` }, 'Licence'),
      ' · ',
      h('a', { href: `${repository}REPOSITORY-LICENSING-NOTICE_PUBLIC.md` }, 'Repository notice'),
      ' · ',
      h('a', { href: `${repository}ATTRIBUTION.md` }, 'Attribution'),
    ]),
  }),
};
