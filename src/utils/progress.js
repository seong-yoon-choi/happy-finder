export const TREE_STAGE_MILESTONES = [
  { id: 'seed', icon: '🌱', title: '행복 씨앗', minStamps: 0, nextAt: 10 },
  { id: 'sprout', icon: '🌿', title: '행복 새싹', minStamps: 10, nextAt: 100 },
  { id: 'clover', icon: '☘️', title: '행복 세잎클로버', minStamps: 100, nextAt: 300 },
  { id: 'lucky-clover', icon: '🍀', title: '행운 네잎클로버', minStamps: 300, nextAt: 500 },
  { id: 'tree', icon: '🌳', title: '행복 나무', minStamps: 500, nextAt: 1000 },
  { id: 'big-tree', icon: '🌲', title: '큰 행복 나무', minStamps: 1000, nextAt: 2000 },
  { id: 'blossom', icon: '🌸', title: '만발한 행복 나무', minStamps: 2000, nextAt: null }
];

export const getTreeInfo = (count) => {
  const normalizedCount = Number.isFinite(count) ? Math.max(0, count) : 0;

  for (let index = TREE_STAGE_MILESTONES.length - 1; index >= 0; index -= 1) {
    const stage = TREE_STAGE_MILESTONES[index];

    if (normalizedCount >= stage.minStamps) {
      return stage;
    }
  }

  return TREE_STAGE_MILESTONES[0];
};
