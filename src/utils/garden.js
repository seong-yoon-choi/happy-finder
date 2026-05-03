import { getCalendarDayDifference, getLocalDateKey } from './date';

export const GARDEN_STORAGE_KEY = 'happy_garden';
export const GARDEN_SIZE_TILES = 64;
export const GARDEN_TILE_SIZE = 32;
export const GARDEN_CENTER_TILE = Math.floor(GARDEN_SIZE_TILES / 2);
export const GARDEN_PLANT_EXPIRE_DAYS = 7;
export const GARDEN_PLANT_THIRSTY_DAYS = 2;
export const GARDEN_PLANT_WILTED_DAYS = 4;

export const FLOWER_CATALOG = {
  clover: {
    id: 'clover',
    name: '클로버',
    seedName: '클로버 씨앗',
    price: 1,
    meaning: '작은 행복, 행운',
    description: '작게 피어난 클로버는 일상 안에서 발견한 행운을 닮았어요.',
    color: '#4CAF68',
    accentColor: '#DDF7A6'
  },
  rose: {
    id: 'rose',
    name: '장미',
    seedName: '장미 씨앗',
    price: 3,
    meaning: '사랑, 애정',
    description: '장미는 마음을 건네는 용기와 따뜻한 관계의 기억을 품고 있어요.',
    color: '#E5536B',
    accentColor: '#FFD0DA'
  },
  dandelion: {
    id: 'dandelion',
    name: '민들레',
    seedName: '민들레 씨앗',
    price: 1,
    meaning: '회복, 다시 시작',
    description: '민들레는 어디서든 다시 피어나는 마음의 힘을 보여줘요.',
    color: '#F6C445',
    accentColor: '#FFF1A8'
  },
  violet: {
    id: 'violet',
    name: '제비꽃',
    seedName: '제비꽃 씨앗',
    price: 2,
    meaning: '작은 기쁨, 겸손한 마음',
    description: '제비꽃은 조용하지만 분명하게 남는 작은 기쁨을 닮았어요.',
    color: '#8067D9',
    accentColor: '#D9D2FF'
  },
  freesia: {
    id: 'freesia',
    name: '프리지아',
    seedName: '프리지아 씨앗',
    price: 2,
    meaning: '응원, 새로운 시작',
    description: '프리지아는 산뜻한 향기처럼 새로운 하루를 응원해요.',
    color: '#F8E7A0',
    accentColor: '#FFFBE3'
  }
};

export const GARDEN_MISSIONS = [
  {
    id: 'daily_happiness_1',
    title: '오늘 행복 1회 찾기',
    description: '행복 카드를 완료하고 물을 받아요.',
    reward: { water: 2 },
    isComplete: stats => stats.todayStamps >= 1
  },
  {
    id: 'daily_memo_1',
    title: '오늘 메모 1개 남기기',
    description: '행복에 의미를 남기고 햇빛을 받아요.',
    reward: { sunlight: 1 },
    isComplete: stats => stats.todayMemos >= 1
  },
  {
    id: 'daily_happiness_3',
    title: '오늘 행복 3회 찾기',
    description: '행복을 더 찾아 씨앗을 받아요.',
    reward: { seeds: 1 },
    isComplete: stats => stats.todayStamps >= 3
  }
];

export const createDefaultGardenState = () => ({
  name: '나의 행복 정원',
  resources: {
    seeds: 0,
    water: 0,
    sunlight: 0
  },
  inventorySeeds: Object.keys(FLOWER_CATALOG).reduce((acc, flowerId) => {
    acc[flowerId] = 0;
    return acc;
  }, {}),
  plants: [],
  claimedMissions: {}
});

const normalizeCount = value => (
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
);

export const normalizeGardenState = value => {
  const fallback = createDefaultGardenState();

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }

  const resources = value.resources && typeof value.resources === 'object' ? value.resources : {};
  const inventorySeeds = value.inventorySeeds && typeof value.inventorySeeds === 'object' ? value.inventorySeeds : {};
  const claimedMissions = value.claimedMissions && typeof value.claimedMissions === 'object'
    ? value.claimedMissions
    : {};

  return {
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim() : fallback.name,
    resources: {
      seeds: normalizeCount(resources.seeds),
      water: normalizeCount(resources.water),
      sunlight: normalizeCount(resources.sunlight)
    },
    inventorySeeds: Object.keys(FLOWER_CATALOG).reduce((acc, flowerId) => {
      acc[flowerId] = normalizeCount(inventorySeeds[flowerId]);
      return acc;
    }, {}),
    plants: Array.isArray(value.plants)
      ? value.plants
        .filter(plant => plant && FLOWER_CATALOG[plant.type])
        .map(plant => ({
          id: typeof plant.id === 'string' ? plant.id : `plant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: plant.type,
          tileX: normalizeCount(plant.tileX),
          tileY: normalizeCount(plant.tileY),
          growth: normalizeCount(plant.growth),
          plantedAt: typeof plant.plantedAt === 'string' ? plant.plantedAt : getLocalDateKey(),
          lastCaredAt: typeof plant.lastCaredAt === 'string' ? plant.lastCaredAt : getLocalDateKey()
        }))
      : [],
    claimedMissions: Object.entries(claimedMissions).reduce((acc, [dateKey, missionIds]) => {
      if (!Array.isArray(missionIds)) {
        return acc;
      }

      acc[dateKey] = missionIds.filter(missionId => (
        typeof missionId === 'string' && GARDEN_MISSIONS.some(mission => mission.id === missionId)
      ));
      return acc;
    }, {})
  };
};

export const getGardenPlantStage = growth => {
  if (growth >= 5) {
    return '만개';
  }

  if (growth >= 3) {
    return '꽃';
  }

  if (growth >= 1) {
    return '새싹';
  }

  return '씨앗';
};

export const getGardenPlantStatus = (plant, today = new Date()) => {
  const diffDays = getCalendarDayDifference(plant?.lastCaredAt, today);

  if (diffDays === null || diffDays < GARDEN_PLANT_THIRSTY_DAYS) {
    return 'healthy';
  }

  if (diffDays >= GARDEN_PLANT_EXPIRE_DAYS) {
    return 'expired';
  }

  if (diffDays >= GARDEN_PLANT_WILTED_DAYS) {
    return 'wilted';
  }

  return 'thirsty';
};

export const getGardenStatusLabel = status => {
  switch (status) {
    case 'thirsty':
      return '목마름';
    case 'wilted':
      return '시듦';
    case 'expired':
      return '사라짐';
    default:
      return '건강함';
  }
};

export const isBlockedGardenTile = (tileX, tileY) => {
  const centerDistanceX = Math.abs(tileX - GARDEN_CENTER_TILE);
  const centerDistanceY = Math.abs(tileY - GARDEN_CENTER_TILE);

  return centerDistanceX <= 3 && centerDistanceY <= 3;
};
