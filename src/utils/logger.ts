type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 10000;

  private format(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
  }

  info(message: string, data?: any): void {
    const entry = this.format('info', message, data);
    console.log(`[${entry.timestamp}] [INFO] ${message}`, data || '');
    this.store(entry);
  }

  warn(message: string, data?: any): void {
    const entry = this.format('warn', message, data);
    console.warn(`[${entry.timestamp}] [WARN] ${message}`, data || '');
    this.store(entry);
  }

  error(message: string, data?: any): void {
    const entry = this.format('error', message, data);
    console.error(`[${entry.timestamp}] [ERROR] ${message}`, data || '');
    this.store(entry);
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      const entry = this.format('debug', message, data);
      console.debug(`[${entry.timestamp}] [DEBUG] ${message}`, data || '');
      this.store(entry);
    }
  }

  private store(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export default new Logger();
