const toStartOfLocalDay = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'string') {
    const dateParts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateParts) {
      const [, year, month, day] = dateParts;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }

  return null;
};

export const getLocalDateKey = (value = new Date()) => {
  const date = toStartOfLocalDay(value);

  if (!date) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
