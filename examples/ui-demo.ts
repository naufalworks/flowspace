/**
 * FlowSpace UI Example
 *
 * Demonstrates the browser UI with recording controls
 */

import { FlowSpaceRuntime } from '@flowspace/runtime';
import { FlowSpaceUI } from '@flowspace/ui';

async function main() {
  console.log('🚀 FlowSpace UI Example\n');

  // Initialize FlowSpace
  const flowspace = new FlowSpaceRuntime({
    headless: false,
    autoGenerateSkills: true
  });

  await flowspace.initialize('https://example.com');

  // Inject UI into the page
  const ui = new FlowSpaceUI(flowspace, {
    position: 'bottom-right',
    showCVL: true,
    showPatternNotifications: true
  });

  await ui.inject();

  console.log('✅ UI injected into page');
  console.log('   Use the control panel to:');
  console.log('   1. Click "Start Recording"');
  console.log('   2. Perform actions in the browser');
  console.log('   3. Click "Stop & Analyze"');
  console.log('   4. Skills will be auto-generated\n');

  // Keep the browser open
  console.log('Press Ctrl+C to exit\n');

  // Wait indefinitely
  await new Promise(() => {});
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
