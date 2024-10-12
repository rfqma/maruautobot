import { igdl } from "btch-downloader";
import idl from "priyansh-ig-downloader";

export const getInstagramPost = async (url: string) => {
  const data = await idl(url);
  return data;
};
