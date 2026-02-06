import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Likanug',
  tagline: 'Dinosaurs are cool',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://likanug.top/',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'bruceblink', // Usually your GitHub org/user name.
  projectName: 'all-in-one', // Usually your repo name.

  onBrokenLinks: 'ignore',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/bruceblink/all-in-one/blob/master/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/bruceblink/all-in-one/blob/master/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'wiki',             // 唯一 ID
        path: 'wiki',           // 本地目录路径
        routeBasePath: 'wiki',  // 访问路径 => /wiki
        sidebarPath: false,     // 如果没有侧边栏可以禁用
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'books',             // 唯一 ID
        path: 'books',           // 本地目录路径
        routeBasePath: 'books',  // 访问路径 => /books
      },
    ],
  ],
  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
      metadata: [
          { name: 'keywords', content: 'docusaurus, docs, blog' },
          { name: 'author', content: 'likanug' },
          { name: 'google-adsense-account', content: 'ca-pub-2122126888973017' },
          { property: 'og:type', content: 'website' },
          { property: 'og:site_name', content: 'My Site' },
        ],
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      hideOnScroll: false,
      title: '',
      logo: {
        alt: 'Likanug Logo',
        src: 'img/logo.png',
      },
      items: [
        {
          to: '/books/intro',
          label: 'Books',
          position: 'left',
        },
        {
          to: 'https://it-tools.likanug.top',
          label: 'Tools',
          position: 'left',
        },
        {
          href: 'https://reference.likanug.top',
          label: 'Reference',
          position: 'left',
        },
        {
          href: 'https://blog.likanug.top',
          label: 'Blog',
          position: 'left',
        },
        {
          href: 'https://news.likanug.top',
          label: 'News',
          position: 'left',
        },
        {
          href: 'https://tv.likanug.top',
          label: 'Video',
          position: 'left',
        },
        {
          to: 'https://dash.likanug.top',
          label: 'Login',
          position: 'right',
        },
        {
          href: 'https://github.com/bruceblink',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Tutorial',
              to: '/docs/intro',
            },
          ],
        },
        {
          title: 'Community',
          items: [
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Likanug. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
