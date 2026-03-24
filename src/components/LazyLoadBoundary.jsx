import React, { Component, Suspense } from 'react';
import './LazyLoadBoundary.css';

const getBoundaryContent = ({
  mode = 'inline',
  isError = false,
  loadingLabel = '불러오는 중이에요.',
  errorTitle = '화면을 불러오지 못했어요.',
  errorMessage = '네트워크 상태를 확인한 뒤 다시 시도해주세요.',
  onDismiss
}) => (
  <div className={`lazy-boundary-shell ${mode}`}>
    <div className="lazy-boundary-card glass-panel" role={isError ? 'alert' : 'status'}>
      {!isError && <div className="lazy-boundary-spinner" aria-hidden="true" />}
      <strong className="lazy-boundary-title">
        {isError ? errorTitle : loadingLabel}
      </strong>
      <p className="lazy-boundary-message">
        {isError ? errorMessage : '잠시만 기다려주세요.'}
      </p>

      {isError && (
        <div className="lazy-boundary-actions">
          <button
            type="button"
            className="lazy-boundary-btn primary"
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
          {onDismiss && (
            <button
              type="button"
              className="lazy-boundary-btn"
              onClick={onDismiss}
            >
              닫기
            </button>
          )}
        </div>
      )}
    </div>
  </div>
);

class LazyErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    const {
      children,
      mode,
      loadingLabel,
      errorTitle,
      errorMessage,
      onDismiss
    } = this.props;

    if (this.state.hasError) {
      return getBoundaryContent({
        mode,
        isError: true,
        loadingLabel,
        errorTitle,
        errorMessage,
        onDismiss
      });
    }

    return children;
  }
}

const LazyLoadBoundary = ({
  children,
  mode = 'inline',
  loadingLabel,
  errorTitle,
  errorMessage,
  onDismiss,
  resetKey
}) => (
  <LazyErrorBoundary
    mode={mode}
    loadingLabel={loadingLabel}
    errorTitle={errorTitle}
    errorMessage={errorMessage}
    onDismiss={onDismiss}
    resetKey={resetKey}
  >
    <Suspense
      fallback={getBoundaryContent({
        mode,
        loadingLabel
      })}
    >
      {children}
    </Suspense>
  </LazyErrorBoundary>
);

export default LazyLoadBoundary;
