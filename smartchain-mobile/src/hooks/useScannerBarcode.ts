import {useCallback, useEffect, useRef} from 'react';
import type {TextInput} from 'react-native';

const SCAN_DEBOUNCE_MS = 50;

/**
 * HID keyboard-wedge scanners: keep field focused and flush barcode after idle gap.
 */
export function useScannerBarcode(
  enabled: boolean,
  onScan: (barcode: string) => void,
) {
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef('');

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [enabled]);

  const flush = useCallback(() => {
    const code = pendingRef.current.trim();
    pendingRef.current = '';
    if (code) {
      onScan(code);
    }
  }, [onScan]);

  const onChangeText = useCallback(
    (text: string) => {
      pendingRef.current = text;
      if (!enabled) {
        return;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        flush();
      }, SCAN_DEBOUNCE_MS);
    },
    [enabled, flush],
  );

  const onSubmitEditing = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    flush();
  }, [flush]);

  return {inputRef, onChangeText, onSubmitEditing};
}
