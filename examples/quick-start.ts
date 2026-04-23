/**
 * FlowSpace Quick Start Example
 *
 * Simplest possible example showing the core workflow
 */

import { FlowSpaceRuntime } from '@flowspace/runtime';

async function quickStart() {
  // 1. Initialize
  const flowspace = new FlowSpaceRuntime();
  await flowspace.initialize('https://example.com');

  // 2. Record actions
  await flowspace.startRecording();
  // ... perform actions manually ...
  const { suggestedSkills } = await flowspace.stopRecording();

  // 3. Execute generated skill
  if (suggestedSkills.length > 0) {
    await flowspace.executeSkill(suggestedSkills[0], {
      username: 'user@example.com',
      password: 'secret123'
    });
  }

  // 4. Cleanup
  await flowspace.cleanup();
}

quickStart();
