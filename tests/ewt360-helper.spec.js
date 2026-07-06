const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.join(__dirname, '..', 'main.user.js');

test.describe('EWT360 Helper Script', () => {
  let scriptContent;

  test.beforeAll(() => {
    scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8');
  });

  test('script file exists and is not empty', () => {
    expect(scriptContent).toBeTruthy();
    expect(scriptContent.length).toBeGreaterThan(100);
  });

  test('script has valid Tampermonkey metadata', () => {
    expect(scriptContent).toContain('// ==UserScript==');
    expect(scriptContent).toContain('// ==/UserScript==');
    expect(scriptContent).toContain('@name');
    expect(scriptContent).toContain('@version');
    expect(scriptContent).toContain('@match');
  });

  test('script targets correct URLs', () => {
    expect(scriptContent).toContain('teacher.ewt360.com');
    expect(scriptContent).toContain('web.ewt360.com');
  });

  test('GUI module is defined', () => {
    expect(scriptContent).toContain('const GUI = {');
    expect(scriptContent).toContain('GUI.init()');
  });

  test('AutoPlay module is defined', () => {
    expect(scriptContent).toContain('const AutoPlay = {');
    expect(scriptContent).toContain('AutoPlay.toggle');
  });

  test('AutoSkip module is defined', () => {
    expect(scriptContent).toContain('const AutoSkip = {');
    expect(scriptContent).toContain('AutoSkip.toggle');
  });

  test('AutoCheckPass module is defined', () => {
    expect(scriptContent).toContain('const AutoCheckPass = {');
    expect(scriptContent).toContain('AutoCheckPass.toggle');
  });

  test('SpeedControl module is defined', () => {
    expect(scriptContent).toContain('const SpeedControl = {');
    expect(scriptContent).toContain('SpeedControl.toggle');
  });

  test('ProgressLock module is defined', () => {
    expect(scriptContent).toContain('const ProgressLock = {');
    expect(scriptContent).toContain('ProgressLock.toggle');
  });

  test('ElementFinder module is defined', () => {
    expect(scriptContent).toContain('const ElementFinder = {');
  });

  test('no hardcoded obfuscated class names', () => {
    const obfuscatedPatterns = [
      'listCon-zrsBh',
      'item-blpma',
      'active-EI2Hl',
      'finished-PsNX9',
      'btn-DOCWn',
      'progress-img-vkUYM'
    ];
    for (const pattern of obfuscatedPatterns) {
      expect(scriptContent).not.toContain(pattern);
    }
  });
});

test.describe('EWT360 Page Navigation', () => {
  test('can load EWT360 login page', async ({ page }) => {
    await page.goto('https://www.ewt360.com', { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    expect(title).toContain('升学e网通');
  });
});
