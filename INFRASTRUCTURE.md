# Infrastructure — GCP, Firebase, Hosting, Billing

Single reference for what is deployed, what it costs, and how to touch it.
Verified 2026-09-13. Deploy *procedure* lives in [GO_LIVE_PLAN.md](GO_LIVE_PLAN.md); this is
the config and cost reference.

> **Deployed is not the same as live.** This project is deployed and it costs money, but no
> restaurant is trading on it. Kaanchipuram Kaapi was a test production run — a rehearsal of the
> deploy path, not a paying customer. Treat the data in it as disposable: no migrations, no
> backward compatibility, re-seed freely. The cost and quota notes below still apply.

---

## 1. Identity — get this right first

| Thing | Value |
|---|---|
| GCP / Firebase project | `rms-app-dd875` (project number `440349438432`) |
| Billing account | `017259-BD4A9E-886E50` — "Firebase Payment", **INR** |
| Billing owner | **`maverick.shaurya@gmail.com`** |
| Region (everything) | `us-central1` |
| Firestore location | `eur3` (Europe multi-region) |

**Only `maverick.shaurya@gmail.com` can see billing.** `shauryaj.finance@gmail.com` and
`shauryajaiswal.dev@gmail.com` both get `PERMISSION_DENIED` on this project — that is an account
mixup, not a broken grant. Always pass `--account=maverick.shaurya@gmail.com` to `gcloud billing`.

A **closed twin billing account** `0181A0-52E402-DE31C3` exists with the same display name.
Ignore it. If a tool picks it up, it picked the wrong one.

---

## 2. What is deployed

**Cloud Functions — 62 exports, Node 22, gen2.** Each export is its own Cloud Run service in
`us-central1`, so 62 services. That means ~8 cold starts per customer flow; folding them into one
HTTP router is the known post-launch fix.

Per-service settings (uniform across all 62):

```
min-instances: 0     max-instances: 10
memory: 256Mi        concurrency: 80
```

`min-instances: 0` is why the project costs nothing at rest. `max-instances: 10` is the real
spend ceiling — see §4. **Do not raise either without reading §4.**

**Firebase Hosting — two sites, one project:**

| Site | URL | Serves | Built by |
|---|---|---|---|
| `plattrpro` | https://plattrpro.web.app | Consumer web app | [scripts/build-consumer-web.sh](scripts/build-consumer-web.sh) → `backend/src-plattr/consumer-web` |
| `rms-app-dd875` | https://rms-app-dd875.web.app | Staff apps at `/server/ /kitchen/ /admin/` | [scripts/build-staff-web.sh](scripts/build-staff-web.sh) → `backend/src-plattr/staff-web/` |

`hosting` in [backend/src-plattr/firebase.json](backend/src-plattr/firebase.json) is a two-entry
**array**. `firebase deploy --only hosting:rms-app-dd875` touches staff only and leaves the
consumer site alone. Both `public` dirs are gitignored build output.

Use the existing `rms-app-dd875` site for staff — its origin is already in the prod CORS
whitelist ([backend/src-plattr/functions/utils/cors.js](backend/src-plattr/functions/utils/cors.js)),
so a new site would need a functions redeploy.

**Consumer app uses HASH routing.** A table link must be
`https://plattrpro.web.app/#/r/<rid>/t/<tid>`. A plain path falls through to the dev restaurant
picker and shows the customer an error. A hosting 302 covers old QRs. The bare root URL still
shows that error — there is no landing page yet.

---

## 3. What actually costs money

Blaze bills from byte one on a few SKUs regardless of traffic. Measured 2026-09-13:

| Driver | Actual | Free tier | Billing? |
|---|---|---|---|
| Artifact Registry (`gcf-artifacts`) | 215 MB | 500 MB | No — **watch this one** |
| Cloud Storage (4 × `gcf-*` buckets) | ~98 MB | 5 GB (us-central1) | No |
| Cloud Run idle | min-instances 0 everywhere | — | No |
| Cloud Scheduler | 0 jobs | 3 free | No |
| Compute Engine / Cloud SQL | not enabled | — | No |
| Firestore, Functions invocations | well under quota | generous | No |

**Steady state is effectively ₹0.** The one that drifts upward on its own is Artifact Registry:
every function deploy pushes a new image and 62 functions redeploy together. At 215/500 MB it is
fine; when it nears the ceiling, add a cleanup policy deleting images older than 30 days.

---

## 4. Billing guardrails — and their limits

**There is no hard spend cap in GCP.** Not in console, not in the API. Google has never shipped
one. Anything claiming to guarantee a ceiling is wrong. What exists:

**`max-instances: 10` is your real protection.** It is real-time, it cannot be outrun, and it
bounds both compute burn and — indirectly, since bounded instances issue bounded queries —
Firestore reads. It is already set on all 62 services. This is the single most important cost
control in the project.

**Budget alert `plattr-pro guard INR500`** (id `b284ca36-b597-4e88-acb4-5f4664a56bf5`) —
thresholds at 50% / 90% / 100% of current spend plus **100% of *forecasted* spend**. The
forecast rule is the useful one: it fires while current spend is still small. Emails billing
admins.

> **A budget ALERTS. It does not CAP.** Nothing stops serving at ₹500.

**Firestore cannot be capped.** Its consumer quotas are administrative (`cmek_databases` etc.) —
there is no settable reads-per-day limit. On `eur3`, reads run ~$0.06/100k. This is the only
genuinely uncapped surface, and `max-instances` is what throttles it.

A Pub/Sub kill switch that detaches billing on overrun was designed and **deliberately rejected**
(2026-09-13): budget data lags hours so it cannot prevent the overrun anyway, and it would take
a live restaurant offline mid-service. Realistic worst case without it is a Firestore loop
burning a few ₹1000s before the forecast alert lands — a bad week, not a catastrophe.

**No BigQuery billing export is configured**, so `gcloud` cannot report spend. Cost figures come
from the console only.

---

## 5. Commands

```bash
# Billing state without needing gcloud auth (uses the firebase CLI's own token)
scripts/billing-check.sh                      # "open": true and billingEnabled: true = healthy

gcloud billing projects describe rms-app-dd875 --account=maverick.shaurya@gmail.com
gcloud billing budgets list --billing-account=017259-BD4A9E-886E50 --account=maverick.shaurya@gmail.com

# Deploy — NEVER a bare full deploy (see gotchas)
scripts/deploy-prod.sh <group…>               # jest gate → per-group → allUsers-invoker loop
scripts/build-consumer-web.sh && firebase deploy --only hosting:plattrpro
scripts/build-staff-web.sh   && firebase deploy --only hosting:rms-app-dd875
```

Payment methods and invoices are **console-only** — no CLI or API exists:
https://console.cloud.google.com/billing/017259-BD4A9E-886E50

---

## 6. Deploy gotchas that have actually bitten

- **Never run a bare full deploy of all 62 functions.** It trips the write quota and silently
  drops the `allUsers` invoker on some services → HTML 403s. Use `scripts/deploy-prod.sh` by group.
- **Prod Firestore rejects `FieldValue.serverTimestamp()` inside arrays.** The emulator accepts
  it (still unexplained). Any array-nested timestamp must use `Timestamp.now()`.
- **`index.js` must export admin endpoints as nested `exports.admin = {…}`** — Cloud Run maps id
  `admin-x` to module path `admin.x`; flat keys crash at boot.
- **Changing a callable ↔ https trigger needs `functions:delete` first.**
- A deploy dying with a bare "An unexpected error has occurred" just needs that group re-run
  with `--debug`.
- **The backend mixes two response envelopes.** Clients must accept
  `status === 'success' || success === true`.

---

## 7. Failure triage

| Symptom | Check first |
|---|---|
| Everything 503s at once | `scripts/billing-check.sh` → `billingEnabled` / account `open` |
| One endpoint returns HTML 403 | Lost `allUsers` invoker — re-run its deploy group |
| Customer sees "Oops! Something went wrong" from a QR | Link missing the `#` — see §2 |
| Staff app "No internet connection" | `AppConfig` left on `Environment.dev` |

**A suspended billing account takes every app down at once for a ₹0 bill** — a dead card is a
bigger outage risk here than any cost overrun. Keep a valid payment method on the account.

---

## Open items (2026-09-13)

- Google flagged the billing account's payment method as past due / invalid. Usage is ~₹0, so
  this is a card problem, not a debt problem — but it ends in suspension if ignored.
  Fix at the console link in §5 as `maverick.shaurya@gmail.com`.
- No landing page at the bare `plattrpro.web.app` root.
- 62 separate functions → ~8 cold starts per flow. Fold into one HTTP router.
