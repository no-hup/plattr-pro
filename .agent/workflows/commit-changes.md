---
description: How to review git diff and commit changes with proper guidelines
---

# Commit Changes Workflow

## Step 1: Review Git Status and Diff
```bash
git status
git diff --stat
git diff
```

## Step 2: Analyze Changes for Sensitive Logic

Before committing, **check if any changes involve**:
- **Pricing Logic**: Any calculations, discounts, tax computations, price display, or priceInfo handling
- **Core Auth Logic**: OTP verification, session validation, token handling, customer authentication, or permission checks
- **API Contract Changes**: Request/response schema changes, new/modified API endpoints, data model structure changes affecting backend-frontend sync

### If Sensitive Logic is Detected:

**DO NOT COMMIT.** Instead, generate a verification prompt for the user with this format:

---

### For Pricing or Auth Logic Changes:

```
## 🔐 Verification Required: [Change Type]

### Requirement
[Describe the actual business requirement or the intent behind the change]

### Change Summary
[Brief explanation of what was modified and how it differs from previous behavior]

### Files Changed
- `path/to/file1.ext` — [brief description of change]
- `path/to/file2.ext` — [brief description of change]

### Verification Prompt for Agent
> [Copy-paste ready prompt that includes the requirement, file names, and asks the agent to verify the logic correctness]
```

---

### For API Contract Changes:

```
## 📋 Contract Change Verification Required

### Change Type
[NEW_ENDPOINT | MODIFIED_REQUEST | MODIFIED_RESPONSE | DEPRECATED_FIELD | ADDED_FIELD | TYPE_CHANGE]

### Requirement
[Describe the business requirement or reason for the contract change]

### Contract Change Summary
[Explain what changed in the API contract - fields added/removed/modified, type changes, required vs optional changes]

### Backend Changes
- `path/to/backend/file.js` — [description of API/function change]

### Frontend Changes (if any)
- `path/to/frontend/file.dart` — [description of model/repository change]

### Breaking Change Assessment
- [ ] Is this a breaking change for existing clients?
- [ ] Are there dependent components that need updates?
- [ ] Does this require data migration?

### Verification Prompt for Contract Validation Agent
> **Objective**: Verify that the API contract change is correctly implemented on both backend and frontend, and no components are broken.
>
> **Requirement**: [Copy requirement from above]
>
> **Files to Review**:
> - Backend: [list backend files]
> - Frontend: [list frontend files]
>
> **Validation Steps**:
> 1. Compare the backend API response schema with the frontend model/parser
> 2. Identify any field mismatches (name, type, nullability)
> 3. Check if all consumers of this API are updated
> 4. Run test API calls against the emulator to validate response structure
> 5. Report any discrepancies or potential runtime errors
>
> **Expected Test Commands**:
> ```bash
> # Start Firebase emulator
> firebase emulators:start --only functions,firestore
> 
> # Test the affected endpoint
> curl -X [METHOD] "http://localhost:5001/[project]/[region]/[function]" \
>   -H "Content-Type: application/json" \
>   -d '[request body if applicable]'
> ```
```

---

Present this to the user and wait for their decision before proceeding.

---

## Step 3: Stage and Commit (Non-Sensitive Changes Only)

If no sensitive logic is detected, proceed with commit:

```bash
git add -A
git commit -m "<commit message>"
```

## Commit Message Guidelines

### Format
```
<Short summary line describing the main change. important: if multiple features are there in the commit hten the first line should have the feature names separated by comma so that >

• <Major change 1>
• <Major change 2>
• <Major change 3>
• <Major change 4>
• <Major change 5>
```

### Rules
1. **Maximum 5 bullet points** — Focus on the most significant changes. Just by looking at the first line of the commit dev should be able to know what all makor things are part of that commit.
2. **Brief and clear** — Each bullet should be a concise description
3. **Use action verbs** — Extract, Refactor, Add, Remove, Fix, Update, Simplify
4. **Group related changes** — Combine similar changes into one bullet
5. **Mention file/component names** — Reference specific files or components when helpful
6. **No redundancy** — Don't repeat what's in the summary line

### Example
```
Refactor Flutter widgets into reusable components and centralize configurations

• Extract PriceDisplay, QuantitySelector, and StatusBadge into dedicated widget files
• Create OtpConfig with centralized OTP length constant
• Simplify MenuRepository by using shared DioClient
• Refactor menu_widgets.dart to use new centralized components
• Update cart_page to use QuantitySelector widget
```

---

## Sensitive Logic Keywords Reference

### Pricing Logic Keywords
- `priceInfo`, `finalPrice`, `basePrice`, `discount`
- `tax`, `total`, `subtotal`, `amount`
- `calculatePrice`, `computeTotal`, `applyDiscount`
- Files: `*price*.dart`, `*cart*.dart`, `*order*.dart`, `*checkout*.dart`

### Auth Logic Keywords
- `otp`, `OTP`, `verifyOtp`, `validateOtp`
- `session`, `token`, `auth`, `authenticate`
- `customer`, `user`, `login`, `logout`
- `permission`, `access`, `validate`
- Files: `*otp*.dart`, `*session*.js`, `*auth*.dart`, `otpService.js`

### API Contract Keywords
- Response models: `*_response.dart`, `*Response.dart`, `ApiResponse`
- Request models: `*_request.dart`, `*Request.dart`
- Repository files: `*_repository.dart`, `*Repository.dart`
- Backend functions: `functions/**/*.js`, `exports.*`
- Schema indicators: `fromJson`, `toJson`, `fromMap`, `toMap`
- Field changes: Added/removed fields in JSON parsing, type changes, nullability changes
- HTTP layer: `res.json()`, `res.status()`, `req.body`, `req.query`
- Files to cross-check:
  - Backend: `functions/**/*.js`
  - Frontend Models: `lib/models/**/*.dart`, `lib/pages/**/models/*.dart`
  - Frontend Repositories: `lib/pages/**/*_repository.dart`
  - Response Parsers: `*parser*.dart`, `*_response.dart`