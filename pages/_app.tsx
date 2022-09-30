import "../styles/globals.css";

import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import { theme } from "../styles/theme";
import MainContainer from "../components/MainContainer";

import Head from "next/head";
import Script from "next/script";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>MEV Watch</title>
        <link rel="shortcut icon" href="/favicon.ico" />
        {/* Twitter Metadata */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@labrys_io" />
        <meta
          name="twitter:description"
          content="Some MEV-Boost relays are regulated under OFAC and will censor certain transactions. Use this tool to observe the effect it's having on Ethereum blocks."
        />
        <meta name="twitter:creator" content="@labrys_io" />
        <meta name="twitter:title" content="MEV Watch" />
        <meta name="og:image" content="https://www.mevwatch.info/preview.png" />
        <meta name="og:image:width" content="1233" />
        <meta name="og:image:height" content="1233" />
      </Head>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-542FSGYLE8"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          
          gtag('config', 'G-542FSGYLE8');
          `}
      </Script>

      <ChakraProvider theme={theme}>
        <MainContainer>
          <Component {...pageProps} />
        </MainContainer>
      </ChakraProvider>
    </>
  );
}

export default MyApp;
