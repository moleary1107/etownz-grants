import { watch } from 'chokidar';
import { logger } from './logger';

export interface FileWatcherOptions {
  paths: string[];
  ignored?: string[];
  persistent?: boolean;
}

export class FileWatcher {
  private watcher: any;

  constructor(private options: FileWatcherOptions) {}

  start(onChange: (path: string, event: string) => void): void {
    logger.info('Starting file watcher', { paths: this.options.paths });
    
    this.watcher = watch(this.options.paths, {
      ignored: this.options.ignored || ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      persistent: this.options.persistent !== false,
      ignoreInitial: true
    });

    this.watcher
      .on('add', (path: string) => onChange(path, 'add'))
      .on('change', (path: string) => onChange(path, 'change'))
      .on('unlink', (path: string) => onChange(path, 'unlink'))
      .on('error', (error: Error) => logger.error('File watcher error', error));
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      logger.info('File watcher stopped');
    }
  }
}

export function setupFileWatcher(paths: string[], onChange: (path: string, event: string) => void): FileWatcher {
  const watcher = new FileWatcher({ paths });
  watcher.start(onChange);
  return watcher;
}