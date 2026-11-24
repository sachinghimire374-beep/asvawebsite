// Writes lib/company-images.generated.json: the list of files in public/images/company.
// Workers have no filesystem at runtime, so lib/site-images.ts reads this manifest instead.
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const dir = path.join(process.cwd(), 'public', 'images', 'company');
const exts = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
const files = existsSync(dir) ? readdirSync(dir).filter((f) => exts.includes(path.extname(f).toLowerCase())).sort() : [];
writeFileSync(path.join(process.cwd(), 'lib', 'company-images.generated.json'), JSON.stringify({ files }, null, 2) + '\n');
console.log(`company-images: ${files.length} files`);
