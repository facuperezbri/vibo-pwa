#!/usr/bin/env node

/**
 * Script para generar iconos PNG desde SVG usando sharp
 * 
 * Requiere: npm install sharp
 * Uso: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ Error: sharp no está instalado.');
  console.log('📦 Instalá sharp con: npm install sharp --save-dev');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const svgFiles = [
  { input: 'icon-192.svg', output: 'icon-192.png', size: 192 },
  { input: 'icon-512.svg', output: 'icon-512.png', size: 512 },
  { input: 'apple-icon.svg', output: 'apple-icon.png', size: 180 },
];

async function generateIcons() {
  console.log('🎨 Generando iconos PNG desde SVG...\n');

  for (const file of svgFiles) {
    const inputPath = path.join(publicDir, file.input);
    const outputPath = path.join(publicDir, file.output);

    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  ${file.input} no encontrado, saltando...`);
      continue;
    }

    try {
      await sharp(inputPath)
        .resize(file.size, file.size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ ${file.output} generado (${file.size}x${file.size})`);
    } catch (error) {
      console.error(`❌ Error generando ${file.output}:`, error.message);
    }
  }

  console.log('\n✨ ¡Iconos generados exitosamente!');
  console.log('💡 Podés reemplazar los SVG con tus propias imágenes cuando estén listas.');
}

generateIcons().catch(console.error);

