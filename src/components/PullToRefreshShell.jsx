import React, { useEffect, useRef, useState } from 'react';
import './PullToRefreshShell.css';

const MAX_PULL_DISTANCE = 104;
const REFRESH_THRESHOLD = 76;
const PULL_RESISTANCE = 0.42;
const PULL_START_THRESHOLD = 14;

const getScrollTop = () => {
  if (typeof window === 'undefined') {
    return 0;
  }

  return window.scrollY
    || document.scrollingElement?.scrollTop
    || document.documentElement.scrollTop
    || 0;
};

const isPullBlockedTarget = target => (
  target instanceof Element
  && Boolean(target.closest('[data-block-pull-refresh="true"]'))
);

const PullToRefreshShell = ({ children, enabled = true, onRefresh }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReadyToRefresh, setIsReadyToRefresh] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isTrackingRef = useRef(false);
  const isPullingRef = useRef(false);
  const settleTimeoutRef = useRef(null);
  const resetFrameRef = useRef(null);

  useEffect(() => () => {
    if (resetFrameRef.current) {
      window.cancelAnimationFrame(resetFrameRef.current);
    }

    if (settleTimeoutRef.current) {
      window.clearTimeout(settleTimeoutRef.current);
    }
  }, []);

  const finishPull = () => {
    setPullDistance(0);
    setIsRefreshing(false);
    setIsReadyToRefresh(false);
    isTrackingRef.current = false;
    isPullingRef.current = false;
  };

  useEffect(() => {
    if (enabled) {
      return undefined;
    }

    resetFrameRef.current = window.requestAnimationFrame(() => {
      finishPull();
      resetFrameRef.current = null;
    });

    return () => {
      if (resetFrameRef.current) {
        window.cancelAnimationFrame(resetFrameRef.current);
        resetFrameRef.current = null;
      }
    };
  }, [enabled]);

  const handleTouchStart = event => {
    if (!enabled || isRefreshing || event.touches.length !== 1 || isPullBlockedTarget(event.target)) {
      return;
    }

    const [touch] = event.touches;
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    isTrackingRef.current = getScrollTop() <= 0;
    isPullingRef.current = false;
  };

  const handleTouchMove = event => {
    if (!enabled || isRefreshing || !isTrackingRef.current || event.touches.length !== 1) {
      return;
    }

    const [touch] = event.touches;
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (deltaY <= 0) {
      if (!isPullingRef.current) {
        setPullDistance(0);
        setIsReadyToRefresh(false);
      }
      return;
    }

    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > PULL_START_THRESHOLD) {
      isTrackingRef.current = false;
      return;
    }

    if (getScrollTop() > 0 && !isPullingRef.current) {
      isTrackingRef.current = false;
      return;
    }

    if (!isPullingRef.current && deltaY < PULL_START_THRESHOLD) {
      return;
    }

    isPullingRef.current = true;

    if (event.cancelable) {
      event.preventDefault();
    }

    const nextPullDistance = Math.min(MAX_PULL_DISTANCE, deltaY * PULL_RESISTANCE);
    setPullDistance(nextPullDistance);
    setIsReadyToRefresh(nextPullDistance >= REFRESH_THRESHOLD);
  };

  const handleTouchEnd = () => {
    if (!isPullingRef.current) {
      isTrackingRef.current = false;
      return;
    }

    isTrackingRef.current = false;
    isPullingRef.current = false;

    if (!isReadyToRefresh) {
      setPullDistance(0);
      setIsReadyToRefresh(false);
      return;
    }

    setIsRefreshing(true);
    setPullDistance(REFRESH_THRESHOLD);

    Promise.resolve(onRefresh?.())
      .catch(() => undefined)
      .finally(() => {
        settleTimeoutRef.current = window.setTimeout(() => {
          finishPull();
        }, 360);
      });
  };

  const isPullVisible = pullDistance > 0 || isRefreshing;
  const shellStateClassName = [
    'pull-refresh-shell',
    pullDistance > 0 && !isRefreshing ? 'dragging' : '',
    isRefreshing ? 'refreshing' : '',
    isReadyToRefresh ? 'ready' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className={shellStateClassName}
      style={{ '--pull-refresh-offset': `${pullDistance}px` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={finishPull}
    >
      <div className={`pull-refresh-indicator ${isPullVisible ? 'visible' : ''}`} aria-hidden={!isPullVisible}>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
          className={`pull-refresh-icon ${isRefreshing ? 'spinning' : ''}`}
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 5v12m0 0-4-4m4 4 4-4"
          />
        </svg>
        <span className="pull-refresh-label">
          {isRefreshing ? '새로고침 중...' : isReadyToRefresh ? '놓으면 새로고침' : '당겨서 새로고침'}
        </span>
      </div>

      <div className="pull-refresh-content">
        {children}
      </div>
    </div>
  );
};

export default PullToRefreshShell;
