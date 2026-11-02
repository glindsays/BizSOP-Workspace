'use client';

import React, { useState } from 'react';
import { ListChecks, RotateCcw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChecklistStep } from '@/lib/api';
import { cn } from '@/lib/utils';

function loadDone(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

export function TaskChecklist({ steps, storageKey }: { steps: ChecklistStep[]; storageKey: string }) {
  const [done, setDone] = useState<string[]>(() => loadDone(storageKey));

  const save = (next: string[]) => {
    setDone(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const toggle = (id: string) =>
    save(done.includes(id) ? done.filter((d) => d !== id) : [...done, id]);

  const sorted = [...steps].sort((a, b) => a.step_number - b.step_number);
  const total = sorted.length;
  const count = sorted.filter((s) => done.includes(s.id)).length;
  const pct = total ? Math.round((count / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-emerald-600" /> Checklist Prosedur
          </span>
          {count > 0 && (
            <Button size="sm" variant="ghost" onClick={() => save([])} className="h-7 text-xs">
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
          )}
        </CardTitle>
        <div className="space-y-1 pt-1">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {count} dari {total} selesai ({pct}%)
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-1 max-h-[480px] overflow-y-auto">
        {sorted.map((step) => {
          const checked = done.includes(step.id);
          return (
            <div
              key={step.id}
              className="flex items-start gap-3 p-2 rounded-md hover:bg-slate-50 transition-colors"
            >
              <Checkbox
                id={step.id}
                checked={checked}
                onCheckedChange={() => toggle(step.id)}
                className="mt-1"
              />
              <label htmlFor={step.id} className="cursor-pointer space-y-1 min-w-0">
                <span
                  className={cn(
                    'block text-sm font-medium leading-tight',
                    checked ? 'line-through text-slate-400' : 'text-slate-900'
                  )}
                >
                  {step.step_number}. {step.title}
                </span>
                {step.description && (
                  <span className="block text-xs text-slate-500 leading-snug">{step.description}</span>
                )}
                {step.role && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {step.role}
                  </Badge>
                )}
              </label>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}