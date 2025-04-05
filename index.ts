import {
  Bot,
  Context,
  session,
  InputMediaBuilder,
  GrammyError,
  HttpError,
  InputFile,
} from "grammy";
import type { SessionFlavor } from "grammy";
import { getTikTokVideo } from "./helpers/tiktok";
import { getInstagramPost } from "./helpers/instagram";

interface SessionData {
  emptySession: boolean;
  waitingForTikTokUrl: boolean;
  waitingForInstagramUrl: boolean;
}

type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(Bun.env.BOT_TOKEN as string);

bot.use(
  session({
    initial: (): SessionData => ({
      emptySession: true,
      waitingForTikTokUrl: false,
      waitingForInstagramUrl: false,
    }),
  })
);

bot.command("mulai", (ctx) => {
  ctx.reply(
    `Halo, ${ctx.from?.username}!\n\n📑 /bantuan untuk melihat daftar perintah yang tersedia`
  );
});

bot.command("bantuan", (ctx) => {
  ctx.reply(
    `⌨️ Daftar perintah @MaruAutoBot\n\n/mulai > memulai bot\n/bantuan > melihat perintah yang tersedia\n/tiktok > unduh media tiktok tanpa wm\n/instagram > unduh media instagram\n/reset > reset robot state`
  );
});

bot.command("tiktok", (ctx) => {
  ctx.session.waitingForInstagramUrl = false;
  ctx.session.waitingForTikTokUrl = true;
  ctx.session.emptySession = false;
  ctx.reply("masukkan url/link tiktok:");
});

bot.command("instagram", (ctx) => {
  ctx.session.waitingForTikTokUrl = false;
  ctx.session.waitingForInstagramUrl = true;
  ctx.session.emptySession = false;
  ctx.reply("masukkan url/link instagram:");
  // ctx.reply("🚧 /instagram sedang dalam perbaikan");
});

bot.command("reset", (ctx) => {
  ctx.session.emptySession = true;
  ctx.session.waitingForTikTokUrl = false;
  ctx.session.waitingForInstagramUrl = false;
  ctx.reply("🔄 Berhasil reset state!");
});

bot.on("message:text", async (ctx) => {
  const url = ctx.message.text;

  if (ctx.session.waitingForTikTokUrl) {
    if (url.includes("tiktok.com")) {
      ctx.reply("🚀 Unduhan sedang dalam proses, tunggu sebentar...");
      ctx.session.waitingForTikTokUrl = false;

      try {
        const urlInfo = await getTikTokVideo(url);
        if (urlInfo.result?.type === "image") {
          if (urlInfo.result.images && urlInfo.result.images.length > 1) {
            for (const i of urlInfo.result.images) {
              await ctx.replyWithPhoto(new InputFile(new URL(i)));
            }

            ctx.reply(`✅ Berhasil unduh foto!`);
          } else {
            ctx.reply(`❌ Gagal unduh foto, foto tidak ditemukan!`);
          }
        } else {
          if (urlInfo.result?.video) {
            await ctx.replyWithVideo(
              new InputFile(new URL(urlInfo.result.video))
            );
            await ctx.reply(`✅ Berhasil unduh video!`);
          } else {
            ctx.reply(`❌ Gagal unduh video, video tidak ditemukan`);
          }
        }
      } catch (error: any) {
        ctx.reply(`❌ Gagal unduh, coba lagi!`);
      } finally {
        ctx.session.emptySession = true;
      }
    } else {
      ctx.reply("🔗❌ url/link tiktok tidak valid");
    }
  }

  if (ctx.session.waitingForInstagramUrl) {
    if (url.includes("instagram.com")) {
      ctx.reply("🚀 Unduhan sedang dalam proses, tunggu sebentar...");
      ctx.session.waitingForInstagramUrl = false;

      try {
        const urlInfo = await getInstagramPost(url);

        const images =
          urlInfo.media_details.filter((item) => item.type === "image") || [];

        const videos =
          urlInfo.media_details.filter((item) => item.type === "video") || [];

        await ctx.reply(
          `owner_username: ${urlInfo.post_info.owner_username}\nowner_fullname: ${urlInfo.post_info.owner_fullname}\nis_verified: ${urlInfo.post_info.is_verified}\nis_private: ${urlInfo.post_info.is_private}\nlikes: ${urlInfo.post_info.likes}\nis_ad: ${urlInfo.post_info.is_ad}\ncaption: ${urlInfo.post_info.caption}\n\nimages: ${images.length}\nvideos: ${videos.length}`
        );

        if (videos.length > 0 && images.length === 0) {
          const videoGroup = videos.map((item, index) => {
            return InputMediaBuilder.video(item.url, {
              caption: ` ${index + 1}/${videos.length}\n type: ${
                item.type
              }\n h: ${item.dimensions.height}\n w: ${
                item.dimensions.width
              }\n ${
                item.video_view_count
                  ? `video_view_count: ${item.video_view_count}`
                  : ""
              }`,
            });
          });

          for (const i of videoGroup) {
            await ctx.replyWithVideo(i.media);
            await ctx.reply(i.caption ?? "");
          }

          ctx.reply(`✅ Berhasil unduh!`);
        } else if (images.length > 0 && videos.length === 0) {
          const imageGroup = images.map((item, index) => {
            return InputMediaBuilder.photo(item.url, {
              caption: ` ${index + 1}/${images.length}\n type: ${
                item.type
              }\n h: ${item.dimensions.height}\n w: ${
                item.dimensions.width
              }\n ${
                item.video_view_count
                  ? `video_view_count: ${item.video_view_count}`
                  : ""
              }`,
            });
          });

          for (const i of imageGroup) {
            await ctx.replyWithPhoto(i.media);
            await ctx.reply(i.caption ?? "");
          }

          ctx.reply(`✅ Berhasil unduh!`);
        } else if (images.length > 0 && videos.length > 0) {
          const imageGroup = images.map((item, index) => {
            return InputMediaBuilder.photo(item.url, {
              caption: ` ${index + 1}/${images.length}\n type: ${
                item.type
              }\n h: ${item.dimensions.height}\n w: ${
                item.dimensions.width
              }\n ${
                item.video_view_count
                  ? `video_view_count: ${item.video_view_count}`
                  : ""
              }`,
            });
          });

          const videoGroup = videos.map((item, index) => {
            return InputMediaBuilder.video(item.url, {
              caption: ` ${index + 1}/${videos.length}\n type: ${
                item.type
              }\n h: ${item.dimensions.height}\n w: ${
                item.dimensions.width
              }\n ${
                item.video_view_count
                  ? `video_view_count: ${item.video_view_count}`
                  : ""
              }`,
            });
          });

          for (const i of imageGroup) {
            await ctx.replyWithPhoto(i.media);
            await ctx.reply(i.caption ?? "");
          }

          for (const i of videoGroup) {
            await ctx.replyWithVideo(i.media);
            await ctx.reply(i.caption ?? "");
          }

          ctx.reply(`✅ Berhasil unduh!`);
        } else {
          ctx.reply("⚠️ Tidak ditemukan media pada unggahan.");
        }
      } catch (error) {
        ctx.reply(`Gagal unduh, coba lagi!`);
      } finally {
        ctx.session.emptySession = true;
      }
    } else {
      ctx.reply("🔗❌ url/link instagram tidak valid");
    }
  }

  if (ctx.session.emptySession) {
    ctx.reply("📃 /mulai untuk memulai bot");
  }
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("could not contact telegram:", e);
  } else {
    console.error("unknown error:", e);
  }
});

bot.start();
