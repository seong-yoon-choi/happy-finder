import React, { useMemo } from 'react';
import { useHappy } from '../store/HappyContext';
import './Analysis.css';

const happinessTypes = [
  { key: 'sensory', label: '감각적', color: '#4ca33a' },
  { key: 'achievement', label: '성취적', color: '#a9d94f' },
  { key: 'relationship', label: '관계적', color: '#f7c437' },
  { key: 'flow', label: '몰입적', color: '#6fbf73' },
  { key: 'meaning', label: '의미적', color: '#d6ca61' }
];

const typeAliases = {
  '감각적': 'sensory',
  '감각적 행복': 'sensory',
  '성취적': 'achievement',
  '성취적 행복': 'achievement',
  '관계적': 'relationship',
  '관계적 행복': 'relationship',
  '몰입적': 'flow',
  '몰입적 행복': 'flow',
  '의미적': 'meaning',
  '의미적 행복': 'meaning'
};

const ignoredWords = new Set([
  '오늘',
  '기록',
  '행복',
  '내가',
  '나는',
  '너무',
  '정말',
  '그리고',
  '그래서',
  '있는',
  '없는',
  '좋은',
  '좋다',
  '좋았다',
  '했다',
  '하면',
  '해서',
  '같다',
  '하루',
  '시간'
]);

const getRecordContent = record => (
  typeof record?.content === 'string' ? record.content.trim() : ''
);

const getTypeKey = type => {
  if (typeof type !== 'string') {
    return '';
  }

  return typeAliases[type.trim()] || '';
};

const getRecordTypeScores = records => {
  const scoreMap = happinessTypes.reduce((acc, type) => {
    acc[type.key] = 0;
    return acc;
  }, {});

  records.forEach(record => {
    if (!Array.isArray(record?.happinessTypes)) {
      return;
    }

    record.happinessTypes.forEach(entry => {
      const typeKey = getTypeKey(entry?.type);
      const weight = Number(entry?.weight);

      if (!typeKey || !Number.isFinite(weight) || weight <= 0) {
        return;
      }

      scoreMap[typeKey] += weight;
    });
  });

  const totalScore = Object.values(scoreMap).reduce((sum, score) => sum + score, 0);

  return happinessTypes.map(type => ({
    ...type,
    score: scoreMap[type.key],
    percentage: totalScore > 0 ? Math.round((scoreMap[type.key] / totalScore) * 100) : 0
  }));
};

const getTypeChartGradient = typeScores => {
  const totalPercentage = typeScores.reduce((sum, type) => sum + type.percentage, 0);

  if (totalPercentage <= 0) {
    return 'conic-gradient(rgba(76, 163, 58, 0.14) 0deg 360deg)';
  }

  let cursor = 0;
  const segments = typeScores
    .filter(type => type.percentage > 0)
    .map(type => {
      const start = cursor;
      const end = cursor + type.percentage * 3.6;
      cursor = end;
      return `${type.color} ${start}deg ${end}deg`;
    });

  return `conic-gradient(${segments.join(', ')})`;
};

const getTopTags = records => {
  const tagCounts = new Map();

  records.forEach(record => {
    if (!Array.isArray(record?.tags)) {
      return;
    }

    record.tags.forEach(tag => {
      const normalizedTag = typeof tag === 'string' ? tag.trim() : '';

      if (!normalizedTag) {
        return;
      }

      tagCounts.set(normalizedTag, (tagCounts.get(normalizedTag) || 0) + 1);
    });
  });

  return Array.from(tagCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
};

const getTopWords = records => {
  const wordCounts = new Map();

  records.forEach(record => {
    getRecordContent(record)
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map(word => word.trim())
      .filter(word => word.length >= 2 && !ignoredWords.has(word))
      .forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
  });

  return Array.from(wordCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
};

const buildAnalysisModel = ({ records, items }) => {
  const freeRecordCount = records.filter(record => record.sourceType === 'free').length;
  const linkedRecordCount = records.filter(record => record.sourceType === 'list').length;
  const typeScores = getRecordTypeScores(records);
  const topTags = getTopTags(records);
  const topWords = getTopWords(records);
  const recommendationItems = Array.isArray(items) ? items.slice(0, 3) : [];
  const styleTitle = records.length === 0
    ? '기록 데이터 없음'
    : freeRecordCount >= linkedRecordCount
      ? '자유롭게 기록하는 행복 스타일'
      : '리스트에서 발견하는 행복 스타일';
  const styleDescription = records.length === 0
    ? '기록이 추가되면 이 영역에 행복 스타일 요약이 들어갑니다.'
    : `${records.length}개의 기록 중 자유 기록 ${freeRecordCount}개, 리스트 기록 ${linkedRecordCount}개가 쌓였습니다.`;

  return {
    styleTitle,
    styleDescription,
    freeRecordCount,
    linkedRecordCount,
    typeScores,
    topTags,
    topWords,
    recommendationItems
  };
};

const Analysis = () => {
  const { getAllRecords, items } = useHappy();

  const records = getAllRecords();
  const analysis = useMemo(
    () => buildAnalysisModel({ records, items }),
    [records, items]
  );
  const chartGradient = getTypeChartGradient(analysis.typeScores);
  const keywordItems = analysis.topTags.length > 0 ? analysis.topTags : analysis.topWords;

  return (
    <div className="view-container analysis-view">
      <header className="analysis-header">
        <div className="analysis-brand" aria-label="Happy Finder 로고">Happy Finder</div>
        <div>
          <h2>분석</h2>
          <p>내 행복 기록의 흐름을 한눈에 정리합니다.</p>
        </div>
      </header>

      <main className="analysis-sections">
        <section className="analysis-type-section">
          <div className="analysis-section-head">
            <span>TYPES</span>
            <h3>행복 유형 비중</h3>
          </div>

          <div className="analysis-type-layout">
            <div className="analysis-donut" style={{ '--analysis-chart': chartGradient }}>
              <div>
                <strong>{analysis.typeScores.reduce((sum, type) => sum + type.percentage, 0)}%</strong>
                <span>분류</span>
              </div>
            </div>

            <div className="analysis-type-list">
              {analysis.typeScores.map(type => (
                <div key={type.key} className="analysis-type-row">
                  <div className="analysis-type-label">
                    <i style={{ background: type.color }} aria-hidden="true" />
                    <span>{type.label}</span>
                  </div>
                  <div className="analysis-type-bar" aria-hidden="true">
                    <span style={{ width: `${type.percentage}%`, background: type.color }} />
                  </div>
                  <strong>{type.percentage}%</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

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

        <section className="analysis-keyword-section">
          <div className="analysis-section-head">
            <span>KEYWORDS</span>
            <h3>자주 나타난 태그와 단어</h3>
          </div>

          {keywordItems.length > 0 ? (
            <div className="analysis-chip-list">
              {keywordItems.map(item => (
                <span key={item.label}>
                  {item.label}
                  <small>{item.count}</small>
                </span>
              ))}
            </div>
          ) : (
            <p className="analysis-empty-line">표시할 태그와 단어가 없습니다.</p>
          )}
        </section>

        <section className="analysis-recommend-section">
          <div className="analysis-section-head">
            <span>RECOMMEND</span>
            <h3>추천 행복 영역</h3>
          </div>

          <div className="analysis-recommend-list">
            {analysis.recommendationItems.map(item => (
              <article key={item.id} className="analysis-recommend-card">
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Analysis;
