import React, { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import CreateHappinessModal from '../components/CreateHappinessModal';
import HappinessCard from '../components/HappinessCard';
import LazyLoadBoundary from '../components/LazyLoadBoundary';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import { HAPPINESS_TAG_GROUPS, normalizeVisibleTags } from '../lib/happinessTags';
import { getMemoImageSrc } from '../lib/memoImages';
import { supabase } from '../lib/supabase';
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

const TodayHappinessImage = ({ record }) => {
  const previewImage = Array.isArray(record?.images) ? record.images[0] : null;
  const [src, setSrc] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (!previewImage) {
        setSrc('');
        return;
      }

      const nextSrc = await getMemoImageSrc({
        image: previewImage,
        supabase
      });

      if (isMounted) {
        setSrc(nextSrc);
      }
    };

    void loadImage();

    return () => {
      isMounted = false;
    };
  }, [previewImage]);

  if (src) {
    return <img src={src} alt="" loading="lazy" />;
  }

  if (record) {
    return <img className="is-fallback" src="/happy-finder-icon.svg" alt="" loading="lazy" />;
  }

  return <span className="home-today-image-blank" aria-hidden="true" />;
};

const Home = () => {
  const [selectedCard, setSelectedCard] = useState(null);
  const [shouldOpenRecord, setShouldOpenRecord] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [sessionShuffleSeed] = useState(() => `${Date.now()}-${Math.random()}`);
  const [isTodayRecordModalOpen, setIsTodayRecordModalOpen] = useState(false);
  const [todayHappinessTitle, setTodayHappinessTitle] = useState('');
  const [todayHappinessContent, setTodayHappinessContent] = useState('');
  const [todayHappinessValidation, setTodayHappinessValidation] = useState({
    title: false,
    content: false
  });
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

  const openTodayRecordModal = () => {
    setTodayHappinessTitle(todayHappinessRecord?.title || '');
    setTodayHappinessContent(todayHappinessRecord?.content || '');
    setTodayHappinessValidation({ title: false, content: false });
    setIsTodayRecordModalOpen(true);
  };

  const closeTodayRecordModal = () => {
    setIsTodayRecordModalOpen(false);
    setTodayHappinessValidation({ title: false, content: false });
  };

  const requestCloseTodayRecordModal = useModalBackNavigation({
    isOpen: isTodayRecordModalOpen,
    onClose: closeTodayRecordModal,
    historyKey: 'home-today-record'
  });

  const handleSaveTodayHappiness = () => {
    const nextTitle = todayHappinessTitle.trim();
    const nextContent = todayHappinessContent.trim();

    if (!nextTitle || !nextContent) {
      setTodayHappinessValidation({
        title: !nextTitle,
        content: !nextContent
      });
      return;
    }

    if (todayHappinessRecord?.id) {
      updateFreeRecord(
        todayHappinessRecord.id,
        nextContent,
        todayHappinessRecord.images || [],
        { title: nextTitle }
      );
    } else {
      addFreeRecord(nextContent, [], { title: nextTitle || TODAY_HAPPINESS_TITLE });
    }

    setTodayHappinessTitle('');
    setTodayHappinessContent('');
    closeTodayRecordModal();
  };

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

      <section className={`home-today-card ${todayHappinessRecord ? 'has-record' : 'is-empty'}`}>
        <button
          type="button"
          className="home-today-open"
          onClick={openTodayRecordModal}
          aria-label="오늘의 행복 기록하기"
        >
          <span className="home-today-image" aria-hidden="true">
            <TodayHappinessImage record={todayHappinessRecord} />
          </span>
          <span className="home-today-copy">
            <span className="home-today-label">오늘의 행복</span>
            <strong className={todayHappinessRecord?.title ? '' : 'home-today-empty-title'}>
              {todayHappinessRecord?.title || '오늘의 행복이 아직 없어요'}
            </strong>
            <span className={todayHappinessRecord?.content ? '' : 'home-today-empty-copy'}>
              {todayHappinessRecord?.content || '눌러서 오늘 좋았던 순간을 가볍게 남겨보세요.'}
            </span>
          </span>
        </button>
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

      {isTodayRecordModalOpen && (
        <div
          className="home-today-modal-overlay"
          data-block-pull-refresh="true"
          onClick={() => requestCloseTodayRecordModal()}
        >
          <div
            className="home-today-modal"
            data-block-pull-refresh="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-today-modal-title"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className="home-today-modal-close"
              onClick={() => requestCloseTodayRecordModal()}
              aria-label="오늘의 행복 닫기"
            >
              &times;
            </button>
            <div className="home-today-modal-head">
              <span>오늘의 행복</span>
              <h2 id="home-today-modal-title">오늘 좋았던 순간을 남겨보세요</h2>
            </div>
            <div className="home-today-modal-image" aria-hidden="true">
              <TodayHappinessImage record={todayHappinessRecord} />
            </div>
            <input
              className={todayHappinessValidation.title ? 'has-error' : ''}
              type="text"
              value={todayHappinessTitle}
              onChange={event => {
                setTodayHappinessTitle(event.target.value);
                setTodayHappinessValidation(prev => ({ ...prev, title: false }));
              }}
              placeholder={todayHappinessValidation.title ? '제목을 적어주세요' : '제목'}
              aria-label="오늘의 행복 제목"
              maxLength={30}
            />
            <textarea
              className={todayHappinessValidation.content ? 'has-error' : ''}
              value={todayHappinessContent}
              onChange={event => {
                setTodayHappinessContent(event.target.value);
                setTodayHappinessValidation(prev => ({ ...prev, content: false }));
              }}
              placeholder={todayHappinessValidation.content ? '내용을 적어주세요' : '내용'}
              aria-label="오늘의 행복 내용"
              rows={5}
              maxLength={300}
            />
            <div className="home-today-modal-actions">
              <button type="button" onClick={() => requestCloseTodayRecordModal()}>취소</button>
              <button type="button" onClick={handleSaveTodayHappiness}>기록에 저장</button>
            </div>
          </div>
        </div>
      )}

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
