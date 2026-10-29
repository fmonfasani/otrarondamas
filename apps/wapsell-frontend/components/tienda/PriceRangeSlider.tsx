'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface PriceRangeSliderProps {
  minPrice: number;
  maxPrice: number;
  currentMin: number;
  currentMax: number;
  onChange: (min: number, max: number) => void;
  step?: number;
  currency?: string;
}

/**
 * Price range slider component
 * - Min and max price range selection
 * - Dual handle slider input
 * - Number input fallback for precision
 * - Visual feedback with gradient track
 */
export default function PriceRangeSlider({
  minPrice,
  maxPrice,
  currentMin,
  currentMax,
  onChange,
  step = 10,
  currency = '$',
}: PriceRangeSliderProps) {
  const t = useTranslations();
  const [localMin, setLocalMin] = useState(currentMin);
  const [localMax, setLocalMax] = useState(currentMax);

  useEffect(() => {
    setLocalMin(currentMin);
    setLocalMax(currentMax);
  }, [currentMin, currentMax]);

  const handleMinChange = (value: number) => {
    const newMin = Math.min(value, localMax);
    setLocalMin(newMin);
    onChange(newMin, localMax);
  };

  const handleMaxChange = (value: number) => {
    const newMax = Math.max(value, localMin);
    setLocalMax(newMax);
    onChange(localMin, newMax);
  };

  const handleMinInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || minPrice;
    handleMinChange(value);
  };

  const handleMaxInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || maxPrice;
    handleMaxChange(value);
  };

  const minPercentage = ((localMin - minPrice) / (maxPrice - minPrice)) * 100;
  const maxPercentage = ((localMax - minPrice) / (maxPrice - minPrice)) * 100;

  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0">
      <h3 className="font-semibold text-gray-900 mb-4">{t('tienda.priceRange')}</h3>

      <div className="space-y-4">
        {/* Visual Slider */}
        <div className="relative pt-2">
          <div className="h-2 bg-gray-200 rounded-lg"></div>

          {/* Track fill */}
          <div
            className="absolute h-2 bg-[#D97757] rounded-lg top-2 pointer-events-none"
            style={{
              left: `${minPercentage}%`,
              right: `${100 - maxPercentage}%`,
            }}
          ></div>

          {/* Min Slider */}
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            value={localMin}
            onChange={(e) => handleMinChange(parseInt(e.target.value))}
            className="absolute w-full h-2 top-2 appearance-none bg-transparent rounded-lg pointer-events-none accent-[#D97757] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#D97757] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-[#D97757] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:border-0"
            style={{ zIndex: localMin > maxPrice - (maxPrice - minPrice) / 2 ? 5 : 3 }}
            aria-label={`${t('common.minimum')} ${t('tienda.price')}`}
          />

          {/* Max Slider */}
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            value={localMax}
            onChange={(e) => handleMaxChange(parseInt(e.target.value))}
            className="absolute w-full h-2 top-2 appearance-none bg-transparent rounded-lg pointer-events-none accent-[#D97757] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#D97757] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-[#D97757] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:border-0"
            style={{ zIndex: localMin <= maxPrice - (maxPrice - minPrice) / 2 ? 5 : 3 }}
            aria-label={`${t('common.maximum')} ${t('tienda.price')}`}
          />
        </div>

        {/* Input Fields */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-600 block mb-1">{t('common.minimum')}</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 text-sm">{currency}</span>
              <input
                type="number"
                value={localMin}
                onChange={handleMinInput}
                min={minPrice}
                max={localMax}
                className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
                aria-label={`${t('common.minimum')} ${t('tienda.price')}`}
              />
            </div>
          </div>

          <div className="flex items-center pt-6 text-gray-400">-</div>

          <div className="flex-1">
            <label className="text-xs text-gray-600 block mb-1">{t('common.maximum')}</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500 text-sm">{currency}</span>
              <input
                type="number"
                value={localMax}
                onChange={handleMaxInput}
                min={localMin}
                max={maxPrice}
                className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#D97757] focus:border-transparent"
                aria-label={`${t('common.maximum')} ${t('tienda.price')}`}
              />
            </div>
          </div>
        </div>

        {/* Range Display */}
        <p className="text-sm text-gray-600 text-center">
          {currency}
          {localMin.toLocaleString()} - {currency}
          {localMax.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
