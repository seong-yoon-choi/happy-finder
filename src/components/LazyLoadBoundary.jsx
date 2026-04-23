import React, { Component, Suspense } from 'react';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import './LazyLoadBoundary.css';

const DEFAULT_LOADING_LABEL = '\uBD88\uB7EC\uC624\uB294 \uC911\uC774\uC5D0\uC694.';
const DEFAULT_ERROR_TITLE = '\uD654\uBA74\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694.';
const DEFAULT_ERROR_MESSAGE = '\uB124\uD2B8\uC6CC\uD06C \uC0C1\uD0DC\uB97C \uD655\uC778\uD558\uACE0 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.';
const DEFAULT_LOADING_MESSAGE = '\uC7A0\uC2DC\uB9CC \uAE30\uB2E4\uB824\uC8FC\uC138\uC694.';
const RELOAD_LABEL = '\uC0C8\uB85C\uACE0\uCE68';
const CLOSE_LABEL = '\uB2EB\uAE30';

const LazyBoundaryShell = ({
  mode = 'inline',
  isError = false,
  loadingLabel = DEFAULT_LOADING_LABEL,
  errorTitle = DEFAULT_ERROR_TITLE,
  errorMessage = DEFAULT_ERROR_MESSAGE,
  onDismiss
}) => {
  const requestClose = useModalBackNavigation({
    isOpen: mode === 'overlay' && typeof onDismiss === 'function',
    onClose: onDismiss,
    historyKey: isError ? 'lazy-boundary-error' : 'lazy-boundary-loading'
  });

  return (
    <div
      className={`lazy-boundary-shell ${mode}`}
      data-block-pull-refresh={mode === 'overlay' ? 'true' : undefined}
    >
      <div
        className="lazy-boundary-card glass-panel"
        role={isError ? 'alert' : 'status'}
        data-block-pull-refresh={mode === 'overlay' ? 'true' : undefined}
      >
        {!isError && <div className="lazy-boundary-spinner" aria-hidden="true" />}
        <strong className="lazy-boundary-title">
          {isError ? errorTitle : loadingLabel}
        </strong>
        <p className="lazy-boundary-message">
          {isError ? errorMessage : DEFAULT_LOADING_MESSAGE}
        </p>

        {isError && (
          <div className="lazy-boundary-actions">
            <button
              type="button"
              className="lazy-boundary-btn primary"
              onClick={() => window.location.reload()}
            >
              {RELOAD_LABEL}
            </button>
            {onDismiss && (
              <button
                type="button"
                className="lazy-boundary-btn"
                onClick={() => requestClose()}
              >
                {CLOSE_LABEL}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

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
      return (
        <LazyBoundaryShell
          mode={mode}
          isError
          loadingLabel={loadingLabel}
          errorTitle={errorTitle}
          errorMessage={errorMessage}
          onDismiss={onDismiss}
        />
      );
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
      fallback={(
        <LazyBoundaryShell
          mode={mode}
          loadingLabel={loadingLabel}
          onDismiss={onDismiss}
        />
      )}
    >
      {children}
    </Suspense>
  </LazyErrorBoundary>
);

export default LazyLoadBoundary;
