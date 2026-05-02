import { FC } from "react";

type MintAttribute = {
  trait_type: string;
  value: string;
};

type MintPreviewProps = {
  title: string;
  description: string;
  mediaUrl: string;
  mediaType?: "image" | "video";
  attributes: MintAttribute[];
};

export const MintPreview: FC<MintPreviewProps> = ({
  title,
  description,
  mediaUrl,
  mediaType = "image",
  attributes,
}) => {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-4 overflow-hidden rounded-lg border border-white/10">
        {mediaType === "video" ? (
          <video className="h-72 w-full object-cover" src={mediaUrl} controls />
        ) : (
          <img className="h-72 w-full object-cover" src={mediaUrl} alt={title} />
        )}
      </div>

      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm opacity-80">{description}</p>

      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold opacity-90">Attributes</h3>
        <div className="grid grid-cols-2 gap-2">
          {attributes.map((attribute) => (
            <div
              key={`${attribute.trait_type}-${attribute.value}`}
              className="rounded-md border border-white/10 bg-black/30 p-2 text-xs"
            >
              <p className="opacity-60">{attribute.trait_type}</p>
              <p className="font-medium">{attribute.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

