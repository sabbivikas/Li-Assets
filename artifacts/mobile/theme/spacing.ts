export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export type SpacingKey = keyof typeof spacing;

export const layout = {
  screenHorizontal: spacing.xl,
  screenTop: spacing.xl,
  screenBottom: spacing.xxxl,
  tabBarClearance: 96,
  sectionGap: spacing.xxl,
  cardGap: spacing.lg,
  gridGap: spacing.lg,
  chipGap: spacing.sm,
  titleToSubtitle: spacing.sm,
  subtitleToContent: spacing.lg,
  headerToFirstSection: spacing.xl,
  buttonTopMargin: spacing.lg,
  listItemGap: spacing.md,
  modalPadding: spacing.xl,
  bottomSheetPadding: spacing.xl,
  cardPadding: spacing.lg,
} as const;
