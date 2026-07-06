/**
 * GUI 界面模块
 */

import { DebugLogger } from '../utils/DebugLogger';
import { PlayMode } from '../modules/AutoPlay';
import { AutoPlay } from '../modules/AutoPlay';
import { AutoSkip } from '../modules/AutoSkip';
import { AutoCheckPass } from '../modules/AutoCheckPass';
import { SpeedControl } from '../modules/SpeedControl';
import { ProgressLock } from '../modules/ProgressLock';

export interface GUIState {
  autoSkip: boolean;
  autoPlay: boolean;
  autoCheckPass: boolean;
  speedControl: boolean;
  lockProgress: boolean;
  courseBrushMode: boolean;
  hasShownGuide: boolean;
  playMode: PlayMode;
}

const DEFAULT_STATE: GUIState = {
  autoSkip: false,
  autoPlay: false,
  autoCheckPass: false,
  speedControl: false,
  lockProgress: false,
  courseBrushMode: false,
  hasShownGuide: false,
  playMode: PlayMode.PROGRESS_85
};

export class GUI {
  private isMenuOpen: boolean = false;
  private state: GUIState;
  private guideOverlay: HTMLElement | null = null;

  // 模块引用
  private autoPlay: AutoPlay;
  private autoSkip: AutoSkip;
  private autoCheckPass: AutoCheckPass;
  private speedControl: SpeedControl;
  private progressLock: ProgressLock;

  constructor(
    autoPlay: AutoPlay,
    autoSkip: AutoSkip,
    autoCheckPass: AutoCheckPass,
    speedControl: SpeedControl,
    progressLock: ProgressLock
  ) {
    this.autoPlay = autoPlay;
    this.autoSkip = autoSkip;
    this.autoCheckPass = autoCheckPass;
    this.speedControl = speedControl;
    this.progressLock = progressLock;
    this.state = { ...DEFAULT_STATE };
  }

  init(): void {
    this.loadConfig();
    this.createStyles();
    this.createMenuButton();
    this.createMenuPanel();
    this.restoreModuleStates();
    this.createGuideOverlay();
    this.autoPlay.setMode(this.state.playMode);
    DebugLogger.log('GUI', '界面初始化完成');
  }

  private loadConfig(): void {
    try {
      const config = localStorage.getItem('ewt_helper_config');
      if (config) {
        this.state = { ...this.state, ...JSON.parse(config) };
      }
    } catch (e) {}
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('ewt_helper_config', JSON.stringify(this.state));
    } catch (e) {}
  }

  private restoreModuleStates(): void {
    if (this.state.courseBrushMode) {
      this.enableCourseBrushMode();
      return;
    }
    if (this.state.autoSkip) this.autoSkip.toggle(true);
    if (this.state.autoPlay) this.autoPlay.toggle(true);
    if (this.state.autoCheckPass) this.autoCheckPass.toggle(true);
    if (this.state.speedControl) this.speedControl.toggle(true);
    if (this.state.lockProgress) this.progressLock.toggle(true);
  }

  private createStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .ewt-helper-container{position:fixed;bottom:20px;right:20px;z-index:99999;font-family:Arial,sans-serif;}
      .ewt-menu-button{width:50px;height:50px;border-radius:50%;background:#4CAF50;color:white;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 8px rgba(0,0,0,0.2);transition:all .3s;}
      .ewt-menu-button:hover{background:#45a049;transform:scale(1.05);}
      .ewt-menu-panel{position:absolute;bottom:60px;right:0;width:280px;background:white;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:15px;display:none;flex-direction:column;gap:10px;}
      .ewt-menu-panel.open{display:flex;}
      .ewt-menu-title{font-size:18px;font-weight:bold;color:#333;margin-bottom:10px;text-align:center;padding-bottom:5px;border-bottom:1px solid #eee;}
      .ewt-toggle-item{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f5f5f5;}
      .ewt-toggle-label{font-size:14px;color:#555;}
      .ewt-toggle-label.brush-mode{color:#2196F3;font-weight:bold;}
      .ewt-playmode-group{padding:8px 0;border-bottom:1px solid #f5f5f5;}
      .ewt-playmode-title{font-size:14px;color:#555;margin-bottom:8px;}
      .ewt-playmode-buttons{display:flex;gap:8px;}
      .ewt-playmode-btn{flex:1;padding:6px 0;border-radius:4px;border:1px solid #ddd;background:#fff;color:#555;cursor:pointer;text-align:center;font-size:13px;transition:all .2s;}
      .ewt-playmode-btn.active{background:#4CAF50;color:white;border-color:#4CAF50;}
      .ewt-playmode-btn:hover{background:#f5f5f5;}
      .ewt-playmode-btn.active:hover{background:#45a049;}
      .ewt-switch{position:relative;display:inline-block;width:40px;height:24px;}
      .ewt-switch input{opacity:0;width:0;height:0;}
      .ewt-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#ccc;transition:.4s;border-radius:24px;}
      .ewt-slider:before{position:absolute;content:"";height:16px;width:16px;left:4px;bottom:4px;background:white;transition:.4s;border-radius:50%;}
      input:checked+.ewt-slider{background:#4CAF50;}
      input:checked+.ewt-slider:before{transform:translateX(16px);}
      .ewt-guide-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99998;display:flex;flex-direction:column;justify-content:center;align-items:center;}
      .ewt-guide-text{color:white;font-size:24px;font-weight:bold;margin-bottom:20px;text-align:center;line-height:1.5;}
      .ewt-guide-arrow{position:fixed;bottom:80px;right:80px;color:white;font-size:60px;font-weight:bold;animation:ewt-bounce 1.5s infinite;transform:rotate(45deg);}
      @keyframes ewt-bounce{0%,100%{transform:translate(0,0) rotate(45deg);}50%{transform:translate(15px,15px) rotate(45deg);}}
    `;
    document.head.appendChild(style);
  }

  private createMenuButton(): void {
    const oldContainer = document.querySelector('.ewt-helper-container');
    if (oldContainer) oldContainer.remove();

    const container = document.createElement('div');
    container.className = 'ewt-helper-container';

    const btn = document.createElement('button');
    btn.className = 'ewt-menu-button';
    btn.innerHTML = '📚';
    btn.onclick = () => this.toggleMenu();

    container.appendChild(btn);
    document.body.appendChild(container);
  }

  private createGuideOverlay(): void {
    if (this.state.hasShownGuide) return;

    const overlay = document.createElement('div');
    overlay.className = 'ewt-guide-overlay';

    const text = document.createElement('div');
    text.className = 'ewt-guide-text';
    text.innerHTML = '欢迎使用升学E网通助手！<br>请点击右下角绿色图标打开控制面板';

    const arrow = document.createElement('div');
    arrow.className = 'ewt-guide-arrow';
    arrow.textContent = '👉';

    overlay.appendChild(text);
    overlay.appendChild(arrow);
    document.body.appendChild(overlay);
    this.guideOverlay = overlay;
  }

  private createMenuPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'ewt-menu-panel';

    const title = document.createElement('div');
    title.className = 'ewt-menu-title';
    title.textContent = '升学E网通助手';

    panel.appendChild(title);
    panel.appendChild(this.createPlayModeGroup());
    panel.appendChild(this.createToggleItem('autoSkip', '自动跳题', v => this.autoSkip.toggle(v)));
    panel.appendChild(this.createToggleItem('autoPlay', '自动连播', v => this.autoPlay.toggle(v)));
    panel.appendChild(this.createToggleItem('autoCheckPass', '自动过检', v => this.autoCheckPass.toggle(v)));
    panel.appendChild(this.createToggleItem('speedControl', '2倍速播放', v => this.speedControl.toggle(v)));
    panel.appendChild(this.createToggleItem('lockProgress', '锁定进度条', v => this.progressLock.toggle(v)));
    panel.appendChild(this.createToggleItem('courseBrushMode', '刷课模式', v => {
      v ? this.enableCourseBrushMode() : this.disableCourseBrushMode();
    }, true));

    document.querySelector('.ewt-helper-container')?.appendChild(panel);
  }

  private createPlayModeGroup(): HTMLElement {
    const group = document.createElement('div');
    group.className = 'ewt-playmode-group';

    const title = document.createElement('div');
    title.className = 'ewt-playmode-title';
    title.textContent = '连播模式选择';
    group.appendChild(title);

    const buttons = document.createElement('div');
    buttons.className = 'ewt-playmode-buttons';

    const btn85 = document.createElement('button');
    btn85.className = `ewt-playmode-btn ${this.state.playMode === PlayMode.PROGRESS_85 ? 'active' : ''}`;
    btn85.textContent = '85%进度连播';
    btn85.onclick = () => {
      this.state.playMode = PlayMode.PROGRESS_85;
      this.autoPlay.setMode(PlayMode.PROGRESS_85);
      this.updatePlayModeButtons();
      this.saveConfig();
    };

    const btnFull = document.createElement('button');
    btnFull.className = `ewt-playmode-btn ${this.state.playMode === PlayMode.FULL_PLAY ? 'active' : ''}`;
    btnFull.textContent = '看完后连播';
    btnFull.onclick = () => {
      this.state.playMode = PlayMode.FULL_PLAY;
      this.autoPlay.setMode(PlayMode.FULL_PLAY);
      this.updatePlayModeButtons();
      this.saveConfig();
    };

    buttons.appendChild(btn85);
    buttons.appendChild(btnFull);
    group.appendChild(buttons);
    return group;
  }

  private updatePlayModeButtons(): void {
    const btns = document.querySelectorAll('.ewt-playmode-btn');
    btns.forEach(b => b.classList.remove('active'));
    if (this.state.playMode === PlayMode.PROGRESS_85) {
      btns[0]?.classList.add('active');
    } else {
      btns[1]?.classList.add('active');
    }
  }

  private createToggleItem(
    id: keyof GUIState,
    label: string,
    onChange: (value: boolean) => void,
    isBrush: boolean = false
  ): HTMLElement {
    const item = document.createElement('div');
    item.className = 'ewt-toggle-item';

    const lab = document.createElement('label');
    lab.className = `ewt-toggle-label ${isBrush ? 'brush-mode' : ''}`;
    lab.textContent = label;

    const sw = document.createElement('label');
    sw.className = 'ewt-switch';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `ewt-toggle-${id}`;
    input.checked = this.state[id] as boolean;

    const slider = document.createElement('span');
    slider.className = 'ewt-slider';

    sw.appendChild(input);
    sw.appendChild(slider);
    item.appendChild(lab);
    item.appendChild(sw);

    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      this.state[id as keyof GUIState] = target.checked as never;
      this.saveConfig();
      onChange(target.checked);
    };

    return item;
  }

  private toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    const panel = document.querySelector('.ewt-menu-panel');
    this.isMenuOpen ? panel?.classList.add('open') : panel?.classList.remove('open');

    if (this.isMenuOpen && this.guideOverlay) {
      this.guideOverlay.remove();
      this.guideOverlay = null;
      this.state.hasShownGuide = true;
      this.saveConfig();
    }
  }

  private enableCourseBrushMode(): void {
    this.setToggleState('autoSkip', true);
    this.setToggleState('autoPlay', true);
    this.setToggleState('autoCheckPass', true);
    this.setToggleState('speedControl', true);
    this.setToggleState('lockProgress', true);
    this.autoSkip.toggle(true);
    this.autoPlay.toggle(true);
    this.autoCheckPass.toggle(true);
    this.speedControl.toggle(true);
    this.progressLock.toggle(true);
    DebugLogger.log('GUI', '刷课模式已开启');
  }

  private disableCourseBrushMode(): void {
    this.setToggleState('autoSkip', false);
    this.setToggleState('autoPlay', false);
    this.setToggleState('autoCheckPass', false);
    this.setToggleState('speedControl', false);
    this.setToggleState('lockProgress', false);
    this.autoSkip.toggle(false);
    this.autoPlay.toggle(false);
    this.autoCheckPass.toggle(false);
    this.speedControl.toggle(false);
    this.progressLock.toggle(false);
    DebugLogger.log('GUI', '刷课模式已关闭');
  }

  private setToggleState(id: keyof GUIState, checked: boolean): void {
    this.state[id] = checked as never;
    this.saveConfig();
    const el = document.getElementById(`ewt-toggle-${id}`) as HTMLInputElement | null;
    if (el) el.checked = checked;
  }
}
