import { forwardRef, useEffect, useImperativeHandle } from 'react';

import type { LookupEvent, LookupSource } from './sources';

export type HiddenLookupHandle = {
  submit: (code: string) => void;
  refresh: () => void;
  reload: () => void;
};

type Props = {
  source: LookupSource;
  value: string;
  showWidget: boolean;
  onEvent: (event: LookupEvent) => void;
};

// Prohlížeč cizí stránku do appky načíst nedovolí, ověření běží jen v telefonu.
export const HiddenLookup = forwardRef<HiddenLookupHandle, Props>(function HiddenLookup({ onEvent }, ref) {
  useImperativeHandle(ref, () => ({ submit: () => {}, refresh: () => {}, reload: () => {} }));
  useEffect(() => {
    onEvent({ type: 'unsupported' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
});
