import fs from 'fs';
import path from 'path';

const srcPath = path.resolve('./src');

function searchInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchInDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes('evolution') || line.toLowerCase().includes('security') || line.toLowerCase().includes('evolução') || line.toLowerCase().includes('segurança')) {
          console.log(`${path.relative(srcPath, fullPath)}:${index + 1}: ${line.trim().substring(0, 100)}`);
        }
      });
    }
  }
}

console.log('--- Buscando chaves de evolução/segurança no frontend ---');
searchInDir(srcPath);
