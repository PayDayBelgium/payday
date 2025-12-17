import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PortalTooltipProps {
  children: React.ReactNode;
  triggerRef: React.RefObject<HTMLElement>;
  show: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * A portal-based tooltip component that renders outside the DOM hierarchy
 * to avoid z-index and overflow issues.
 */
export const PortalTooltip: React.FC<PortalTooltipProps> = ({
  children,
  triggerRef,
  show,
  placement = 'top',
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (show && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = rect.top - 8;
          left = rect.left;
          break;
        case 'bottom':
          top = rect.bottom + 8;
          left = rect.left;
          break;
        case 'left':
          top = rect.top;
          left = rect.left - 8;
          break;
        case 'right':
          top = rect.top;
          left = rect.right + 8;
          break;
      }

      setPosition({ top, left });
    }
  }, [show, triggerRef, placement]);

  if (!show) return null;

  const getTransform = () => {
    switch (placement) {
      case 'top':
        return 'translateY(-100%)';
      case 'bottom':
        return 'translateY(0)';
      case 'left':
        return 'translateX(-100%)';
      case 'right':
        return 'translateX(0)';
      default:
        return 'translateY(-100%)';
    }
  };

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: getTransform(),
      }}
    >
      {children}
    </div>,
    document.body
  );
};
