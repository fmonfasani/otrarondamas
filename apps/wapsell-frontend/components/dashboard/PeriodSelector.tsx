'use client';

interface PeriodSelectorProps {
  value: '7d' | '30d' | '90d';
  onChange: (period: '7d' | '30d' | '90d') => void;
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const periods: Array<{ value: '7d' | '30d' | '90d'; label: string }> = [
    { value: '7d', label: 'Últimos 7 días' },
    { value: '30d', label: 'Últimos 30 días' },
    { value: '90d', label: 'Últimos 90 días' },
  ];

  return (
    <div className="flex gap-2">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            value === period.value
              ? 'bg-[#D97757] text-white'
              : 'bg-white text-[#1A1815] border border-gray-200 hover:border-[#D97757]'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
