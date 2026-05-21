import React, { useMemo } from 'react';
import { HAPPINESS_TAG_GROUPS, HAPPINESS_TAGS, normalizeVisibleTags } from '../lib/happinessTags';
import { useHappy } from '../store/HappyContext';
import './Analysis.css';

const TAG_COLORS = [
  '#3f8f46',
  '#78a75b',
  '#4d9c9f',
  '#d98859',
  '#f2b84b',
  '#6f9e45',
  '#508fb8',
  '#a49d4f',
  '#e0a33c',
  '#6aac6e',
  '#c07b95',
  '#7b9fca',
  '#b7b84d'
];

const tagMetaMap = new Map(
  HAPPINESS_TAG_GROUPS.flatMap(group => (
    group.tags.map(tag => [tag, { group: group.label }])
  ))
);

const tagColorMap = new Map(
  HAPPINESS_TAGS.map((tag, index) => [tag, TAG_COLORS[index % TAG_COLORS.length]])
);

const createTagCounter = () => (
  new Map(HAPPINESS_TAGS.map(tag => [
    tag,
    {
      label: tag,
      group: tagMetaMap.get(tag)?.group || '태그',
      color: tagColorMap.get(tag) || TAG_COLORS[0],
      count: 0
    }
  ]))
);

const addTagsToCounter = (counter, tags, amount = 1) => {
  normalizeVisibleTags(tags, Infinity).forEach(tag => {
    const current = counter.get(tag);

    if (!current) {
      return;
    }

    counter.set(tag, {
      ...current,
      count: current.count + amount
    });
  });
};

const getSortedTagStats = (counter, limit = Infinity) => (
  Array.from(counter.values())
    .filter(tag => tag.count > 0)
    .sort((left, right) => (
      right.count - left.count || HAPPINESS_TAGS.indexOf(left.label) - HAPPINESS_TAGS.indexOf(right.label)
    ))
    .slice(0, limit)
);

const getItemTags = item => normalizeVisibleTags(item?.tags, Infinity);

const buildItemSource = ({ title, description, items = [] }) => {
  const counter = createTagCounter();

  items.forEach(item => {
    addTagsToCounter(counter, getItemTags(item));
  });

  return {
    title,
    description,
    countLabel: `${items.length}개`,
    tags: getSortedTagStats(counter, 5)
  };
};

const buildRecordSource = records => {
  const counter = createTagCounter();
  const linkedRecords = records.filter(record => record.sourceType === 'list');

  linkedRecords.forEach(record => {
    const itemTags = getItemTags(record.item);
    const recordTags = itemTags.length > 0
      ? itemTags
      : normalizeVisibleTags(record.tags, Infinity);

    addTagsToCounter(counter, recordTags);
  });

  return {
    title: '행복 메모',
    description: '행복 리스트에 남긴 기록',
    countLabel: `${linkedRecords.length}개`,
    tags: getSortedTagStats(counter, 5)
  };
};

const getTagChartGradient = tagStats => {
  const totalCount = tagStats.reduce((sum, tag) => sum + tag.count, 0);

  if (totalCount <= 0) {
    return 'conic-gradient(rgba(76, 163, 58, 0.14) 0deg 360deg)';
  }

  let cursor = 0;
  const segments = tagStats.map(tag => {
    const start = cursor;
    const end = cursor + (tag.count / totalCount) * 360;
    cursor = end;
    return `${tag.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${segments.join(', ')})`;
};

const getTagPercentage = (tag, totalCount) => (
  totalCount > 0 ? Math.round((tag.count / totalCount) * 100) : 0
);

const getRecommendationItems = ({ items, topTags, userFavorites, userEmpathies, myItems }) => {
  if (!Array.isArray(items) || items.length === 0 || topTags.length === 0) {
    return [];
  }

  const myItemIds = new Set(myItems.map(item => item.id));
  const usedItemIds = new Set([
    ...Object.entries(userFavorites || {}).filter(([, value]) => value).map(([id]) => id),
    ...Object.entries(userEmpathies || {}).filter(([, value]) => value).map(([id]) => id),
    ...myItemIds
  ]);
  const topTagSet = new Set(topTags.slice(0, 3).map(tag => tag.label));

  return items
    .filter(item => !usedItemIds.has(item.id))
    .filter(item => getItemTags(item).some(tag => topTagSet.has(tag)))
    .slice(0, 3);
};

const buildAnalysisModel = ({ records, items, favoriteItems, myItems, userEmpathies, userFavorites }) => {
  const empathyItems = items.filter(item => userEmpathies?.[item.id]);
  const sources = [
    buildItemSource({
      title: '즐겨찾기',
      description: '마음에 들어 저장한 행복',
      items: favoriteItems
    }),
    buildItemSource({
      title: '내가 만든 행복',
      description: '직접 만든 행복 리스트',
      items: myItems
    }),
    buildRecordSource(records),
    buildItemSource({
      title: '공감',
      description: '따뜻한 흔적을 남긴 행복',
      items: empathyItems
    })
  ];

  const combinedCounter = createTagCounter();
  sources.forEach(source => {
    source.tags.forEach(tag => {
      addTagsToCounter(combinedCounter, [tag.label], tag.count);
    });
  });

  const topTags = getSortedTagStats(combinedCounter, 8);
  const totalSignals = topTags.reduce((sum, tag) => sum + tag.count, 0);
  const primaryTag = topTags[0] || null;
  const recommendationItems = getRecommendationItems({
    items,
    topTags,
    userFavorites,
    userEmpathies,
    myItems
  });

  const styleTitle = primaryTag
    ? `${primaryTag.label} 쪽 행복이 자주 보여요`
    : '분석할 행복 데이터가 아직 충분하지 않아요';
  const styleDescription = primaryTag
    ? `즐겨찾기, 내가 만든 행복, 행복 메모, 공감에서 ${totalSignals}개의 태그 흐름을 모았어요.`
    : '즐겨찾기, 공감, 행복 메모, 내가 만든 행복이 쌓이면 2차 태그 기준으로 흐름을 보여줄게요.';

  return {
    sources,
    topTags,
    totalSignals,
    primaryTag,
    styleTitle,
    styleDescription,
    recommendationItems
  };
};

const Analysis = () => {
  const {
    getAllRecords,
    getFavoriteItems,
    getMyItems,
    items,
    userEmpathies,
    userFavorites
  } = useHappy();

  const records = getAllRecords();
  const favoriteItems = getFavoriteItems();
  const myItems = getMyItems();
  const analysis = useMemo(
    () => buildAnalysisModel({
      records,
      items,
      favoriteItems,
      myItems,
      userEmpathies,
      userFavorites
    }),
    [records, items, favoriteItems, myItems, userEmpathies, userFavorites]
  );
  const chartGradient = getTagChartGradient(analysis.topTags);

  return (
    <div className="view-container analysis-view">
      <header className="analysis-header">
        <div className="analysis-brand" aria-label="Happy Finder 로고">Happy Finder</div>
        <div>
          <h2>분석</h2>
          <p>내 행복의 태그 흐름을 한눈에 정리합니다.</p>
        </div>
      </header>

      <main className="analysis-sections">
        <section className="analysis-style-section">
          <div className="analysis-section-head">
            <span>STYLE</span>
            <h3>나의 행복 스타일</h3>
          </div>
          <div className="analysis-style-body">
            <div className="analysis-style-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path
                  d="M12 20C8.25 17.15 5 14.35 5 10.75C5 8.4 6.7 6.75 8.9 6.75C10.15 6.75 11.25 7.35 12 8.3C12.75 7.35 13.85 6.75 15.1 6.75C17.3 6.75 19 8.4 19 10.75C19 14.35 15.75 17.15 12 20Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <strong>{analysis.styleTitle}</strong>
              <p>{analysis.styleDescription}</p>
            </div>
          </div>
        </section>

        <section className="analysis-tag-section">
          <div className="analysis-section-head">
            <span>TAGS</span>
            <h3>자주 만난 태그</h3>
          </div>

          {analysis.topTags.length > 0 ? (
            <div className="analysis-tag-layout">
              <div className="analysis-donut" style={{ '--analysis-chart': chartGradient }}>
                <div>
                  <strong>{analysis.totalSignals}</strong>
                  <span>흔적</span>
                </div>
              </div>

              <div className="analysis-tag-list">
                {analysis.topTags.slice(0, 6).map(tag => (
                  <div key={tag.label} className="analysis-tag-row">
                    <div className="analysis-tag-label">
                      <i style={{ background: tag.color }} aria-hidden="true" />
                      <span>{tag.label}</span>
                    </div>
                    <div className="analysis-tag-bar" aria-hidden="true">
                      <span
                        style={{
                          width: `${getTagPercentage(tag, analysis.totalSignals)}%`,
                          background: tag.color
                        }}
                      />
                    </div>
                    <strong>{getTagPercentage(tag, analysis.totalSignals)}%</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="analysis-empty-line">분석할 행복 데이터가 아직 충분하지 않아요.</p>
          )}
        </section>

        <section className="analysis-source-section">
          <div className="analysis-section-head">
            <span>SOURCES</span>
            <h3>기준별 태그</h3>
          </div>

          <div className="analysis-source-grid">
            {analysis.sources.map(source => (
              <article key={source.title} className="analysis-source-card">
                <div>
                  <strong>{source.title}</strong>
                  <small>{source.countLabel}</small>
                </div>
                <p>{source.description}</p>
                {source.tags.length > 0 ? (
                  <div className="analysis-mini-chip-list">
                    {source.tags.map(tag => (
                      <span key={tag.label}>
                        {tag.label}
                        <small>{tag.count}</small>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="analysis-source-empty">아직 태그가 없어요.</span>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="analysis-recommend-section">
          <div className="analysis-section-head">
            <span>NEXT</span>
            <h3>비슷하게 살펴볼 행복</h3>
          </div>

          {analysis.recommendationItems.length > 0 ? (
            <div className="analysis-recommend-list">
              {analysis.recommendationItems.map(item => (
                <article key={item.id} className="analysis-recommend-card">
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="analysis-empty-line">태그 흐름이 쌓이면 비슷한 행복을 보여줄게요.</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default Analysis;
