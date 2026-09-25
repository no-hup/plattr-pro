import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Seeds this slot before a run, on top of what is there (no --clean, well under a second each): MockData5's
// e2e restaurants for the scenario specs, then MockData7's Meghana for walks.spec.ts. So a fresh emulator
// needs nothing but `EMU_SLOT=<n> npm run e2e:ui`.
export default function globalSetup() {
  const cwd = fileURLToPath(new URL('../../../backend/src-plattr/functions/', import.meta.url))
  for (const file of ['', '--file=mock/MockData7ProductionMenus.json']) execSync(`node mock/importMockData5.js ${file} --refresh-timestamps`, { cwd, stdio: 'ignore' })
}
