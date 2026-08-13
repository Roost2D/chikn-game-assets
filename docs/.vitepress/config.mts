import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Chikn Game Assets',
  description: 'Publicly hosted Chikn, Roostr, and FarmLand community assets.',
  base: process.env.DOCS_BASE ?? '/',
  themeConfig: {
    nav: [
      { text: 'Quick start', link: '/quick-start' },
      { text: 'Character generator', link: '/character-generator' },
      { text: 'Showcase', link: '/showcase/' },
      { text: 'Distribution', link: '/distribution' },
      { text: 'Rights', link: '/rights' },
    ],
    sidebar: [
      {
        text: 'Get started',
        items: [
          { text: 'Five-minute quick start', link: '/quick-start' },
          { text: 'Install Roost2D', link: '/install-roost2d' },
          { text: 'Load the asset pack', link: '/load-pack' },
          { text: 'Render a Chikn', link: '/render-chikn' },
          { text: 'Character generator', link: '/character-generator' },
        ],
      },
      {
        text: 'Content',
        items: [
          { text: 'Audio', link: '/audio' },
          { text: 'Traits and skins', link: '/traits' },
          { text: 'Animations and ownership', link: '/animations' },
          { text: 'Roostr rigs', link: '/roostr' },
          { text: 'FarmLand', link: '/farmland' },
          { text: 'Mini-game recipe', link: '/mini-game' },
        ],
      },
      {
        text: 'Release and rights',
        items: [
          { text: 'Distribution', link: '/distribution' },
          { text: 'Commercial use', link: '/commercial-use' },
          { text: 'Rights and attribution', link: '/rights' },
          { text: 'Release integrity', link: '/releases' },
          { text: 'Security notes', link: '/security-notes' },
          { text: 'Asset contributions', link: 'https://github.com/Roost2D/chikn-game-assets/blob/main/ASSET_CONTRIBUTIONS.md' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/Roost2D/chikn-game-assets' }],
  },
});
