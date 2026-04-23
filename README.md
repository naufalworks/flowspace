# FlowSpace

**Self-reshaping automation workspace that learns from your actions**

FlowSpace watches you perform tasks once, translates them to CVL (Custom Visual Language) tokens, and generates reusable automation skills that work across different websites.

## The Innovation

**You perform actions once → System translates to CVL → Becomes reusable automation**

```
Your Actions          CVL Tokens                    Generated Skill
───────────          ──────────                    ───────────────
Click login    →     E.BTN T.LOG C.BLU      →     async function login() {
Type username  →     E.INP P.USR T.TXT      →       await findByCVL('E.BTN T.LOG').click();
Type password  →     E.INP P.PWD T.PWD      →       await findByCVL('E.INP P.USR').fill(user);
Click submit   →     E.BTN T.SUB A.SUB      →       await findByCVL('E.INP P.PWD').fill(pass);
                                                     await findByCVL('E.BTN T.SUB').click();
                                                   }
```

## Key Features

- **Record Once, Reuse Everywhere**: Actions work across different sites with similar patterns
- **CVL-Based Matching**: Finds elements by what they ARE, not where they are
- **Auto-Skill Generation**: Detects patterns and generates SKILL.md files automatically
- **Continuous Learning**: Powered by Morpheus - learns from Claude without retraining
- **Self-Healing**: When sites change, re-classifies and updates skills automatically

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              FlowSpace Runtime                           │
│         (Orchestrates recording & execution)             │
└─────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────┐                  ┌──────────────────┐
│  Perception       │                  │  Execution       │
│  (Morpheus)       │                  │  (FlowMind)      │
│                   │                  │                  │
│ - Scene graphs    │                  │ - Actions        │
│ - CVL tokens      │                  │ - Validation     │
│ - Classification  │                  │ - Rollback       │
└──────────────────┘                  └──────────────────┘
        ↓                                       ↓
┌─────────────────────────────────────────────────────────┐
│              Skill System (NEW)                          │
│  - ActionRecorder: Records user actions                 │
│  - PatternDetector: Finds repeated CVL sequences        │
│  - SkillGenerator: Generates SKILL.md files             │
│  - CVLMatcher: Finds elements by CVL pattern            │
│  - SkillRegistry: Manages and executes skills           │
└─────────────────────────────────────────────────────────┘
```

## Packages

- **core**: Morpheus + FlowMind integration
- **recorder**: ActionRecorder (captures user actions)
- **matcher**: CVLMatcher (reverse lookup by CVL)
- **detector**: PatternDetector (finds repeated patterns)
- **generator**: SkillGenerator (creates SKILL.md files)
- **registry**: SkillRegistry (manages skills)
- **runtime**: FlowSpaceRuntime (main orchestrator)
- **ui**: Browser UI (recording controls, visualization)

## Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run example
npx ts-node examples/quick-start.ts
```

## Usage

### Basic Example

```typescript
import { FlowSpaceRuntime } from '@flowspace/runtime';

// 1. Initialize
const flowspace = new FlowSpaceRuntime();
await flowspace.initialize('https://example.com');

// 2. Record actions
await flowspace.startRecording();
// ... perform actions manually in the browser ...
const { suggestedSkills } = await flowspace.stopRecording();

// 3. Execute generated skill
await flowspace.executeSkill('login-flow', {
  username: 'user@example.com',
  password: 'secret123'
});

// 4. Cleanup
await flowspace.cleanup();
```

### Complete Example

See [examples/login-flow.ts](./examples/login-flow.ts) for a full demonstration.

## How It Works

1. **Record**: FlowSpace watches you perform actions (click, type, select)
2. **Analyze**: Converts actions to CVL tokens and detects repeated patterns
3. **Generate**: Creates SKILL.md files with executable JavaScript code
4. **Execute**: Runs skills on any site with similar patterns

## Packages

- **core**: Morpheus + FlowMind integration
- **recorder**: ActionRecorder (captures user actions)
- **matcher**: CVLMatcher (reverse lookup by CVL)
- **detector**: PatternDetector (finds repeated patterns)
- **generator**: SkillGenerator (creates SKILL.md files)
- **registry**: SkillRegistry (manages skills)
- **runtime**: FlowSpaceRuntime (main orchestrator)
- **ui**: Browser UI (recording controls, visualization)

## Quick Start

## Research Contribution

**Novel Aspects:**
1. Self-modifying automation system (not just self-improving)
2. Automatic skill synthesis from observed patterns
3. CVL-based portable automation
4. Human-in-the-loop skill curation

**Potential Paper:** "FlowSpace: Self-Modifying Browser Automation Through Continuous Pattern Learning"

**Target Venues:** CHI 2027, UIST 2027, WWW 2027

## License

MIT

## Links

- GitHub: https://github.com/naufalworks/flowspace
- Morpheus: https://github.com/naufalworks/morpheus
- FlowMind: https://github.com/naufalworks/flowmind

## Development Status

- ✅ Repository structure (monorepo with workspaces)
- ✅ Core package (type definitions)
- ✅ ActionRecorder (records user actions)
- ✅ CVLMatcher (reverse lookup by CVL)
- ✅ PatternDetector (detects repeated patterns)
- ✅ SkillGenerator (generates SKILL.md files)
- ✅ SkillRegistry (manages and executes skills)
- ✅ FlowSpaceRuntime (main orchestrator)
- ✅ Examples and documentation
- 🚧 Browser UI (planned)
- 🚧 Tests (planned)

**Progress: 80% complete** (8/10 tasks done)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT

## Acknowledgments

Built on top of:
- [Morpheus](https://github.com/naufalworks/morpheus) - Scene graph-based UI classification
- [FlowMind](https://github.com/naufalworks/flowmind) - Autonomous web scraping
