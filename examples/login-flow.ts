/**
 * FlowSpace Example - Record and Execute Login Flow
 *
 * This example demonstrates:
 * 1. Recording user actions
 * 2. Detecting patterns
 * 3. Auto-generating skills
 * 4. Executing generated skills
 */

import { FlowSpaceRuntime } from '@flowspace/runtime';

async function main() {
  console.log('🚀 FlowSpace Example: Login Flow Automation\n');

  // Initialize FlowSpace
  const flowspace = new FlowSpaceRuntime({
    headless: false, // Show browser for demo
    autoGenerateSkills: true
  });

  await flowspace.initialize('https://example.com');

  console.log('\n📝 STEP 1: Record Login Actions');
  console.log('   Perform these actions manually:');
  console.log('   1. Click login button');
  console.log('   2. Type username');
  console.log('   3. Type password');
  console.log('   4. Click submit\n');

  // Start recording
  await flowspace.startRecording();

  console.log('🔴 Recording... (perform actions now)');
  console.log('   Press Ctrl+C when done, or wait 30 seconds\n');

  // Wait for user to perform actions (or timeout after 30s)
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Stop recording and analyze
  const result = await flowspace.stopRecording();

  console.log('\n✅ Recording complete!');
  console.log(`   Captured: ${result.actions.length} actions`);
  console.log(`   Detected: ${result.patterns.length} patterns`);
  console.log(`   Generated: ${result.suggestedSkills.length} skills\n`);

  // Show detected patterns
  if (result.patterns.length > 0) {
    console.log('🔍 Detected Patterns:');
    result.patterns.forEach((pattern, i) => {
      console.log(`   ${i + 1}. ${pattern.name}`);
      console.log(`      - Frequency: ${pattern.frequency}`);
      console.log(`      - Confidence: ${(pattern.confidence * 100).toFixed(0)}%`);
      console.log(`      - Steps: ${pattern.cvlSequence.length}`);
    });
    console.log('');
  }

  // Show generated skills
  if (result.suggestedSkills.length > 0) {
    console.log('✨ Generated Skills:');
    result.suggestedSkills.forEach((skillName, i) => {
      console.log(`   ${i + 1}. ${skillName}`);
    });
    console.log('');
  }

  // Execute the first generated skill
  if (result.suggestedSkills.length > 0) {
    const skillName = result.suggestedSkills[0];

    console.log(`\n📝 STEP 2: Execute Generated Skill`);
    console.log(`   Executing: ${skillName}\n`);

    // Navigate to a different site to test portability
    await flowspace.goto('https://github.com/login');

    try {
      await flowspace.executeSkill(skillName, {
        username: 'test@example.com',
        password: 'test123'
      });

      console.log('✅ Skill executed successfully!');
      console.log('   The same skill works on a different site!\n');
    } catch (error: any) {
      console.log(`❌ Skill execution failed: ${error.message}\n`);
    }
  }

  // Show statistics
  console.log('📊 Statistics:');
  const stats = flowspace.getStats();
  console.log(`   Mode: ${stats.mode}`);
  console.log(`   Total Actions: ${stats.detector.totalActions}`);
  console.log(`   Total Patterns: ${stats.detector.totalPatterns}`);
  console.log(`   Total Skills: ${stats.registry.totalSkills}`);
  console.log(`   Success Rate: ${(stats.registry.successRate * 100).toFixed(0)}%\n`);

  // Export data
  console.log('💾 Exporting data...');
  const data = flowspace.exportJSON();
  console.log(`   Exported ${data.length} bytes\n`);

  // Cleanup
  await flowspace.cleanup();
  console.log('✅ Done!');
}

// Run example
main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
