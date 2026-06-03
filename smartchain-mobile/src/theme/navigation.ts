import {colors, fontSize} from './tokens';

export const defaultStackScreenOptions = {
  contentStyle: {backgroundColor: colors.bgPage},
  headerStyle: {backgroundColor: colors.white},
  headerShadowVisible: true,
  headerTitleStyle: {
    fontSize: fontSize.xl,
    fontWeight: '600' as const,
    color: colors.gray900,
  },
  headerTintColor: colors.primary,
};
