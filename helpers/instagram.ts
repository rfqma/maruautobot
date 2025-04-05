import { instagramGetUrl } from "instagram-url-direct";

export const getInstagramPost = async (url: string) => {
  const data = await instagramGetUrl(url);
  return data;
};
