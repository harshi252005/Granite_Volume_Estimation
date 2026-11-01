import React from 'react';

/**
 * StepTracker — horizontal lifecycle stepper
 * Props: steps = [{label, icon}], currentStep (0-indexed)
 */
export default function StepTracker({ steps = [], currentStep = 0 }) {
  return (
    <div className="step-track">
      {steps.map((step, i) => {
        const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'upcoming';
        return (
          <div key={i} className={`step-node ${state}`}>
            <div className={`step-dot ${state}`}>
              {state === 'done' ? '✓' : step.icon || (i + 1)}
            </div>
            <span className="step-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
