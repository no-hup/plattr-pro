# Writing tests — the playbook

Read this before writing any automated test in this repo: backend unit, e2e, Flutter or Playwright.
It is the thinking, not the commands. Where tests live and how to run them: `CLAUDE.md` → Testing.
Exploring screens with an agent is a different job: `AGENT_QA.md`.

> **Editing this file.** Keep it to principles that hold for every stack here and that a real bug
> proved. One rule is a bold name and a line or two of why. Add a rule only when a bug got past our
> tests because it was missing. Replace a line rather than add a second one. No commands, no
> per-module detail, nothing written in advance. If a rule would make an agent write worse tests in
> some case, it doesn't belong here. The file stays readable in one sitting.

## Principles

- **A test is a claim about behaviour someone depends on.** Name it after the rule or scenario it
  guards (`FL-S24 a move is refused while a line is billed`). If you can't say which rule, don't
  write it.
- **Expected values are worked out by hand.** Write ₹257.98 because you did the sum, not because the
  code printed it. A test whose expected value came from the code under test can only agree with it.
- **Prove it can fail.** A new test goes red on the old code, or on a planted bug, before it goes
  green. A test that has never failed has never checked anything.
- **Every bug gets its test first.** Reproduce it red, then fix it. The test is how the bug stays
  fixed.
- **Test at the cheapest level that can see the bug.** A rule (money, tax, "may this table merge")
  is a unit test. Several documents changing together is an e2e test on the emulator. Only what the
  screen shows or sends is a browser test. The screen doesn't re-check the maths: the backend
  owns it.
- **Seams are tested from the real writer.** A test that seeds the data in the shape its reader
  expects proves only that the reader reads that shape. Where one part writes and another reads (a
  bill and the floor, a line and the kitchen), at least one test must produce the data through the
  real writer. Every seeded test on the floor was green while real bills never reached it.
- **Fixtures keep one id per concept.** Never let the cashier's login, the guest's sitting and the
  draft share an id such as `s1`. A mix-up between them then passes every test.
- **Check what was stored, not what was returned.** The next screen reads the database, not this
  function's reply. After a write, read the document back.
- **Assert outcomes, not internals.** Check the money, the state and the refusal message. Don't check
  that a helper was called with some argument: that breaks on every refactor and misses real bugs.
- **Refusals are behaviour too.** For every "must not", test that it is refused, that the reason
  names the thing (the table, the bill), and that nothing changed.
- **Deterministic or deleted.** No sleeps, no real clock, no shared state between tests. A test that
  fails without a code change is fixed or deleted the same day, never retried until it passes.
- **A known bug is marked, not skipped.** A test for an open finding uses the runner's own expected-failure
  mark with the id first in its title (Jest `test.failing`, Playwright `test.fail()`, e2e `knownBug: 'QB-2'`).
  Every run lists it, and it goes red the day the bug is fixed, so the mark comes off with the fix.
- **Never weaken a test to get green.** No skipping, loosening or deleting. If the test is wrong,
  say why in the same change.

## Don't

- Screenshot or golden-image tests of screens: they break on every design change and catch little.
- Tests for code nobody is changing, written "for coverage". Add one when a bug or a change arrives.
- One giant test per flow that checks forty things: when it fails, nobody knows which rule broke.
