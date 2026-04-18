import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

const SECTIONS = [
  {
    title: 'Docs',
    description: '技术文档 · 系统设计 · 工程实践',
    href: '/docs/intro',
    icon: '📖',
  },
  {
    title: 'Books',
    description: '技术书籍精读笔记与摘要',
    href: '/books/intro',
    icon: '📚',
  },
  {
    title: 'Blog',
    description: '记录思考 · 分享见解',
    href: '/blog',
    icon: '✍️',
  },
  {
    title: 'Wiki',
    description: '知识索引 · 风格指南',
    href: '/wiki/',
    icon: '🗂️',
  },
];

function HeroSection() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <section className={styles.hero}>
      <div className={styles.heroBg} aria-hidden="true" />
      <div className={styles.heroInner}>
        <span className={styles.badge}>Personal Knowledge Base</span>
        <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <div className={styles.heroActions}>
          <Link to="/docs/intro" className={styles.primaryBtn}>
            开始探索
          </Link>
          <Link to="/blog" className={styles.secondaryBtn}>
            最新博客
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionCards() {
  return (
    <section className={styles.sections}>
      <div className={styles.sectionGrid}>
        {SECTIONS.map((s) => (
          <Link key={s.title} to={s.href} className={styles.card}>
            <span className={styles.cardIcon}>{s.icon}</span>
            <h3 className={styles.cardTitle}>{s.title}</h3>
            <p className={styles.cardDesc}>{s.description}</p>
            <span className={styles.cardArrow}>→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Likanug's personal knowledge base — docs, books, blog and wiki.">
      <main>
        <HeroSection />
        <SectionCards />
      </main>
    </Layout>
  );
}

