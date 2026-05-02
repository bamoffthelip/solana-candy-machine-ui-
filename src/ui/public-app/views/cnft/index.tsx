import { FC } from "react";
import { CnftMint } from "../../components/CnftMint";

export const CnftMintView: FC = ({ }) => {
  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className='mt-6'>
          <h1 className="text-center text-5xl md:pl-12 font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mb-4">
            Unify cNFT Collection
          </h1>
        </div>
        
        <div className="text-center mb-8">
          <p className="text-lg opacity-80 mb-2">
            Mint a compressed NFT from the Unify Collection
          </p>
          <p className="text-sm opacity-60">
            Free mint - transaction fees paid by the server (~$0.005)
          </p>
        </div>

        <div className="flex flex-col mt-2">
          <CnftMint />
        </div>

        <div className="mt-8 p-4 bg-black/20 rounded-lg max-w-md">
          <h3 className="text-lg font-semibold mb-2">About Compressed NFTs</h3>
          <ul className="text-sm opacity-70 space-y-1">
            <li>• 400x cheaper than standard NFTs</li>
            <li>• Same ownership & trading capabilities</li>
            <li>• Verified collection for wallet visibility</li>
            <li>• Appears in Phantom Collectibles</li>
          </ul>
        </div>

        <div className="mt-6 text-center text-xs opacity-50">
          <p>Collection: DVaJS3FNBHvrWvZAEFNyNoi67ZqzJJ7gUoX6abHrQsM</p>
          <p>Merkle Tree: E3Do6eop2Bf2vv3nRCdsaE9uqosYyEaAe3zA1MNQNkUG</p>
        </div>
      </div>
    </div>
  );
};
