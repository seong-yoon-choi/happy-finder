import React, { lazy, useMemo, useState } from 'react';
import LazyLoadBoundary from '../components/LazyLoadBoundary';
import { HAPPINESS_TAG_GROUPS, HAPPINESS_TAGS, normalizeVisibleTags } from '../lib/happinessTags';
import { useHappy } from '../store/HappyContext';
import './Analysis.css';

const HappinessDetailModal = lazy(() => import('../components/HappinessDetailModal'));

const ANALYSIS_MIN_SIGNAL_COUNT = 6;

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

const getLinkedRecordTags = record => {
  const itemTags = getItemTags(record.item);

  return itemTags.length > 0
    ? itemTags
    : normalizeVisibleTags(record.tags, Infinity);
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

const getStyleProfile = topTags => {
  const tagSet = new Set(topTags.map(tag => tag.label));
  const hasAny = (...tags) => tags.some(tag => tagSet.has(tag));

  if (hasAny('휴식', '편안함') && hasAny('혼자', '실내')) {
    return {
      title: '차분한 회복형 행복',
      focus: '조용한 환경에서 에너지를 회복하는 활동',
      advice: '큰 자극보다 부담 없이 반복할 수 있는 루틴을 쌓을수록 만족도가 안정적으로 높아질 가능성이 큽니다.'
    };
  }

  if (hasAny('함께') && hasAny('즐거움', '감동', '위로')) {
    return {
      title: '관계 공감형 행복',
      focus: '사람과의 연결 속에서 감정이 따뜻해지는 활동',
      advice: '혼자 완성하는 활동보다 누군가와 나누고 반응을 주고받는 순간에서 행복 신호가 강해지는 편입니다.'
    };
  }

  if (hasAny('활동적', '실외') && hasAny('설렘', '새로움', '즐거움')) {
    return {
      title: '경험 확장형 행복',
      focus: '몸을 움직이거나 새로운 장면을 만나는 활동',
      advice: '익숙한 일상 안에서도 장소, 속도, 동선을 조금 바꾸면 행복을 발견할 가능성이 높아집니다.'
    };
  }

  if (hasAny('짧게', '무료') && hasAny('혼자', '실내', '휴식')) {
    return {
      title: '일상 발견형 행복',
      focus: '시간과 비용의 부담 없이 바로 시작할 수 있는 활동',
      advice: '작은 행동을 자주 반복하는 방식이 잘 맞기 때문에 짧은 기록을 꾸준히 남기는 것이 분석 정확도를 높입니다.'
    };
  }

  if (hasAny('뿌듯함') && hasAny('길게', '활동적', '새로움')) {
    return {
      title: '성장 실감형 행복',
      focus: '해냈다는 감각이 남는 활동',
      advice: '완료한 흔적이 남는 행복을 더 자주 기록하면 본인이 어떤 성취에서 힘을 얻는지 더 선명해집니다.'
    };
  }

  return {
    title: topTags[0] ? `${topTags[0].label} 중심형 행복` : '행복 스타일 분석 대기',
    focus: '반복적으로 선택한 태그가 포함된 활동',
    advice: '더 많은 기록과 공감이 쌓이면 태그 조합을 기준으로 행복 스타일을 더 구체적으로 분리할 수 있습니다.'
  };
};

const buildStyleSummary = ({ nickname, topTags, totalSignals }) => {
  if (topTags.length === 0) {
    return {
      title: '행복 스타일 분석 대기',
      description: '아직 분석할 수 있는 태그 흐름이 충분하지 않습니다.'
    };
  }

  const profile = getStyleProfile(topTags);
  const selectedTags = topTags.slice(0, 3);
  const tagPhrase = selectedTags.map(tag => tag.label).join(', ');
  const strongestTag = selectedTags[0]?.label || '행복';
  const secondaryText = selectedTags.length > 1
    ? `${selectedTags.slice(1).map(tag => tag.label).join(', ')} 태그가 함께 따라옵니다`
    : '아직 함께 묶을 보조 태그는 더 쌓이는 중입니다';

  return {
    title: profile.title,
    description: `${nickname}님은 ${tagPhrase} 태그가 들어있는 활동을 자주 선택하는 것으로 보아 ${profile.focus}을 좋아하는 스타일입니다. 현재 ${totalSignals}개의 태그 신호 중 ${strongestTag} 태그가 가장 강하게 나타나고, ${secondaryText}. ${profile.advice}`
  };
};

const rotateItems = (items, seed) => {
  if (items.length <= 1) {
    return items;
  }

  const offset = seed % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
};

const getRecommendationItems = ({
  items,
  topTags,
  userFavorites,
  userEmpathies,
  myItems,
  recordedItemIds,
  refreshSeed
}) => {
  if (!Array.isArray(items) || items.length === 0 || topTags.length === 0) {
    return [];
  }

  const myItemIds = new Set(myItems.map(item => item.id));
  const usedItemIds = new Set([
    ...Object.entries(userFavorites || {}).filter(([, value]) => value).map(([id]) => id),
    ...Object.entries(userEmpathies || {}).filter(([, value]) => value).map(([id]) => id),
    ...myItemIds,
    ...recordedItemIds
  ]);
  const topTagWeights = new Map(topTags.slice(0, 5).map((tag, index) => [tag.label, 5 - index]));

  const scoredItems = items
    .filter(item => !usedItemIds.has(item.id))
    .map(item => {
      const score = getItemTags(item).reduce((sum, tag) => (
        sum + (topTagWeights.get(tag) || 0)
      ), 0);

      return { item, score };
    })
    .filter(entry => entry.score > 0)
    .sort((left, right) => right.score - left.score || String(left.item.title).localeCompare(String(right.item.title), 'ko'));

  const poolSize = Math.min(Math.max(6, 3), scoredItems.length);
  const recommendationPool = scoredItems.slice(0, poolSize).map(entry => entry.item);

  return rotateItems(recommendationPool, refreshSeed).slice(0, 3);
};

const buildAnalysisModel = ({
  records,
  items,
  favoriteItems,
  myItems,
  userEmpathies,
  userFavorites,
  authUserNickname,
  refreshSeed
}) => {
  const linkedRecords = records.filter(record => record.sourceType === 'list');
  const recordedItemIds = new Set(linkedRecords.map(record => record.itemId).filter(Boolean));
  const empathyItems = items.filter(item => userEmpathies?.[item.id]);
  const combinedCounter = createTagCounter();

  favoriteItems.forEach(item => addTagsToCounter(combinedCounter, getItemTags(item)));
  myItems.forEach(item => addTagsToCounter(combinedCounter, getItemTags(item)));
  empathyItems.forEach(item => addTagsToCounter(combinedCounter, getItemTags(item)));
  linkedRecords.forEach(record => addTagsToCounter(combinedCounter, getLinkedRecordTags(record)));

  const allTagStats = getSortedTagStats(combinedCounter);
  const topTags = allTagStats.slice(0, 6);
  const totalSignals = allTagStats.reduce((sum, tag) => sum + tag.count, 0);
  const nickname = typeof authUserNickname === 'string' && authUserNickname.trim()
    ? authUserNickname.trim()
    : '사용자';
  const styleSummary = buildStyleSummary({
    nickname,
    topTags: topTags.slice(0, 3),
    totalSignals
  });
  const recommendationItems = getRecommendationItems({
    items,
    topTags,
    userFavorites,
    userEmpathies,
    myItems,
    recordedItemIds,
    refreshSeed
  });

  return {
    allTagStats,
    topTags,
    totalSignals,
    styleSummary,
    recommendationItems,
    isLocked: totalSignals < ANALYSIS_MIN_SIGNAL_COUNT
  };
};

const Analysis = () => {
  const {
    authUserNickname,
    getAllRecords,
    getFavoriteItems,
    getMyItems,
    items,
    userEmpathies,
    userFavorites
  } = useHappy();
  const [recommendationRefreshSeed, setRecommendationRefreshSeed] = useState(0);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

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
      userFavorites,
      authUserNickname,
      refreshSeed: recommendationRefreshSeed
    }),
    [
      records,
      items,
      favoriteItems,
      myItems,
      userEmpathies,
      userFavorites,
      authUserNickname,
      recommendationRefreshSeed
    ]
  );
  const chartGradient = getTagChartGradient(analysis.allTagStats);

  const handleRefreshRecommendations = () => {
    setRecommendationRefreshSeed(prevSeed => prevSeed + 1);
  };

  const handleCloseRecommendation = () => {
    setSelectedRecommendation(null);
  };

  return (
    <div className="view-container analysis-view">
      <header className="analysis-header">
        <div className="analysis-brand" aria-label="Happy Finder 로고">Happy Finder</div>
        <div>
          <h2>분석</h2>
          <p>내 행복의 태그 흐름을 한눈에 정리합니다.</p>
        </div>
      </header>

      {analysis.isLocked ? (
        <main className="analysis-sections analysis-locked-wrap">
          <section className="analysis-locked-card">
            <strong>아직 분석 기록이 부족해요.</strong>
            <p>더 많은 기록과 공감이 필요해요. 행복 메모, 즐겨찾기, 공감이 6개 이상 쌓이면 분석을 보여줄게요.</p>
          </section>
        </main>
      ) : (
        <main className="analysis-sections">
          <section className="analysis-style-section">
            <div className="analysis-section-head">
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
                <strong>{analysis.styleSummary.title}</strong>
                <p>{analysis.styleSummary.description}</p>
              </div>
            </div>
          </section>

          <section className="analysis-tag-section">
            <div className="analysis-section-head">
              <h3>주요 태그 분포</h3>
            </div>

            <div className="analysis-tag-layout">
              <div className="analysis-donut" style={{ '--analysis-chart': chartGradient }}>
                <div>
                  <strong>{analysis.totalSignals}</strong>
                  <span>태그 신호</span>
                </div>
              </div>

              <div className="analysis-tag-list">
                {analysis.topTags.map(tag => (
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
          </section>

          <section className="analysis-recommend-section">
            <div className="analysis-section-head analysis-section-head-row">
              <h3>추천 행복</h3>
              <button
                type="button"
                className="analysis-refresh-btn"
                onClick={handleRefreshRecommendations}
                aria-label="추천 행복 새로고침"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M20 12a8 8 0 0 1-13.65 5.65M4 12A8 8 0 0 1 17.65 6.35M18 3v4h-4M6 21v-4h4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {analysis.recommendationItems.length > 0 ? (
              <div className="analysis-recommend-list">
                {analysis.recommendationItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="analysis-recommend-card"
                    onClick={() => setSelectedRecommendation(item)}
                  >
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="analysis-empty-line">아직 추천할 행복이 부족해요. 기록과 공감을 조금 더 쌓아주세요.</p>
            )}
          </section>
        </main>
      )}

      {selectedRecommendation && (
        <LazyLoadBoundary
          mode="overlay"
          loadingLabel="행복 상세 화면을 불러오는 중이에요."
          errorTitle="행복 상세 화면을 열지 못했어요."
          errorMessage="잠시 후 다시 시도해주세요."
          onDismiss={handleCloseRecommendation}
          resetKey={`analysis-recommend-${selectedRecommendation.id}`}
        >
          <HappinessDetailModal
            item={selectedRecommendation}
            isOpen={Boolean(selectedRecommendation)}
            onClose={handleCloseRecommendation}
            canDelete={false}
          />
        </LazyLoadBoundary>
      )}
    </div>
  );
};

export default Analysis;
