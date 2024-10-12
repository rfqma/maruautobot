import { ttdl } from "btch-downloader";

export const getTikTokVideo = async (url: string) => {
  const data = await ttdl(url);
  return data;
};
