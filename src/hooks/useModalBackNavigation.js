import { useCallback, useEffect, useRef } from 'react';

const MODAL_HISTORY_STATE_KEY = '__happyFinderModalKey';

let modalHistorySequence = 0;
const activeModalKeys = new Set();

const normalizeHistoryState = state => (
  state && typeof state === 'object' ? state : {}
);

const getModalHistoryKey = state => {
  const normalizedState = normalizeHistoryState(state);
  const modalHistoryKey = normalizedState[MODAL_HISTORY_STATE_KEY];

  return typeof modalHistoryKey === 'string' ? modalHistoryKey : null;
};

const getCurrentUrl = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

const useModalBackNavigation = ({
  isOpen,
  onClose,
  canClose = true,
  historyKey = 'modal'
}) => {
  const onCloseRef = useRef(onClose);
  const afterCloseRef = useRef(null);
  const modalEntryKeyRef = useRef(null);
  const hasHistoryEntryRef = useRef(false);
  const cleanupTimeoutRef = useRef(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const clearPendingCleanup = useCallback(() => {
    if (!cleanupTimeoutRef.current) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.clearTimeout(cleanupTimeoutRef.current);
    }

    cleanupTimeoutRef.current = null;
  }, []);

  const finalizeClose = useCallback(() => {
    const afterClose = afterCloseRef.current;

    afterCloseRef.current = null;
    onCloseRef.current?.();
    afterClose?.();
  }, []);

  const requestClose = useCallback(afterClose => {
    if (!canClose) {
      return;
    }

    clearPendingCleanup();
    afterCloseRef.current = typeof afterClose === 'function' ? afterClose : null;

    if (typeof window === 'undefined') {
      finalizeClose();
      return;
    }

    const modalEntryKey = modalEntryKeyRef.current;
    const currentStateModalKey = getModalHistoryKey(window.history.state);

    if (hasHistoryEntryRef.current && modalEntryKey && currentStateModalKey === modalEntryKey) {
      window.history.back();
      return;
    }

    hasHistoryEntryRef.current = false;
    modalEntryKeyRef.current = null;
    finalizeClose();
  }, [canClose, clearPendingCleanup, finalizeClose]);

  useEffect(() => {
    if (!isOpen || !canClose || typeof window === 'undefined') {
      return undefined;
    }

    clearPendingCleanup();

    const modalEntryKey = `${historyKey}:${modalHistorySequence += 1}`;
    const currentHistoryModalKey = getModalHistoryKey(window.history.state);
    const shouldReplaceCurrentEntry = Boolean(
      currentHistoryModalKey && !activeModalKeys.has(currentHistoryModalKey)
    );

    modalEntryKeyRef.current = modalEntryKey;
    hasHistoryEntryRef.current = true;
    activeModalKeys.add(modalEntryKey);

    window.history[shouldReplaceCurrentEntry ? 'replaceState' : 'pushState'](
      {
        ...normalizeHistoryState(window.history.state),
        [MODAL_HISTORY_STATE_KEY]: modalEntryKey
      },
      '',
      getCurrentUrl()
    );

    const handlePopState = () => {
      if (!hasHistoryEntryRef.current || modalEntryKeyRef.current !== modalEntryKey) {
        return;
      }

      clearPendingCleanup();

      if (getModalHistoryKey(window.history.state) === modalEntryKey) {
        return;
      }

      hasHistoryEntryRef.current = false;
      modalEntryKeyRef.current = null;
      activeModalKeys.delete(modalEntryKey);
      finalizeClose();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      afterCloseRef.current = null;
      clearPendingCleanup();

      if (!hasHistoryEntryRef.current || modalEntryKeyRef.current !== modalEntryKey) {
        activeModalKeys.delete(modalEntryKey);
        return;
      }

      const shouldRewindHistory = getModalHistoryKey(window.history.state) === modalEntryKey;
      hasHistoryEntryRef.current = false;
      modalEntryKeyRef.current = null;
      activeModalKeys.delete(modalEntryKey);

      if (shouldRewindHistory) {
        cleanupTimeoutRef.current = window.setTimeout(() => {
          cleanupTimeoutRef.current = null;

          if (getModalHistoryKey(window.history.state) === modalEntryKey) {
            window.history.back();
          }
        }, 0);
      }
    };
  }, [canClose, clearPendingCleanup, finalizeClose, historyKey, isOpen]);

  return requestClose;
};

export default useModalBackNavigation;
