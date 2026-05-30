import React, { lazy, useCallback, useMemo, useState } from 'react';
import CreateHappinessModal from '../components/CreateHappinessModal';
import HappinessCard from '../components/HappinessCard';
import LazyLoadBoundary from '../components/LazyLoadBoundary';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import { HAPPINESS_TAG_GROUPS, normalizeVisibleTags } from '../lib/happinessTags';
import { useHappy } from '../store/HappyContext';
import './Home.css';

const loadHappinessDetailModal = () => import('../components/HappinessDetailModal');
const HappinessDetailModal = lazy(loadHappinessDetailModal);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M10.8 18.1C14.8317 18.1 18.1 14.8317 18.1 10.8C18.1 6.76832 14.8317 3.5 10.8 3.5C6.76832 3.5 3.5 6.76832 3.5 10.8C3.5 14.8317 6.76832 18.1 10.8 18.1Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16.1 16.1L20.5 20.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const TagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M5 7H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 17H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M12 5V19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M5 12H19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const ClearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M7 7L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const getSessionShuffleRank = (itemId, seed) => {
  const source = `${seed}:${itemId}`;
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const normalizeSearchValue = value => (
  typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR')
    : ''
);

const itemMatchesSearchQuery = (item, searchQuery) => {
  if (!searchQuery) {
    return true;
  }

  const searchableText = [
    item.title,
    item.description,
    ...(Array.isArray(item.tags) ? item.tags : [])
  ]
    .filter(value => typeof value === 'string')
    .join(' ')
    .toLocaleLowerCase('ko-KR');

  return searchableText.includes(searchQuery);
};

const itemMatchesSelectedTags = (item, selectedTags) => {
  if (selectedTags.length === 0) {
    return true;
  }

  const itemTags = Array.isArray(item.tags) ? item.tags : [];
  return selectedTags.some(tag => itemTags.includes(tag));
};

const TODAY_HAPPINESS_TITLE = '오늘의 행복';

const getLocalDateKey = value => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const Home = () => {
  const [selectedCard, setSelectedCard] = useState(null);
  const [shouldOpenRecord, setShouldOpenRecord] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [sessionShuffleSeed] = useState(() => `${Date.now()}-${Math.random()}`);
  const [isTodayComposerOpen, setIsTodayComposerOpen] = useState(false);
  const [todayHappinessText, setTodayHappinessText] = useState('');
  const [todayHappinessError, setTodayHappinessError] = useState(false);
  const {
    items,
    authUserNickname,
    getFreeRecords,
    addFreeRecord,
    updateFreeRecord
  } = useHappy();

  const viewerPossessiveLabel = authUserNickname ? `${authUserNickname} 님의` : '나의';
  const normalizedSearchQuery = normalizeSearchValue(searchQuery);
  const hasActiveFilters = Boolean(normalizedSearchQuery || selectedTags.length > 0);
  const todayDateKey = getLocalDateKey(new Date());
  const todayHappinessRecord = getFreeRecords()
    .find(record => getLocalDateKey(record.createdAt || record.updatedAt) === todayDateKey);

  const shuffledItems = useMemo(() => {
    return [...items].sort((leftItem, rightItem) => {
      const rankDiff = getSessionShuffleRank(leftItem.id, sessionShuffleSeed)
        - getSessionShuffleRank(rightItem.id, sessionShuffleSeed);

      if (rankDiff !== 0) {
        return rankDiff;
      }

      return leftItem.id.localeCompare(rightItem.id);
    });
  }, [items, sessionShuffleSeed]);

  const currentItems = useMemo(() => (
    shuffledItems.filter(item => (
      itemMatchesSearchQuery(item, normalizedSearchQuery)
      && itemMatchesSelectedTags(item, selectedTags)
    ))
  ), [normalizedSearchQuery, selectedTags, shuffledItems]);

  const closeTagPicker = useCallback(() => {
    setIsTagPickerOpen(false);
  }, []);

  const requestCloseTagPicker = useModalBackNavigation({
    isOpen: isTagPickerOpen,
    onClose: closeTagPicker,
    historyKey: 'home-tag-filter'
  });

  const handleCardClick = useCallback(item => {
    setShouldOpenRecord(true);
    setSelectedCard(item);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setSelectedCard(null);
    setShouldOpenRecord(false);
  }, []);

  const handleToggleTagFilter = useCallback(tag => {
    setSelectedTags(prevTags => {
      if (prevTags.includes(tag)) {
        return prevTags.filter(savedTag => savedTag !== tag);
      }

      return normalizeVisibleTags([...prevTags, tag]);
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTags([]);
  }, []);

  const openTodayComposer = useCallback(() => {
    setTodayHappinessText(todayHappinessRecord?.content || '');
    setTodayHappinessError(false);
    setIsTodayComposerOpen(true);
  }, [todayHappinessRecord?.content]);

  const closeTodayComposer = useCallback(() => {
    setIsTodayComposerOpen(false);
    setTodayHappinessError(false);
  }, []);

  const handleSaveTodayHappiness = useCallback(() => {
    const nextContent = todayHappinessText.trim();

    if (!nextContent) {
      setTodayHappinessError(true);
      return;
    }

    if (todayHappinessRecord?.id) {
      updateFreeRecord(
        todayHappinessRecord.id,
        nextContent,
        todayHappinessRecord.images || [],
        { title: todayHappinessRecord.title || TODAY_HAPPINESS_TITLE }
      );
    } else {
      addFreeRecord(nextContent, [], { title: TODAY_HAPPINESS_TITLE });
    }

    setTodayHappinessText('');
    setTodayHappinessError(false);
    setIsTodayComposerOpen(false);
  }, [
    addFreeRecord,
    todayHappinessRecord,
    todayHappinessText,
    updateFreeRecord
  ]);

  const emptyStateTitle = normalizedSearchQuery
    ? '검색에 맞는 결과가 존재하지 않아요'
    : selectedTags.length > 0
      ? '선택한 태그에 맞는 행복이 존재하지 않아요'
      : '아직 행복이 존재하지 않아요';
  const emptyStateDescription = hasActiveFilters
    ? ''
    : '나만의 행복을 만들어 보세요';

  return (
    <div className="view-container home-view">
      <header className="home-header">
        <h1>Happy Finder</h1>
        <p>오늘 {viewerPossessiveLabel} 일상에 어떤 행복을 가져와 볼까요?</p>
      </header>

      <section className={`home-today-card ${todayHappinessRecord ? 'has-record' : 'is-empty'} ${isTodayComposerOpen ? 'is-editing' : ''}`}>
        <button
          type="button"
          className="home-today-open"
          onClick={openTodayComposer}
          aria-label="오늘의 행복 바로 적기"
        >
          <span className="home-today-image" aria-hidden="true">
            <img src="/happy-finder-icon.svg" alt="" />
          </span>
          <span className="home-today-copy">
            <span className="home-today-label">오늘의 행복</span>
            <strong>{todayHappinessRecord?.title || '오늘의 행복을 적어보세요'}</strong>
            <span>{todayHappinessRecord?.content || '작게 좋았던 순간을 바로 남길 수 있어요.'}</span>
          </span>
        </button>

        {isTodayComposerOpen && (
          <div className="home-today-composer">
            <textarea
              value={todayHappinessText}
              onChange={event => {
                setTodayHappinessText(event.target.value);
                setTodayHappinessError(false);
              }}
              placeholder="오늘 좋았던 순간을 짧게 적어보세요"
              aria-label="오늘의 행복 입력"
              rows={3}
              maxLength={140}
            />
            {todayHappinessError && (
              <p className="home-today-error">오늘의 행복을 먼저 적어주세요.</p>
            )}
            <div className="home-today-actions">
              <button type="button" onClick={closeTodayComposer}>취소</button>
              <button type="button" onClick={handleSaveTodayHappiness}>저장</button>
            </div>
          </div>
        )}
      </section>

      <div className="home-tools" aria-label="행복 목록 도구">
        <div
          className="home-tool-search"
          role="search"
          aria-label="행복 검색"
        >
          <SearchIcon />
          <input
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder="검색"
            aria-label="행복 검색"
          />
          {searchQuery && (
            <button type="button" className="home-search-clear" onClick={() => setSearchQuery('')} aria-label="검색어 지우기">
              <ClearIcon />
            </button>
          )}
        </div>
        <button
          type="button"
          className={`home-tool-tag ${selectedTags.length > 0 ? 'active' : ''}`}
          onClick={() => setIsTagPickerOpen(true)}
          aria-label={`태그 선택${selectedTags.length > 0 ? ` ${selectedTags.length}개` : ''}`}
        >
          <TagIcon />
        </button>
        <button
          type="button"
          className="home-tool-add"
          aria-label="행복 추가"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <PlusIcon />
        </button>
      </div>

      {hasActiveFilters && (
        <div className="home-active-filters" aria-label="적용된 검색 조건">
          {selectedTags.map(tag => (
            <button key={tag} type="button" className="home-filter-chip" onClick={() => handleToggleTagFilter(tag)}>
              {tag}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <button type="button" className="home-filter-reset" onClick={handleClearFilters}>
            초기화
          </button>
        </div>
      )}

      <div className="feed-container">
        {currentItems.length > 0 ? (
          currentItems.map(item => (
            <HappinessCard
              key={item.id}
              item={item}
              onClick={handleCardClick}
            />
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🍀</div>
            <p>
              {emptyStateTitle}
              {emptyStateDescription && (
                <>
                  <br />
                  {emptyStateDescription}
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {selectedCard && (
        <LazyLoadBoundary
          mode="overlay"
          loadingLabel="행복 상세 화면을 불러오는 중이에요."
          errorTitle="행복 상세 화면을 열지 못했어요."
          errorMessage="잠시 후 다시 시도해주세요."
          onDismiss={handleCloseDetailModal}
          resetKey={`${selectedCard.id}-${shouldOpenRecord ? 'record' : 'detail'}`}
        >
          <HappinessDetailModal
            item={selectedCard}
            isOpen={!!selectedCard}
            onClose={handleCloseDetailModal}
            showOwnerInsights={false}
            canDelete={false}
            autoOpenMemoComposer={shouldOpenRecord}
          />
        </LazyLoadBoundary>
      )}

      {isCreateModalOpen && (
        <CreateHappinessModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {isTagPickerOpen && (
        <div
          className="home-tag-picker-overlay"
          data-block-pull-refresh="true"
          onClick={() => requestCloseTagPicker()}
        >
          <div
            className="home-tag-picker-modal"
            data-block-pull-refresh="true"
            onClick={event => event.stopPropagation()}
          >
            <div className="home-tag-picker-header">
              <div>
                <h2>태그 선택</h2>
                <p>선택한 태그 중 하나라도 포함된 행복을 보여줘요.</p>
              </div>
              <button type="button" onClick={() => requestCloseTagPicker()} aria-label="태그 선택 닫기">
                완료
              </button>
            </div>

            <div className="home-tag-picker-groups">
              {HAPPINESS_TAG_GROUPS.map(group => (
                <section key={group.label} className="home-tag-picker-group">
                  <strong>{group.label}</strong>
                  <div className="home-tag-options">
                    {group.tags.map(tag => {
                      const isSelected = selectedTags.includes(tag);

                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`home-tag-option ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleTagFilter(tag)}
                          aria-pressed={isSelected}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {selectedTags.length > 0 && (
              <button type="button" className="home-tag-clear-all" onClick={() => setSelectedTags([])}>
                태그 전체 해제
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
