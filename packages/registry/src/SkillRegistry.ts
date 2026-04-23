/**
 * SkillRegistry
 *
 * Manages all skills (_core, _learned, _user) and executes them.
 * This is the central hub for skill discovery, search, and execution.
 */

import type { Page } from 'playwright';
import type { Skill } from '@flowspace/core';
import { CVLMatcher } from '@flowspace/matcher';
import * as fs from 'fs';
import * as path from 'path';

export interface SkillRegistryConfig {
  /**
   * Base directory for skills
   */
  skillsDirectory?: string;

  /**
   * Whether to auto-load skills on initialization
   */
  autoLoad?: boolean;

  /**
   * Whether to track skill usage statistics
   */
  trackUsage?: boolean;
}

export interface SkillMetadata {
  skill: Skill;
  category: 'core' | 'learned' | 'user';
  filePath: string;
  usageCount: number;
  successCount: number;
  lastUsed?: number;
}

export interface SkillExecutionResult {
  success: boolean;
  skillName: string;
  duration: number;
  error?: string;
}

export class SkillRegistry {
  private config: SkillRegistryConfig;
  private skills: Map<string, SkillMetadata> = new Map();
  private page?: Page;
  private matcher?: CVLMatcher;

  constructor(config: SkillRegistryConfig = {}) {
    this.config = {
      skillsDirectory: config.skillsDirectory ?? './skills',
      autoLoad: config.autoLoad ?? true,
      trackUsage: config.trackUsage ?? true
    };

    if (this.config.autoLoad) {
      this.loadSkills();
    }
  }

  /**
   * Set the page for skill execution
   */
  setPage(page: Page): void {
    this.page = page;
    this.matcher = new CVLMatcher(page);
  }

  /**
   * Load all skills from directories
   */
  loadSkills(): void {
    const categories: Array<'core' | 'learned' | 'user'> = ['core', 'learned', 'user'];

    for (const category of categories) {
      const dir = path.join(this.config.skillsDirectory!, `_${category}`);

      if (!fs.existsSync(dir)) {
        continue;
      }

      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

      for (const file of files) {
        const filePath = path.join(dir, file);
        const skill = this.parseSkillFile(filePath);

        if (skill) {
          this.skills.set(skill.name, {
            skill,
            category,
            filePath,
            usageCount: 0,
            successCount: 0
          });
        }
      }
    }

    console.log(`✅ Loaded ${this.skills.size} skills`);
  }

  /**
   * Parse a SKILL.md file
   */
  private parseSkillFile(filePath: string): Skill | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const name = path.basename(filePath, '.md');

      // Extract code block (implementation)
      const codeMatch = content.match(/```javascript\n(async function[\s\S]*?)\n```/);
      const code = codeMatch ? codeMatch[1] : '';

      // Extract description (first paragraph after title)
      const descMatch = content.match(/^# .*\n\n(.*?)\n\n/);
      const description = descMatch ? descMatch[1] : '';

      return {
        id: `skill_${name}`,
        name,
        description,
        pattern: {
          id: `pattern_${name}`,
          name,
          cvlSequence: [],
          frequency: 0,
          successRate: 1.0
        },
        code,
        createdAt: fs.statSync(filePath).birthtimeMs
      };
    } catch (error) {
      console.error(`Failed to parse skill file: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Register a new skill
   */
  register(skill: Skill, category: 'core' | 'learned' | 'user' = 'user'): void {
    const dir = path.join(this.config.skillsDirectory!, `_${category}`);
    const filePath = path.join(dir, `${skill.name}.md`);

    this.skills.set(skill.name, {
      skill,
      category,
      filePath,
      usageCount: 0,
      successCount: 0
    });

    console.log(`✅ Registered skill: ${skill.name} (${category})`);
  }

  /**
   * Search for skills by name or description
   */
  search(query: string): SkillMetadata[] {
    const lowerQuery = query.toLowerCase();
    const results: SkillMetadata[] = [];

    for (const metadata of this.skills.values()) {
      const { skill } = metadata;

      if (
        skill.name.toLowerCase().includes(lowerQuery) ||
        skill.description.toLowerCase().includes(lowerQuery)
      ) {
        results.push(metadata);
      }
    }

    return results;
  }

  /**
   * Get a skill by name
   */
  get(skillName: string): SkillMetadata | undefined {
    return this.skills.get(skillName);
  }

  /**
   * Execute a skill
   */
  async execute(skillName: string, params: Record<string, any> = {}): Promise<SkillExecutionResult> {
    const startTime = Date.now();

    if (!this.page || !this.matcher) {
      return {
        success: false,
        skillName,
        duration: 0,
        error: 'Page not set. Call setPage() first.'
      };
    }

    const metadata = this.skills.get(skillName);

    if (!metadata) {
      return {
        success: false,
        skillName,
        duration: Date.now() - startTime,
        error: `Skill not found: ${skillName}`
      };
    }

    try {
      // Execute the skill code
      await this.executeSkillCode(metadata.skill, params);

      // Update statistics
      if (this.config.trackUsage) {
        metadata.usageCount++;
        metadata.successCount++;
        metadata.lastUsed = Date.now();
      }

      return {
        success: true,
        skillName,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      // Update statistics
      if (this.config.trackUsage) {
        metadata.usageCount++;
        metadata.lastUsed = Date.now();
      }

      return {
        success: false,
        skillName,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Execute skill code with CVL-based element finding
   */
  private async executeSkillCode(skill: Skill, params: Record<string, any>): Promise<void> {
    // Create a context with findByCVL helper
    const context = {
      findByCVL: async (cvl: string) => {
        const result = await this.matcher!.findBestMatch(cvl);
        if (!result) {
          throw new Error(`No element found matching CVL: ${cvl}`);
        }
        return result.element;
      },
      ...params
    };

    // Parse and execute the function
    const functionCode = skill.code;
    const functionMatch = functionCode.match(/async function (\w+)\((.*?)\)/);

    if (!functionMatch) {
      throw new Error('Invalid skill code format');
    }

    const functionName = functionMatch[1];
    const paramNames = functionMatch[2].split(',').map(p => p.trim()).filter(p => p);

    // Create function from code
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction('findByCVL', ...paramNames, functionCode.replace(/^async function \w+\(.*?\) \{/, '').replace(/\}$/, ''));

    // Execute with context
    await fn(context.findByCVL, ...paramNames.map(name => params[name]));
  }

  /**
   * List all skills
   */
  list(): SkillMetadata[] {
    return Array.from(this.skills.values());
  }

  /**
   * List skills by category
   */
  listByCategory(category: 'core' | 'learned' | 'user'): SkillMetadata[] {
    return this.list().filter(m => m.category === category);
  }

  /**
   * Get most used skills
   */
  getMostUsed(limit: number = 10): SkillMetadata[] {
    return this.list()
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Get recently used skills
   */
  getRecentlyUsed(limit: number = 10): SkillMetadata[] {
    return this.list()
      .filter(m => m.lastUsed)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      .slice(0, limit);
  }

  /**
   * Delete a skill
   */
  delete(skillName: string): boolean {
    const metadata = this.skills.get(skillName);

    if (!metadata) {
      return false;
    }

    // Delete file if it exists
    if (fs.existsSync(metadata.filePath)) {
      fs.unlinkSync(metadata.filePath);
    }

    this.skills.delete(skillName);
    return true;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSkills: number;
    coreSkills: number;
    learnedSkills: number;
    userSkills: number;
    totalExecutions: number;
    successRate: number;
  } {
    const skills = this.list();
    const totalExecutions = skills.reduce((sum, m) => sum + m.usageCount, 0);
    const totalSuccesses = skills.reduce((sum, m) => sum + m.successCount, 0);

    return {
      totalSkills: skills.length,
      coreSkills: this.listByCategory('core').length,
      learnedSkills: this.listByCategory('learned').length,
      userSkills: this.listByCategory('user').length,
      totalExecutions,
      successRate: totalExecutions > 0 ? totalSuccesses / totalExecutions : 0
    };
  }

  /**
   * Export registry as JSON
   */
  exportJSON(): string {
    return JSON.stringify({
      skills: Array.from(this.skills.entries()).map(([name, metadata]) => ({
        name,
        category: metadata.category,
        usageCount: metadata.usageCount,
        successCount: metadata.successCount,
        lastUsed: metadata.lastUsed
      })),
      stats: this.getStats()
    }, null, 2);
  }
}
