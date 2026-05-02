import { AppProps } from 'next/app';
import Head from 'next/head';
import { FC } from 'react';
import { ContextProvider } from '../ui/shared/contexts/ContextProvider';
import { AppBar } from '../ui/shared/components/AppBar';
import { ContentContainer } from '../ui/shared/components/ContentContainer';
import { Footer } from '../ui/shared/components/Footer';
import Notifications from '../ui/shared/components/Notification'
require('@solana/wallet-adapter-react-ui/styles.css');
require('../styles/globals.css');

const App: FC<AppProps> = ({ Component, pageProps }) => {
    return (
        <>
          <Head>
            <title>Solana Scaffold Lite</title>
          </Head>

          <ContextProvider>
            <div className="flex flex-col h-screen">
              <Notifications />
              <AppBar/>
              <ContentContainer>
                <Component {...pageProps} />
                <Footer/>
              </ContentContainer>
            </div>
          </ContextProvider>
        </>
    );
};

export default App;
