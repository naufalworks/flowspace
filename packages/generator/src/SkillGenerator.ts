/**
 * SkillGenerator
 *
 * Generates SKILL.md files and JavaScript code from detected patterns.
 * This is the component that turns observed patterns into reusable automation.
 */

import type { Pattern, Skill } from '@flowspace/core';
import * as fs from 'fs';
import * as path from 'path';

export interface SkillGeneratorConfig {
  /**
   * Directory to store generated skills
   */
  skillsDirectory?: string;

  /**
   * Whether to generate JavaScript code
   */
  generateCode?: boolean;

  /**
   * Whether to include usage examples
   */
  includeExamples?: boolean;

  /**
   * Template style: 'simple' | 'detailed'
   */
  templateStyle?: 'simple' | 'detailed';
}

export interface GeneratedSkill {
  skill: Skill;
  markdown: string;
  code: string;
  filePath: string;
}

export class SkillGenerator {
  private config: SkillGeneratorConfig;

  constructor(config: SkillGeneratorConfig = {}) {
    this.config = {
      skillsDirectory: config.skillsDirectory ?? './skills/_learned',
      generateCode: config.generateCode ?? true,
      includeExamples: config.includeExamples ?? true,
      templateStyle: config.templateStyle ?? 'detailed'
    };

    // Ensure skills directory exists
    if (!fs.existsSync(this.config.skillsDirectory!)) {
      fs.mkdirSync(this.config.skillsDirectory!, { recursive: true });
    }
  }

  /**
   * Generate a skill from a detected pattern
   */
  async generateSkill(pattern: Pattern): Promise<GeneratedSkill> {
    const skill: Skill = {
      id: pattern.id,
      name: pattern.name,
      description: this.generateDescription(pattern),
      pattern,
      code: this.generateCode(pattern),
      createdAt: Date.now()
    };

    const markdown = this.generateMarkdown(skill);
    const filePath = path.join(this.config.skillsDirectory!, `${pattern.name}.md`);

    // Write SKILL.md file
    fs.writeFileSync(filePath, markdown);

    return {
      skill,
      markdown,
      code: skill.code,
      filePath
    };
  }

  /**
   * Generate multiple skills from patterns
   */
  async generateBatch(patterns: Pattern[]): Promise<GeneratedSkill[]> {
    const skills: GeneratedSkill[] = [];

    for (const pattern of patterns) {
      const skill = await this.generateSkill(pattern);
      skills.push(skill);
    }

    return skills;
  }

  /**
   * Generate human-readable description
   */
  private generateDescription(pattern: Pattern): string {
    const { name, cvlSequence, frequency } = pattern;

    // Pattern-specific descriptions
    if (name === 'login-flow') {
      return `Automates login process. Detected ${frequency} times with ${(pattern.successRate * 100).toFixed(0)}% success rate.`;
    }
    if (name === 'signup-flow') {
      return `Automates signup/registration process. Detected ${frequency} times.`;
    }
    if (name === 'search-flow') {
      return `Automates search functionality. Detected ${frequency} times.`;
    }
    if (name === 'checkout-flow') {
      return `Automates checkout process. Detected ${frequency} times.`;
    }

    // Generic description
    return `Automates ${name.replace(/-/g, ' ')}. Detected ${frequency} times across ${cvlSequence.length} steps.`;
  }

  /**
   * Generate JavaScript code for the skill
   */
  private generateCode(pattern: Pattern): string {
    const { name, cvlSequence } = pattern;

    const functionName = name.replace(/-/g, '_');
    const params = this.inferParameters(pattern);

    let code = `async function ${functionName}(${params.join(', ')}) {\n`;
    code += `  // Auto-generated from pattern: ${pattern.id}\n`;
    code += `  // CVL sequence: ${cvlSequence.join(' | ')}\n\n`;

    // Generate code for each step
    for (let i = 0; i < cvlSequence.length; i++) {
      const cvl = cvlSequence[i];
      const step = this.cvlToCode(cvl, i, params);
      code += `  ${step}\n`;
    }

    code += `}\n`;

    return code;
  }

  /**
   * Infer function parameters from pattern
   */
  private inferParameters(pattern: Pattern): string[] {
    const params: string[] = [];

    // Check CVL tokens for common patterns
    const cvlString = pattern.cvlSequence.join(' ');

    if (cvlString.includes('E.INP') && cvlString.includes('T.LOG')) {
      params.push('username', 'password');
    } else if (cvlString.includes('E.INP') && cvlString.includes('T.SRC')) {
      params.push('query');
    } else if (cvlString.includes('E.INP')) {
      params.push('value');
    }

    return params.length > 0 ? params : ['options'];
  }

  /**
   * Convert CVL token to executable code
   */
  private cvlToCode(cvl: string, index: number, params: string[]): string {
    // Parse CVL tokens
    const tokens = cvl.split(' ');

    // Determine action type
    if (tokens.includes('E.BTN') || tokens.includes('E.LNK')) {
      // Click action
      const label = this.inferLabel(tokens);
      return `await findByCVL('${cvl}').click(); // ${label}`;
    }

    if (tokens.includes('E.INP')) {
      // Fill action
      const paramName = params[Math.min(index, params.length - 1)] || 'value';
      const label = this.inferLabel(tokens);
      return `await findByCVL('${cvl}').fill(${paramName}); // ${label}`;
    }

    if (tokens.includes('E.SEL')) {
      // Select action
      const paramName = params[Math.min(index, params.length - 1)] || 'value';
      return `await findByCVL('${cvl}').selectOption(${paramName});`;
    }

    // Default
    return `await findByCVL('${cvl}').click();`;
  }

  /**
   * Infer human-readable label from CVL tokens
   */
  private inferLabel(tokens: string[]): string {
    if (tokens.includes('T.LOG')) return 'Login';
    if (tokens.includes('T.SIG')) return 'Signup';
    if (tokens.includes('T.SRC')) return 'Search';
    if (tokens.includes('T.SUB')) return 'Submit';
    if (tokens.includes('T.CLS')) return 'Close';
    if (tokens.includes('T.MNU')) return 'Menu';
    if (tokens.includes('T.CRT')) return 'Cart';
    return 'Action';
  }

  /**
   * Generate SKILL.md markdown
   */
  private generateMarkdown(skill: Skill): string {
    const { name, description, pattern, code, createdAt } = skill;

    let md = `# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\n`;
    md += `${description}\n\n`;
    md += `**Auto-generated:** ${new Date(createdAt).toISOString()}\n\n`;

    // Pattern details
    if (this.config.templateStyle === 'detailed') {
      md += `## Pattern Details\n\n`;
      md += `- **Frequency:** ${pattern.frequency} occurrences\n`;
      md += `- **Success Rate:** ${(pattern.successRate * 100).toFixed(0)}%\n`;
      md += `- **Steps:** ${pattern.cvlSequence.length}\n`;
      md += `- **CVL Sequence:**\n`;
      pattern.cvlSequence.forEach((cvl, i) => {
        md += `  ${i + 1}. \`${cvl}\`\n`;
      });
      md += `\n`;
    }

    // Usage
    md += `## Usage\n\n`;
    md += `\`\`\`javascript\n`;
    md += `await flowspace.executeSkill('${name}', {\n`;

    const params = this.inferParameters(pattern);
    params.forEach(param => {
      md += `  ${param}: 'your-${param}',\n`;
    });

    md += `});\n`;
    md += `\`\`\`\n\n`;

    // Implementation
    if (this.config.generateCode) {
      md += `## Implementation\n\n`;
      md += `\`\`\`javascript\n`;
      md += code;
      md += `\`\`\`\n\n`;
    }

    // Examples
    if (this.config.includeExamples) {
      md += `## Examples\n\n`;
      md += this.generateExamples(skill);
    }

    // Footer
    md += `---\n\n`;
    md += `🤖 Generated by [FlowSpace](https://github.com/naufalworks/flowspace)\n`;

    return md;
  }

  /**
   * Generate usage examples
   */
  private generateExamples(skill: Skill): string {
    const { name } = skill;

    if (name === 'login-flow') {
      return `\`\`\`javascript
// Example 1: Login to GitHub
await flowspace.executeSkill('login-flow', {
  username: 'user@example.com',
  password: 'secret123'
});

// Example 2: Login to Twitter
await flowspace.executeSkill('login-flow', {
  username: 'myusername',
  password: 'mypassword'
});
\`\`\`\n\n`;
    }

    if (name === 'search-flow') {
      return `\`\`\`javascript
// Example: Search on any site
await flowspace.executeSkill('search-flow', {
  query: 'machine learning'
});
\`\`\`\n\n`;
    }

    return `\`\`\`javascript
// Example usage
await flowspace.executeSkill('${name}', {
  // Add parameters here
});
\`\`\`\n\n`;
  }

  /**
   * List all generated skills
   */
  listSkills(): string[] {
    if (!fs.existsSync(this.config.skillsDirectory!)) {
      return [];
    }

    return fs.readdirSync(this.config.skillsDirectory!)
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace('.md', ''));
  }

  /**
   * Delete a skill
   */
  deleteSkill(skillName: string): boolean {
    const filePath = path.join(this.config.skillsDirectory!, `${skillName}.md`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }

    return false;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSkills: number;
    skillsDirectory: string;
  } {
    return {
      totalSkills: this.listSkills().length,
      skillsDirectory: this.config.skillsDirectory!
    };
  }
}
