import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PortalTooltipProps {
  /** Trigger element. Required in both modes. */
  children: React.ReactNode;
  /** Tooltip body. If provided, the component manages its own hover state. */
  content?: React.ReactNode;
  /** Legacy external trigger ref (used when the parent owns the ref). */
  triggerRef?: React.RefObject<HTMLElement | null>;
  /** Legacy external show state. When omitted, the tooltip toggles on hover/focus of the wrapper. */
  show?: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * Portal-based tooltip that renders outside the DOM hierarchy.
 *
 * Two usage modes:
 *  1. Hover mode (preferred):
 *     <PortalTooltip content={<>...</>}>
 *       <Info />
 *     </PortalTooltip>
 *  2. Controlled mode (legacy):
 *     <PortalTooltip triggerRef={ref} show={isOpen}>
 *       {tooltipContent}
 *     </PortalTooltip>
 */
export const PortalTooltip: React.FC<PortalTooltipProps> = ({
  children,
  content,
  triggerRef,
  show,
  placement = 'top',
  className,
}) => {
  const internalRef = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Hover mode: tooltip-body is the `content` prop, trigger is `children`.
  const isHoverMode = content !== undefined;
  const visible = isHoverMode ? hovered : !!show;
  const refToUse: React.RefObject<HTMLElement | null> = isHoverMode
    ? (internalRef as React.RefObject<HTMLElement | null>)
    : (triggerRef as React.RefObject<HTMLElement | null>);

  useEffect(() => {
    if (visible && refToUse?.current) {
      const rect = refToUse.current.getBoundingClientRect();
      let top = 0;
      let left = 0;
      switch (placement) {
        case 'top':
          top = rect.top - 8;
          left = rect.left + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - 8;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + 8;
          break;
      }
      setPosition({ top, left });
    }
  }, [visible, refToUse, placement]);

  const getTransform = () => {
    switch (placement) {
      case 'top':
        return 'translate(-50%, -100%)';
      case 'bottom':
        return 'translate(-50%, 0)';
      case 'left':
        return 'translate(-100%, -50%)';
      case 'right':
        return 'translate(0, -50%)';
      default:
        return 'translate(-50%, -100%)';
    }
  };

  const tooltipBody = isHoverMode ? content : children;
  const trigger = isHoverMode ? (
    <span
      ref={internalRef}
      className="inline-flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {children}
    </span>
  ) : null;

  const tooltip = visible
    ? createPortal(
        <div
          className={`fixed z-[9999] pointer-events-none ${className ?? ''}`}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: getTransform(),
          }}
        >
          <div className="bg-ink-900 text-white text-xs rounded-md px-2.5 py-1.5 shadow-lg max-w-xs">
            {tooltipBody}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {trigger}
      {tooltip}
    </>
  );
};
