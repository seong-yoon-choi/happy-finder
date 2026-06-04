import React, { useCallback, useEffect, useRef, useState } from 'react';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import './ImageAdjustModal.css';

const OUTPUT_SIZE = 1200;
const DEFAULT_FRAME_SIZE = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.8;

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
  const dragRef = useRef(null);
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

  if (!isOpen || !imageSrc) {
    return null;
  }

  const displaySize = getDisplaySize({
    naturalWidth: imageSize.width,
    naturalHeight: imageSize.height,
    frameSize,
    zoom
  });

  const handlePointerDown = event => {
    if (isApplying || !imageSize.width || !imageSize.height) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: offset
    };
  };

  const handlePointerMove = event => {
    const dragState = dragRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const nextOffset = {
      x: dragState.startOffset.x + event.clientX - dragState.startX,
      y: dragState.startOffset.y + event.clientY - dragState.startY
    };

    setOffset(getClampedOffset(nextOffset));
  };

  const handlePointerUp = event => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const handleZoomChange = event => {
    const nextZoom = Number(event.target.value);
    setZoom(nextZoom);
    setOffset(prev => getClampedOffset(prev, nextZoom));
  };

  const handleReset = () => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  };

  const handleApply = async () => {
    const imageElement = imageRef.current;

    if (!imageElement || !imageSize.width || !imageSize.height || isApplying) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const sourceX = (displaySize.width / 2 - frameSize / 2 - offset.x) / displaySize.scale;
    const sourceY = (displaySize.height / 2 - frameSize / 2 - offset.y) / displaySize.scale;
    const sourceSize = frameSize / displaySize.scale;

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

        <p className="image-adjust-copy">첫 번째 사진이 리스트에 보입니다. 네모 안에 보일 부분을 맞춰주세요.</p>

        <div
          ref={frameRef}
          className="image-adjust-frame"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
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

        <label className="image-adjust-zoom">
          <span>확대</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.05"
            value={zoom}
            onChange={handleZoomChange}
            disabled={isApplying}
          />
        </label>

        <div className="image-adjust-actions">
          <button type="button" onClick={handleReset} disabled={isApplying}>
            가운데로
          </button>
          <button type="button" onClick={() => requestClose()} disabled={isApplying}>
            취소
          </button>
          <button type="button" className="primary" onClick={handleApply} disabled={isApplying || !imageSize.width}>
            {isApplying ? '적용 중...' : '이대로 사용'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageAdjustModal;
