export type IconSizeKey = 'small' | 'medium' | 'large';

export const getIconScale = (size: IconSizeKey) => {
  if (size === 'small') return 0.85;
  if (size === 'large') return 1.2;
  return 1;
};
