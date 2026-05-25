import {useSelector} from 'react-redux';
import {selectHasPermission} from '../store/slices/authSlice';
import type {RootState} from '../store';

export function usePermission(code: string): boolean {
  return useSelector((state: RootState) => selectHasPermission(state, code));
}

export function useAnyPermission(codes: string[]): boolean {
  return useSelector((state: RootState) =>
    codes.some(c => selectHasPermission(state, c)),
  );
}
