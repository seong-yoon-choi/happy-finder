export const getTreeInfo = (count) => {
  if (count < 10) return { id: 'seed', icon: '🌱', title: '행복 씨앗', nextAt: 10 };
  if (count < 100) return { id: 'sprout', icon: '🌿', title: '행복 새싹', nextAt: 100 };
  if (count < 300) return { id: 'clover', icon: '☘️', title: '행복 세잎클로버', nextAt: 300 };
  if (count < 500) return { id: 'lucky-clover', icon: '🍀', title: '행운 네잎클로버', nextAt: 500 };
  if (count < 1000) return { id: 'tree', icon: '🌳', title: '행복 나무', nextAt: 1000 };
  if (count < 2000) return { id: 'big-tree', icon: '🌲', title: '큰 행복 나무', nextAt: 2000 };
  return { id: 'blossom', icon: '🌸', title: '만발한 행복 나무', nextAt: null };
};
