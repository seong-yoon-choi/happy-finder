export const getTreeInfo = (count) => {
  if (count < 10) return { id: 'seed', icon: '🌱', title: '행복 씨앗', nextAt: 10 };
  if (count < 50) return { id: 'sprout', icon: '🌿', title: '행복 새싹', nextAt: 50 };
  if (count < 200) return { id: 'clover', icon: '🍀', title: '작은 행복 나무', nextAt: 200 };
  if (count < 500) return { id: 'tree', icon: '🌳', title: '행복 나무', nextAt: 500 };
  if (count < 1000) return { id: 'big-tree', icon: '🌲', title: '큰 행복 나무', nextAt: 1000 };
  return { id: 'blossom', icon: '🌸', title: '만발한 행복 나무', nextAt: null };
};
