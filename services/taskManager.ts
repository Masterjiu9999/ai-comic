import { TaskPayload, TaskStatus, TaskType } from '../types';

// Rate Limit to avoid Gemini API 429 errors
const MAX_CONCURRENT_TASKS = 3;

class TaskManager {
  private queue: TaskPayload[] = [];
  private listeners: (() => void)[] = [];
  private activeCount: number = 0;

  // Add a task to the queue
  addTask(type: TaskType, description: string, execute: () => Promise<any>, onComplete?: (result: any) => void) {
    const newTask: TaskPayload = {
      id: crypto.randomUUID(),
      type,
      description,
      status: 'pending',
      execute,
      onComplete
    };
    
    this.queue.push(newTask);
    this.notify();
    this.processQueue();
  }

  // Main processing loop
  private async processQueue() {
    if (this.activeCount >= MAX_CONCURRENT_TASKS) return;

    const nextTask = this.queue.find(t => t.status === 'pending');
    if (!nextTask) return;

    this.activeCount++;
    nextTask.status = 'processing';
    this.notify();

    try {
      const result = await nextTask.execute();
      nextTask.status = 'completed';
      if (nextTask.onComplete) {
        nextTask.onComplete(result);
      }
    } catch (error: any) {
      console.error(`Task ${nextTask.id} failed:`, error);
      nextTask.status = 'failed';
      nextTask.error = error.message || "Unknown error";
    } finally {
      this.activeCount--;
      this.notify();
      // Try to process next task
      this.processQueue();
    }
  }

  cancelAll() {
    // Clear pending tasks
    this.queue = this.queue.filter(t => t.status === 'processing' || t.status === 'completed' || t.status === 'failed');
    this.notify();
  }

  getTasks() {
    return this.queue;
  }

  getActiveCount() {
    return this.activeCount;
  }

  // cleanup completed tasks periodically (could be added)
  clearCompleted() {
    this.queue = this.queue.filter(t => t.status !== 'completed' && t.status !== 'failed');
    this.notify();
  }

  // Observer pattern for React
  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const taskManager = new TaskManager();