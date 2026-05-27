export const MAX_RECORD_TAGS = 4;

export const HAPPINESS_TAG_GROUPS = [
  {
    key: 'relation',
    label: '관계',
    tags: ['혼자', '함께']
  },
  {
    key: 'place',
    label: '장소',
    tags: ['실내', '실외']
  },
  {
    key: 'time',
    label: '시간',
    tags: ['짧게', '길게']
  },
  {
    key: 'action',
    label: '행동',
    tags: ['활동적', '휴식']
  }
];

export const HAPPINESS_CORE_TAG_GROUPS = HAPPINESS_TAG_GROUPS;

export const HAPPINESS_TAGS = HAPPINESS_TAG_GROUPS.flatMap(group => group.tags);

export const normalizeGroupedTags = (tags, fallbackTags = [], maxCount = MAX_RECORD_TAGS) => {
  const normalizedTags = normalizeVisibleTags(tags, Infinity);
  const normalizedFallbackTags = normalizeVisibleTags(fallbackTags, Infinity);

  return HAPPINESS_TAG_GROUPS
    .map(group => (
      normalizedTags.find(tag => group.tags.includes(tag))
      || normalizedFallbackTags.find(tag => group.tags.includes(tag))
    ))
    .filter(Boolean)
    .slice(0, maxCount);
};

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
