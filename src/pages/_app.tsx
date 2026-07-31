import NextApp, { AppContext, AppProps } from 'next/app';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import type { FC } from 'react';
require('@solana/wallet-adapter-react-ui/styles.css');
require('../styles/globals.css');

const LazyAppShell = dynamic(() => import('../ui/shared/LazyAppShell'), {
  ssr: false,
});

type AppWithInitial = FC<AppProps> & Pick<typeof NextApp, 'getInitialProps'>;

const App: AppWithInitial = (props) => {
    return (
        <>
          <Head>
            <title>Solana Scaffold Lite</title>
          </Head>

          <LazyAppShell {...props} />
        </>
    );
};

/**
 * Opt entire Pages Router tree out of automatic static optimization so prerender
 * workers don't hang on wallet/Crossmint client-only trees during `/404`, `/500`, etc.
 */
App.getInitialProps = async (appContext: AppContext) => NextApp.getInitialProps(appContext);

export default App;
