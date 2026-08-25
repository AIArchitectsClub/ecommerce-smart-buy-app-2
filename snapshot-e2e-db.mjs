import { snapshotState, closeDb } from './e2e/fixtures/db.js'
const s = await snapshotState()
console.log(JSON.stringify(s))
await closeDb()
