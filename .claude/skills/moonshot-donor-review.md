---
name: Moonshot Donor Review
description: Blind review of a module's spec sheet against working open-source POS code. Spawns a fresh Opus subagent that has seen none of the main session's reasoning, reads the donor files for the concern before it reads our sheet, and reports what the donors handle that the sheet does not, with file:line. The main session invokes it when implementation starts, keeps building, and merges the report before Definition of done.
---

## Moonshot Donor Review

Usage: `/moonshot-donor-review <SPEC file> "<DONORS.md section>" ["<second section>"]`
Example: `/moonshot-donor-review moonshot/SPEC_ST_staff_pin_and_approvals.md "Approvals, PIN, discount limits" "Void, cancel, what the kitchen sees"`

You, the main session, do not read the donor files. Your thinking is already on the sheet; the
reviewer's value is that it has not seen it. Spawn, keep building, merge when it returns.

### Spawn
Agent tool: `subagent_type: general-purpose`, `model: opus`, `run_in_background: true`. Pass the
prompt below with the three placeholders filled and nothing else. No summary of the design, no
decisions, no code paths, no chat.

### Prompt
```
You are reviewing one module of a restaurant POS against working open-source POS systems. You have
not seen how the module was designed, and that is the point. Do not ask for it.

Concern: {CONCERN}
Donor index: `moonshot/DONORS.md`, section(s) {SECTIONS}. Clones are at `~/Desktop/moonshot/donors/`.
Read only the files those sections name and grep near them. Do not survey the clones.
Our sheet: `{SPEC}`. Do not open it until step 2 is written.

1. Inventory. From the donor files alone, list every behaviour a working POS has for this concern:
   what can happen, who may do it, what is checked, what is recorded, what the guest or the kitchen
   sees, what happens when it fails. One line each with file:line. Include what they get wrong (a
   limit in code, a check on the client) and mark it.
2. Write the inventory to `moonshot/reviews/{DATE}-donor-{XX}.md` before reading anything of ours.
3. Now read the sheet's Job, Who can do what, Scenarios, Rules and Out of scope. Skip its Decisions.
4. Append three lists, one line each, donor file:line on every line:
   MISSING · a donor behaviour the sheet has no scenario or rule for. Say what breaks in a real
   restaurant if it stays missing, with a price and an hour.
   DIFFERENT · the sheet does it another way. Say which way is safer for the money, or for a lone
   cashier at 11pm, and why.
   OURS ALONE · the sheet does something no donor does. Flag it, do not judge it.
   Skip UI, framework, accounting-ledger detail and style.
5. Under 40 lines total. No preamble. Return the file path and the MISSING list.
```

### When it returns
Treat it like a consult, not a verdict. Every item gets one line in the sheet's Decisions table:
accept (add the scenario and its test), push back (why, in one line), or verify (open that one
file:line yourself, the only time you read a donor). Add one row `Donor review, <date>` pointing at
the report. A MISSING item that touches money, auth or concurrency is a test before it is a decision.
