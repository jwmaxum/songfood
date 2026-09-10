'use client';

import React from 'react';
import { UAENutritionOutput, TrafficLightRating } from '@/lib/nutrition-calculator';

interface Props {
  data: UAENutritionOutput;
  className?: string;
}

function getRatingBadgeClasses(rating: TrafficLightRating): { bg: string; border: string; text: string; badge: string } {
  switch (rating) {
    case 'green':
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-400',
        text: 'text-emerald-900',
        badge: 'bg-emerald-600 text-white'
      };
    case 'amber':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-400',
        text: 'text-amber-900',
        badge: 'bg-amber-600 text-white'
      };
    case 'red':
      return {
        bg: 'bg-red-50',
        border: 'border-red-400',
        text: 'text-red-900',
        badge: 'bg-red-600 text-white'
      };
  }
}

export default function UAETrafficLightPanel({ data, className = '' }: Props) {
  const { per100g } = data;
  const { trafficLights } = per100g;

  const items = [
    { key: 'fat', labelAr: 'الدهون', labelEn: 'FAT', value: `${per100g.fatG}g`, light: trafficLights.fat },
    { key: 'satFat', labelAr: 'الدهون المشبعة', labelEn: 'SATURATES', value: `${per100g.saturatedFatG}g`, light: trafficLights.saturatedFat },
    { key: 'sugars', labelAr: 'السكريات', labelEn: 'SUGARS', value: `${per100g.sugarsG}g`, light: trafficLights.sugars },
    { key: 'salt', labelAr: 'الملح', labelEn: 'SALT', value: `${per100g.saltG}g`, light: trafficLights.salt },
  ];

  return (
    <div className={`border border-stone-800 bg-white p-4 font-sans max-w-sm w-full shadow-sm select-none ${className}`} dir="rtl">
      <div className="text-center font-black text-base border-b-2 border-stone-900 pb-1.5 font-jakarta flex justify-between items-center">
        <span>البيانات التغذوية</span>
        <span className="text-xs font-normal text-stone-500 font-sans">لكل 100 غرام (Per 100g)</span>
      </div>

      {/* 4 Traffic Light Boxes */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs mt-3">
        {items.map((item) => {
          const style = getRatingBadgeClasses(item.light.rating);
          return (
            <div key={item.key} className={`${style.bg} border ${style.border} p-2 rounded-xl flex flex-col justify-between`}>
              <div>
                <div className="text-[10px] text-stone-700 font-bold truncate">{item.labelAr}</div>
                <div className="text-[8px] text-stone-400 font-sans">{item.labelEn}</div>
              </div>
              <div className="text-sm font-black my-1 font-mono">{item.value}</div>
              <span className={`text-[9px] ${style.badge} px-1.5 py-0.5 rounded font-bold uppercase`}>
                {item.light.labelAr}
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-stone-800 pt-3 border-t border-stone-200 mt-3 text-center flex justify-between">
        <span>الطاقة (Energy):</span>
        <span className="font-mono font-bold">
          {per100g.caloriesKcal} سعرة ({per100g.caloriesKj} kJ)
        </span>
      </div>

      <div className="text-[9px] text-stone-400 pt-1.5 text-center">
        مطابق للائحة الفنية الخليجية GSO 9 / MoIAT UAE.S Traffic Light
      </div>
    </div>
  );
}
