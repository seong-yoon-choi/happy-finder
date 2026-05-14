export const MAX_RECORD_TAGS = 3;

export const HAPPINESS_TAG_GROUPS = [
  {
    label: '상황',
    tags: ['혼자', '함께', '실내', '실외']
  },
  {
    label: '조건',
    tags: ['짧게', '길게', '무료', '유료']
  },
  {
    label: '상태',
    tags: ['활동적', '휴식']
  },
  {
    label: '감정',
    tags: ['즐거움', '편안함', '설렘', '뿌듯함', '위로', '감동', '새로움']
  }
];

export const HAPPINESS_TAGS = HAPPINESS_TAG_GROUPS.flatMap(group => group.tags);

export const normalizeVisibleTags = (tags, maxCount = Infinity) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  const seenTags = new Set();
  const normalizedTags = [];

  tags.forEach(tag => {
    const normalizedTag = typeof tag === 'string' ? tag.trim() : '';

    if (!normalizedTag || !HAPPINESS_TAGS.includes(normalizedTag) || seenTags.has(normalizedTag)) {
      return;
    }

    seenTags.add(normalizedTag);
    normalizedTags.push(normalizedTag);
  });

  return normalizedTags.slice(0, maxCount);
};
