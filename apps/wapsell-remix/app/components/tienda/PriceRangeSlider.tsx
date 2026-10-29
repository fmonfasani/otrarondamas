/**
 * PriceRangeSlider - Min/max price selector with dual slider
 * Supports manual input or slider drag
 */

import React, { useState, useEffect } from 'react';

export interface PriceRangeSliderProps {
  minPrice: number;
  maxPrice: number;
  step?: number;
  selectedMin: number;
  selectedMax: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  currency?: string;
}

export const PriceRangeSlider = React.forwardRef<HTMLDivElement, PriceRangeSliderProps>(
  (
    {
      minPrice,
      maxPrice,
      step = 10,
      selectedMin,
      selectedMax,
      onMinChange,
      onMaxChange,
      currency = '$',
    },
    ref
  ) => {
    const [minInput, setMinInput] = useState(selectedMin.toString());
    const [maxInput, setMaxInput] = useState(selectedMax.toString());

    useEffect(() => {
      setMinInput(selectedMin.toString());
    }, [selectedMin]);

    useEffect(() => {
      setMaxInput(selectedMax.toString());
    }, [selectedMax]);

    const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setMinInput(e.target.value);
    };

    const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setMaxInput(e.target.value);
    };

    const handleMinInputBlur = () => {
      const value = Math.max(minPrice, Math.min(parseInt(minInput) || minPrice, selectedMax));
      onMinChange(value);
      setMinInput(value.toString());
    };

    const handleMaxInputBlur = () => {
      const value = Math.max(selectedMin, Math.min(parseInt(maxInput) || maxPrice, maxPrice));
      onMaxChange(value);
      setMaxInput(value.toString());
    };

    const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.min(parseInt(e.target.value), selectedMax);
      onMinChange(value);
    };

    const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(parseInt(e.target.value), selectedMin);
      onMaxChange(value);
    };

    // Calculate percentage positions for visual slider
    const minPercent = ((selectedMin - minPrice) / (maxPrice - minPrice)) * 100;
    const maxPercent = ((selectedMax - minPrice) / (maxPrice - minPrice)) * 100;

    return (
      <div ref={ref} className="space-y-4">
        <h3 className="font-semibold text-gray-900">Rango de Precio</h3>

        {/* Range Slider */}
        <div className="relative py-6 px-2">
          {/* Visual Track */}
          <div className="absolute top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full" />

          {/* Filled Track */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2 h-1 bg-blue-600 rounded-full"
            style={{
              left: `${minPercent}%`,
              right: `${100 - maxPercent}%`,
            }}
          />

          {/* Min Slider */}
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            step={step}
            value={selectedMin}
            onChange={handleMinSliderChange}
            className="absolute w-full h-1 top-1/2 transform -translate-y-1/2 pointer-events-none appearance-none bg-transparent rounded-lg z-5 accent-blue-600"
            style={{
              zIndex: selectedMin > maxPrice - (maxPrice - minPrice) / 2 ? 5 : 3,
            }}
          />

          {/* Max Slider */}
          <input
            type="range"
            min={minPrice}
            max={maxPrice}
            step={step}
            value={selectedMax}
            onChange={handleMaxSliderChange}
            className="absolute w-full h-1 top-1/2 transform -translate-y-1/2 pointer-events-none appearance-none bg-transparent rounded-lg z-4 accent-blue-600"
          />
        </div>

        {/* Input Fields */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-600 mb-1 block">Mínimo</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                {currency}
              </span>
              <input
                type="number"
                value={minInput}
                onChange={handleMinInputChange}
                onBlur={handleMinInputBlur}
                min={minPrice}
                max={selectedMax}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="flex items-end">
            <div className="text-gray-400 font-bold">–</div>
          </div>

          <div className="flex-1">
            <label className="text-xs text-gray-600 mb-1 block">Máximo</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                {currency}
              </span>
              <input
                type="number"
                value={maxInput}
                onChange={handleMaxInputChange}
                onBlur={handleMaxInputBlur}
                min={selectedMin}
                max={maxPrice}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Reset Button */}
        {(selectedMin > minPrice || selectedMax < maxPrice) && (
          <button
            onClick={() => {
              onMinChange(minPrice);
              onMaxChange(maxPrice);
            }}
            className="w-full py-2 px-3 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
          >
            Restablecer Rango
          </button>
        )}

        {/* Price Info */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Rango: <span className="font-semibold text-gray-900">{currency}{selectedMin}</span> -{' '}
            <span className="font-semibold text-gray-900">{currency}{selectedMax}</span>
          </p>
        </div>
      </div>
    );
  }
);

PriceRangeSlider.displayName = 'PriceRangeSlider';
