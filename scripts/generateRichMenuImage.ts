import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { buttons, CELL_H, CELL_W, HEIGHT, WIDTH, type RichMenuButton } from "./richMenuLayout";

const FONT_FAMILY = "Yu Gothic, Meiryo, MS Gothic, sans-serif";

function buttonSvg({ x, y, color, label, caption }: RichMenuButton): string {
  const cx = x + CELL_W / 2;
  const labelY = y + CELL_H / 2 - 10;
  const captionY = labelY + 68;
  return `
    <rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" rx="36" fill="${color}" />
    <text x="${cx}" y="${labelY}" font-size="112" font-weight="700" font-family="${FONT_FAMILY}" fill="#FFFFFF" text-anchor="middle">${label}</text>
    <text x="${cx}" y="${captionY}" font-size="42" font-family="${FONT_FAMILY}" fill="#FFFFFFCC" text-anchor="middle">${caption}</text>
  `;
}

function buildSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="#F3F4F6" />
    ${buttons.map(buttonSvg).join("\n")}
  </svg>`;
}

async function main(): Promise<void> {
  const outDir = path.join(__dirname, "..", "assets");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "richmenu.png");
  await sharp(Buffer.from(buildSvg())).png().toFile(outPath);
  console.log(`Generated ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
