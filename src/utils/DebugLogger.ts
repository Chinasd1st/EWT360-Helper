/**
 * 调试日志工具
 */

export interface Logger {
  enabled: boolean;
  log(module: string, message: string, data?: unknown): void;
  warn(module: string, message: string, data?: unknown): void;
  error(module: string, message: string, error?: unknown): void;
  debug(module: string, message: string, data?: unknown): void;
}

function getTimestamp(): string {
  const now = new Date();
  return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}]`;
}

function formatMessage(module: string, message: string): string {
  return `${getTimestamp()} [${module}] ${message}`;
}

export const DebugLogger: Logger = {
  enabled: false,

  log(module: string, message: string, data?: unknown) {
    if (!this.enabled) return;
    const msg = formatMessage(module, `[INFO] ${message}`);
    data ? console.log(msg, data) : console.log(msg);
  },

  warn(module: string, message: string, data?: unknown) {
    if (!this.enabled) return;
    const msg = formatMessage(module, `[WARN] ${message}`);
    data ? console.warn(msg, data) : console.warn(msg);
  },

  error(module: string, message: string, error?: unknown) {
    if (!this.enabled) return;
    const msg = formatMessage(module, `[ERROR] ${message}`);
    error ? console.error(msg, error) : console.error(msg);
  },

  debug(module: string, message: string, data?: unknown) {
    if (!this.enabled) return;
    const msg = formatMessage(module, `[DEBUG] ${message}`);
    data ? console.debug(msg, data) : console.debug(msg);
  }
};
