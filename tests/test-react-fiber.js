/**
 * React Fiber Tree Traversal - Direct State Manipulation
 * 
 * This script finds the React component that manages video selection
 * and directly calls its setState setter to switch videos.
 * 
 * It runs in the browser console (via Browser MCP or Playwright).
 */

(function() {
  'use strict';

  const LOG_PREFIX = '[EWT360-AutoPlay]';
  const log = (...args) => console.log(LOG_PREFIX, ...args);
  const warn = (...args) => console.warn(LOG_PREFIX, ...args);
  const error = (...args) => console.error(LOG_PREFIX, ...args);

  // ========== Step 1: Find sidebar container ==========
  function findSidebarContainer() {
    // Try multiple selectors
    const selectors = [
      '[class*="listCon-"]',
      '[class*="lessonList"] [class*="list"]',
      '[class*="studentPlayer"] [class*="list"]',
      '[class*="listContainer"]'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.children.length > 0) {
        log('Found sidebar container:', sel, el.className?.substring(0, 60));
        return el;
      }
    }
    return null;
  }

  // ========== Step 2: Get React fiber from element ==========
  function getReactFiber(element) {
    const key = Object.keys(element).find(k => 
      k.startsWith('__reactInternalInstance') || k.startsWith('__reactFiber')
    );
    if (!key) return null;
    return element[key];
  }

  // ========== Step 3: Get React event handlers from element ==========
  function getReactEventHandlers(element) {
    const key = Object.keys(element).find(k => 
      k.startsWith('__reactEventHandlers')
    );
    if (!key) return null;
    return element[key];
  }

  // ========== Step 4: Walk fiber tree to find component with video state ==========
  function findVideoStateComponent(fiber) {
    let current = fiber;
    let depth = 0;
    const results = [];

    while (current && depth < 100) {
      // Check memoizedState (for hooks in function components)
      if (current.memoizedState) {
        let hook = current.memoizedState;
        let hookIndex = 0;
        
        while (hook) {
          const state = hook.memoizedState;
          
          // Check if this hook contains video/lesson data
          if (state && typeof state === 'object') {
            const stateStr = JSON.stringify(state, (key, value) => {
              if (typeof value === 'function') return '[Function]';
              if (value instanceof HTMLElement) return '[HTMLElement]';
              return value;
            }, 0);
            
            if (stateStr && (
              stateStr.includes('lessonId') || 
              stateStr.includes('videoList') ||
              stateStr.includes('currentVideo') ||
              stateStr.includes('activeLesson')
            )) {
              results.push({
                component: current.type?.name || current.type?.displayName || 'Anonymous',
                hookIndex,
                statePreview: stateStr.substring(0, 200),
                hasDispatch: typeof hook.queue?.dispatch === 'function',
                fiber: current
              });
            }
          }
          
          // Also check if state is an array of video items
          if (Array.isArray(state) && state.length > 0 && state[0]?.lessonId) {
            results.push({
              component: current.type?.name || current.type?.displayName || 'Anonymous',
              hookIndex,
              stateType: 'Array',
              firstItem: JSON.stringify(state[0]).substring(0, 200),
              length: state.length,
              hasDispatch: typeof hook.queue?.dispatch === 'function',
              fiber: current
            });
          }
          
          hook = hook.next;
          hookIndex++;
        }
      }

      // Check pendingProps for video-related data
      if (current.pendingProps) {
        const props = current.pendingProps;
        if (props.videoList || props.lessonList || props.videos) {
          results.push({
            component: current.type?.name || current.type?.displayName || 'Anonymous',
            propKeys: Object.keys(props),
            hasVideoList: !!props.videoList,
            videoListLength: props.videoList?.length,
            fiber: current
          });
        }
      }

      current = current.return;
      depth++;
    }

    return results;
  }

  // ========== Step 5: Find Redux store ==========
  function findReduxStore() {
    const appEl = document.getElementById('app');
    if (!appEl) {
      warn('No #app element found');
      return null;
    }

    const fiber = getReactFiber(appEl);
    if (!fiber) {
      warn('No React fiber found on #app');
      return null;
    }

    // Walk up to root
    let root = fiber;
    while (root.return) root = root.return;

    // Search for Provider with store
    function search(node, depth = 0) {
      if (depth > 50) return null;
      if (node?.memoizedProps?.store?.getState) {
        return node.memoizedProps.store;
      }
      let child = node?.child;
      while (child) {
        const result = search(child, depth + 1);
        if (result) return result;
        child = child.sibling;
      }
      return null;
    }

    return search(root);
  }

  // ========== Step 6: Analyze Redux state ==========
  function analyzeReduxState(store) {
    if (!store) return null;
    
    try {
      const state = store.getState();
      const stateKeys = Object.keys(state);
      
      log('Redux state keys:', stateKeys);
      
      // Look for video/lesson related state
      const videoRelated = {};
      for (const key of stateKeys) {
        const value = state[key];
        if (value && typeof value === 'object') {
          const str = JSON.stringify(value, (k, v) => {
            if (typeof v === 'function') return '[Function]';
            if (v instanceof HTMLElement) return '[HTMLElement]';
            return v;
          }, 0);
          
          if (str && (
            str.includes('lessonId') || 
            str.includes('videoList') ||
            str.includes('currentVideo') ||
            str.includes('activeLesson') ||
            str.includes('playerToken')
          )) {
            videoRelated[key] = str.substring(0, 300);
          }
        }
      }
      
      return { stateKeys, videoRelated };
    } catch (e) {
      error('Failed to analyze Redux state:', e);
      return null;
    }
  }

  // ========== Step 7: Try to switch video via React state ==========
  function trySwitchVideo(container, targetIndex) {
    const items = Array.from(container.children).filter(el => {
      const cls = el.className || '';
      return cls.includes('item') && !cls.includes('noMore');
    });
    
    if (targetIndex < 0 || targetIndex >= items.length) {
      error('Invalid target index:', targetIndex);
      return false;
    }
    
    const targetItem = items[targetIndex];
    log('Target item:', targetItem.className?.substring(0, 60), targetItem.textContent?.substring(0, 30));
    
    // Method 1: Try React event handlers onClick
    const handlers = getReactEventHandlers(targetItem);
    if (handlers?.onClick) {
      log('Found onClick handler, calling it...');
      try {
        // Create a minimal fake event
        const fakeEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
          nativeEvent: new MouseEvent('click'),
          target: targetItem,
          currentTarget: targetItem,
          type: 'click',
          isTrusted: false
        };
        handlers.onClick(fakeEvent);
        log('onClick called successfully');
        return true;
      } catch (e) {
        error('onClick failed:', e);
      }
    }
    
    // Method 2: Try fiber tree traversal to find setState
    const fiber = getReactFiber(targetItem);
    if (fiber) {
      log('Walking fiber tree to find video state...');
      const components = findVideoStateComponent(fiber);
      log('Found components with video state:', components.length);
      
      for (const comp of components) {
        log('Component:', comp.component, 'hookIndex:', comp.hookIndex);
        if (comp.fiber?.memoizedState) {
          let hook = comp.fiber.memoizedState;
          for (let i = 0; i < comp.hookIndex; i++) {
            if (hook) hook = hook.next;
          }
          
          if (hook?.queue?.dispatch) {
            log('Found dispatch function, calling it...');
            // We need to figure out what to dispatch
            // This depends on the state structure
            log('Current state:', JSON.stringify(hook.memoizedState)?.substring(0, 200));
          }
        }
      }
    }
    
    // Method 3: Script injection into page context
    log('Trying script injection approach...');
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        try {
          var container = document.querySelector('[class*="listCon-"]');
          if (!container) return;
          var items = Array.from(container.children).filter(function(el) {
            return (el.className || '').includes('item') && !(el.className || '').includes('noMore');
          });
          var target = items[${targetIndex}];
          if (target) {
            // Try native click
            target.click();
            // Try dispatching trusted-like event
            var evt = new PointerEvent('click', { bubbles: true, cancelable: true, view: window });
            target.dispatchEvent(evt);
            window.__ewt360_click_result = 'dispatched';
          }
        } catch(e) {
          window.__ewt360_click_result = 'error: ' + e.message;
        }
      })();
    `;
    document.head.appendChild(script);
    script.remove();
    
    return true;
  }

  // ========== Main diagnostic function ==========
  window.__ewt360_diagnose = function() {
    log('=== Starting Diagnosis ===');
    
    // 1. Find sidebar
    const container = findSidebarContainer();
    if (!container) {
      error('Sidebar not found!');
      return;
    }
    
    // 2. Count items
    const items = Array.from(container.children);
    const videoItems = items.filter(el => {
      const cls = el.className || '';
      return cls.includes('item') && !cls.includes('noMore');
    });
    log(`Found ${videoItems.length} video items (total children: ${items.length})`);
    
    // 3. Check first few items for React data
    videoItems.slice(0, 3).forEach((item, i) => {
      const fiber = getReactFiber(item);
      const handlers = getReactEventHandlers(item);
      log(`Item ${i}:`, {
        className: item.className?.substring(0, 60),
        text: item.textContent?.substring(0, 30),
        hasFiber: !!fiber,
        hasHandlers: !!handlers,
        handlerKeys: handlers ? Object.keys(handlers) : [],
        hasOnClick: !!handlers?.onClick,
        onClickStr: handlers?.onClick?.toString()?.substring(0, 100)
      });
      
      if (fiber) {
        const components = findVideoStateComponent(fiber);
        if (components.length > 0) {
          log(`  Video state components found:`, components.map(c => ({
            name: c.component,
            hookIndex: c.hookIndex,
            hasDispatch: c.hasDispatch
          })));
        }
      }
    });
    
    // 4. Check Redux store
    const store = findReduxStore();
    if (store) {
      log('Redux store found!');
      const analysis = analyzeReduxState(store);
      if (analysis) {
        log('Redux state keys:', analysis.stateKeys);
        log('Video-related state:', analysis.videoRelated);
      }
    } else {
      warn('Redux store not found via fiber tree');
    }
    
    // 5. Check URL
    log('Current URL:', window.location.href);
    log('Hash:', window.location.hash);
    
    // 6. Check for video element
    const video = document.querySelector('video');
    if (video) {
      log('Video element found:', {
        src: video.src?.substring(0, 80),
        currentTime: video.currentTime,
        duration: video.duration,
        paused: video.paused,
        ended: video.ended
      });
    }
    
    log('=== Diagnosis Complete ===');
  };

  // ========== Switch video function ==========
  window.__ewt360_switch = function(index) {
    const container = findSidebarContainer();
    if (!container) {
      error('Sidebar not found');
      return false;
    }
    return trySwitchVideo(container, index);
  };

  // ========== Auto-switch to next video ==========
  window.__ewt360_next = function() {
    const container = findSidebarContainer();
    if (!container) {
      error('Sidebar not found');
      return false;
    }
    
    const items = Array.from(container.children).filter(el => {
      const cls = el.className || '';
      return cls.includes('item') && !cls.includes('noMore');
    });
    
    // Find current active item
    let currentIdx = items.findIndex(el => {
      const cls = el.className || '';
      return cls.includes('active');
    });
    
    if (currentIdx === -1) {
      // Try URL
      const urlLessonId = window.location.hash.match(/lessonId=(\d+)/)?.[1];
      if (urlLessonId) {
        currentIdx = items.findIndex(el => {
          const m = (el.className || '').match(/item(\d+)/);
          return m && (urlLessonId.endsWith(m[1]) || m[1].endsWith(urlLessonId));
        });
      }
    }
    
    if (currentIdx === -1) {
      warn('Cannot find current active item, switching to index 1');
      currentIdx = 0;
    }
    
    const nextIdx = currentIdx + 1;
    if (nextIdx >= items.length) {
      log('Already at the end, no more videos');
      return false;
    }
    
    log(`Switching from item ${currentIdx} to ${nextIdx}`);
    return trySwitchVideo(container, nextIdx);
  };

  log('AutoPlay diagnostic functions loaded:');
  log('  __ewt360_diagnose() - Run full diagnosis');
  log('  __ewt360_switch(index) - Switch to specific video by index');
  log('  __ewt360_next() - Switch to next video');
  log('Run __ewt360_diagnose() first to understand the page structure.');

})();
