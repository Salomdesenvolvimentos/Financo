/**
 * build-mobile.js
 *
 * Script para gerar build estático do Next.js para o Capacitor.
 * As rotas de API são temporariamente movidas durante o build
 * porque o Next.js não suporta API routes com output: 'export'.
 * O app mobile chama a API via NEXT_PUBLIC_API_BASE_URL (Vercel).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiDir    = path.join(__dirname, '../src/app/api');
const apiBackup = path.join(__dirname, '../_api_mobile_backup');

function restoreApi() {
  if (fs.existsSync(apiBackup)) {
    fs.renameSync(apiBackup, apiDir);
    console.log('✓ Rotas de API restauradas.');
  }
}

// Garante que a restauração acontece mesmo em caso de erro
process.on('exit', restoreApi);
process.on('SIGINT', () => { restoreApi(); process.exit(1); });
process.on('uncaughtException', (err) => { console.error(err); restoreApi(); process.exit(1); });

try {
  // 1. Esconde as rotas de API
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, apiBackup);
    console.log('▸ Rotas de API ocultadas temporariamente...');
  }

  // 2. Roda o build estático
  execSync('cross-env CAPACITOR_BUILD=true next build', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });

  console.log('\n✓ Build mobile concluído! Pasta out/ gerada.');
} catch (err) {
  console.error('\n✗ Build mobile falhou:', err.message);
  process.exit(1);
}
// restoreApi() é chamado pelo handler process.on('exit') acima
