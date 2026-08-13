import { promises as fs } from "node:fs";
import path from "node:path";
import { messagingApi } from "@line/bot-sdk";
import { env } from "../src/config/env";
import { buttons, CELL_H, CELL_W, HEIGHT, WIDTH } from "./richMenuLayout";

const RICH_MENU_NAME = "mercari-line-bot-v2-main-menu";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
});
const blobClient = new messagingApi.MessagingApiBlobClient({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
});

async function deletePreviousMenus(): Promise<void> {
  const { richmenus } = await client.getRichMenuList();
  const previous = richmenus.filter((menu) => menu.name === RICH_MENU_NAME);
  for (const menu of previous) {
    await client.deleteRichMenu(menu.richMenuId);
    console.log(`Deleted previous rich menu: ${menu.richMenuId}`);
  }
}

async function main(): Promise<void> {
  const imagePath = path.join(__dirname, "..", "assets", "richmenu.png");
  const imageBuffer = await fs.readFile(imagePath).catch(() => {
    throw new Error(`画像が見つかりません。先に "npm run richmenu:generate" を実行してください: ${imagePath}`);
  });

  await deletePreviousMenus();

  const { richMenuId } = await client.createRichMenu({
    size: { width: WIDTH, height: HEIGHT },
    selected: true,
    name: RICH_MENU_NAME,
    chatBarText: "メニュー",
    areas: buttons.map((button) => ({
      bounds: { x: button.x, y: button.y, width: CELL_W, height: CELL_H },
      action: { type: "message", label: button.label, text: button.label },
    })),
  });
  console.log(`Created rich menu: ${richMenuId}`);

  await blobClient.setRichMenuImage(richMenuId, new Blob([imageBuffer], { type: "image/png" }));
  console.log("Uploaded rich menu image");

  await client.setDefaultRichMenu(richMenuId);
  console.log("Set as default rich menu for all users 🎉");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
