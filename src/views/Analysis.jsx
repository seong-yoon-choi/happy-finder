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
  const primaryTag = topTags[0]?.label || '';

  if (primaryTag === '혼자' || (hasAny('혼자') && hasAny('휴식', '편안함', '실내', '뿌듯함'))) {
    return {
      title: '자기 몰입형 행복',
      overview: '혼자서 즐기는 행복을 선호하는 스타일입니다.',
      interpretation: '남들과 함께 보내는 순간보다 자신의 속도에 맞춰 몰입하고, 조용히 정리하고, 스스로를 발전시키는 과정에서 안정적인 만족감을 느끼는 편입니다. 혼자 있는 시간이 단절이라기보다 에너지를 회복하고 생각을 정돈하는 중요한 기반으로 작동합니다.',
      recommendation: '책상 위를 정리하고 짧은 기록을 남기거나, 혼자 산책하며 생각을 정리하는 루틴처럼 방해가 적고 반복 가능한 활동을 늘리면 더 자주 행복을 느낄 가능성이 큽니다.',
      strength: '스스로를 돌보는 힘이 강하고, 외부 분위기에 휘둘리지 않고 자신만의 만족 기준을 만들 수 있습니다.',
      caution: '다만 혼자만의 활동이 지나치게 많아지면 좋은 경험이 안쪽에만 머물 수 있습니다. 가끔은 내가 해낸 일이나 좋았던 순간을 다른 사람에게 공유하고, 다른 사람은 어떤 방식으로 행복을 얻는지도 살펴보는 것이 균형에 도움이 됩니다.'
    };
  }

  if (primaryTag === '함께' || (hasAny('함께') && hasAny('즐거움', '감동', '위로', '설렘'))) {
    return {
      title: '관계 교류형 행복',
      overview: '사람들과 감정을 나누는 순간에서 행복을 크게 느끼는 스타일입니다.',
      interpretation: '혼자 완성하는 활동보다 누군가와 경험을 공유하고, 반응을 주고받고, 작은 대화 속에서 감정이 따뜻해질 때 행복감이 커지는 편입니다. 행복을 개인적인 성취보다 관계 안에서 확인하는 경향이 있습니다.',
      recommendation: '가벼운 약속, 함께 먹는 식사, 좋은 것을 발견했을 때 바로 공유하는 행동처럼 부담이 작지만 연결감이 남는 활동을 자주 배치하는 것이 좋습니다.',
      strength: '정서적 회복이 빠르고, 주변 사람의 반응을 통해 행복을 더 풍부하게 확장할 수 있습니다.',
      caution: '다만 타인의 반응에 행복이 많이 좌우되면 혼자 있는 시간이 허전하게 느껴질 수 있습니다. 혼자서도 만족을 느낄 수 있는 작은 루틴을 함께 만들어두면 관계의 밀도와 개인의 안정감을 같이 지킬 수 있습니다.'
    };
  }

  if (primaryTag === '활동적' || primaryTag === '실외' || (hasAny('활동적', '실외') && hasAny('설렘', '새로움', '즐거움'))) {
    return {
      title: '경험 확장형 행복',
      overview: '몸을 움직이거나 새로운 장면을 만날 때 행복이 살아나는 스타일입니다.',
      interpretation: '가만히 머물기보다 환경을 바꾸고, 직접 움직이고, 평소와 다른 장면을 경험할 때 감정의 환기가 잘 일어나는 편입니다. 행복을 생각으로만 찾기보다 실제 행동과 공간 변화 속에서 발견하는 경향이 있습니다.',
      recommendation: '새로운 동네를 걷기, 짧은 외출 목표 만들기, 평소와 다른 길로 이동하기처럼 일상 안에 작은 변화와 움직임을 넣으면 행복을 더 자주 찾을 수 있습니다.',
      strength: '변화에 대한 감각이 살아 있고, 작은 시도만으로도 기분 전환을 만들어내는 능력이 좋습니다.',
      caution: '다만 새로움만 계속 좇으면 익숙한 일상의 만족을 놓칠 수 있습니다. 활동 후 좋았던 장면을 기록하거나, 반복해도 좋은 루틴으로 남길 만한 것을 골라두는 것이 안정감을 더해줍니다.'
    };
  }

  if (primaryTag === '휴식' || primaryTag === '편안함' || (hasAny('휴식', '편안함') && hasAny('실내', '짧게', '무료'))) {
    return {
      title: '회복 안정형 행복',
      overview: '자극을 늘리기보다 마음과 몸을 편안하게 회복하는 행복을 선호하는 스타일입니다.',
      interpretation: '큰 이벤트보다 부담이 적고 안정적인 환경에서 긴장을 내려놓을 때 만족감이 커지는 편입니다. 행복을 강한 성취감보다 몸과 마음이 무리하지 않는 상태에서 발견하는 경향이 있습니다.',
      recommendation: '잠깐 쉬는 시간, 따뜻한 음료, 조용한 음악, 정돈된 공간처럼 회복감을 주는 요소를 의식적으로 일상에 넣으면 행복의 빈도가 높아질 수 있습니다.',
      strength: '자신의 피로와 감정 상태를 섬세하게 감지하고, 무리하지 않는 방식으로 균형을 되찾는 능력이 좋습니다.',
      caution: '다만 안정만 오래 유지하면 새로운 자극이나 성취의 기회가 줄어들 수 있습니다. 컨디션이 괜찮은 날에는 아주 작은 도전이나 외부 활동을 하나씩 섞어보는 것이 좋습니다.'
    };
  }

  if (primaryTag === '뿌듯함' || (hasAny('뿌듯함') && hasAny('길게', '활동적', '새로움'))) {
    return {
      title: '성장 실감형 행복',
      overview: '무언가를 해냈다는 감각에서 행복을 얻는 스타일입니다.',
      interpretation: '결과가 작더라도 직접 완성하고, 개선하고, 어제보다 나아졌다는 느낌이 남을 때 만족감이 커지는 편입니다. 행복을 단순한 기분 전환보다 성장의 증거로 받아들이는 경향이 있습니다.',
      recommendation: '작은 목표를 정하고 완료 표시를 남기거나, 전후가 보이는 활동을 기록하면 행복감이 더 선명해질 수 있습니다. 특히 반복할수록 실력이 쌓이는 활동이 잘 맞습니다.',
      strength: '자신을 움직이게 하는 동기가 분명하고, 작은 성취를 장기적인 자신감으로 연결할 가능성이 큽니다.',
      caution: '다만 결과 중심으로만 행복을 판단하면 쉬는 시간에 죄책감을 느낄 수 있습니다. 성취형 활동 사이에 아무것도 증명하지 않아도 되는 회복 활동을 함께 두는 것이 좋습니다.'
    };
  }

  return {
    title: '일상 탐색형 행복',
    overview: '일상 속 작은 선택에서 자신에게 맞는 행복을 찾아가는 스타일입니다.',
    interpretation: '특정한 한 가지 방식에 고정되기보다 상황과 감정에 따라 다양한 행복을 시도하는 편입니다. 아직 분석 신호가 넓게 퍼져 있어, 앞으로 기록이 쌓일수록 더 뚜렷한 성향이 드러날 가능성이 큽니다.',
    recommendation: '좋았던 활동을 그냥 지나치지 말고 짧게라도 기록해두는 것이 좋습니다. 반복해서 떠오르는 활동과 감정이 쌓이면 나에게 맞는 행복 패턴을 더 정확하게 찾을 수 있습니다.',
    strength: '한 가지 방식에 갇히지 않고 여러 행복을 실험할 수 있는 유연성이 있습니다.',
    caution: '다만 기준이 너무 넓으면 무엇이 나에게 진짜 잘 맞는지 흐려질 수 있습니다. 좋았던 순간을 기록한 뒤 왜 좋았는지 한 문장만 덧붙이면 분석의 선명도가 높아집니다.'
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
  return {
    title: profile.title,
    overview: `${nickname}님은 ${profile.overview}`,
    interpretation: profile.interpretation,
    recommendation: profile.recommendation,
    strength: profile.strength,
    caution: profile.caution,
    signalLabel: `${totalSignals}개 기록 기반`
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
              <h3>나의 행복 스타일 리포트</h3>
            </div>
            <div className="analysis-report">
              <div className="analysis-report-hero">
                <span>{analysis.styleSummary.signalLabel}</span>
                <strong>{analysis.styleSummary.title}</strong>
                <p>{analysis.styleSummary.overview}</p>
              </div>
              <div className="analysis-report-grid">
                <article>
                  <span>성향 해석</span>
                  <p>{analysis.styleSummary.interpretation}</p>
                </article>
                <article>
                  <span>추천 행동</span>
                  <p>{analysis.styleSummary.recommendation}</p>
                </article>
              </div>
              <div className="analysis-report-balance">
                <div>
                  <span>강점</span>
                  <p>{analysis.styleSummary.strength}</p>
                </div>
                <div>
                  <span>균형 포인트</span>
                  <p>{analysis.styleSummary.caution}</p>
                </div>
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
            autoOpenMemoComposer
          />
        </LazyLoadBoundary>
      )}
    </div>
  );
};

export default Analysis;
