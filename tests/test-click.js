const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const ctx = browser.contexts()[0];
  const page = ctx.pages().find(p => p.url().includes('ewt360'));

  if (!page) {
    console.log('No EWT360 page found');
    process.exit(1);
  }

  console.log('URL:', page.url());

  // === Test 1: script-inject click (page context) ===
  console.log('\n=== Test 1: Script-inject click ===');
  const t1 = await page.evaluate(() => {
    return new Promise((resolve) => {
      const container = document.querySelector('[class*="listCon-"]');
      if (!container) return resolve('NO CONTAINER');
      
      const itemIdx = Array.from(container.children).findIndex(el => 
        (el.className || '').includes('active-')
      );
      if (itemIdx === -1) return resolve('NO ACTIVE ITEM');
      
      // Find next item
      const nextItem = container.children[itemIdx + 1];
      if (!nextItem) return resolve('NO NEXT ITEM');
      
      const before = document.querySelector('video')?.src?.substring(0, 80);
      
      // Inject script into page context
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          var items = document.querySelector('[class*="listCon-"]').children;
          var idx = ${itemIdx};
          var next = items[idx + 1];
          if (next) {
            // Try direct click
            next.click();
            // Also try dispatching native MouseEvent
            var evt = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
              isTrusted: false
            });
            next.dispatchEvent(evt);
          }
        })();
      `;
      document.head.appendChild(script);
      script.remove();
      
      setTimeout(() => {
        const after = document.querySelector('video')?.src?.substring(0, 80);
        resolve({ before, after, changed: before !== after });
      }, 2000);
    });
  });
  console.log('Test 1 result:', JSON.stringify(t1));

  // === Test 2: Intercept fetch/XHR ===
  console.log('\n=== Test 2: Intercept network requests ===');
  const t2 = await page.evaluate(() => {
    return new Promise((resolve) => {
      const requests = [];
      const origFetch = window.fetch;
      const origXHROpen = XMLHttpRequest.prototype.open;
      
      window.fetch = function(...args) {
        requests.push({ type: 'fetch', url: typeof args[0] === 'string' ? args[0] : args[0]?.url });
        return origFetch.apply(this, args);
      };
      
      XMLHttpRequest.prototype.open = function(...args) {
        requests.push({ type: 'xhr', method: args[0], url: args[1] });
        return origXHROpen.apply(this, args);
      };
      
      // Click manually
      const container = document.querySelector('[class*="listCon-"]');
      const itemIdx = Array.from(container.children).findIndex(el => 
        (el.className || '').includes('active-')
      );
      const nextItem = container.children[itemIdx + 1];
      
      if (nextItem) {
        nextItem.click();
      }
      
      setTimeout(() => {
        window.fetch = origFetch;
        XMLHttpRequest.prototype.open = origXHROpen;
        resolve(requests.filter(r => !r.url?.includes('beacon') && !r.url?.includes('log')));
      }, 3000);
    });
  });
  console.log('Test 2 network requests:', JSON.stringify(t2, null, 2));

  // === Test 3: Find webpackJsonp / chunk modules ===
  console.log('\n=== Test 3: Webpack internals ===');
  const t3 = await page.evaluate(() => {
    const results = {};
    
    // Try to find webpack module system
    if (window.webpackJsonp) {
      results.webpackJsonp = true;
      results.chunkCount = window.webpackJsonp.length;
    }
    if (window.webpackChunk) {
      results.webpackChunk = true;
    }
    
    // Try to find webpack require via IIFE hack
    let wpRequire = null;
    try {
      // Webpack stores modules in an internal cache
      const wpKeys = Object.keys(window).filter(k => 
        k.includes('webpack') || k.includes('__webpack')
      );
      results.webpackKeys = wpKeys;
    } catch(e) {}
    
    // Try to find React fiber root
    const rootEl = document.getElementById('root');
    if (rootEl) {
      const fiberKey = Object.keys(rootEl).find(k => 
        k.startsWith('__reactContainer') || k.startsWith('__reactInternalInstance')
      );
      results.reactFiberKey = fiberKey;
      
      if (fiberKey) {
        const fiber = rootEl[fiberKey];
        // Walk up to find the root
        let current = fiber;
        let depth = 0;
        while (current?.return && depth < 50) {
          current = current.return;
          depth++;
        }
        results.fiberRoot = current ? Object.keys(current).filter(k => !k.startsWith('__')).slice(0, 20) : null;
        results.fiberRootType = current?.type || current?.stateNode?.constructor?.name;
      }
    }
    
    return results;
  });
  console.log('Test 3 webpack:', JSON.stringify(t3, null, 2));

  // === Test 4: Check if video player is in an iframe ===
  console.log('\n=== Test 4: Check for iframes ===');
  const t4 = await page.evaluate(() => {
    const iframes = document.querySelectorAll('iframe');
    return Array.from(iframes).map(f => ({
      src: f.src?.substring(0, 100),
      id: f.id,
      className: f.className?.substring(0, 50),
      hasVideo: f.contentDocument?.querySelector('video') ? true : false
    }));
  });
  console.log('Test 4 iframes:', JSON.stringify(t4, null, 2));

  // === Test 5: Find the video player region ===
  console.log('\n=== Test 5: Video player structure ===');
  const t5 = await page.evaluate(() => {
    const region = document.querySelector('[aria-label="视频播放器"]');
    if (!region) return 'NO VIDEO PLAYER REGION';
    
    return {
      tagName: region.tagName,
      className: region.className?.substring(0, 100),
      parentClass: region.parentElement?.className?.substring(0, 100),
      hasReactHandlers: Object.keys(region).filter(k => k.startsWith('__react')).join(', '),
      childrenCount: region.children.length,
      innerHTML: region.innerHTML?.substring(0, 200)
    };
  });
  console.log('Test 5 player:', JSON.stringify(t5, null, 2));

  // === Test 6: Find ALL React event handlers on item elements ===
  console.log('\n=== Test 6: React event handlers on items ===');
  const t6 = await page.evaluate(() => {
    const container = document.querySelector('[class*="listCon-"]');
    if (!container) return 'NO CONTAINER';
    
    const items = Array.from(container.children).filter(el => 
      (el.className || '').includes('item')
    );
    
    // Check last few items for onClick
    const lastItems = items.slice(-3);
    return lastItems.map((item, i) => {
      const keys = Object.keys(item);
      const reactKey = keys.find(k => k.startsWith('__reactEventHandlers'));
      const internalKey = keys.find(k => k.startsWith('__reactInternalInstance'));
      
      const handlers = reactKey ? item[reactKey] : null;
      const handlerNames = handlers ? Object.keys(handlers) : [];
      
      // Try to find the onClick handler
      const onClick = handlers?.onClick;
      let onClickStr = null;
      if (onClick) {
        onClickStr = onClick.toString().substring(0, 200);
      }
      
      return {
        index: items.indexOf(item),
        className: item.className?.substring(0, 60),
        reactKey: reactKey?.substring(0, 30),
        internalKey: internalKey?.substring(0, 30),
        handlerNames,
        onClickStr,
        textContent: item.textContent?.substring(0, 30)
      };
    });
  });
  console.log('Test 6 handlers:', JSON.stringify(t6, null, 2));

})();
