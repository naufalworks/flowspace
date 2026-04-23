/**
 * FlowSpace UI
 *
 * Browser-based UI for FlowSpace with recording controls and visualization.
 * Injects a floating control panel into the page.
 */

import type { FlowSpaceRuntime } from '@flowspace/runtime';

export interface UIConfig {
  /**
   * Position of the control panel
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

  /**
   * Whether to show CVL tokens in real-time
   */
  showCVL?: boolean;

  /**
   * Whether to show pattern notifications
   */
  showPatternNotifications?: boolean;
}

export class FlowSpaceUI {
  private runtime: FlowSpaceRuntime;
  private config: UIConfig;
  private panel?: HTMLElement;
  private isRecording: boolean = false;

  constructor(runtime: FlowSpaceRuntime, config: UIConfig = {}) {
    this.runtime = runtime;
    this.config = {
      position: config.position ?? 'bottom-right',
      showCVL: config.showCVL ?? true,
      showPatternNotifications: config.showPatternNotifications ?? true
    };
  }

  /**
   * Inject UI into the page
   */
  async inject(): Promise<void> {
    // Create control panel
    this.panel = this.createPanel();
    document.body.appendChild(this.panel);

    console.log('✅ FlowSpace UI injected');
  }

  /**
   * Create the control panel HTML
   */
  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'flowspace-panel';
    panel.innerHTML = `
      <style>
        #flowspace-panel {
          position: fixed;
          ${this.getPositionStyles()}
          width: 300px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: white;
          z-index: 999999;
          backdrop-filter: blur(10px);
        }

        #flowspace-panel h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
          font-weight: 600;
        }

        #flowspace-panel button {
          width: 100%;
          padding: 12px;
          margin: 8px 0;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        #flowspace-panel button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        #flowspace-record-btn {
          background: #10b981;
          color: white;
        }

        #flowspace-record-btn.recording {
          background: #ef4444;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        #flowspace-stop-btn {
          background: #f59e0b;
          color: white;
        }

        #flowspace-stats {
          margin-top: 15px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 12px;
        }

        #flowspace-stats div {
          margin: 4px 0;
          display: flex;
          justify-content: space-between;
        }

        #flowspace-cvl-display {
          margin-top: 10px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          font-size: 11px;
          font-family: 'Courier New', monospace;
          max-height: 100px;
          overflow-y: auto;
        }

        #flowspace-minimize {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
        }

        #flowspace-panel.minimized {
          width: 60px;
          height: 60px;
          padding: 0;
          overflow: hidden;
        }

        #flowspace-panel.minimized #flowspace-content {
          display: none;
        }
      </style>

      <button id="flowspace-minimize">−</button>

      <div id="flowspace-content">
        <h3>🚀 FlowSpace</h3>

        <button id="flowspace-record-btn">
          ⏺ Start Recording
        </button>

        <button id="flowspace-stop-btn" style="display: none;">
          ⏹ Stop & Analyze
        </button>

        <div id="flowspace-stats">
          <div>
            <span>Mode:</span>
            <span id="flowspace-mode">Idle</span>
          </div>
          <div>
            <span>Actions:</span>
            <span id="flowspace-actions">0</span>
          </div>
          <div>
            <span>Patterns:</span>
            <span id="flowspace-patterns">0</span>
          </div>
          <div>
            <span>Skills:</span>
            <span id="flowspace-skills">0</span>
          </div>
        </div>

        ${this.config.showCVL ? '<div id="flowspace-cvl-display">CVL tokens will appear here...</div>' : ''}
      </div>
    `;

    // Add event listeners
    this.attachEventListeners(panel);

    return panel;
  }

  /**
   * Get position styles based on config
   */
  private getPositionStyles(): string {
    switch (this.config.position) {
      case 'top-right':
        return 'top: 20px; right: 20px;';
      case 'top-left':
        return 'top: 20px; left: 20px;';
      case 'bottom-left':
        return 'bottom: 20px; left: 20px;';
      case 'bottom-right':
      default:
        return 'bottom: 20px; right: 20px;';
    }
  }

  /**
   * Attach event listeners to buttons
   */
  private attachEventListeners(panel: HTMLElement): void {
    const recordBtn = panel.querySelector('#flowspace-record-btn') as HTMLButtonElement;
    const stopBtn = panel.querySelector('#flowspace-stop-btn') as HTMLButtonElement;
    const minimizeBtn = panel.querySelector('#flowspace-minimize') as HTMLButtonElement;

    recordBtn?.addEventListener('click', () => this.handleRecord());
    stopBtn?.addEventListener('click', () => this.handleStop());
    minimizeBtn?.addEventListener('click', () => this.toggleMinimize());
  }

  /**
   * Handle record button click
   */
  private async handleRecord(): Promise<void> {
    if (this.isRecording) return;

    await this.runtime.startRecording();
    this.isRecording = true;

    // Update UI
    const recordBtn = this.panel?.querySelector('#flowspace-record-btn') as HTMLButtonElement;
    const stopBtn = this.panel?.querySelector('#flowspace-stop-btn') as HTMLButtonElement;
    const modeSpan = this.panel?.querySelector('#flowspace-mode') as HTMLSpanElement;

    if (recordBtn) {
      recordBtn.style.display = 'none';
    }
    if (stopBtn) {
      stopBtn.style.display = 'block';
    }
    if (modeSpan) {
      modeSpan.textContent = 'Recording';
      modeSpan.style.color = '#ef4444';
    }

    // Start updating stats
    this.startStatsUpdate();
  }

  /**
   * Handle stop button click
   */
  private async handleStop(): Promise<void> {
    if (!this.isRecording) return;

    const result = await this.runtime.stopRecording();
    this.isRecording = false;

    // Update UI
    const recordBtn = this.panel?.querySelector('#flowspace-record-btn') as HTMLButtonElement;
    const stopBtn = this.panel?.querySelector('#flowspace-stop-btn') as HTMLButtonElement;
    const modeSpan = this.panel?.querySelector('#flowspace-mode') as HTMLSpanElement;

    if (recordBtn) {
      recordBtn.style.display = 'block';
    }
    if (stopBtn) {
      stopBtn.style.display = 'none';
    }
    if (modeSpan) {
      modeSpan.textContent = 'Idle';
      modeSpan.style.color = 'white';
    }

    // Show notification
    if (this.config.showPatternNotifications && result.suggestedSkills.length > 0) {
      this.showNotification(
        `✨ Generated ${result.suggestedSkills.length} skill(s): ${result.suggestedSkills.join(', ')}`
      );
    }

    // Update final stats
    this.updateStats();
  }

  /**
   * Toggle minimize/maximize
   */
  private toggleMinimize(): void {
    this.panel?.classList.toggle('minimized');
    const btn = this.panel?.querySelector('#flowspace-minimize') as HTMLButtonElement;
    if (btn) {
      btn.textContent = this.panel?.classList.contains('minimized') ? '+' : '−';
    }
  }

  /**
   * Start updating stats periodically
   */
  private startStatsUpdate(): void {
    const interval = setInterval(() => {
      if (!this.isRecording) {
        clearInterval(interval);
        return;
      }
      this.updateStats();
    }, 1000);
  }

  /**
   * Update statistics display
   */
  private updateStats(): void {
    const stats = this.runtime.getStats();

    const actionsSpan = this.panel?.querySelector('#flowspace-actions') as HTMLSpanElement;
    const patternsSpan = this.panel?.querySelector('#flowspace-patterns') as HTMLSpanElement;
    const skillsSpan = this.panel?.querySelector('#flowspace-skills') as HTMLSpanElement;

    if (actionsSpan) actionsSpan.textContent = stats.detector.totalActions.toString();
    if (patternsSpan) patternsSpan.textContent = stats.detector.totalPatterns.toString();
    if (skillsSpan) skillsSpan.textContent = stats.registry.totalSkills.toString();
  }

  /**
   * Show notification
   */
  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 1000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      animation: slideDown 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Remove UI from page
   */
  remove(): void {
    this.panel?.remove();
  }
}
