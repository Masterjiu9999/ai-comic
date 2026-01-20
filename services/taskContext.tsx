import React, { createContext, useContext, useState, useEffect } from 'react';
import { TaskContextType, TaskPayload, TaskType } from '../types';
import { taskManager } from './taskManager';

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTask = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<TaskPayload[]>([]);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    // Subscribe to task manager updates
    const unsubscribe = taskManager.subscribe(() => {
      setTasks([...taskManager.getTasks()]); // Force new array reference
      setActiveCount(taskManager.getActiveCount());
    });
    return unsubscribe;
  }, []);

  const addTask = (type: TaskType, description: string, execute: () => Promise<any>, onComplete?: (result: any) => void) => {
    taskManager.addTask(type, description, execute, onComplete);
  };

  const cancelAll = () => {
    taskManager.cancelAll();
  };

  return (
    <TaskContext.Provider value={{ tasks, addTask, cancelAll, activeCount }}>
      {children}
    </TaskContext.Provider>
  );
};