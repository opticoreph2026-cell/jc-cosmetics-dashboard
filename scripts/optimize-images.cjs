const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");

async function main() {
  const duplicate = path.join(publicDir, "cover photo.png");
  if (fs.existsSync(duplicate)) {
    fs.unlinkSync(duplicate);
    console.log("Removed duplicate: cover photo.png");
  }

  const coverPath = path.join(publicDir, "cover.png");
  const coverOut = path.join(publicDir, "cover.webp");
  if (fs.existsSync(coverPath)) {
    const img = fs.readFileSync(coverPath);
    const meta = await sharp(img).metadata();
    console.log(`cover.png: ${(img.length / 1024).toFixed(1)} KB, ${meta.width}x${meta.height}`);
    await sharp(img)
      .resize(Math.min(meta.width, 800), Math.min(meta.height, 800), { fit: "inside" })
      .webp({ quality: 80 })
      .toFile(coverOut);
    console.log(`cover.webp: ${(fs.statSync(coverOut).size / 1024).toFixed(1)} KB`);
  }

  const logoPath = path.join(publicDir, "logo.png");
  const logoOut = path.join(publicDir, "logo.webp");
  if (fs.existsSync(logoPath)) {
    const img = fs.readFileSync(logoPath);
    const meta = await sharp(img).metadata();
    console.log(`logo.png: ${(img.length / 1024).toFixed(1)} KB, ${meta.width}x${meta.height}`);
    await sharp(img)
      .resize(Math.min(meta.width, 128), Math.min(meta.height, 128), { fit: "inside" })
      .webp({ quality: 80 })
      .toFile(logoOut);
    console.log(`logo.webp: ${(fs.statSync(logoOut).size / 1024).toFixed(1)} KB`);
  }

  console.log("Done");
}

main().catch(console.error);
