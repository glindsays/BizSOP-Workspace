'use client';

import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export function TaskChecklist({ initialTasks }: { initialTasks: TaskItem[] }) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-green-600" /> Checklist Prosedur SOP
          </span>
          <span className="text-xs font-normal text-slate-500">
            {completedCount} dari {tasks.length} Selesai
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start space-x-3 p-2 hover:bg-slate-50 rounded-md transition-colors">
            <Checkbox
              id={task.id}
              checked={task.completed}
              onCheckedChange={() => toggleTask(task.id)}
              className="mt-0.5"
            />
            <label
              htmlFor={task.id}
              className={`text-sm cursor-pointer leading-tight ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}
            >
              {task.title || JSON.stringify(task)}
            </label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}