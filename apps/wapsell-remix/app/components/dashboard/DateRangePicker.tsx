/**
 * DateRangePicker - Date range selection component
 * Allows users to select from/to dates with preset ranges
 */

import React, { useState } from 'react';
import { Input } from '../Input';

export interface DateRange {
  from: string;
  to: string;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  label?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  ariaLabel?: string;
}

type PresetRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export const DateRangePicker = React.forwardRef<HTMLDivElement, DateRangePickerProps>(
  (
    {
      value,
      onChange,
      label = 'Rango de fechas',
      disabled = false,
      minDate,
      maxDate,
      ariaLabel,
    },
    ref
  ) => {
    const [preset, setPreset] = useState<PresetRange>('month');

    const getPresetRange = (range: PresetRange): DateRange => {
      const today = new Date();
      const from = new Date(today);
      const to = new Date(today);

      switch (range) {
        case 'today':
          return {
            from: today.toISOString().split('T')[0],
            to: today.toISOString().split('T')[0],
          };

        case 'week':
          from.setDate(today.getDate() - today.getDay());
          return {
            from: from.toISOString().split('T')[0],
            to: today.toISOString().split('T')[0],
          };

        case 'month':
          from.setDate(1);
          return {
            from: from.toISOString().split('T')[0],
            to: today.toISOString().split('T')[0],
          };

        case 'quarter':
          const quarter = Math.floor(today.getMonth() / 3);
          from.setMonth(quarter * 3, 1);
          return {
            from: from.toISOString().split('T')[0],
            to: today.toISOString().split('T')[0],
          };

        case 'year':
          from.setMonth(0, 1);
          return {
            from: from.toISOString().split('T')[0],
            to: today.toISOString().split('T')[0],
          };

        case 'custom':
        default:
          return value;
      }
    };

    const handlePresetClick = (range: PresetRange) => {
      setPreset(range);
      if (range !== 'custom') {
        onChange(getPresetRange(range));
      }
    };

    const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPreset('custom');
      onChange({ ...value, from: e.target.value });
    };

    const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPreset('custom');
      onChange({ ...value, to: e.target.value });
    };

    const presets: Array<{ id: PresetRange; label: string }> = [
      { id: 'today', label: 'Hoy' },
      { id: 'week', label: 'Esta semana' },
      { id: 'month', label: 'Este mes' },
      { id: 'quarter', label: 'Este trimestre' },
      { id: 'year', label: 'Este año' },
      { id: 'custom', label: 'Personalizado' },
    ];

    return (
      <div
        ref={ref}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        aria-label={ariaLabel || label}
      >
        <h4 className="text-sm font-medium text-gray-900 mb-4">{label}</h4>

        <div className="mb-4 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetClick(p.id)}
              disabled={disabled}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                preset === p.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-pressed={preset === p.id}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Desde"
            value={value.from}
            onChange={handleFromChange}
            disabled={disabled}
            min={minDate}
            max={value.to || maxDate}
            aria-label="Fecha de inicio"
          />
          <Input
            type="date"
            label="Hasta"
            value={value.to}
            onChange={handleToChange}
            disabled={disabled}
            min={value.from || minDate}
            max={maxDate}
            aria-label="Fecha de fin"
          />
        </div>
      </div>
    );
  }
);

DateRangePicker.displayName = 'DateRangePicker';
