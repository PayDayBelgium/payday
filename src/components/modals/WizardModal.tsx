import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: React.ReactNode;
  isValid?: boolean;
  canSkip?: boolean;
}

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: WizardStep[];
  onComplete: () => void;
  currentStepIndex?: number;
  onStepChange?: (stepIndex: number) => void;
  showStepIndicator?: boolean;
  completeButtonLabel?: string;
}

export const WizardModal: React.FC<WizardModalProps> = ({
  isOpen,
  onClose,
  title,
  steps,
  onComplete,
  currentStepIndex: externalStepIndex,
  onStepChange,
  showStepIndicator = true,
  completeButtonLabel = 'Voltooien',
}) => {
  const [internalStepIndex, setInternalStepIndex] = useState(0);

  // Use external step index if provided (controlled), otherwise use internal (uncontrolled)
  const isControlled = externalStepIndex !== undefined;
  const currentStepIndex = isControlled ? externalStepIndex : internalStepIndex;

  useEffect(() => {
    if (isOpen) {
      // Reset to first step when modal opens
      if (!isControlled) {
        setInternalStepIndex(0);
      }
    }
  }, [isOpen, isControlled]);

  if (!isOpen) return null;

  // Guard against empty steps array or invalid index
  if (!steps || steps.length === 0) return null;

  const safeStepIndex = Math.min(Math.max(0, currentStepIndex), steps.length - 1);
  const currentStep = steps[safeStepIndex];
  const isFirstStep = safeStepIndex === 0;
  const isLastStep = safeStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      const nextIndex = currentStepIndex + 1;
      if (isControlled && onStepChange) {
        onStepChange(nextIndex);
      } else {
        setInternalStepIndex(nextIndex);
      }
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      const prevIndex = currentStepIndex - 1;
      if (isControlled && onStepChange) {
        onStepChange(prevIndex);
      } else {
        setInternalStepIndex(prevIndex);
      }
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Only allow clicking on previous steps or current step
    if (stepIndex <= currentStepIndex) {
      if (isControlled && onStepChange) {
        onStepChange(stepIndex);
      } else {
        setInternalStepIndex(stepIndex);
      }
    }
  };

  const canGoNext = currentStep.isValid !== false;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[900px] h-[750px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
            {currentStep.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {currentStep.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Step Indicator */}
        {showStepIndicator && steps.length > 1 && (
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;
                const isClickable = index <= currentStepIndex;

                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => isClickable && handleStepClick(index)}
                      disabled={!isClickable}
                      className={`flex items-center gap-3 ${
                        isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                          isCompleted
                            ? 'bg-positive-600 text-white'
                            : isActive
                              ? 'bg-primary-700 text-white'
                              : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                      </div>
                      <div className="text-left hidden md:block">
                        <p
                          className={`text-sm font-medium ${
                            isActive
                              ? 'text-primary-700 dark:text-primary-300'
                              : isCompleted
                                ? 'text-positive-600 dark:text-positive-500'
                                : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {step.title}
                        </p>
                      </div>
                    </button>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          index < currentStepIndex
                            ? 'bg-positive-600'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">{currentStep.component}</div>
        </div>

        {/* Footer with Navigation */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Stap {currentStepIndex + 1} van {steps.length}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              Annuleren
            </button>
            {!isFirstStep && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Vorige
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isLastStep ? completeButtonLabel : 'Volgende'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
