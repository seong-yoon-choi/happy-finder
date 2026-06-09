import React, { useCallback, useEffect, useRef, useState } from 'react';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import './ImageAdjustModal.css';

const OUTPUT_SIZE = 1200;
const DEFAULT_FRAME_SIZE = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3.4;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getDisplaySize = ({ naturalWidth, naturalHeight, frameSize, zoom }) => {
  if (!naturalWidth || !naturalHeight || !frameSize) {
    return { width: frameSize, height: frameSize, scale: 1 };
  }

  const baseScale = Math.max(frameSize / naturalWidth, frameSize / naturalHeight);
  const scale = baseScale * zoom;

  return {
    width: naturalWidth * scale,
    height: naturalHeight * scale,
    scale
  };
};

const getPointDistance = (leftPoint, rightPoint) => (
  Math.hypot(rightPoint.x - leftPoint.x, rightPoint.y - leftPoint.y)
);

const getPointCenter = (leftPoint, rightPoint) => ({
  x: (leftPoint.x + rightPoint.x) / 2,
  y: (leftPoint.y + rightPoint.y) / 2
});

const getFirstTwoPoints = pointers => Array.from(pointers.values()).slice(0, 2);

const getTouchPoint = touch => ({
  id: touch.identifier,
  x: touch.clientX,
  y: touch.clientY
});

const ImageAdjustModal = ({
  isOpen,
  imageSrc,
  title = '사진 맞추기',
  isApplying = false,
  onCancel,
  onApply
}) => {
  const frameRef = useRef(null);
  const imageRef = useRef(null);
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const [frameSize, setFrameSize] = useState(DEFAULT_FRAME_SIZE);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const getClampedOffset = useCallback((nextOffset, nextZoom = zoom) => {
    const displaySize = getDisplaySize({
      naturalWidth: imageSize.width,
      naturalHeight: imageSize.height,
      frameSize,
      zoom: nextZoom
    });
    const maxX = Math.max(0, (displaySize.width - frameSize) / 2);
    const maxY = Math.max(0, (displaySize.height - frameSize) / 2);

    return {
      x: clamp(nextOffset.x, -maxX, maxX),
      y: clamp(nextOffset.y, -maxY, maxY)
    };
  }, [frameSize, imageSize.height, imageSize.width, zoom]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const measureFrame = () => {
      const measuredSize = frameRef.current?.getBoundingClientRect().width || DEFAULT_FRAME_SIZE;
      setFrameSize(measuredSize);
    };

    measureFrame();
    window.addEventListener('resize', measureFrame);

    return () => window.removeEventListener('resize', measureFrame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    pointersRef.current.clear();
    gestureRef.current = null;
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    setImageSize({ width: 0, height: 0 });
  }, [imageSrc, isOpen]);

  useEffect(() => {
    setOffset(prev => getClampedOffset(prev));
  }, [frameSize, getClampedOffset, imageSize, zoom]);

  const requestClose = useModalBackNavigation({
    isOpen,
    onClose: onCancel,
    canClose: !isApplying,
    historyKey: 'image-adjust'
  });

  const displaySize = getDisplaySize({
    naturalWidth: imageSize.width,
    naturalHeight: imageSize.height,
    frameSize,
    zoom
  });

  const startPanGesture = point => {
    if (!point) {
      gestureRef.current = null;
      return;
    }

    gestureRef.current = {
      type: 'pan',
      pointerId: point.id,
      startPoint: point,
      startOffset: offset
    };
  };

  const startPinchGesture = points => {
    const [firstPoint, secondPoint] = points;
    const center = getPointCenter(firstPoint, secondPoint);

    gestureRef.current = {
      type: 'pinch',
      startDistance: Math.max(1, getPointDistance(firstPoint, secondPoint)),
      startCenter: center,
      startZoom: zoom,
      startOffset: offset
    };
  };

  const updateGestureFromPoints = () => {
    const points = getFirstTwoPoints(pointersRef.current);
    const gesture = gestureRef.current;

    if (points.length >= 2) {
      if (!gesture || gesture.type !== 'pinch') {
        startPinchGesture(points);
        return;
      }

      const [firstPoint, secondPoint] = points;
      const center = getPointCenter(firstPoint, secondPoint);
      const distance = Math.max(1, getPointDistance(firstPoint, secondPoint));
      const nextZoom = clamp(gesture.startZoom * (distance / gesture.startDistance), MIN_ZOOM, MAX_ZOOM);
      const nextOffset = {
        x: gesture.startOffset.x + center.x - gesture.startCenter.x,
        y: gesture.startOffset.y + center.y - gesture.startCenter.y
      };

      setZoom(nextZoom);
      setOffset(getClampedOffset(nextOffset, nextZoom));
      return;
    }

    if (points.length === 1) {
      if (!gesture || gesture.type !== 'pan') {
        startPanGesture(points[0]);
        return;
      }

      const [point] = points;
      const nextOffset = {
        x: gesture.startOffset.x + point.x - gesture.startPoint.x,
        y: gesture.startOffset.y + point.y - gesture.startPoint.y
      };

      setOffset(getClampedOffset(nextOffset));
      return;
    }

    gestureRef.current = null;
  };

  const finishGesturePoint = id => {
    if (!pointersRef.current.has(id)) {
      return;
    }

    pointersRef.current.delete(id);
    const points = getFirstTwoPoints(pointersRef.current);

    if (points.length >= 2) {
      startPinchGesture(points);
      return;
    }

    if (points.length === 1) {
      startPanGesture(points[0]);
      return;
    }

    gestureRef.current = null;
  };

  const canAdjustImage = !isApplying && imageSize.width > 0 && imageSize.height > 0;

  const handlePointerDown = event => {
    if (event.pointerType === 'touch' || !canAdjustImage) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY
    });
    updateGestureFromPoints();
  };

  const handlePointerMove = event => {
    if (event.pointerType === 'touch' || !pointersRef.current.has(event.pointerId)) {
      return;
    }

    event.preventDefault();
    pointersRef.current.set(event.pointerId, {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY
    });
    updateGestureFromPoints();
  };

  const handlePointerUp = event => {
    if (event.pointerType === 'touch') {
      return;
    }

    finishGesturePoint(event.pointerId);
  };

  const handleTouchStart = event => {
    if (!canAdjustImage) {
      return;
    }

    event.preventDefault();
    Array.from(event.changedTouches).forEach(touch => {
      pointersRef.current.set(touch.identifier, getTouchPoint(touch));
    });
    updateGestureFromPoints();
  };

  const handleTouchMove = event => {
    if (pointersRef.current.size === 0) {
      return;
    }

    event.preventDefault();
    Array.from(event.changedTouches).forEach(touch => {
      if (pointersRef.current.has(touch.identifier)) {
        pointersRef.current.set(touch.identifier, getTouchPoint(touch));
      }
    });
    updateGestureFromPoints();
  };

  const handleTouchEnd = event => {
    Array.from(event.changedTouches).forEach(touch => {
      finishGesturePoint(touch.identifier);
    });
  };

  const handleWheel = event => {
    if (!canAdjustImage) {
      return;
    }

    event.preventDefault();
    const nextZoom = clamp(zoom + (event.deltaY > 0 ? -0.08 : 0.08), MIN_ZOOM, MAX_ZOOM);
    setZoom(nextZoom);
    setOffset(prev => getClampedOffset(prev, nextZoom));
  };

  const handleReset = () => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  };

  const handleApply = async () => {
    const imageElement = imageRef.current;

    if (!imageElement || isApplying) {
      return;
    }

    const naturalWidth = imageSize.width || imageElement.naturalWidth;
    const naturalHeight = imageSize.height || imageElement.naturalHeight;

    if (!naturalWidth || !naturalHeight) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const currentDisplaySize = getDisplaySize({
      naturalWidth,
      naturalHeight,
      frameSize,
      zoom
    });
    const sourceX = (currentDisplaySize.width / 2 - frameSize / 2 - offset.x) / currentDisplaySize.scale;
    const sourceY = (currentDisplaySize.height / 2 - frameSize / 2 - offset.y) / currentDisplaySize.scale;
    const sourceSize = frameSize / currentDisplaySize.scale;

    context.fillStyle = '#f9f7ed';
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(
      imageElement,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE
    );

    await onApply?.(canvas.toDataURL('image/jpeg', 0.86));
  };

  if (!isOpen || !imageSrc) {
    return null;
  }

  return (
    <div
      className="image-adjust-overlay"
      data-block-pull-refresh="true"
      onClick={() => requestClose()}
    >
      <div
        className="image-adjust-modal"
        data-block-pull-refresh="true"
        onClick={event => event.stopPropagation()}
      >
        <div className="image-adjust-header">
          <div>
            <span>IMAGE</span>
            <h3>{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => requestClose()}
            disabled={isApplying}
            aria-label="사진 조정 닫기"
          >
            &times;
          </button>
        </div>

        <p className="image-adjust-copy">사진을 움직여 네모 안에 보일 부분을 맞춰주세요. 두 손가락을 벌리면 확대되고 모으면 축소됩니다.</p>

        <div
          ref={frameRef}
          className="image-adjust-frame"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onWheel={handleWheel}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt=""
            draggable="false"
            onLoad={event => {
              setImageSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight
              });
            }}
            style={{
              width: `${displaySize.width}px`,
              height: `${displaySize.height}px`,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`
            }}
          />
          <span className="image-adjust-grid" aria-hidden="true" />
        </div>

        <div className="image-adjust-actions">
          <button type="button" onClick={handleReset} disabled={isApplying}>
            가운데로
          </button>
          <button type="button" onClick={() => requestClose()} disabled={isApplying}>
            취소
          </button>
          <button type="button" className="primary" onClick={handleApply} disabled={isApplying}>
            {isApplying ? '적용 중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageAdjustModal;
