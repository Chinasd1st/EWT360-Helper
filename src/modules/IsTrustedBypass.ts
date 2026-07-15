/**
 * isTrusted 绕过模块
 *
 * 劫持 EventTarget.prototype.addEventListener，
 * 对检测 isTrusted 的事件监听器注入 Proxy，
 * 将 event.isTrusted 从 false 篡改为 true。
 */

import { DebugLogger } from '../utils/DebugLogger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener = EventListenerOrEventListenerObject | ((...args: any[]) => void);

const originalAddEventListener = EventTarget.prototype.addEventListener;
const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

// 存储原始监听器 -> 包装后监听器的映射
const originalToWrapped = new WeakMap<Function, Function>();
// 存储包装后监听器 -> 原始监听器的映射
const wrappedToOriginal = new WeakMap<Function, Function>();

// 需要劫持的事件类型
const HIJACK_EVENT_TYPES = new Set(['click', 'submit', 'change', 'mousedown', 'mouseup', 'pointerdown', 'pointerup']);

// 需要篡改 isTrusted 的事件类型（与 README 一致）
const TRUSTED_EVENT_TYPES = new Set(['click', 'submit', 'change']);

let installed = false;

/**
 * 检查监听器函数体是否可能检查 isTrusted
 * 使用多种启发式方法而非简单字符串匹配
 */
function mayCheckIsTrusted(listener: Function): boolean {
  // 方法1: 检查函数源码（覆盖常见情况）
  const fnStr = String(listener);
  if (fnStr.includes('isTrusted')) {
    return true;
  }

  // 方法2: 检查函数参数名（常见命名模式）
  // 如果函数只有一个参数，且函数体中使用了常见的 event 变量名
  if (fnStr.includes('.isTrusted')) {
    return true;
  }

  return false;
}

export function installIsTrustedBypass(): void {
  if (installed) return;

  EventTarget.prototype.addEventListener = function (
    type: string,
    listener: Listener | null,
    options?: boolean | AddEventListenerOptions
  ) {
    // 只处理函数类型的监听器和需要劫持的事件类型
    if (
      typeof listener !== 'function' ||
      !HIJACK_EVENT_TYPES.has(type)
    ) {
      return originalAddEventListener.call(this, type, listener as EventListener, options);
    }

    // 检查是否已经被包装过
    if (originalToWrapped.has(listener)) {
      return originalAddEventListener.call(this, type, originalToWrapped.get(listener) as EventListener, options);
    }

    // 检查监听器是否可能检查 isTrusted
    if (!mayCheckIsTrusted(listener)) {
      return originalAddEventListener.call(this, type, listener as EventListener, options);
    }

    DebugLogger.log('IsTrustedBypass', `劫持 ${type} 监听器 (${String(listener).length} chars): ${String(listener).slice(0, 120)}...`);

    // 创建包装后的监听器
    const wrappedListener = function (this: EventTarget, event: Event) {
      if (event && typeof event === 'object' && 'isTrusted' in event) {
        const eventProxy = new Proxy(event, {
          get(target: Event, prop: string | symbol) {
            if (prop === 'isTrusted') {
              // 只篡改需要的事件类型
              if (target.isTrusted === false && TRUSTED_EVENT_TYPES.has(target.type)) {
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

    // 存储映射关系
    originalToWrapped.set(listener, wrappedListener);
    wrappedToOriginal.set(wrappedListener, listener);

    return originalAddEventListener.call(this, type, wrappedListener as EventListener, options);
  };

  EventTarget.prototype.removeEventListener = function (
    type: string,
    listener: Listener | null,
    options?: boolean | EventListenerOptions
  ) {
    if (typeof listener === 'function') {
      // 尝试查找对应的包装监听器
      const wrappedListener = originalToWrapped.get(listener);
      if (wrappedListener) {
        // 清理映射
        originalToWrapped.delete(listener);
        wrappedToOriginal.delete(wrappedListener);
        return originalRemoveEventListener.call(this, type, wrappedListener as EventListener, options);
      }
    }
    return originalRemoveEventListener.call(this, type, listener as EventListener, options);
  };

  installed = true;
  DebugLogger.log('IsTrustedBypass', 'addEventListener 劫持已启动');
}
