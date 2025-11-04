import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import hasuras from '@site/static/img/hasuras.png';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
      <header className={clsx('hero', styles.heroBanner)}>
          <div className="container">
              <div style={{ display: `flex`, flexDirection: `column`, placeItems: `center` }}>
                  <h1 className="hero__title">{siteConfig.title}</h1>
                  <p className="hero__subtitle">{siteConfig.tagline}</p>
              </div>
              <div className={styles.links}>
                  <Link to={"/index"} className="button button--primary button--lg">
                      Likanug Docs
                  </Link>
                  <div className={styles.links}>
                      <Link className="button button--secondary button--lg" to="/wiki/">
                          Docs Wiki
                      </Link>
                  </div>
                  <div className={styles.links}>
                      <Link className="button button--success button--lg" to="/wiki/style/">
                          Docs Style Guide
                      </Link>
                  </div>
              </div>
              <img src={hasuras} alt="Hasuras Image" />
          </div>
      </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      <HomepageHeader />
      <main>
        {/*<HomepageFeatures />*/}
      </main>
    </Layout>
  );
}
