import type { NextPage } from "next";
import Head from "next/head";
import { CnftMintView } from "../ui/public-app/views";

const CnftMintPage: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Mint cNFT - Unify Collection</title>
        <meta
          name="description"
          content="Mint a compressed NFT from the Unify Collection"
        />
      </Head>
      <CnftMintView />
    </div>
  );
};

export default CnftMintPage;
