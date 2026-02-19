
import React, { useMemo } from 'react';
import { Attributes } from '../types';
import { ATTR_LABELS } from '../constants';

interface RadarChartProps {
  attributes: Attributes;
  color: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({ attributes, color }) => {
  const size = 300;
  const center = size / 2;
  const radius = 100;

  const data = useMemo(() => [
    { label: ATTR_LABELS.pace, val: attributes.pace },
    { label: ATTR_LABELS.shooting, val: attributes.shooting },
    { label: ATTR_LABELS.passing, val: attributes.passing },
    { label: ATTR_LABELS.dribbling, val: attributes.dribbling },
    { label: ATTR_LABELS.defending, val: attributes.defending },
    { label: ATTR_LABELS.physical, val: attributes.physical },
  ], [attributes]);

  const points = data.map((d, i) => {
    const angle = (i * 60 - 90) * (Math.PI / 180);
    const r = (d.val / 100) * radius;
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  }).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
      {[25, 50, 75, 100].map((ring, idx) => {
        const r = (ring / 100) * radius;
        const pts = Array.from({ length: 6 }).map((_, i) => {
          const angle = (i * 60 - 90) * (Math.PI / 180);
          return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
        }).join(' ');
        return <polygon key={idx} points={pts} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
      })}
      <polygon points={points} fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" style={{ transition: 'all 0.4s ease' }} />
      {data.map((d, i) => {
        const angle = (i * 60 - 90) * (Math.PI / 180);
        const x = center + (radius + 25) * Math.cos(angle);
        const y = center + (radius + 25) * Math.sin(angle);
        return <text key={i} x={x} y={y} fill="white" fillOpacity="0.6" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{d.label}</text>;
      })}
    </svg>
  );
};
