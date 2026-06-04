import { useCallback, useEffect, useRef, useState } from 'react';

const LONG_PRESS_DELAY_MS = 260;
const MOVE_CANCEL_DISTANCE = 9;
const CLICK_SUPPRESS_MS = 360;

const getDistance = (startX, startY, currentX, currentY) => (
  Math.hypot(currentX - startX, currentY - startY)
);

const findImageTarget = (event, stripElement) => {
  if (!stripElement || typeof document.elementsFromPoint !== 'function') {
    return null;
  }

  return document
    .elementsFromPoint(event.clientX, event.clientY)
    .find(element => (
      element?.dataset?.imageId
      && element.closest('[data-reorder-strip="true"]') === stripElement
    )) || null;
};

const usePressReorder = ({ onReorder, enabled = true } = {}) => {
  const [activeId, setActiveId] = useState('');
  const stateRef = useRef(null);
  const suppressClickUntilRef = useRef(0);

  const clearPressTimer = useCallback(() => {
    if (stateRef.current?.timerId) {
      window.clearTimeout(stateRef.current.timerId);
      stateRef.current.timerId = null;
    }
  }, []);

  const finishPress = useCallback(() => {
    const wasDragging = Boolean(stateRef.current?.isDragging);

    clearPressTimer();

    if (wasDragging) {
      suppressClickUntilRef.current = Date.now() + CLICK_SUPPRESS_MS;
    }

    stateRef.current = null;
    setActiveId('');
  }, [clearPressTimer]);

  useEffect(() => () => {
    clearPressTimer();
  }, [clearPressTimer]);

  const getReorderProps = useCallback(imageId => ({
    'data-image-id': imageId,
    onPointerDown: event => {
      if (
        !enabled
        || !onReorder
        || event.button > 0
        || event.target.closest('[data-reorder-ignore="true"]')
      ) {
        return;
      }

      const currentElement = event.currentTarget;
      const pointerId = event.pointerId;
      const stripElement = currentElement.closest('[data-reorder-strip="true"]');

      stateRef.current = {
        imageId,
        pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastTargetId: imageId,
        isDragging: false,
        stripElement,
        timerId: window.setTimeout(() => {
          if (!stateRef.current || stateRef.current.pointerId !== pointerId) {
            return;
          }

          stateRef.current.isDragging = true;
          setActiveId(imageId);
          currentElement.setPointerCapture?.(pointerId);

          if (typeof navigator.vibrate === 'function') {
            navigator.vibrate(12);
          }
        }, LONG_PRESS_DELAY_MS)
      };
    },
    onPointerMove: event => {
      const pressState = stateRef.current;

      if (!pressState || pressState.pointerId !== event.pointerId) {
        return;
      }

      if (!pressState.isDragging) {
        if (getDistance(pressState.startX, pressState.startY, event.clientX, event.clientY) > MOVE_CANCEL_DISTANCE) {
          finishPress();
        }

        return;
      }

      event.preventDefault();
      const targetElement = findImageTarget(event, pressState.stripElement);
      const targetId = targetElement?.dataset?.imageId || '';

      if (!targetId || targetId === pressState.imageId || targetId === pressState.lastTargetId) {
        return;
      }

      pressState.lastTargetId = targetId;
      onReorder(pressState.imageId, targetId);
    },
    onPointerUp: event => {
      if (stateRef.current?.pointerId === event.pointerId) {
        finishPress();
      }
    },
    onPointerCancel: event => {
      if (stateRef.current?.pointerId === event.pointerId) {
        finishPress();
      }
    },
    onLostPointerCapture: finishPress,
    onClickCapture: event => {
      if (Date.now() < suppressClickUntilRef.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }), [enabled, finishPress, onReorder]);

  return {
    activeId,
    getReorderProps
  };
};

export default usePressReorder;
