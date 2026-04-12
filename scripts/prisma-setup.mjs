#!/usr/bin/env node
/**
 * Prisma DB Push für Vercel
 * Synct das aktuelle Schema direkt zur DB (kein Migration-File nötig)
 */

import { execSync } from 'child_process';

async function main() {
  console.log('🔧 Prisma DB Sync...');
  
  try {
    console.log('📦 Running prisma db push...');
    execSync('npx prisma db push --accept-data-loss', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log('✅ Schema synced successfully');
  } catch (error) {
    console.error('❌ DB push failed:', error.message);
    // Nicht crashen - Next.js Build soll trotzdem durchlaufen
    console.log('⚠️ Continuing build without DB sync...');
  }
}

main().catch(console.error);
