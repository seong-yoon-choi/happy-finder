import { useCallback, useEffect, useRef, useState } from 'react';

const LONG_PRESS_DELAY_MS = 260;
const MOVE_CANCEL_DISTANCE = 14;
const CLICK_SUPPRESS_MS = 360;

const getDistance = (startX, startY, currentX, currentY) => (
  Math.hypot(currentX - startX, currentY - startY)
);

const getTouchPoint = touch => ({
  id: touch.identifier,
  x: touch.clientX,
  y: touch.clientY
});

const preventGestureDefault = event => {
  if (event.cancelable) {
    event.preventDefault();
  }
};

const isPointInsideElement = ({ x, y, element }) => {
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
};

const findImageTarget = ({ x, y, stripElement, activeImageId, activeElement }) => {
  if (!stripElement) {
    return null;
  }

  if (isPointInsideElement({ x, y, element: activeElement })) {
    return null;
  }

  const candidates = Array.from(stripElement.querySelectorAll('[data-image-id]'))
    .filter(element => element?.dataset?.imageId && element.dataset.imageId !== activeImageId);

  const containingTarget = candidates.find(element => {
    const rect = element.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });

  if (containingTarget) {
    return containingTarget;
  }

  return candidates
    .map(element => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      return {
        element,
        distance: Math.hypot(centerX - x, centerY - y)
      };
    })
    .sort((left, right) => left.distance - right.distance)[0]?.element || null;
};

const usePressReorder = ({ onReorder, enabled = true } = {}) => {
  const [activeId, setActiveId] = useState('');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const stateRef = useRef(null);
  const suppressClickUntilRef = useRef(0);

  const clearPressTimer = useCallback(() => {
    if (stateRef.current?.timerId) {
      window.clearTimeout(stateRef.current.timerId);
      stateRef.current.timerId = null;
    }
  }, []);

  const activateDrag = useCallback((pressState, currentElement) => {
    pressState.isDragging = true;
    pressState.lastTargetId = pressState.imageId;
    setActiveId(pressState.imageId);
    setDragOffset({ x: 0, y: 0 });

    currentElement?.classList.add('is-press-dragging');

    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  }, []);

  const finishPress = useCallback(() => {
    const wasDragging = Boolean(stateRef.current?.isDragging);

    clearPressTimer();

    if (stateRef.current?.element) {
      stateRef.current.element.classList.remove('is-press-dragging');
    }

    if (wasDragging) {
      suppressClickUntilRef.current = Date.now() + CLICK_SUPPRESS_MS;
    }

    stateRef.current = null;
    setActiveId('');
    setDragOffset({ x: 0, y: 0 });
  }, [clearPressTimer]);

  useEffect(() => () => {
    clearPressTimer();
  }, [clearPressTimer]);

  const beginPress = useCallback(({ imageId, element, pointerId, x, y, source }) => {
    if (!enabled || !onReorder) {
      return;
    }

    const stripElement = element.closest('[data-reorder-strip="true"]');

    clearPressTimer();
    if (stateRef.current?.element && stateRef.current.element !== element) {
      stateRef.current.element.classList.remove('is-press-dragging');
    }
    setActiveId('');
    setDragOffset({ x: 0, y: 0 });
    stateRef.current = {
      imageId,
      pointerId,
      source,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      lastTargetId: imageId,
      isDragging: false,
      element,
      stripElement,
      timerId: window.setTimeout(() => {
        const pressState = stateRef.current;

        if (!pressState || pressState.pointerId !== pointerId || pressState.source !== source) {
          return;
        }

        activateDrag(pressState, element);
      }, LONG_PRESS_DELAY_MS)
    };
  }, [activateDrag, clearPressTimer, enabled, onReorder]);

  const movePress = useCallback(({ pointerId, x, y, source, preventDefault }) => {
    const pressState = stateRef.current;

    if (!pressState || pressState.pointerId !== pointerId || pressState.source !== source) {
      return;
    }

    pressState.lastX = x;
    pressState.lastY = y;

    if (!pressState.isDragging) {
      if (getDistance(pressState.startX, pressState.startY, x, y) > MOVE_CANCEL_DISTANCE) {
        finishPress();
      }

      return;
    }

    preventDefault?.();
    const nextOffset = {
      x: x - pressState.startX,
      y: y - pressState.startY
    };
    setDragOffset(nextOffset);

    const targetElement = findImageTarget({
      x,
      y,
      stripElement: pressState.stripElement,
      activeImageId: pressState.imageId,
      activeElement: pressState.element
    });
    const targetId = targetElement?.dataset?.imageId || '';

    if (!targetId || targetId === pressState.lastTargetId) {
      return;
    }

    pressState.lastTargetId = targetId;
    onReorder(pressState.imageId, targetId);
  }, [finishPress, onReorder]);

  const endPress = useCallback(({ pointerId, source }) => {
    const pressState = stateRef.current;

    if (pressState?.pointerId === pointerId && pressState.source === source) {
      finishPress();
    }
  }, [finishPress]);

  useEffect(() => {
    const handleWindowTouchMove = event => {
      const pressState = stateRef.current;

      if (!pressState || pressState.source !== 'touch') {
        return;
      }

      const touch = Array.from(event.changedTouches)
        .find(candidate => candidate.identifier === pressState.pointerId);

      if (!touch) {
        return;
      }

      const point = getTouchPoint(touch);
      movePress({
        pointerId: point.id,
        x: point.x,
        y: point.y,
        source: 'touch',
        preventDefault: () => preventGestureDefault(event)
      });
    };

    const handleWindowTouchEnd = event => {
      const pressState = stateRef.current;

      if (!pressState || pressState.source !== 'touch') {
        return;
      }

      const touch = Array.from(event.changedTouches)
        .find(candidate => candidate.identifier === pressState.pointerId);

      if (touch) {
        endPress({ pointerId: touch.identifier, source: 'touch' });
      }
    };

    const handleWindowTouchCancel = event => {
      const pressState = stateRef.current;

      if (!pressState || pressState.source !== 'touch') {
        return;
      }

      if (pressState.isDragging) {
        preventGestureDefault(event);
        return;
      }

      finishPress();
    };

    const handleWindowBlur = () => {
      finishPress();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        finishPress();
      }
    };

    const options = { passive: false, capture: true };

    window.addEventListener('touchmove', handleWindowTouchMove, options);
    window.addEventListener('touchend', handleWindowTouchEnd, options);
    window.addEventListener('touchcancel', handleWindowTouchCancel, options);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('touchmove', handleWindowTouchMove, options);
      window.removeEventListener('touchend', handleWindowTouchEnd, options);
      window.removeEventListener('touchcancel', handleWindowTouchCancel, options);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [endPress, finishPress, movePress]);

  const getReorderProps = useCallback(imageId => {
    const isActive = activeId === imageId;

    return {
      'data-image-id': imageId,
      style: isActive
        ? {
          '--press-reorder-x': `${dragOffset.x}px`,
          '--press-reorder-y': `${dragOffset.y}px`
        }
        : undefined,
      onPointerDown: event => {
        if (
          event.pointerType === 'touch'
          || !enabled
          || !onReorder
          || event.button > 0
          || event.target.closest('[data-reorder-ignore="true"]')
        ) {
          return;
        }

        beginPress({
          imageId,
          element: event.currentTarget,
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          source: 'pointer'
        });
        event.currentTarget.setPointerCapture?.(event.pointerId);
      },
      onPointerMove: event => {
        if (event.pointerType === 'touch') {
          return;
        }

        movePress({
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          source: 'pointer',
          preventDefault: () => event.preventDefault()
        });
      },
      onPointerUp: event => {
        if (event.pointerType !== 'touch') {
          endPress({ pointerId: event.pointerId, source: 'pointer' });
        }
      },
      onPointerCancel: event => {
        if (event.pointerType !== 'touch') {
          endPress({ pointerId: event.pointerId, source: 'pointer' });
        }
      },
      onLostPointerCapture: () => {
        if (stateRef.current?.source === 'pointer') {
          finishPress();
        }
      },
      onTouchStart: event => {
        if (
          !enabled
          || !onReorder
          || event.target.closest('[data-reorder-ignore="true"]')
        ) {
          return;
        }

        const [touch] = Array.from(event.changedTouches);

        if (!touch) {
          return;
        }

        const point = getTouchPoint(touch);
        beginPress({
          imageId,
          element: event.currentTarget,
          pointerId: point.id,
          x: point.x,
          y: point.y,
          source: 'touch'
        });
      },
      onTouchMove: event => {
        const pressState = stateRef.current;

        if (!pressState || pressState.source !== 'touch') {
          return;
        }

        const touch = Array.from(event.changedTouches)
          .find(candidate => candidate.identifier === pressState.pointerId);

        if (!touch) {
          return;
        }

        const point = getTouchPoint(touch);
        movePress({
          pointerId: point.id,
          x: point.x,
          y: point.y,
          source: 'touch',
          preventDefault: () => preventGestureDefault(event)
        });
      },
      onTouchEnd: event => {
        const pressState = stateRef.current;

        if (!pressState || pressState.source !== 'touch') {
          return;
        }

        const touch = Array.from(event.changedTouches)
          .find(candidate => candidate.identifier === pressState.pointerId);

        if (touch) {
          endPress({ pointerId: touch.identifier, source: 'touch' });
        }
      },
      onTouchCancel: event => {
        const pressState = stateRef.current;

        if (!pressState || pressState.source !== 'touch') {
          return;
        }

        if (pressState.isDragging) {
          preventGestureDefault(event);
          return;
        }

        const touch = Array.from(event.changedTouches)
          .find(candidate => candidate.identifier === pressState.pointerId);

        if (touch) {
          endPress({ pointerId: touch.identifier, source: 'touch' });
        } else {
          finishPress();
        }
      },
      onClickCapture: event => {
        if (Date.now() < suppressClickUntilRef.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };
  }, [activeId, beginPress, dragOffset.x, dragOffset.y, enabled, endPress, finishPress, movePress, onReorder]);

  return {
    activeId,
    getReorderProps
  };
};

export default usePressReorder;
