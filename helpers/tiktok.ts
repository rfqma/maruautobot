// import { ttdl } from "btch-downloader";
import * as tdl from "@tobyg74/tiktok-api-dl";

export const getTikTokVideo = async (url: string) => {
  const data = await tdl.Downloader(url, { version: "v2" });
  return data;
};
