import { defineConfig } from '@playwright/test'
// Runs against the Firebase emulator (functions on VITE_FUNCTIONS_URL, default slot 0). Start it first: cd backend/src-plattr && ./emu.sh
export default defineConfig({
  testDir: 'e2e',
  timeout: 20_000,
  workers: 1,          // one emulator, one staff account per role: tests must not interleave PIN attempts
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:5173', headless: true },
  webServer: { command: 'npx vite --host 127.0.0.1 --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
})
