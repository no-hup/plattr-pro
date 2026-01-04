# 🏗️ Agent Architecture Guidelines

> **Purpose**: Best practices for structuring utility modules and workflows for LLM agent consumption.  
> **Scope**: Utility flows, automation scripts, agent-facing tooling. NOT for production Flutter/backend code.

---

## 🤖 Sub-Agent Friendly Architecture

When building utility modules or automation flows that agents will interact with, consider designing with **sub-agent delegation** in mind.

### When This Applies
- ✅ Developer tooling and automation scripts
- ✅ Emulator/environment management
- ✅ Log capture and monitoring utilities
- ✅ Data import/export workflows
- ✅ Testing and validation pipelines

### When This Does NOT Apply
- ❌ Production Flutter app code
- ❌ Backend Cloud Functions APIs
- ❌ User-facing features
- ❌ Core business logic

---

## 📐 Design Principles

### 1. **Create Self-Contained Instruction Files**

When building a utility module, include a `SubAgent*.md` file with:
- Clear objectives
- Step-by-step instructions
- Required paths/configs (use absolute paths)
- Success criteria checklist
- Troubleshooting section
- Status report template

**Example**: `response_guard/SubAgentFirebaseEmulator.md`

### 2. **Design for Statelessness**

Each script/command should:
- Check current state before acting
- Be idempotent (safe to run multiple times)
- Report its outcome clearly

```bash
# Good: Check first, then act
if curl -s http://127.0.0.1:5002/ > /dev/null 2>&1; then
    echo "Already running"
else
    start_emulator
fi
```

### 3. **Provide Clear Status Commands**

Every utility should have:
- `--check` or `--status` to query current state
- `--help` for usage documentation
- Clear success/failure output

### 4. **Use Absolute Paths**

Sub-agents don't have context of "current directory". Always use absolute paths in documentation:

```bash
# Bad
cd functions && node mock/quickImport.js

# Good  
cd /Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions
node mock/quickImport.js
```

### 5. **Log to Standard Locations**

Use consistent, predictable output locations:
```
agent_workspace/<module>/output/   # Session logs
agent_workspace/<module>/config/   # Configuration
```

### 6. **Include Verification Steps**

Always provide a way to verify success:
```bash
# Verification command
curl http://127.0.0.1:5002/rms-app-dd875/us-central1/dev-listRestaurants

# Expected output pattern
{"status":"success", ...}
```

---

## 📁 Recommended Module Structure

For agent-facing utility modules:

```
agent_workspace/<module_name>/
├── README.md                    # Human-readable documentation
├── SubAgent<Purpose>.md         # Sub-agent instruction file(s)
├── config/                      # Configuration files
│   └── *.json
├── scripts/                     # Executable scripts
│   ├── main_operation.sh
│   └── helper_scripts.sh
├── output/                      # Runtime output (gitignored)
│   └── *.json, *.log
└── templates/                   # Templates for generated files
    └── *.template
```

---

## 📋 Sub-Agent Instruction File Template

```markdown
# Sub-Agent: <Purpose>

## Objectives
1. Primary goal
2. Secondary goal

## Prerequisites
- What must be true before starting

## Steps
### Step 1: Check Current State
### Step 2: Perform Action
### Step 3: Verify Success

## Success Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Troubleshooting
### Issue: <problem>
Solution: <fix>

## Status Report Template
```

---

## 💡 Examples in This Project

| Module | Sub-Agent File | Purpose |
|--------|----------------|---------|
| Response Guard | `SubAgentFirebaseEmulator.md` | Emulator lifecycle management |

---

## 📝 Notes

- This is a **soft guideline**, not a strict requirement
- Apply when building agent-facing utilities
- The goal is to enable main agents to delegate setup/infrastructure tasks to sub-agents
- Review and update this document as sub-agent capabilities evolve
