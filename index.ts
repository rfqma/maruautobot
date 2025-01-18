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
import { Menu } from "@grammyjs/menu";
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

// const downloader = "downloader";
// const backButton = "🔙 kembali";

// const menu = new Menu<MyContext>("root-menu").submenu(
//   downloader,
//   "downloader-menu"
// );

// const downloaderMenu = new Menu<MyContext>("downloader-menu")
//   .text("tiktok", (ctx) => {
//     ctx.reply("kasih aku url tiktoknya 😁");
//     ctx.session.waitingForTikTokUrl = true;
//     ctx.session.emptySession = false;
//   })
//   .row()
//   .text("instagram", (ctx) => {
//     ctx.reply("kasih aku url instagramnya 😁");
//     ctx.session.waitingForInstagramUrl = true;
//     ctx.session.emptySession = false;
//   })
//   .back(backButton);

// menu.register(downloaderMenu);

// bot.use(menu);
// bot.use(downloaderMenu);

bot.command("mulai", (ctx) => {
  ctx.reply(
    `Halo, ${ctx.from?.username}!\n\n📑 /bantuan untuk daftar perintah yang tersedia`
    // { reply_markup: menu }
  );
});

bot.command("bantuan", (ctx) => {
  ctx.reply(
    `Daftar perintah\n\n/mulai - memulai bot\n/bantuan - melihat perintah yang tersedia\n/tiktok - unduh media tiktok tanpa wm\n/instagram - unduh media instagram\n/reset - reset robot state`
    // {
    //   reply_markup: menu,
    // }
  );
});

bot.command("tiktok", (ctx) => {
  ctx.session.waitingForTikTokUrl = true;
  ctx.session.emptySession = false;
  ctx.reply("masukkan url/link tiktok:");
});

bot.command("instagram", (ctx) => {
  // ctx.session.waitingForInstagramUrl = true;
  // ctx.session.emptySession = false;
  ctx.reply("🚧 menu /instagram sedang dalam perbaikan");
});

bot.command("reset", (ctx) => {
  ctx.session.emptySession = true;
  ctx.session.waitingForTikTokUrl = false;
  ctx.session.waitingForInstagramUrl = false;
  ctx.reply("🔄 state direset");
});

bot.on("message:text", async (ctx) => {
  if (ctx.session.waitingForTikTokUrl) {
    const url = ctx.message.text;

    if (url.includes("tiktok.com")) {
      ctx.reply("🚀 unduhan diproses, tunggu sebentar...");
      ctx.session.waitingForTikTokUrl = false;

      try {
        const urlInfo = await getTikTokVideo(url);
        if (urlInfo.result?.type === "image") {
          if (urlInfo.result.images && urlInfo.result.images.length > 1) {
            for (const i of urlInfo.result.images) {
              await ctx.replyWithPhoto(new InputFile(new URL(i)));
            }

            ctx.reply(`✅ foto berhasil diunduh`);
          } else {
            ctx.reply(`❌ unduh gagal, foto tidak ditemukan...`);
          }
        } else {
          if (urlInfo.result?.video) {
            await ctx.replyWithVideo(
              new InputFile(new URL(urlInfo.result.video))
            );
            await ctx.reply(`✅ video berhasil diunduh`);
          } else {
            ctx.reply(`❌ unduh gagal, video tidak ditemukan...`);
          }
        }
      } catch (error: any) {
        ctx.reply(`❌ unduh gagal, coba lagi..`);
      } finally {
        ctx.session.emptySession = true;
      }
    } else {
      ctx.reply("🔗❌ url/link tiktok invalid");
    }
  }

  if (ctx.session.waitingForInstagramUrl) {
    const url = ctx.message.text;

    if (url.includes("instagram.com")) {
      ctx.reply("🚀 unduhan diproses, tunggu sebentar...");
      ctx.session.waitingForInstagramUrl = false;

      try {
        const urlInfo = await getInstagramPost(url);
        if (
          urlInfo.video &&
          (urlInfo.image === undefined || urlInfo.image.length === 0)
        ) {
          const igVideo = urlInfo.video;

          const videoGroup = igVideo.map((video: any) => {
            return InputMediaBuilder.video(video.video);
          });

          for (const i of videoGroup) {
            await ctx.replyWithVideo(i.media);
          }

          ctx.reply(`✅ berhasil diunduh`);
        } else if (
          urlInfo.image &&
          (urlInfo.video === undefined || urlInfo.video.length === 0)
        ) {
          const igImage = urlInfo.image;

          const imageGroup = igImage.map((image: any) => {
            return InputMediaBuilder.photo(image);
          });

          for (const i of imageGroup) {
            await ctx.replyWithPhoto(i.media);
          }

          ctx.reply(`✅ berhasil diunduh`);
        } else {
          const igVideo = urlInfo.video;
          const igImage = urlInfo.image;

          const videoGroup = igVideo.map((video: any) => {
            return InputMediaBuilder.video(video.video);
          });

          const imageGroup = igImage.map((image: any) => {
            return InputMediaBuilder.photo(image);
          });

          for (const i of imageGroup) {
            await ctx.replyWithPhoto(i.media);
          }
          for (const i of videoGroup) {
            await ctx.replyWithVideo(i.media);
          }
          ctx.reply(`✅ berhasil diunduh`);
        }
      } catch (error: any) {
        ctx.reply(`gagal unduh, coba lagi...`);
      } finally {
        ctx.session.emptySession = true;
      }
    } else {
      ctx.reply("🔗❌ url/link instagram invalid");
    }
  }

  if (ctx.session.emptySession) {
    ctx.reply("📃 /mulai untuk memulai bot");
  }
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

bot.start();
