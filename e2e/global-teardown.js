// Closes the shared e2e/fixtures/db.js pool exactly once. Playwright
// reuses one worker process across spec files — if each file closed the
// pool in its own afterAll, whichever file finishes first would close it
// out from under files that haven't run yet ("Cannot use a pool after
// calling end"), which looks like an app bug but is just test-infra.
import { closeDb } from './fixtures/db.js'

export default async function globalTeardown() {
  await closeDb()
}
