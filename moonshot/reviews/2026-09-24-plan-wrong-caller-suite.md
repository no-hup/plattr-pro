# Plan (draft) — the wrong-caller test suite

Status: **draft, parked 2026-09-24.** Rough on purpose. Rethink in detail before building.
Pickup: row 10 in `STATE.md` → Next.

## Why
On 2026-09-23 we found that anyone holding table 4's QR (restaurant id + table id, printed on
the card) could add to, remove from or empty table 4's cart. Remove and clear needed no login
at all. It had been live since the old cart code was written, and **no test failed**, because
every test was written from the spec scenarios: they prove the right person *can*, never that
the wrong person *can't*. About 1,250 unit tests, and not one of them tried a stranger.

Without this suite, the next leak of this kind ships the same way: a green `make check` and a
hole nobody looked for.

## The idea
One e2e suite that loops over **every callable endpoint** and calls each one as the wrong
person. Every call must be refused. One loop, not hundreds of hand-written tests.

The wrong callers, per endpoint:
1. **No credentials.** No session, no staff token.
2. **The wrong table.** A live guest session from table 2, used against table 4.
3. **The wrong restaurant.** A valid session from restaurant A, used against restaurant B.
4. **The wrong staff role.** SERVER on a MANAGER-only act; guest session on a staff act.
5. **An ended session.** A session that was valid, then Cleared or expired.

Pass = refused, with the error `ErrorHandler` would give (unauthenticated / permission-denied),
and **nothing written**: the cart, order or bill is byte-identical before and after.

## Rough shape
- `test/e2e/suites/wrong-caller.js`, on its own fixtures (its own table ids, like `table_clean_*`).
- An **endpoint table**: name → who is allowed (guest of this table / SERVER / MANAGER / ADMIN /
  public) → a minimal valid body. That table is the real work.
- **Built from `index.js` exports**, so a new endpoint missing from the table fails the suite.
  That makes it impossible to add an endpoint without declaring who may call it.
- Public endpoints (menu fetch, restaurant info) are listed as public on purpose, and skipped.

## Definition of done hook
Add to the moonshot Definition of done once built: "every new endpoint has a row in the
wrong-caller table".

## Open questions (decide when we come back)
- Are 5 wrong callers enough? What about replaying another guest's `requestId`, or sending a
  price or role in the body (the "server decides" rule)?
- Flutter-only endpoints and the older `adminApp/` functions: in or out of the first pass?
- How to build a valid-shaped body per endpoint without hand-writing ~80 of them. Maybe reuse
  the existing e2e suites' payloads.
- Expect it to fail on first run. Each failure is either a real leak (fix it, red test first)
  or a wrong row in the table. Budget for triage, not just writing.

## Out of scope for this suite
Rate limiting, brute-forcing OTPs or PINs, Firestore security rules (the till never touches
Firestore directly), and anything about performance.
