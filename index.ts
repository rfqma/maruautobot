import {
  Bot,
  Context,
  session,
  InputMediaBuilder,
  GrammyError,
  HttpError,
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

const downloader = "downloader";
const backButton = "🔙 kembali";

const menu = new Menu<MyContext>("root-menu").submenu(
  downloader,
  "downloader-menu"
);

const downloaderMenu = new Menu<MyContext>("downloader-menu")
  .text("tiktok", (ctx) => {
    ctx.reply("kasih aku url tiktoknya 😁");
    ctx.session.waitingForTikTokUrl = true;
    ctx.session.emptySession = false;
  })
  .row()
  .text("instagram", (ctx) => {
    ctx.reply("kasih aku url instagramnya 😁");
    ctx.session.waitingForInstagramUrl = true;
    ctx.session.emptySession = false;
  })
  .back(backButton);

menu.register(downloaderMenu);

bot.use(menu);
bot.use(downloaderMenu);

bot.command("start", (ctx) => {
  ctx.reply(
    `🍥 halooo, ${ctx.from?.first_name}!\n\n🤖 fitur yang tersedia sejauh ini adalah pengunduh instagram dan tiktok\n\n👇🏼 pilih menu di bawah untuk memulai`,
    { reply_markup: menu }
  );
});

bot.command("menu", (ctx) => {
  ctx.reply(
    `🍥 halooo, ${ctx.from?.first_name}!\n\n🤖 fitur yang tersedia sejauh ini adalah pengunduh instagram dan tiktok\n\n👇🏼 pilih menu di bawah untuk memulai`,
    { reply_markup: menu }
  );
});

bot.command("mulai", (ctx) => {
  ctx.reply(
    `🍥 halooo, ${ctx.from?.first_name}!\n\n🤖 fitur yang tersedia sejauh ini adalah pengunduh instagram dan tiktok\n\n👇🏼 pilih menu di bawah untuk memulai`,
    { reply_markup: menu }
  );
});

bot.on("message:text", async (ctx) => {
  if (ctx.session.waitingForTikTokUrl) {
    const url = ctx.message.text;

    if (url.includes("tiktok.com")) {
      ctx.reply("🚀 proses unduh, tunggu bentar...");
      ctx.session.waitingForTikTokUrl = false;

      try {
        const urlInfo = await getTikTokVideo(url);
        await ctx.replyWithVideo(urlInfo.video[0]);
        ctx.reply(`✅ video tiktok berhasil diunduh`);
      } catch (error: any) {
        ctx.reply(`😅 gagal unduh video, coba lagi aja...`);
      } finally {
        ctx.session.emptySession = true;
      }
    } else {
      ctx.reply("🔗❌ url tiktoknya invalid");
    }
  }

  if (ctx.session.waitingForInstagramUrl) {
    const url = ctx.message.text;

    if (url.includes("instagram.com")) {
      ctx.reply("🚀 proses unduh, tunggu bentar...");
      ctx.session.waitingForInstagramUrl = false;

      try {
        const urlInfo = await getInstagramPost(url);

        const igVideo = urlInfo.video;
        const igImage = urlInfo.image;

        const videoGroup = igVideo.map((video: any) => {
          return InputMediaBuilder.video(video.video);
        });

        const imageGroup = igImage.map((image: any) => {
          return InputMediaBuilder.photo(image);
        });

        const mediaGroup = [...imageGroup];

        await ctx.replyWithMediaGroup(mediaGroup);
        for (const i of videoGroup) {
          await ctx.replyWithVideo(i.media);
        }
        ctx.reply(`✅ berhasil diunduh`);
      } catch (error: any) {
        ctx.reply(`😅 gagal unduh, coba lagi aja...`);
        console.log(error);
      } finally {
        ctx.session.emptySession = true;
      }
    } else {
      ctx.reply("🔗❌ url instagramnya invalid");
    }
  }

  if (ctx.session.emptySession) {
    ctx.reply("📃 pilih menu untuk melanjutkan");
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