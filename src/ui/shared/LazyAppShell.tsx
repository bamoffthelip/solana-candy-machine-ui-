import type { AppProps } from "next/app";
import { FC } from "react";
import { ContextProvider } from "./contexts/ContextProvider";
import { CrossmintProviderBridge } from "./contexts/CrossmintProviderBridge";
import { AppBar } from "./components/AppBar";
import { ContentContainer } from "./components/ContentContainer";
import { Footer } from "./components/Footer";
import Notifications from "./components/Notification";

/**
 * Wallet + Crossmint providers only run in the browser so `next build` static prerender
 * (e.g. /404, /500) does not execute adapter/wallet-standard code in Node workers.
 */
const LazyAppShell: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <ContextProvider>
      <CrossmintProviderBridge>
        <div className="flex flex-col h-screen">
          <Notifications />
          <AppBar />
          <ContentContainer>
            <Component {...pageProps} />
            <Footer />
          </ContentContainer>
        </div>
      </CrossmintProviderBridge>
    </ContextProvider>
  );
};

export default LazyAppShell;
