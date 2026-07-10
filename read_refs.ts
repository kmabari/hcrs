import fs from 'fs';
import path from 'path';

function scanDir(dir: string): void {
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (item !== 'node_modules' && item !== 'dist') {
          console.log(`Directory: ${fullPath}`);
          scanDir(fullPath);
        }
      } else {
        console.log(`File: ${fullPath}`);
        if (fullPath.includes('config') || fullPath.includes('log') || fullPath.includes('HEAD')) {
          try {
            const size = stat.size;
            console.log(`  Size: ${size} bytes`);
            if (size < 10000) {
              const content = fs.readFileSync(fullPath, 'utf8');
              console.log(`  --- CONTENT START ---`);
              console.log(content.slice(0, 1000));
              console.log(`  --- CONTENT END ---`);
            }
          } catch (e: any) {
            console.log(`  Failed to read file: ${e.message}`);
          }
        }
      }
    }
  } catch (e: any) {
    console.log(`Error reading ${dir}: ${e.message}`);
  }
}

if (fs.existsSync('.git')) {
  scanDir('.git');
} else {
  console.log(".git does not exist");
}
