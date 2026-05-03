import React, { useMemo, useRef, useState } from 'react';
import GrowthStageAvatar from '../components/GrowthStageAvatar';
import { useHappy } from '../store/HappyContext';
import { getTreeInfo } from '../utils/progress';
import {
  FLOWER_CATALOG,
  GARDEN_CENTER_TILE,
  GARDEN_MISSIONS,
  GARDEN_SIZE_TILES,
  GARDEN_TILE_SIZE,
  getGardenPlantStage,
  getGardenPlantStatus,
  getGardenStatusLabel,
  isBlockedGardenTile
} from '../utils/garden';
import './Garden.css';

const flowerIds = Object.keys(FLOWER_CATALOG);
const MIN_ZOOM_SCALE = 0.05;
const MAX_ZOOM_SCALE = 1;

const getZoomScale = zoomLevel => (
  MIN_ZOOM_SCALE + ((MAX_ZOOM_SCALE - MIN_ZOOM_SCALE) * (zoomLevel / 100))
);

const rewardLabel = reward => [
  reward.seeds ? `씨앗 ${reward.seeds}` : '',
  reward.water ? `물 ${reward.water}` : '',
  reward.sunlight ? `햇빛 ${reward.sunlight}` : ''
].filter(Boolean).join(' · ');

const createDirtPathTiles = () => {
  const tiles = [];
  const center = GARDEN_CENTER_TILE;

  for (let offset = -10; offset <= 10; offset += 1) {
    tiles.push({ x: center + offset, y: center - 6 });
    tiles.push({ x: center + offset, y: center + 6 });
    tiles.push({ x: center - 8, y: center + offset });
    tiles.push({ x: center + 8, y: center + offset });
  }

  for (let offset = -14; offset <= 14; offset += 1) {
    if (Math.abs(offset) > 4) {
      tiles.push({ x: center + offset, y: center });
      tiles.push({ x: center, y: center + offset });
    }
  }

  return tiles.filter((tile, index, source) => (
    source.findIndex(candidate => candidate.x === tile.x && candidate.y === tile.y) === index
  ));
};

const FlowerSprite = ({ flower, stage, status }) => {
  const isSeed = stage === '씨앗';
  const isSprout = stage === '새싹';
  const isWilted = status === 'wilted';
  const isThirsty = status === 'thirsty';

  return (
    <div
      className={`garden-flower-sprite ${isWilted ? 'wilted' : ''} ${isThirsty ? 'thirsty' : ''}`}
      style={{ '--flower-color': flower.color, '--flower-accent': flower.accentColor }}
      aria-hidden="true"
    >
      {isSeed ? (
        <span className="garden-seed-dot" />
      ) : (
        <>
          <span className="garden-stem" />
          {isSprout ? (
            <span className="garden-sprout-leaves" />
          ) : (
            <span className="garden-blossom">
              <span />
              <span />
              <span />
              <span />
              <i />
            </span>
          )}
        </>
      )}
    </div>
  );
};

const Garden = () => {
  const {
    totalStamps,
    gardenState,
    getTodayGardenMissionStats,
    claimGardenMission,
    buyGardenSeed,
    plantGardenSeed,
    careGardenPlant
  } = useHappy();

  const viewportRef = useRef(null);
  const dragStateRef = useRef(null);
  const [activePanel, setActivePanel] = useState('missions');
  const [zoomLevel, setZoomLevel] = useState(56);
  const zoom = getZoomScale(zoomLevel);
  const [pan, setPan] = useState({ x: -680, y: -610 });
  const [seedPrompt, setSeedPrompt] = useState(null);
  const [plantingFlowerId, setPlantingFlowerId] = useState(null);
  const [selectedTile, setSelectedTile] = useState(null);
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [feedback, setFeedback] = useState('');

  const stats = getTodayGardenMissionStats();
  const claimedToday = Array.isArray(gardenState.claimedMissions[stats.todayKey])
    ? gardenState.claimedMissions[stats.todayKey]
    : [];
  const pathTiles = useMemo(() => createDirtPathTiles(), []);
  const occupiedTileKeys = useMemo(() => new Set(
    gardenState.plants.map(plant => `${plant.tileX}:${plant.tileY}`)
  ), [gardenState.plants]);
  const selectedPlant = gardenState.plants.find(plant => plant.id === selectedPlantId) || null;
  const centerTreeInfo = getTreeInfo(totalStamps);
  const worldSize = GARDEN_SIZE_TILES * GARDEN_TILE_SIZE;

  const handlePointerDown = event => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
      didMove: false
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = event => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragState.didMove = true;
    }

    setPan({
      x: dragState.panX + dx,
      y: dragState.panY + dy
    });
  };

  const handlePointerUp = event => {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;

    if (!dragState || dragState.pointerId !== event.pointerId || dragState.didMove) {
      return;
    }

    if (!plantingFlowerId || !viewportRef.current) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const worldX = (event.clientX - rect.left - pan.x) / zoom;
    const worldY = (event.clientY - rect.top - pan.y) / zoom;
    const tileX = Math.floor(worldX / GARDEN_TILE_SIZE);
    const tileY = Math.floor(worldY / GARDEN_TILE_SIZE);
    const tileKey = `${tileX}:${tileY}`;

    if (
      tileX < 0
      || tileY < 0
      || tileX >= GARDEN_SIZE_TILES
      || tileY >= GARDEN_SIZE_TILES
      || isBlockedGardenTile(tileX, tileY)
      || occupiedTileKeys.has(tileKey)
    ) {
      setFeedback('이 위치에는 씨앗을 심을 수 없어요.');
      setSelectedTile(null);
      return;
    }

    setFeedback('');
    setSelectedTile({ tileX, tileY });
  };

  const handleClaimMission = missionId => {
    const result = claimGardenMission(missionId);

    setFeedback(result.success ? '보상을 받았어요.' : '아직 받을 수 없는 보상이에요.');
  };

  const handleBuySeed = flowerId => {
    const result = buyGardenSeed(flowerId);
    const flower = FLOWER_CATALOG[flowerId];

    setFeedback(result.success ? `${flower.seedName}을 보관함에 넣었어요.` : '씨앗이 부족해요.');
  };

  const handleConfirmPlantingPrompt = () => {
    setPlantingFlowerId(seedPrompt);
    setSeedPrompt(null);
    setSelectedTile(null);
    setFeedback('씨앗을 심을 위치를 선택해주세요.');
    setActivePanel('inventory');
  };

  const handlePlantSelectedTile = () => {
    if (!plantingFlowerId || !selectedTile) {
      return;
    }

    const result = plantGardenSeed({
      flowerId: plantingFlowerId,
      tileX: selectedTile.tileX,
      tileY: selectedTile.tileY
    });

    if (!result.success) {
      setFeedback('씨앗을 심지 못했어요. 다른 위치를 골라주세요.');
      return;
    }

    setFeedback(`${FLOWER_CATALOG[plantingFlowerId].seedName}을 심었어요.`);
    setPlantingFlowerId(null);
    setSelectedTile(null);
  };

  const handleCarePlant = careType => {
    if (!selectedPlant) {
      return;
    }

    const result = careGardenPlant(selectedPlant.id, careType);

    setFeedback(result.success ? '꽃을 돌봤어요.' : '필요한 자원이 부족해요.');
  };

  return (
    <div className="view-container garden-view">
      <section className="garden-map-card">
        <div className="garden-resource-bar" aria-label="정원 자원">
          <span>씨앗 {gardenState.resources.seeds}</span>
          <span>물 {gardenState.resources.water}</span>
          <span>햇빛 {gardenState.resources.sunlight}</span>
        </div>

        <div className="garden-map-toolbar">
          <button type="button" onClick={() => setZoomLevel(value => Math.max(0, value - 10))}>-</button>
          <span>{zoomLevel}</span>
          <button type="button" onClick={() => setZoomLevel(value => Math.min(100, value + 10))}>+</button>
        </div>

        <div
          ref={viewportRef}
          className={`garden-viewport ${plantingFlowerId ? 'planting' : ''}`}
          data-block-pull-refresh="true"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div
            className="garden-world"
            style={{
              width: worldSize,
              height: worldSize,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              '--garden-tile-size': `${GARDEN_TILE_SIZE}px`
            }}
          >
            {pathTiles.map(tile => (
              <span
                key={`${tile.x}-${tile.y}`}
                className="garden-dirt-tile"
                style={{
                  left: tile.x * GARDEN_TILE_SIZE,
                  top: tile.y * GARDEN_TILE_SIZE
                }}
              />
            ))}

            <button
              type="button"
              className="garden-center-tree"
              style={{
                left: (GARDEN_CENTER_TILE - 3) * GARDEN_TILE_SIZE,
                top: (GARDEN_CENTER_TILE - 4) * GARDEN_TILE_SIZE
              }}
              onPointerDown={event => event.stopPropagation()}
              onClick={() => setFeedback(`중앙 식물은 지금까지 찾은 행복 ${totalStamps}번으로 자라고 있어요.`)}
            >
              <GrowthStageAvatar stageId={centerTreeInfo.id} label={centerTreeInfo.title} />
            </button>

            {gardenState.plants.map(plant => {
              const flower = FLOWER_CATALOG[plant.type];
              const stage = getGardenPlantStage(plant.growth);
              const status = getGardenPlantStatus(plant);

              return (
                <button
                  type="button"
                  key={plant.id}
                  className={`garden-plant ${selectedPlantId === plant.id ? 'selected' : ''}`}
                  style={{
                    left: plant.tileX * GARDEN_TILE_SIZE,
                    top: plant.tileY * GARDEN_TILE_SIZE
                  }}
                  onPointerDown={event => event.stopPropagation()}
                  onClick={() => setSelectedPlantId(plant.id)}
                  aria-label={`${flower.name} ${stage}`}
                >
                  <FlowerSprite flower={flower} stage={stage} status={status} />
                </button>
              );
            })}

            {selectedTile && (
              <span
                className="garden-selected-tile"
                style={{
                  left: selectedTile.tileX * GARDEN_TILE_SIZE,
                  top: selectedTile.tileY * GARDEN_TILE_SIZE
                }}
              />
            )}
          </div>
        </div>

        {plantingFlowerId && (
          <div className="garden-planting-bar">
            <span>{FLOWER_CATALOG[plantingFlowerId].seedName} 심기</span>
            <button type="button" onClick={() => { setPlantingFlowerId(null); setSelectedTile(null); }}>취소</button>
            <button type="button" className="primary" onClick={handlePlantSelectedTile} disabled={!selectedTile}>
              여기에 심기
            </button>
          </div>
        )}
      </section>

      {feedback && <div className="garden-feedback">{feedback}</div>}

      <div className="garden-panel-tabs">
        <button className={activePanel === 'missions' ? 'active' : ''} onClick={() => setActivePanel('missions')}>미션</button>
        <button className={activePanel === 'shop' ? 'active' : ''} onClick={() => setActivePanel('shop')}>꽃 상점</button>
        <button className={activePanel === 'inventory' ? 'active' : ''} onClick={() => setActivePanel('inventory')}>보관함</button>
      </div>

      {activePanel === 'missions' && (
        <section className="garden-panel">
          {GARDEN_MISSIONS.map(mission => {
            const isComplete = mission.isComplete(stats);
            const isClaimed = claimedToday.includes(mission.id);

            return (
              <article key={mission.id} className="garden-list-item">
                <div>
                  <strong>{mission.title}</strong>
                  <p>{mission.description}</p>
                  <span>보상: {rewardLabel(mission.reward)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleClaimMission(mission.id)}
                  disabled={!isComplete || isClaimed}
                >
                  {isClaimed ? '완료' : '받기'}
                </button>
              </article>
            );
          })}
        </section>
      )}

      {activePanel === 'shop' && (
        <section className="garden-panel">
          {flowerIds.map(flowerId => {
            const flower = FLOWER_CATALOG[flowerId];

            return (
              <article key={flower.id} className="garden-list-item flower-shop-item">
                <FlowerSprite flower={flower} stage="꽃" status="healthy" />
                <div>
                  <strong>{flower.seedName}</strong>
                  <p>{flower.meaning}</p>
                  <span>씨앗 {flower.price}개</span>
                </div>
                <button type="button" onClick={() => handleBuySeed(flower.id)}>구매</button>
              </article>
            );
          })}
        </section>
      )}

      {activePanel === 'inventory' && (
        <section className="garden-panel">
          {flowerIds.map(flowerId => {
            const flower = FLOWER_CATALOG[flowerId];
            const count = gardenState.inventorySeeds[flowerId] || 0;

            return (
              <article key={flower.id} className="garden-list-item flower-shop-item">
                <FlowerSprite flower={flower} stage="씨앗" status="healthy" />
                <div>
                  <strong>{flower.seedName}</strong>
                  <p>보유 {count}개</p>
                </div>
                <button type="button" disabled={count <= 0} onClick={() => setSeedPrompt(flower.id)}>심기</button>
              </article>
            );
          })}
        </section>
      )}

      {selectedPlant && (
        <div className="garden-modal-backdrop" onClick={() => setSelectedPlantId(null)}>
          <section className="garden-plant-modal" onClick={event => event.stopPropagation()}>
            {(() => {
              const flower = FLOWER_CATALOG[selectedPlant.type];
              const stage = getGardenPlantStage(selectedPlant.growth);
              const status = getGardenPlantStatus(selectedPlant);

              return (
                <>
                  <button className="garden-modal-close" type="button" onClick={() => setSelectedPlantId(null)}>&times;</button>
                  <FlowerSprite flower={flower} stage={stage} status={status} />
                  <h2>{flower.name}</h2>
                  <p className="garden-meaning">꽃말: {flower.meaning}</p>
                  <p>{flower.description}</p>
                  <div className="garden-plant-meta">
                    <span>성장: {stage}</span>
                    <span>상태: {getGardenStatusLabel(status)}</span>
                  </div>
                  <div className="garden-care-actions">
                    <button type="button" onClick={() => handleCarePlant('water')}>물 주기</button>
                    <button type="button" onClick={() => handleCarePlant('sunlight')}>햇빛 주기</button>
                  </div>
                </>
              );
            })()}
          </section>
        </div>
      )}

      {seedPrompt && (
        <div className="garden-modal-backdrop" onClick={() => setSeedPrompt(null)}>
          <section className="garden-confirm-modal" onClick={event => event.stopPropagation()}>
            <h2>{FLOWER_CATALOG[seedPrompt].seedName}을 심을까요?</h2>
            <p>확인을 누르면 정원에서 심을 위치를 고를 수 있어요.</p>
            <div>
              <button type="button" onClick={() => setSeedPrompt(null)}>취소</button>
              <button type="button" className="primary" onClick={handleConfirmPlantingPrompt}>확인</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default Garden;
