# FlowSpace Examples

This directory contains example scripts demonstrating FlowSpace capabilities.

## Quick Start

The simplest possible example:

```bash
npm run example:quick-start
```

See: [quick-start.ts](./quick-start.ts)

## Login Flow Automation

Complete example showing:
- Recording user actions
- Pattern detection
- Auto-skill generation
- Skill execution on different sites

```bash
npm run example:login-flow
```

See: [login-flow.ts](./login-flow.ts)

## Running Examples

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build packages:**
   ```bash
   npm run build
   ```

3. **Run an example:**
   ```bash
   npx ts-node examples/quick-start.ts
   ```

## What to Expect

When you run an example:

1. **Browser opens** (Firefox by default)
2. **Recording starts** - perform actions manually
3. **Patterns detected** - FlowSpace analyzes your actions
4. **Skills generated** - SKILL.md files created in `skills/_learned/`
5. **Skills executed** - Automation runs on different sites

## Example Output

```
🚀 FlowSpace Example: Login Flow Automation

📝 STEP 1: Record Login Actions
🔴 Recording... (perform actions now)

✅ Recording complete!
   Captured: 4 actions
   Detected: 1 patterns
   Generated: 1 skills

🔍 Detected Patterns:
   1. login-flow
      - Frequency: 1
      - Confidence: 95%
      - Steps: 4

✨ Generated Skills:
   1. login-flow

📝 STEP 2: Execute Generated Skill
   Executing: login-flow

✅ Skill executed successfully!
   The same skill works on a different site!

📊 Statistics:
   Mode: idle
   Total Actions: 4
   Total Patterns: 1
   Total Skills: 1
   Success Rate: 100%

✅ Done!
```

## Next Steps

After running examples:

1. Check generated skills in `skills/_learned/`
2. Modify and customize skills
3. Share skills with your team
4. Build your own automation workflows
