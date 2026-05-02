import type { NextApiRequest, NextApiResponse } from "next";
import { formatNftName, getProjectConfigOrFallback } from "../../../../lib/project-config";

type MetaplexAttribute = {
  trait_type: string;
  value: string;
};

type MetaplexMetadata = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  animation_url?: string;
  attributes: MetaplexAttribute[];
  properties: {
    category: "image" | "video";
    files: Array<{
      uri: string;
      type: string;
    }>;
  };
};

type ResponseData =
  | MetaplexMetadata
  | {
      error: string;
    };

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const projectIdParam = req.query.projectId;
  const metadataIndexParam = req.query.metadataIndex;

  const projectId = typeof projectIdParam === "string" && projectIdParam ? projectIdParam : "unify";
  const metadataIndex = Number(metadataIndexParam);

  if (!Number.isFinite(metadataIndex) || metadataIndex < 0) {
    return res.status(400).json({ error: "Invalid metadataIndex query param" });
  }

  const project = getProjectConfigOrFallback(projectId);
  const mediaType = project.mediaType || "image";
  const name = formatNftName(project.nftNameTemplate, Math.floor(metadataIndex));

  const metadata: MetaplexMetadata = {
    name,
    symbol: project.symbol,
    description: project.description,
    image: project.mediaUrl,
    attributes: project.attributes,
    properties: {
      category: mediaType,
      files: [
        {
          uri: project.mediaUrl,
          type: mediaType === "video" ? "video/mp4" : "image/png",
        },
      ],
    },
  };

  if (mediaType === "video") {
    metadata.animation_url = project.mediaUrl;
  }

  return res.status(200).json(metadata);
}
