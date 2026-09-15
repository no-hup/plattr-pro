import { test } from '@playwright/test'
// ST-S2 in the browser: the ONE interceptor in api/client.ts shows the PIN box and resends.
test.fixme('ST-S2 ₹251 off the ₹1,250 pitcher → PIN box appears → 1234 → line shows −₹251 and the box closes', async () => {})
test.fixme('ST-S3 wrong PIN → box stays with "Wrong PIN, 4 left", no auto-resend; 5th → box closes, "Locked for 15 min", no loop', async () => {})
test.fixme('ST-S1 ₹100 off → applied with no PIN box', async () => {})
test.fixme('ST-S6 submit with no reason → button disabled; reason list comes from config', async () => {})
test.fixme('ST-S2 exactly two network calls: the second is the same body plus pin', async () => {})
test.fixme('ST-S4 permission-denied without requires → no PIN box, toast "Not allowed"', async () => {})
test.fixme('cancel the PIN box → no second call, nothing applied', async () => {})
test.fixme('after success the PIN is in no component state and no localStorage/sessionStorage key', async () => {})
