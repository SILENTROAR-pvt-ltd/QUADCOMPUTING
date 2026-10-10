'use client';

import React from 'react';
import { Clock, ChefHat, CheckCircle2 } from 'lucide-react';

export interface TrackerTimelineProps {
  currentStep: number;
  kotNumber?: string | null;
  status?: string | null;
}

export function TrackerTimeline({ currentStep, kotNumber, status }: TrackerTimelineProps) {
  const normStatus = (status || '').toLowerCase();
  const isDelivered = normStatus === 'served' || normStatus === 'delivered';
  const steps = [
    { title: 'Order Placed', subtitle: kotNumber || 'KOT-Live', icon: Clock },
    { title: 'Preparing by Chef', subtitle: 'In Kitchen', icon: ChefHat },
    { title: 'Ready / Served', subtitle: isDelivered ? 'Delivered' : 'Plated & Ready', icon: CheckCircle2 },
  ];

  return (
    <div className="relative max-w-xl mx-auto my-6 px-6">
      {/* Background Track Line: perfectly centered at top-6 (24px, center of w-12 h-12) */}
      <div className="absolute left-12 right-12 top-6 -translate-y-1/2 h-1 bg-neutral-100 rounded-full z-0 overflow-hidden">
        {/* Active Progress Fill Line */}
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${(Math.min(Math.max(currentStep, 0), steps.length - 1) / (steps.length - 1)) * 100}%`,
          }}
        />
      </div>

      {/* Steps Distribution */}
      <div className="relative z-10 flex items-start justify-between">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx <= currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div key={idx} className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm ${
                  isCompleted
                    ? 'bg-neutral-900 text-white shadow-neutral-900/20 scale-105'
                    : 'bg-white text-neutral-400 border border-neutral-200'
                } ${
                  isCurrent
                    ? 'ring-4 ring-emerald-500/20 border-emerald-500 text-emerald-600 bg-emerald-50'
                    : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-center mt-3 max-w-[100px] sm:max-w-[120px]">
                <span
                  className={`block text-xs font-semibold leading-tight ${
                    isCompleted ? 'text-neutral-900' : 'text-neutral-400'
                  }`}
                >
                  {step.title}
                </span>
                <span className="block text-[10px] font-medium text-neutral-400 mt-0.5 truncate">
                  {step.subtitle}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
