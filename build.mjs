// build.mjs — esbuild-based build script for @epoch-sui/sdk
import * as esbuild from 'esbuild'
import { execSync } from 'child_process'
import { rmSync, mkdirSync } from 'fs'

// Clean dist
try { rmSync('dist', { recursive: true, force: true }) } catch {}
mkdirSync('dist', { recursive: true })

const shared = {
  bundle: true,
  sourcemap: true,
  external: ['@mysten/sui', '@mysten/sui/transactions', '@mysten/sui/client', 'react', 'react-dom'],
  target: 'es2020',
}

// Main entry — ESM + CJS
await esbuild.build({ ...shared, entryPoints: ['src/index.ts'],      format: 'esm', outfile: 'dist/index.mjs' })
await esbuild.build({ ...shared, entryPoints: ['src/index.ts'],      format: 'cjs', outfile: 'dist/index.js'  })

// React components entry — ESM + CJS
await esbuild.build({ ...shared, entryPoints: ['src/components.tsx'], format: 'esm', outfile: 'dist/components.mjs' })
await esbuild.build({ ...shared, entryPoints: ['src/components.tsx'], format: 'cjs', outfile: 'dist/components.js'  })

// Types — via tsc
execSync('npx tsc --emitDeclarationOnly --declaration --declarationMap --outDir dist', { stdio: 'inherit' })

console.log('✓ dist/index.mjs        (ESM)')
console.log('✓ dist/index.js         (CJS)')
console.log('✓ dist/components.mjs   (ESM)')
console.log('✓ dist/components.js    (CJS)')
console.log('✓ dist/*.d.ts           (types)')
