import {createNavigationContainerRef} from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigateFromPush(route: string): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate(route as never);
  }
}
