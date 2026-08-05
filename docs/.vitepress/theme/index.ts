import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';
import './custom.css';

const repository = 'https://github.com/Roost2D/chikn-game-assets/blob/main/';

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'layout-top': () => h('aside', { class: 'chikn-terms-banner' }, [
      h('strong', 'Community non-commercial assets. '),
      'Chikn, Roostr and FarmLand assets are hosted with permission; commercial use requires a separate Chikn agreement. ',
      h('a', { href: `${repository}CHIKN-COMMUNITY-ASSET-NOTICE.md` }, 'Notice'),
      ' · ',
      h('a', { href: `${repository}ATTRIBUTION.md` }, 'Attribution'),
      ' · ',
      h('a', { href: `${repository}COMMERCIAL_USE.md` }, 'Commercial use'),
    ]),
  }),
};
