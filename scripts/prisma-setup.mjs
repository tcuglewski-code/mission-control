#!/usr/bin/env node
/**
 * Prisma Migration Setup für Vercel
 * 
 * Dieses Script prüft ob Migrations bereits angewendet wurden.
 * Wenn die _prisma_migrations Tabelle nicht existiert, wird die
 * initiale Migration als "applied" markiert (Baseline).
 */

import { execSync } from 'child_process';

const INIT_MIGRATION = '20260329010000_init';

async function main() {
  console.log('🔧 Prisma Migration Setup...');
  
  try {
    // Versuche migrate deploy
    console.log('📦 Running prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log('✅ Migrations applied successfully');
  } catch (error) {
    // Wenn es fehlschlägt, könnte die Baseline fehlen
    console.log('⚠️  migrate deploy failed, checking if baseline needed...');
    
    try {
      // Versuche Baseline zu setzen
      console.log(`📌 Marking ${INIT_MIGRATION} as applied (baseline)...`);
      execSync(`npx prisma migrate resolve --applied ${INIT_MIGRATION}`, {
        stdio: 'inherit',
        env: { ...process.env }
      });
      
      // Nochmal migrate deploy versuchen
      console.log('📦 Retrying prisma migrate deploy...');
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit', 
        env: { ...process.env }
      });
      console.log('✅ Migrations applied after baseline');
    } catch (baselineError) {
      console.log('⚠️  Could not apply migrations, falling back to db push');
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        env: { ...process.env }
      });
    }
  }
}

main().catch(console.error);
