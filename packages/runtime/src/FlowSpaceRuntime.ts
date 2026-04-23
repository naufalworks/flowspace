/**
 * FlowSpaceRuntime
 *
 * Main orchestrator that integrates all FlowSpace components.
 * This is the entry point for users to interact with FlowSpace.
 */

import type { Browser, Page } from 'playwright';
import { firefox } from 'playwright';
import { ActionRecorder } from '@flowspace/recorder';
import { CVLMatcher } from '@flowspace/matcher';
import { PatternDetector } from '@flowspace/detector';
import { SkillGenerator } from '@flowspace/generator';
import { SkillRegistry } from '@flowspace/registry';
import type { RecordedAction, Pattern } from '@flowspace/core';

export interface FlowSpaceConfig {
  /**
   * Browser to use (firefox, chromium, webkit)
   */
  browser?: 'firefox' | 'chromium' | 'webkit';

  /**
   * Whether to run in headless mode
   */
  headless?: boolean;

  /**
   * Skills directory
   */
  skillsDirectory?: string;

  /**
   * Pattern detection config
   */
  patternDetection?: {
    minFrequency?: number;
    minConfidence?: number;
  };

  /**
   * Whether to auto-generate skills
   */
  autoGenerateSkills?: boolean;
}

export type FlowSpaceMode = 'recording' | 'executing' | 'idle';

export class FlowSpaceRuntime {
  private config: FlowSpaceConfig;
  private browser?: Browser;
  private page?: Page;
  private mode: FlowSpaceMode = 'idle';

  // Components
  private recorder?: ActionRecorder;
  private matcher?: CVLMatcher;
  private detector: PatternDetector;
  private generator: SkillGenerator;
  private registry: SkillRegistry;

  constructor(config: FlowSpaceConfig = {}) {
    this.config = {
      browser: config.browser ?? 'firefox',
      headless: config.headless ?? false,
      skillsDirectory: config.skillsDirectory ?? './skills',
      patternDetection: {
        minFrequency: config.patternDetection?.minFrequency ?? 2,
        minConfidence: config.patternDetection?.minConfidence ?? 0.8
      },
      autoGenerateSkills: config.autoGenerateSkills ?? true
    };

    // Initialize components
    this.detector = new PatternDetector(this.config.patternDetection);
    this.generator = new SkillGenerator({
      skillsDirectory: `${this.config.skillsDirectory}/_learned`
    });
    this.registry = new SkillRegistry({
      skillsDirectory: this.config.skillsDirectory
    });

    console.log('✅ FlowSpace initialized');
  }

  /**
   * Initialize browser and page
   */
  async initialize(url?: string): Promise<void> {
    // Launch browser
    this.browser = await firefox.launch({
      headless: this.config.headless
    });

    this.page = await this.browser.newPage();

    // Initialize components with page
    this.recorder = new ActionRecorder(this.page);
    this.matcher = new CVLMatcher(this.page);
    this.registry.setPage(this.page);

    // Navigate to URL if provided
    if (url) {
      await this.page.goto(url);
    }

    console.log('✅ Browser initialized');
  }

  /**
   * Start recording user actions
   */
  async startRecording(): Promise<void> {
    if (!this.recorder) {
      throw new Error('Not initialized. Call initialize() first.');
    }

    if (this.mode === 'recording') {
      throw new Error('Already recording');
    }

    await this.recorder.startRecording();
    this.mode = 'recording';

    console.log('🔴 Recording started');
  }

  /**
   * Stop recording and analyze patterns
   */
  async stopRecording(): Promise<{
    actions: RecordedAction[];
    patterns: Pattern[];
    suggestedSkills: string[];
  }> {
    if (!this.recorder) {
      throw new Error('Not initialized');
    }

    if (this.mode !== 'recording') {
      throw new Error('Not recording');
    }

    // Stop recording
    const actions = await this.recorder.stopRecording();
    this.mode = 'idle';

    console.log(`⏹️  Recording stopped. Captured ${actions.length} actions`);

    // Detect patterns
    const detectedPatterns = this.detector.addActions(actions);
    const suggestedPatterns = this.detector.getSuggestedPatterns();

    console.log(`🔍 Detected ${detectedPatterns.length} patterns`);
    console.log(`💡 Suggested ${suggestedPatterns.length} skills`);

    // Auto-generate skills if enabled
    const suggestedSkills: string[] = [];

    if (this.config.autoGenerateSkills && suggestedPatterns.length > 0) {
      for (const pattern of suggestedPatterns) {
        const generated = await this.generator.generateSkill(pattern);
        this.registry.register(generated.skill, 'learned');
        suggestedSkills.push(generated.skill.name);

        console.log(`✨ Generated skill: ${generated.skill.name}`);
      }
    }

    return {
      actions,
      patterns: suggestedPatterns,
      suggestedSkills
    };
  }

  /**
   * Execute a skill by name
   */
  async executeSkill(skillName: string, params: Record<string, any> = {}): Promise<void> {
    if (!this.page) {
      throw new Error('Not initialized');
    }

    this.mode = 'executing';

    console.log(`▶️  Executing skill: ${skillName}`);

    const result = await this.registry.execute(skillName, params);

    this.mode = 'idle';

    if (result.success) {
      console.log(`✅ Skill executed successfully (${result.duration}ms)`);
    } else {
      console.error(`❌ Skill execution failed: ${result.error}`);
      throw new Error(result.error);
    }
  }

  /**
   * Navigate to a URL
   */
  async goto(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Not initialized');
    }

    await this.page.goto(url);
    console.log(`🌐 Navigated to: ${url}`);
  }

  /**
   * Search for skills
   */
  searchSkills(query: string) {
    return this.registry.search(query);
  }

  /**
   * List all skills
   */
  listSkills() {
    return this.registry.list();
  }

  /**
   * Get detected patterns
   */
  getPatterns() {
    return this.detector.getPatterns();
  }

  /**
   * Get suggested patterns (for skill generation)
   */
  getSuggestedPatterns() {
    return this.detector.getSuggestedPatterns();
  }

  /**
   * Get current mode
   */
  getMode(): FlowSpaceMode {
    return this.mode;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      mode: this.mode,
      detector: this.detector.getStats(),
      registry: this.registry.getStats(),
      generator: this.generator.getStats()
    };
  }

  /**
   * Export all data as JSON
   */
  exportJSON(): string {
    return JSON.stringify({
      patterns: this.detector.exportJSON(),
      registry: this.registry.exportJSON(),
      stats: this.getStats()
    }, null, 2);
  }

  /**
   * Cleanup and close browser
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }
}
