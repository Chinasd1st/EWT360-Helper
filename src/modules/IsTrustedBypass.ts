/**
 * isTrusted 绕过模块
 *
 * 劫持 EventTarget.prototype.addEventListener，
 * 对检测 isTrusted 的 click 事件监听器注入 Proxy，
 * 将 event.isTrusted 从 false 篡改为 true。
 */

import { DebugLogger } from '../utils/DebugLogger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener = EventListenerOrEventListenerObject | ((...args: any[]) => void);

const originalAddEventListener = EventTarget.prototype.addEventListener;
const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
const wrappedListenersMap = new WeakMap<Function, Function>();

let installed = false;

export function installIsTrustedBypass(): void {
  if (installed) return;

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: Listener | null,
    options?: boolean | AddEventListenerOptions
  ) {
    if (
      typeof listener !== 'function' ||
      type !== 'click' ||
      !String(listener).includes('isTrusted')
    ) {
      return originalAddEventListener.call(this, type, listener as EventListener, options);
    }

    DebugLogger.log('IsTrustedBypass', `劫持 click 监听器: ${String(listener).slice(0, 80)}...`);

    let wrappedListener = wrappedListenersMap.get(listener) as Function | undefined;
    if (!wrappedListener) {
      wrappedListener = function (this: EventTarget, event: Event) {
        if (event && typeof event === 'object' && 'isTrusted' in event) {
          const eventProxy = new Proxy(event, {
            get(target: Event, prop: string | symbol) {
              if (prop === 'isTrusted') {
                if (
                  target.isTrusted === false &&
                  (target.type === 'click' || target.type === 'submit' || target.type === 'change')
                ) {
                  DebugLogger.log('IsTrustedBypass', `篡改 ${target.type} isTrusted: false -> true`);
                  return true;
                }
                return target.isTrusted;
              }
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const value = (target as any)[prop];
              return typeof value === 'function' ? value.bind(target) : value;
            },
          });
          return (listener as Function).call(this, eventProxy);
        }
        return (listener as Function).call(this, event);
      };
      wrappedListenersMap.set(listener, wrappedListener);
      wrappedListenersMap.set(wrappedListener, listener);
    }

    return originalAddEventListener.call(this, type, wrappedListener as EventListener, options);
  };

  EventTarget.prototype.removeEventListener = function (
    type: string,
    listener: Listener | null,
    options?: boolean | EventListenerOptions
  ) {
    if (typeof listener === 'function') {
      const wrappedListener = wrappedListenersMap.get(listener);
      if (wrappedListener) {
        return originalRemoveEventListener.call(this, type, wrappedListener as EventListener, options);
      }
    }
    return originalRemoveEventListener.call(this, type, listener as EventListener, options);
  };

  installed = true;
  DebugLogger.log('IsTrustedBypass', 'addEventListener 劫持已启动');
}
