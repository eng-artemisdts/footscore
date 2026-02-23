import React, { useMemo } from 'react';
import { Attributes } from '../types';
import { PeladaSport } from '../types';
import { getSportSchema } from "../sportSchemas";

interface RadarChartProps {
  attributes: Attributes;
  color: string;
  sport?: PeladaSport;
}

export const RadarChart: React.FC<RadarChartProps> = ({ attributes, color, sport }) => {
  const size = 300;
  const center = size / 2;
  const radius = 100;

  const schema = useMemo(() => getSportSchema(sport), [sport]);
  const data = useMemo(
    () =>
      schema.attributeKeys.map((key) => ({
        key,
        label: schema.attributeLabels[key] ?? key,
        val: typeof attributes?.[key] === "number" ? attributes[key] : schema.defaultAttributes[key] ?? 0,
      })),
    [attributes, schema],
  );

  const points = data.map((d, i) => {
    const angle = (i * (360 / data.length) - 90) * (Math.PI / 180);
    const r = (d.val / 100) * radius;
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  }).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
      {[25, 50, 75, 100].map((ring, idx) => {
        const r = (ring / 100) * radius;
        const pts = Array.from({ length: data.length }).map((_, i) => {
          const angle = (i * (360 / data.length) - 90) * (Math.PI / 180);
          return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
        }).join(' ');
        return <polygon key={idx} points={pts} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
      })}
      <polygon points={points} fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" style={{ transition: 'all 0.4s ease' }} />
      {data.map((d, i) => {
        const angle = (i * (360 / data.length) - 90) * (Math.PI / 180);
        const x = center + (radius + 25) * Math.cos(angle);
        const y = center + (radius + 25) * Math.sin(angle);
        return <text key={i} x={x} y={y} fill="white" fillOpacity="0.6" fontSize="10" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">{d.label}</text>;
      })}
    </svg>
  );
};

