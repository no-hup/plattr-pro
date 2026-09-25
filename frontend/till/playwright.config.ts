import { defineConfig } from '@playwright/test'
// Runs against your own emulator slot: EMU_SLOT=<n> npm run e2e:ui, with the n that `./emu.sh` printed
// (cd backend/src-plattr && ./emu.sh). Ports are base + slot × 100, as in emu.sh: functions, Firestore
// and this suite's own Vite all follow the slot, so two sessions never share a database or a dev server.
// No default: guessing the slot means testing against somebody else's data (moonshot/CLAUDE.md "Emulator slots").
if (process.env.EMU_SLOT === undefined) throw new Error('Set EMU_SLOT to the slot ./emu.sh printed, e.g. EMU_SLOT=1 npm run e2e:ui')
const off = Number(process.env.EMU_SLOT) * 100
process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${8080 + off}`
process.env.PLATTR_BASE_URL = `http://127.0.0.1:${5002 + off}/rms-app-dd875/us-central1`
const vite = `http://127.0.0.1:${5173 + off}`

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 20_000,
  workers: 1,          // one emulator, one staff account per role: tests must not interleave PIN attempts
  fullyParallel: false,
  use: { baseURL: vite, headless: true },
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${5173 + off} --strictPort`,
    url: vite,
    env: { VITE_FUNCTIONS_URL: process.env.PLATTR_BASE_URL },
    reuseExistingServer: false,   // a Vite already on this port may be pointed at another slot
  },
})
