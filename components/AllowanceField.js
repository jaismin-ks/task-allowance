// components/AllowanceField.js — Monthly allowance (spec §5.5), used by S13 and onboarding.
// Helper is live: "About $4.85 a day for the rest of October."
import { forwardRef } from 'react';
import { computeDailyCap } from '../lib/dailyCap';
import { formatMoney, monthName, parseMoney } from '../lib/format';
import { MoneyField } from './ui/MoneyField';

export const AllowanceField = forwardRef(function AllowanceField(
  { value, onChangeText, currency, earnedBeforeToday = 0, error, onBlur, ...props },
  ref
) {
  const n = parseMoney(value);
  const helper =
    Number.isFinite(n) && n > 0
      ? `About ${formatMoney(computeDailyCap(n, earnedBeforeToday).dailyCap, currency)} a day for the rest of ${monthName()}.`
      : undefined;
  return (
    <MoneyField
      ref={ref}
      label="Monthly allowance"
      placeholder="150.00"
      currencyCode={currency}
      max={10000}
      value={value}
      onChangeText={onChangeText}
      helper={helper}
      error={error}
      onBlur={onBlur}
      {...props}
    />
  );
});
