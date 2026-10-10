'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, LucideIcon } from 'lucide-react';

export interface StageConfig {
  step: number;
  name: string;
  sublabel: string;
  icon: LucideIcon;
  description: string;
  badgeText: string;
  estimatedText: string;
}

interface TrackerTimelineProps {
  stages: StageConfig[];
  currentStage: number;
}

export const TrackerTimeline: React.FC<TrackerTimelineProps> = ({ stages, currentStage }) => {
  return (
    <div className="relative pt-2 pb-1">
      {/* Background Track Line and Filled Progress: connects center of Stage 1 (16.67%) to center of Stage 3 (83.33%) */}
      <div className="absolute top-[22px] left-[16.67%] right-[16.67%] h-0.5 bg-neutral-200 -z-0">
        <motion.div
          className="h-full bg-neutral-900"
          initial={{ width: '0%' }}
          animate={{
            width: currentStage === 1 ? '0%' : currentStage === 2 ? '50%' : '100%',
          }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>

      {/* Stages Row */}
      <div className="grid grid-cols-3 gap-2 relative z-10">
        {stages.map((st) => {
          const isCompleted = st.step < currentStage;
          const isCurrent = st.step === currentStage;
          const IconComponent = st.icon;

          return (
            <div key={st.step} className="flex flex-col items-center text-center">
              {/* Circle Indicator */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                  isCompleted
                    ? 'bg-white text-black font-bold border border-white'
                    : isCurrent
                    ? 'bg-neutral-900 text-white border-2 border-white ring-4 ring-neutral-100'
                    : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                ) : isCurrent ? (
                  <IconComponent className="w-4 h-4 stroke-[2.2] animate-pulse" />
                ) : (
                  <span className="font-mono text-xs">{st.step}</span>
                )}
              </div>

              {/* Stage Labels */}
              <div className="mt-2.5 space-y-0.5">
                <p
                  className={`text-xs font-semibold tracking-tight transition-colors ${
                    isCurrent ? 'text-neutral-900' : isCompleted ? 'text-neutral-700' : 'text-neutral-500'
                  }`}
                >
                  {st.name}
                </p>
                <p className="text-[10px] text-neutral-400 font-light">{st.sublabel}</p>
              </div>

              {/* Active Badge for Current Stage */}
              {isCurrent && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-[9px] font-medium text-neutral-700"
                >
                  <Clock className="w-2.5 h-2.5 text-neutral-400" />
                  <span>{st.estimatedText}</span>
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
