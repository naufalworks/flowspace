/**
 * @flowspace/core
 *
 * Core components - Morpheus and FlowMind integration
 *
 * For now, we'll use the existing repos as dependencies
 * and build new FlowSpace-specific components on top.
 */

// Re-export from morpheus and flowmind repos (as dependencies)
// This will be updated once we properly migrate the code

export const version = '0.1.0';

// Placeholder exports - will be implemented in new packages
export interface RecordedAction {
  type: 'click' | 'fill' | 'navigate' | 'select';
  cvl: string;
  label: string;
  timestamp: number;
  element?: {
    tag: string;
    text: string;
    selector: string;
  };
}

export interface Pattern {
  id: string;
  name: string;
  cvlSequence: string[];
  frequency: number;
  successRate: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  pattern: Pattern;
  code: string;
  createdAt: number;
}
