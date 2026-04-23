/**
 * PatternDetector
 *
 * Analyzes recorded action sequences to detect repeated patterns.
 * This is the intelligence that decides when to suggest generating a skill.
 */

import type { RecordedAction, Pattern } from '@flowspace/core';

export interface PatternDetectorConfig {
  /**
   * Minimum frequency to consider a pattern (how many times it appears)
   */
  minFrequency?: number;

  /**
   * Minimum sequence length (number of actions)
   */
  minSequenceLength?: number;

  /**
   * Maximum sequence length
   */
  maxSequenceLength?: number;

  /**
   * Minimum confidence to suggest skill generation (0-1)
   */
  minConfidence?: number;
}

export interface DetectedPattern {
  id: string;
  name: string;
  cvlSequence: string[];
  actions: RecordedAction[];
  frequency: number;
  confidence: number;
  successRate: number;
  suggestSkill: boolean;
}

export class PatternDetector {
  private config: PatternDetectorConfig;
  private patterns: Map<string, DetectedPattern> = new Map();
  private actionHistory: RecordedAction[] = [];

  constructor(config: PatternDetectorConfig = {}) {
    this.config = {
      minFrequency: config.minFrequency ?? 2,
      minSequenceLength: config.minSequenceLength ?? 2,
      maxSequenceLength: config.maxSequenceLength ?? 10,
      minConfidence: config.minConfidence ?? 0.8
    };
  }

  /**
   * Add actions to history and detect patterns
   */
  addActions(actions: RecordedAction[]): DetectedPattern[] {
    this.actionHistory.push(...actions);

    // Detect patterns in the updated history
    return this.detectPatterns();
  }

  /**
   * Detect patterns in action history
   */
  detectPatterns(): DetectedPattern[] {
    const newPatterns: DetectedPattern[] = [];

    // Try different sequence lengths
    for (let length = this.config.minSequenceLength!; length <= this.config.maxSequenceLength!; length++) {
      const sequences = this.extractSequences(length);

      // Count frequency of each sequence
      const frequencyMap = new Map<string, RecordedAction[][]>();

      for (const seq of sequences) {
        const key = this.sequenceToKey(seq);
        if (!frequencyMap.has(key)) {
          frequencyMap.set(key, []);
        }
        frequencyMap.get(key)!.push(seq);
      }

      // Find patterns that meet frequency threshold
      for (const [key, occurrences] of frequencyMap.entries()) {
        if (occurrences.length >= this.config.minFrequency!) {
          const pattern = this.createPattern(occurrences);

          if (pattern.confidence >= this.config.minConfidence!) {
            this.patterns.set(pattern.id, pattern);
            newPatterns.push(pattern);
          }
        }
      }
    }

    return newPatterns;
  }

  /**
   * Extract all sequences of a given length from action history
   */
  private extractSequences(length: number): RecordedAction[][] {
    const sequences: RecordedAction[][] = [];

    for (let i = 0; i <= this.actionHistory.length - length; i++) {
      sequences.push(this.actionHistory.slice(i, i + length));
    }

    return sequences;
  }

  /**
   * Convert sequence to a unique key (based on CVL tokens)
   */
  private sequenceToKey(sequence: RecordedAction[]): string {
    return sequence.map(action => action.cvl).join(' | ');
  }

  /**
   * Create a pattern from multiple occurrences
   */
  private createPattern(occurrences: RecordedAction[][]): DetectedPattern {
    const firstOccurrence = occurrences[0];
    const cvlSequence = firstOccurrence.map(action => action.cvl);

    // Generate pattern name from labels
    const labels = firstOccurrence.map(action => action.label);
    const name = this.generatePatternName(labels);

    // Calculate confidence based on consistency
    const confidence = this.calculateConfidence(occurrences);

    // Suggest skill if confidence is high and frequency is good
    const suggestSkill = confidence >= this.config.minConfidence! &&
                         occurrences.length >= 3;

    return {
      id: this.generatePatternId(cvlSequence),
      name,
      cvlSequence,
      actions: firstOccurrence,
      frequency: occurrences.length,
      confidence,
      successRate: 1.0, // Default to 100% - will be updated with actual execution data
      suggestSkill
    };
  }

  /**
   * Generate a human-readable pattern name
   */
  private generatePatternName(labels: string[]): string {
    // Common patterns
    if (labels.includes('login-button') || labels.includes('username-input')) {
      return 'login-flow';
    }
    if (labels.includes('signup-button')) {
      return 'signup-flow';
    }
    if (labels.includes('search-input') && labels.includes('submit-button')) {
      return 'search-flow';
    }
    if (labels.includes('cart') || labels.includes('checkout')) {
      return 'checkout-flow';
    }

    // Generic name
    return labels.join('-').replace(/-(button|input)$/g, '') + '-flow';
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(cvlSequence: string[]): string {
    const hash = cvlSequence.join('|').split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    return `pattern_${Math.abs(hash)}`;
  }

  /**
   * Calculate confidence based on consistency across occurrences
   */
  private calculateConfidence(occurrences: RecordedAction[][]): number {
    if (occurrences.length === 0) return 0;

    // Check CVL consistency
    const firstCVL = occurrences[0].map(a => a.cvl);
    let consistentCount = 0;

    for (const occurrence of occurrences) {
      const cvl = occurrence.map(a => a.cvl);
      if (JSON.stringify(cvl) === JSON.stringify(firstCVL)) {
        consistentCount++;
      }
    }

    const cvlConsistency = consistentCount / occurrences.length;

    // Check label consistency
    const firstLabels = occurrences[0].map(a => a.label);
    let labelConsistentCount = 0;

    for (const occurrence of occurrences) {
      const labels = occurrence.map(a => a.label);
      if (JSON.stringify(labels) === JSON.stringify(firstLabels)) {
        labelConsistentCount++;
      }
    }

    const labelConsistency = labelConsistentCount / occurrences.length;

    // Weighted average (CVL is more important)
    return (cvlConsistency * 0.7) + (labelConsistency * 0.3);
  }

  /**
   * Get all detected patterns
   */
  getPatterns(): DetectedPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get patterns that should trigger skill generation
   */
  getSuggestedPatterns(): DetectedPattern[] {
    return this.getPatterns().filter(p => p.suggestSkill);
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): DetectedPattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Clear all patterns and history
   */
  clear(): void {
    this.patterns.clear();
    this.actionHistory = [];
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalActions: number;
    totalPatterns: number;
    suggestedPatterns: number;
    avgConfidence: number;
  } {
    const patterns = this.getPatterns();
    const avgConfidence = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      : 0;

    return {
      totalActions: this.actionHistory.length,
      totalPatterns: patterns.length,
      suggestedPatterns: this.getSuggestedPatterns().length,
      avgConfidence
    };
  }

  /**
   * Export patterns as JSON
   */
  exportJSON(): string {
    return JSON.stringify({
      patterns: Array.from(this.patterns.values()),
      stats: this.getStats()
    }, null, 2);
  }
}
