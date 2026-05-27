import React, { lazy, useMemo, useState } from 'react';
import LazyLoadBoundary from '../components/LazyLoadBoundary';
import {
  HAPPINESS_TAG_GROUPS,
  HAPPINESS_TAGS,
  normalizeVisibleTags
} from '../lib/happinessTags';
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

const AXIS_COLORS = {
  relation: '#3f8f46',
  place: '#4d9c9f',
  time: '#d98859',
  action: '#6f9e45'
};

const STYLE_TYPE_NAMES = {
  '혼자|실내|짧게|활동적': '자기 루틴 실행형',
  '혼자|실내|짧게|휴식': '미니 회복 루틴형',
  '혼자|실내|길게|활동적': '심층 몰입 실행형',
  '혼자|실내|길게|휴식': '깊은 안정 회복형',
  '혼자|실외|짧게|활동적': '단기 환기 실행형',
  '혼자|실외|짧게|휴식': '고요한 산책 회복형',
  '혼자|실외|길게|활동적': '독립 탐색 성장형',
  '혼자|실외|길게|휴식': '느린 여정 회복형',
  '함께|실내|짧게|활동적': '가벼운 실내 교류형',
  '함께|실내|짧게|휴식': '짧은 안정 교류형',
  '함께|실내|길게|활동적': '공동 몰입 실행형',
  '함께|실내|길게|휴식': '깊은 대화 안정형',
  '함께|실외|짧게|활동적': '즉흥 활력 교류형',
  '함께|실외|짧게|휴식': '가벼운 동행 회복형',
  '함께|실외|길게|활동적': '공동 탐험 활력형',
  '함께|실외|길게|휴식': '긴 동행 회복형'
};

const STYLE_AXIS_COPY = {
  혼자: {
    interpretation: '행복의 중심이 외부 반응보다 자기 리듬에 놓여 있어, 스스로 선택하고 조절할 수 있는 순간에서 만족이 선명해지는 편입니다.',
    recommendation: '혼자만의 시간을 미리 확보하고, 그 안에서 기록이나 정리처럼 결과가 남는 행동을 하나씩 배치해보세요.',
    strength: '자기 돌봄과 자기 조절 능력이 강해 주변 분위기에 크게 흔들리지 않고 만족을 만들 수 있습니다.',
    caution: '다만 좋은 경험이 안쪽에만 머물면 확장성이 줄어들 수 있으니, 가끔은 좋았던 순간을 누군가에게 공유해보는 것이 균형에 도움이 됩니다.'
  },
  함께: {
    interpretation: '행복이 관계 안에서 커지는 편이라, 누군가와 경험을 나누고 반응을 주고받는 과정에서 감정의 밀도가 높아집니다.',
    recommendation: '부담이 큰 약속보다 짧은 대화, 가벼운 동행, 함께 먹는 식사처럼 연결감이 남는 활동을 자주 만들어보세요.',
    strength: '좋은 감정을 혼자 끝내지 않고 관계 속에서 확장하는 힘이 있습니다.',
    caution: '다만 타인의 반응에 행복이 지나치게 묶이면 혼자 있는 시간이 허전해질 수 있으니, 혼자서도 만족할 수 있는 작은 루틴을 같이 두는 것이 좋습니다.'
  },
  실내: {
    interpretation: '익숙하고 안정적인 공간에서 행복 신호가 잘 쌓입니다. 환경을 통제할 수 있을 때 몰입이나 회복이 더 편안해지는 흐름입니다.',
    recommendation: '책상, 침대 주변, 자주 머무는 공간에 행복을 시작하기 쉬운 물건이나 루틴을 놓아두세요.',
    strength: '일상의 반복 공간을 행복의 기반으로 바꾸는 능력이 좋습니다.',
    caution: '실내 중심이 지나치면 새로운 자극이 줄 수 있는 환기감을 놓칠 수 있습니다.'
  },
  실외: {
    interpretation: '공간이 바뀌고 시야가 넓어질 때 감정이 환기되는 편입니다. 밖으로 나가는 행동 자체가 행복을 시작시키는 스위치처럼 작동합니다.',
    recommendation: '큰 외출보다 동네 한 바퀴, 다른 길로 걷기, 가까운 장소 방문처럼 낮은 진입 장벽의 외부 활동을 늘려보세요.',
    strength: '환경 변화만으로도 기분 전환을 빠르게 만들어낼 수 있습니다.',
    caution: '외부 자극에만 기대면 쉬는 날의 안정감이 약해질 수 있으니, 돌아온 뒤 정리하는 루틴을 함께 두면 좋습니다.'
  },
  짧게: {
    interpretation: '긴 준비보다 바로 실행할 수 있는 작은 행동에서 행복을 자주 발견합니다. 생활 중간중간 짧은 회복과 전환을 잘 활용하는 흐름입니다.',
    recommendation: '5분 안에 할 수 있는 행복 목록을 만들어두고, 피로하거나 흐름이 끊겼을 때 바로 꺼내 쓰는 방식이 잘 맞습니다.',
    strength: '작은 시간도 놓치지 않고 기분을 바꿀 수 있는 실용적인 행복 감각이 있습니다.',
    caution: '짧은 만족만 반복하면 깊은 몰입의 보상이 약해질 수 있으니, 가끔은 시간을 길게 쓰는 활동도 남겨두는 것이 좋습니다.'
  },
  길게: {
    interpretation: '충분한 시간을 들여 몰입하거나 머무를 때 만족이 커집니다. 행복이 순간적인 자극보다 누적되는 경험에 가까운 편입니다.',
    recommendation: '방해받지 않는 시간을 일정에 먼저 확보하고, 끝낸 뒤에는 무엇이 좋았는지 짧게 기록해보세요.',
    strength: '시간을 들여 깊은 만족과 성취감을 만드는 힘이 있습니다.',
    caution: '준비 시간이 길어 시작이 미뤄질 수 있으니, 아주 작은 첫 행동을 따로 정해두는 것이 좋습니다.'
  },
  활동적: {
    interpretation: '생각만 하기보다 직접 움직이고 실행할 때 행복감이 살아납니다. 몸이나 행동의 변화가 감정 변화로 이어지는 편입니다.',
    recommendation: '정리, 걷기, 만들기, 배우기처럼 시작과 끝이 보이는 활동을 자주 배치해보세요.',
    strength: '정체된 감정을 행동으로 풀어내는 전환력이 좋습니다.',
    caution: '활동이 계속 쌓이면 회복 시간이 부족해질 수 있으니, 활동 뒤에는 의도적인 휴식을 붙여두는 것이 좋습니다.'
  },
  휴식: {
    interpretation: '무언가를 더 하기보다 긴장을 내려놓고 회복할 때 행복 신호가 커집니다. 안정과 여유가 중요한 기준으로 작동합니다.',
    recommendation: '음악, 향, 차, 조용한 공간처럼 몸과 마음이 빠르게 내려앉는 회복 요소를 일상에 넣어보세요.',
    strength: '자신의 피로와 감정 상태를 섬세하게 알아차리고 무리하지 않는 방향을 찾을 수 있습니다.',
    caution: '휴식만 길어지면 변화나 성취의 자극이 줄어들 수 있으니, 컨디션이 괜찮은 날에는 작은 실행을 하나 섞어보는 것이 좋습니다.'
  }
};

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

const getAxisStats = counter => HAPPINESS_TAG_GROUPS.map(group => {
  const [leftTag, rightTag] = group.tags;
  const leftCount = counter.get(leftTag)?.count || 0;
  const rightCount = counter.get(rightTag)?.count || 0;
  const total = leftCount + rightCount;
  const leftPercentage = total > 0 ? Math.round((leftCount / total) * 100) : 50;
  const rightPercentage = total > 0 ? 100 - leftPercentage : 50;
  const dominantSide = total <= 0 || leftCount === rightCount
    ? 'none'
    : leftCount > rightCount ? 'left' : 'right';
  const dominantPercentage = dominantSide === 'right' ? rightPercentage : leftPercentage;

  return {
    key: group.key,
    label: group.label,
    color: AXIS_COLORS[group.key] || TAG_COLORS[0],
    leftTag,
    rightTag,
    leftCount,
    rightCount,
    total,
    leftPercentage,
    rightPercentage,
    dominantSide,
    dominantPercentage
  };
});

const getDominantAxisTag = axis => {
  if (!axis || axis.leftCount === axis.rightCount) {
    return axis?.leftTag || '';
  }

  return axis.leftCount > axis.rightCount ? axis.leftTag : axis.rightTag;
};

const getAnalysisMaturity = (axisStats, totalSignals) => {
  const safeSignals = Math.max(0, Number.isFinite(totalSignals) ? totalSignals : 0);
  const coveredAxes = axisStats.filter(axis => axis.total >= 2).length;
  const solidAxes = axisStats.filter(axis => axis.total >= 4).length;

  if (safeSignals >= 24 && coveredAxes >= 4 && solidAxes >= 4) {
    return {
      key: 'enough',
      label: '충분한 분석',
      range: '4축 충분 확인',
      description: '4가지 태그 축이 충분히 쌓여 현재 행복 성향을 비교적 안정적으로 해석할 수 있어요.'
    };
  }

  if (safeSignals >= 12 && coveredAxes >= 4) {
    return {
      key: 'stable',
      label: '안정 분석',
      range: '4축 흐름 확인',
      description: '관계, 장소, 시간, 행동 축이 모두 보이기 시작해 추천과 리포트의 기준이 안정되는 단계예요.'
    };
  }

  return {
    key: 'early',
    label: '초급 분석',
    range: '일부 축 확인',
    description: '분석은 가능하지만 아직 4가지 태그 축의 분포가 충분히 쌓이지 않아 앞으로의 기록에 따라 성향이 바뀔 수 있어요.'
  };
};

const getAxisStatByKey = (axisStats, key) => axisStats.find(axis => axis.key === key);

const getAxisSummary = axisStats => {
  const coreTags = HAPPINESS_TAG_GROUPS.map(group => {
    const axis = getAxisStatByKey(axisStats, group.key);
    return getDominantAxisTag(axis);
  });
  const typeKey = coreTags.join('|');

  return {
    coreTags,
    title: STYLE_TYPE_NAMES[typeKey] || '일상 탐색형',
    typeKey
  };
};

const getStyleProfile = axisStats => {
  const { coreTags, title } = getAxisSummary(axisStats);
  const copies = coreTags.map(tag => STYLE_AXIS_COPY[tag]).filter(Boolean);
  const [relationTag, placeTag, timeTag, actionTag] = coreTags;

  return {
    title,
    overview: `${relationTag}, ${placeTag}, ${timeTag}, ${actionTag} 흐름이 함께 나타나는 행복 스타일입니다.`,
    interpretation: copies.map(copy => copy.interpretation).join(' '),
    recommendation: copies.map(copy => copy.recommendation).join(' '),
    strength: copies.map(copy => copy.strength).join(' '),
    caution: copies.map(copy => copy.caution).join(' ')
  };
};

const buildStyleSummary = ({ nickname, axisStats, totalSignals }) => {
  const hasAxisSignals = axisStats.some(axis => axis.total > 0);

  if (!hasAxisSignals) {
    return {
      title: '행복 스타일 분석 대기',
      description: '아직 분석할 수 있는 태그 흐름이 충분하지 않습니다.'
    };
  }

  const profile = getStyleProfile(axisStats);
  return {
    title: profile.title,
    overview: `${nickname}님은 ${profile.overview}`,
    interpretation: profile.interpretation,
    recommendation: profile.recommendation,
    strength: profile.strength,
    caution: profile.caution,
    signalLabel: `${totalSignals}개의 행복 데이터 기반`
  };
};

const rotateItems = (items, seed) => {
  if (items.length <= 1) {
    return items;
  }

  const offset = seed % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
};

const getRecentTagStats = (records = []) => {
  const recentCounter = createTagCounter();

  records.slice(0, 8).forEach((record, index) => {
    const weight = Math.max(1, 4 - Math.floor(index / 2));
    addTagsToCounter(recentCounter, getLinkedRecordTags(record), weight);
  });

  return getSortedTagStats(recentCounter, 3);
};

const buildRecommendationPrompt = ({ recentTags = [], topTags = [] }) => {
  const sourceTags = recentTags.length > 0 ? recentTags : topTags.slice(0, 2);
  const tagLabels = sourceTags.slice(0, 2).map(tag => tag.label);

  if (tagLabels.length === 0) {
    return '';
  }

  const tagText = tagLabels.join(' · ');

  return recentTags.length > 0
    ? `최근에 ${tagText} 태그가 자주 보였어요. 이 태그와 가까운 행복을 추천해 드릴게요.`
    : `최근에 ${tagText} 태그 흐름이 눈에 띄어요. 이 태그와 가까운 행복을 추천해 드릴게요.`;
};

const getRecommendationItems = ({
  items,
  topTags = [],
  recentTags = [],
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
  const recentTagWeights = new Map(recentTags.slice(0, 3).map((tag, index) => [tag.label, 6 - (index * 2)]));

  const scoredItems = items
    .filter(item => !usedItemIds.has(item.id))
    .map(item => {
      const score = getItemTags(item).reduce((sum, tag) => (
        sum + (topTagWeights.get(tag) || 0) + (recentTagWeights.get(tag) || 0)
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

  const axisStats = getAxisStats(combinedCounter);
  const allTagStats = getSortedTagStats(combinedCounter);
  const topTags = allTagStats.slice(0, 6);
  const recentTags = getRecentTagStats(linkedRecords);
  const totalSignals = allTagStats.reduce((sum, tag) => sum + tag.count, 0);
  const nickname = typeof authUserNickname === 'string' && authUserNickname.trim()
    ? authUserNickname.trim()
    : '사용자';
  const styleSummary = buildStyleSummary({
    nickname,
    axisStats,
    totalSignals
  });
  const recommendationItems = getRecommendationItems({
    items,
    topTags,
    recentTags,
    userFavorites,
    userEmpathies,
    myItems,
    recordedItemIds,
    refreshSeed
  });
  const recommendationPrompt = buildRecommendationPrompt({
    recentTags,
    topTags
  });

  return {
    allTagStats,
    axisStats,
    topTags,
    totalSignals,
    styleSummary,
    recommendationItems,
    recommendationPrompt,
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
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [isMaturityModalOpen, setIsMaturityModalOpen] = useState(false);

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
  const analysisMaturity = getAnalysisMaturity(analysis.axisStats, analysis.totalSignals);

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
        <div className="analysis-header-row">
          <div className="analysis-title-block">
            <h2>분석</h2>
            <p>내 행복의 태그 흐름을 한눈에 정리합니다.</p>
          </div>
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
            <div className="analysis-section-head analysis-section-head-row analysis-report-head">
              <h3>나의 행복 분석 리포트</h3>
              <button
                type="button"
                className="analysis-maturity-btn analysis-report-maturity-btn"
                onClick={() => setIsMaturityModalOpen(true)}
                aria-label={`분석 단계 보기: ${analysisMaturity.label}, ${analysis.totalSignals}개`}
              >
                <span className="analysis-maturity-label">{analysisMaturity.label}</span>
              </button>
            </div>
            <div className="analysis-report">
              <div className="analysis-axis-panel">
                <div className="analysis-axis-panel-head">
                  <span className="analysis-report-signal-badge">{analysis.styleSummary.signalLabel}</span>
                  <strong>4가지 태그 축</strong>
                </div>
                <div className="analysis-axis-list" aria-label="4가지 태그 축 비율">
                  {analysis.axisStats.map(axis => (
                    <div
                      key={axis.key}
                      className={`analysis-axis-item dominant-${axis.dominantSide}`}
                      style={{
                        '--axis-color': axis.color,
                        '--axis-dominant': `${axis.dominantPercentage}%`
                      }}
                    >
                      <div className="analysis-axis-item-head">
                        <strong>{axis.label}</strong>
                        <div className="analysis-axis-percentages">
                          {axis.total > 0 ? (
                            <>
                              <span className={axis.dominantSide === 'left' ? 'is-dominant' : ''}>{axis.leftPercentage}%</span>
                              <span aria-hidden="true">/</span>
                              <span className={axis.dominantSide === 'right' ? 'is-dominant' : ''}>{axis.rightPercentage}%</span>
                            </>
                          ) : (
                            <span className="analysis-axis-empty">{'\uB370\uC774\uD130 \uB300\uAE30'}</span>
                          )}
                        </div>
                      </div>
                      <div className="analysis-axis-track" aria-hidden="true">
                        <i />
                      </div>
                      <div className="analysis-axis-labels">
                        <span className={axis.dominantSide === 'left' ? 'is-dominant' : ''}>{axis.leftTag}</span>
                        <span className={axis.dominantSide === 'right' ? 'is-dominant' : ''}>{axis.rightTag}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analysis-report-hero">
                <strong>{analysis.styleSummary.title}</strong>
                <p>{analysis.styleSummary.overview}</p>
              </div>

              {!isReportExpanded && (
                <div className="analysis-report-preview">
                  <span>성향 해석</span>
                  <p>{analysis.styleSummary.interpretation}</p>
                </div>
              )}

              <button
                type="button"
                className={`analysis-report-more ${isReportExpanded ? 'is-open' : ''}`}
                onClick={() => setIsReportExpanded(prevExpanded => !prevExpanded)}
                aria-expanded={isReportExpanded}
              >
                <span>{isReportExpanded ? '리포트 접기' : '자세히 보기'}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6 9l6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isReportExpanded && (
                <div className="analysis-report-details">
                  <article>
                    <span>성향 해석</span>
                    <p>{analysis.styleSummary.interpretation}</p>
                  </article>
                  <article>
                    <span>추천 행동</span>
                    <p>{analysis.styleSummary.recommendation}</p>
                  </article>
                  <div>
                    <span>강점</span>
                    <p>{analysis.styleSummary.strength}</p>
                  </div>
                  <div>
                    <span>균형 포인트</span>
                    <p>{analysis.styleSummary.caution}</p>
                  </div>
                </div>
              )}
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
              <>
                {analysis.recommendationPrompt && (
                  <p className="analysis-recommend-prompt">{analysis.recommendationPrompt}</p>
                )}
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
              </>
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

      {isMaturityModalOpen && (
        <div
          className="analysis-maturity-overlay"
          data-block-pull-refresh="true"
          onClick={() => setIsMaturityModalOpen(false)}
        >
          <div
            className="analysis-maturity-modal"
            data-block-pull-refresh="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analysis-maturity-title"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className="analysis-maturity-close"
              onClick={() => setIsMaturityModalOpen(false)}
              aria-label="분석 단계 설명 닫기"
            >
              &times;
            </button>
            <div className="analysis-maturity-modal-head">
              <div>
                <h3 id="analysis-maturity-title">분석 단계</h3>
                <p>4가지 태그 축이 얼마나 고르게 쌓였는지에 따라 리포트의 신뢰도를 나눠요.</p>
              </div>
            </div>
            <div className="analysis-maturity-stage-list">
              {[
                {
                  label: '초급 분석',
                  range: '일부 축 확인',
                  description: '태그 흐름은 보이지만 관계, 장소, 시간, 행동 축이 아직 고르게 쌓이지 않은 단계예요.'
                },
                {
                  label: '안정 분석',
                  range: '주요 축 확인',
                  description: '여러 축에서 반복되는 방향이 보이기 시작해 성향 해석과 추천의 기준이 안정되는 단계예요.'
                },
                {
                  label: '충분한 분석',
                  range: '4축 충분 확인',
                  description: '4가지 축의 분포가 충분히 쌓여 현재 행복 성향을 더 믿을 만하게 해석할 수 있는 단계예요.'
                }
              ].map(stage => (
                <article
                  key={stage.label}
                  className={stage.label === analysisMaturity.label ? 'active' : ''}
                >
                  <div>
                    <strong>{stage.label}</strong>
                    <span>{stage.range}</span>
                  </div>
                  <p>{stage.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;
