/**
 * ActionRecorder
 *
 * Records user actions in the browser and converts them to CVL tokens.
 * This is the core component that enables "watch once, automate everywhere".
 */

import type { Page } from 'playwright';
import type { RecordedAction } from '@flowspace/core';

export interface ActionRecorderConfig {
  /**
   * Whether to record all actions or only specific types
   */
  recordAll?: boolean;

  /**
   * Action types to record (if recordAll is false)
   */
  actionTypes?: ('click' | 'fill' | 'navigate' | 'select')[];

  /**
   * Whether to generate CVL tokens immediately
   */
  generateCVL?: boolean;

  /**
   * Whether to classify elements with Morpheus
   */
  classifyElements?: boolean;
}

export class ActionRecorder {
  private page: Page;
  private config: ActionRecorderConfig;
  private actions: RecordedAction[] = [];
  private isRecording: boolean = false;
  private listeners: Map<string, Function> = new Map();

  constructor(page: Page, config: ActionRecorderConfig = {}) {
    this.page = page;
    this.config = {
      recordAll: config.recordAll ?? true,
      actionTypes: config.actionTypes ?? ['click', 'fill', 'navigate', 'select'],
      generateCVL: config.generateCVL ?? true,
      classifyElements: config.classifyElements ?? true
    };
  }

  /**
   * Start recording user actions
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    this.isRecording = true;
    this.actions = [];

    // Inject recording script into page
    await this.page.addInitScript(() => {
      // Helper function to generate CSS selector
      function generateSelector(element: HTMLElement): string {
        if (element.id) return `#${element.id}`;

        const path: string[] = [];
        let current: HTMLElement | null = element;

        while (current && current.tagName) {
          let selector = current.tagName.toLowerCase();

          if (current.className) {
            selector += '.' + Array.from(current.classList).join('.');
          }

          path.unshift(selector);
          current = current.parentElement;

          if (path.length > 3) break; // Limit depth
        }

        return path.join(' > ');
      }

      // Track clicks
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        (window as any).__flowspace_actions = (window as any).__flowspace_actions || [];
        (window as any).__flowspace_actions.push({
          type: 'click',
          timestamp: Date.now(),
          element: {
            tag: target.tagName.toLowerCase(),
            text: target.textContent?.trim().slice(0, 100) || '',
            selector: generateSelector(target),
            classes: Array.from(target.classList),
            id: target.id
          }
        });
      }, true);

      // Track input changes
      document.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        (window as any).__flowspace_actions = (window as any).__flowspace_actions || [];
        (window as any).__flowspace_actions.push({
          type: 'fill',
          timestamp: Date.now(),
          value: target.value,
          element: {
            tag: target.tagName.toLowerCase(),
            text: target.placeholder || target.name || '',
            selector: generateSelector(target),
            type: target.type,
            name: target.name
          }
        });
      }, true);

      // Track select changes
      document.addEventListener('change', (event) => {
        const target = event.target as HTMLSelectElement;
        if (target.tagName.toLowerCase() === 'select') {
          (window as any).__flowspace_actions = (window as any).__flowspace_actions || [];
          (window as any).__flowspace_actions.push({
            type: 'select',
            timestamp: Date.now(),
            value: target.value,
            element: {
              tag: target.tagName.toLowerCase(),
              text: target.options[target.selectedIndex]?.text || '',
              selector: generateSelector(target),
              name: target.name
            }
          });
        }
      }, true);
    });

    console.log('✅ ActionRecorder started');
  }

  /**
   * Stop recording and return captured actions
   */
  async stopRecording(): Promise<RecordedAction[]> {
    if (!this.isRecording) {
      throw new Error('Not recording');
    }

    // Retrieve actions from page
    const pageActions = await this.page.evaluate(() => {
      return (window as any).__flowspace_actions || [];
    });

    // Process actions: generate CVL, classify elements
    for (const action of pageActions) {
      const recordedAction: RecordedAction = {
        type: action.type,
        cvl: this.config.generateCVL ? await this.generateCVL(action) : '',
        label: this.config.classifyElements ? await this.classifyElement(action) : 'unknown',
        timestamp: action.timestamp,
        element: action.element
      };

      this.actions.push(recordedAction);
    }

    this.isRecording = false;
    console.log(`✅ ActionRecorder stopped. Recorded ${this.actions.length} actions`);

    return this.actions;
  }

  /**
   * Get currently recorded actions (without stopping)
   */
  getActions(): RecordedAction[] {
    return [...this.actions];
  }

  /**
   * Clear recorded actions
   */
  clearActions(): void {
    this.actions = [];
  }

  /**
   * Generate CVL tokens for an action
   * TODO: Integrate with Morpheus CVLEncoder
   */
  private async generateCVL(action: any): Promise<string> {
    // Placeholder - will integrate with Morpheus
    const element = action.element;
    const tokens: string[] = [];

    // Element type
    if (element.tag === 'button') tokens.push('E.BTN');
    else if (element.tag === 'input') tokens.push('E.INP');
    else if (element.tag === 'a') tokens.push('E.LNK');
    else if (element.tag === 'select') tokens.push('E.SEL');

    // Text content hints
    const text = element.text.toLowerCase();
    if (text.includes('login')) tokens.push('T.LOG');
    else if (text.includes('sign')) tokens.push('T.SIG');
    else if (text.includes('search')) tokens.push('T.SRC');
    else if (text.includes('submit')) tokens.push('T.SUB');
    else if (text.includes('close')) tokens.push('T.CLS');

    // Action type
    if (action.type === 'click') tokens.push('A.CLK');
    else if (action.type === 'fill') tokens.push('A.FIL');
    else if (action.type === 'select') tokens.push('A.SEL');

    return tokens.join(' ');
  }

  /**
   * Classify element using Morpheus
   * TODO: Integrate with Morpheus classifier
   */
  private async classifyElement(action: any): Promise<string> {
    // Placeholder - will integrate with Morpheus
    const cvl = await this.generateCVL(action);

    // Simple heuristic classification for now
    if (cvl.includes('T.LOG')) return 'login-button';
    if (cvl.includes('T.SIG')) return 'signup-button';
    if (cvl.includes('T.SRC')) return 'search-input';
    if (cvl.includes('T.SUB')) return 'submit-button';
    if (cvl.includes('T.CLS')) return 'close-button';

    return 'unknown';
  }

  /**
   * Export actions as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.actions, null, 2);
  }

  /**
   * Import actions from JSON
   */
  importJSON(json: string): void {
    this.actions = JSON.parse(json);
  }
}
