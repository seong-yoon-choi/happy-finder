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

const getImageElements = stripElement => (
  Array.from(stripElement?.querySelectorAll('[data-image-id]') || [])
    .filter(element => element?.dataset?.imageId)
);

const hasAnyActiveTouch = event => Array.from(event.touches || []).length > 0;

const isPointInsideRect = ({ x, y, rect, inset = 0 }) => (
  Boolean(rect)
  && x >= rect.left + inset
  && x <= rect.right - inset
  && y >= rect.top + inset
  && y <= rect.bottom - inset
);

const findImageTarget = ({ x, y, stripElement, activeImageId }) => {
  const candidates = getImageElements(stripElement)
    .filter(element => element.dataset.imageId !== activeImageId);

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

const getPreviewTransforms = ({ stripElement, activeImageId, targetId }) => {
  if (!stripElement || !activeImageId || !targetId || activeImageId === targetId) {
    return {};
  }

  const elements = getImageElements(stripElement);
  const ids = elements.map(element => element.dataset.imageId);
  const sourceIndex = ids.indexOf(activeImageId);
  const targetIndex = ids.indexOf(targetId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return {};
  }

  const slotRects = elements.map(element => element.getBoundingClientRect());
  const currentRectsById = new Map(
    elements.map(element => [element.dataset.imageId, element.getBoundingClientRect()])
  );
  const nextIds = [...ids];
  const [movingId] = nextIds.splice(sourceIndex, 1);
  nextIds.splice(targetIndex, 0, movingId);

  return ids.reduce((transforms, id, currentIndex) => {
    if (id === activeImageId) {
      return transforms;
    }

    const nextIndex = nextIds.indexOf(id);

    if (nextIndex < 0 || nextIndex === currentIndex) {
      return transforms;
    }

    const currentRect = currentRectsById.get(id);
    const nextRect = slotRects[nextIndex];

    if (!currentRect || !nextRect) {
      return transforms;
    }

    const x = nextRect.left - currentRect.left;
    const y = nextRect.top - currentRect.top;

    if (Math.abs(x) > 0.5 || Math.abs(y) > 0.5) {
      transforms[id] = { x, y };
    }

    return transforms;
  }, {});
};

const usePressReorder = ({ onReorder, enabled = true } = {}) => {
  const [activeId, setActiveId] = useState('');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [previewTransforms, setPreviewTransforms] = useState({});
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
    pressState.finalTargetId = '';
    setActiveId(pressState.imageId);
    setDragOffset({ x: 0, y: 0 });
    setPreviewTransforms({});

    currentElement?.classList.add('is-press-dragging');

    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(12);
    }
  }, []);

  const finishPress = useCallback(({ applyReorder = true } = {}) => {
    const pressState = stateRef.current;
    const wasDragging = Boolean(pressState?.isDragging);
    const sourceId = pressState?.imageId || '';
    const targetId = pressState?.finalTargetId || '';

    clearPressTimer();

    if (pressState?.element) {
      pressState.element.classList.remove('is-press-dragging');
    }

    if (wasDragging) {
      suppressClickUntilRef.current = Date.now() + CLICK_SUPPRESS_MS;
    }

    stateRef.current = null;
    setActiveId('');
    setDragOffset({ x: 0, y: 0 });
    setPreviewTransforms({});

    if (wasDragging && applyReorder && sourceId && targetId && sourceId !== targetId) {
      onReorder?.(sourceId, targetId);
    }
  }, [clearPressTimer, onReorder]);

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
    setPreviewTransforms({});
    stateRef.current = {
      imageId,
      pointerId,
      source,
      startX: x,
      startY: y,
      lastX: x,
      lastY: y,
      lastTargetId: imageId,
      finalTargetId: '',
      isDragging: false,
      element,
      startRect: element.getBoundingClientRect(),
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
        finishPress({ applyReorder: false });
      }

      return;
    }

    preventDefault?.();
    setDragOffset({
      x: x - pressState.startX,
      y: y - pressState.startY
    });

    const isBackAtStart = isPointInsideRect({
      x,
      y,
      rect: pressState.startRect,
      inset: Math.min(pressState.startRect.width, pressState.startRect.height) * 0.12
    });

    if (isBackAtStart) {
      if (pressState.finalTargetId || pressState.lastTargetId !== pressState.imageId) {
        pressState.lastTargetId = pressState.imageId;
        pressState.finalTargetId = '';
        setPreviewTransforms({});
      }

      return;
    }

    const targetElement = findImageTarget({
      x,
      y,
      stripElement: pressState.stripElement,
      activeImageId: pressState.imageId
    });
    const targetId = targetElement?.dataset?.imageId || '';

    if (!targetId || targetId === pressState.lastTargetId) {
      return;
    }

    pressState.lastTargetId = targetId;
    pressState.finalTargetId = targetId;
    setPreviewTransforms(getPreviewTransforms({
      stripElement: pressState.stripElement,
      activeImageId: pressState.imageId,
      targetId
    }));
  }, [finishPress]);

  const endPress = useCallback(({ pointerId, source }) => {
    const pressState = stateRef.current;

    if (pressState?.pointerId === pointerId && pressState.source === source) {
      finishPress();
    }
  }, [finishPress]);

  useEffect(() => {
    const handleWindowPointerMove = event => {
      const pressState = stateRef.current;

      if (!pressState || pressState.source !== 'pointer') {
        return;
      }

      movePress({
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        source: 'pointer',
        preventDefault: () => preventGestureDefault(event)
      });
    };

    const handleWindowPointerUp = event => {
      endPress({ pointerId: event.pointerId, source: 'pointer' });
    };

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

      if (!pressState) {
        return;
      }

      if (pressState.source === 'pointer' && !hasAnyActiveTouch(event)) {
        finishPress();
        return;
      }

      if (pressState.source !== 'touch') {
        return;
      }

      const touch = Array.from(event.changedTouches)
        .find(candidate => candidate.identifier === pressState.pointerId);

      if (touch || !hasAnyActiveTouch(event)) {
        finishPress();
      }
    };

    const handleWindowTouchCancel = event => {
      const pressState = stateRef.current;

      if (!pressState) {
        return;
      }

      if (pressState.isDragging) {
        preventGestureDefault(event);
        return;
      }

      finishPress({ applyReorder: false });
    };

    const handleWindowBlur = () => {
      finishPress({ applyReorder: false });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        finishPress({ applyReorder: false });
      }
    };

    const options = { passive: false, capture: true };

    window.addEventListener('pointermove', handleWindowPointerMove, options);
    window.addEventListener('pointerup', handleWindowPointerUp, options);
    window.addEventListener('touchmove', handleWindowTouchMove, options);
    window.addEventListener('touchend', handleWindowTouchEnd, options);
    window.addEventListener('touchcancel', handleWindowTouchCancel, options);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove, options);
      window.removeEventListener('pointerup', handleWindowPointerUp, options);
      window.removeEventListener('touchmove', handleWindowTouchMove, options);
      window.removeEventListener('touchend', handleWindowTouchEnd, options);
      window.removeEventListener('touchcancel', handleWindowTouchCancel, options);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [endPress, finishPress, movePress]);

  const getReorderProps = useCallback(imageId => {
    const isActive = activeId === imageId;
    const previewTransform = previewTransforms[imageId];

    return {
      'data-image-id': imageId,
      style: isActive
        ? {
          '--press-reorder-x': `${dragOffset.x}px`,
          '--press-reorder-y': `${dragOffset.y}px`
        }
        : previewTransform
          ? {
            transform: `translate3d(${previewTransform.x}px, ${previewTransform.y}px, 0)`
          }
          : undefined,
      onPointerDown: event => {
        if (
          !enabled
          || !onReorder
          || event.button > 0
          || event.target.closest('[data-reorder-ignore="true"]')
        ) {
          return;
        }

        preventGestureDefault(event);
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
        movePress({
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          source: 'pointer',
          preventDefault: () => preventGestureDefault(event)
        });
      },
      onPointerUp: event => {
        endPress({ pointerId: event.pointerId, source: 'pointer' });
      },
      onPointerCancel: event => {
        const pressState = stateRef.current;

        if (pressState?.source !== 'pointer') {
          return;
        }

        if (pressState.isDragging) {
          preventGestureDefault(event);
          return;
        }

        finishPress({ applyReorder: false });
      },
      onLostPointerCapture: () => {
        const pressState = stateRef.current;

        if (pressState?.source === 'pointer' && !pressState.isDragging) {
          finishPress({ applyReorder: false });
        }
      },
      onTouchStart: event => {
        if (
          window.PointerEvent
          || !enabled
          || !onReorder
          || event.target.closest('[data-reorder-ignore="true"]')
        ) {
          return;
        }

        const [touch] = Array.from(event.changedTouches);

        if (!touch) {
          return;
        }

        preventGestureDefault(event);
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
        if (window.PointerEvent) {
          return;
        }

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
        if (window.PointerEvent) {
          return;
        }

        const pressState = stateRef.current;

        if (!pressState || pressState.source !== 'touch') {
          return;
        }

        const touch = Array.from(event.changedTouches)
          .find(candidate => candidate.identifier === pressState.pointerId);

        if (touch || !hasAnyActiveTouch(event)) {
          finishPress();
        }
      },
      onTouchCancel: event => {
        if (window.PointerEvent) {
          return;
        }

        const pressState = stateRef.current;

        if (!pressState || pressState.source !== 'touch') {
          return;
        }

        if (pressState.isDragging) {
          preventGestureDefault(event);
          return;
        }

        finishPress({ applyReorder: false });
      },
      onClickCapture: event => {
        if (Date.now() < suppressClickUntilRef.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };
  }, [
    activeId,
    beginPress,
    dragOffset.x,
    dragOffset.y,
    enabled,
    endPress,
    finishPress,
    movePress,
    onReorder,
    previewTransforms
  ]);

  return {
    activeId,
    getReorderProps
  };
};

export default usePressReorder;
