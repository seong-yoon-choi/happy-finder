const normalizeSharePart = value => (
  typeof value === 'string' ? value.trim() : ''
);

const buildFallbackShareText = ({ title = '', text = '', url = '' } = {}) => (
  [normalizeSharePart(title), normalizeSharePart(text), normalizeSharePart(url)]
    .filter(Boolean)
    .join('\n\n')
);

const copyTextWithTextarea = text => {
  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
};

export const shareTextContent = async ({ title = '', text = '', url = '' } = {}) => {
  const normalizedTitle = normalizeSharePart(title);
  const normalizedText = normalizeSharePart(text);
  const normalizedUrl = normalizeSharePart(url);
  const fallbackText = buildFallbackShareText({
    title: normalizedTitle,
    text: normalizedText,
    url: normalizedUrl
  });

  if (!fallbackText) {
    return { success: false, code: 'EMPTY' };
  }

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        ...(normalizedTitle ? { title: normalizedTitle } : {}),
        ...(normalizedText ? { text: normalizedText } : {}),
        ...(normalizedUrl ? { url: normalizedUrl } : {})
      });

      return { success: true, method: 'native' };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { success: false, code: 'CANCELLED' };
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(fallbackText);
      return { success: true, method: 'clipboard' };
    } catch {
      // Fall through to the textarea fallback for older webviews.
    }
  }

  if (copyTextWithTextarea(fallbackText)) {
    return { success: true, method: 'clipboard' };
  }

  return { success: false, code: 'FAILED' };
};
