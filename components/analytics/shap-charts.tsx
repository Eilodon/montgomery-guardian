// components/analytics/shap-charts.tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useSHAPExplainability } from '@/lib/api';

interface SHAPFeature {
  name: string;
  importance: number;
  category: 'weather' | '311' | 'temporal' | 'spatial' | 'other';
}

const COLORS = {
  weather: '#3b82f6',
  311: '#10b981',
  temporal: '#f59e0b',
  spatial: '#8b5cf6',
  other: '#6b7280'
};

export function SHAPFeatureImportance() {
  const { shapData, isLoading, isError } = useSHAPExplainability();

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-800 rounded-lg">
        <div className="text-slate-400">Loading SHAP analysis...</div>
      </div>
    );
  }

  if (isError || !shapData) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-800 rounded-lg">
        <div className="text-slate-400">Failed to load SHAP analysis</div>
      </div>
    );
  }

  // Transform API data to chart format
  const features: SHAPFeature[] = shapData.features?.map((feature: any) => ({
    name: feature.name,
    importance: Math.abs(feature.importance),
    category: feature.category || 'other'
  })) || [];

  // Calculate category totals for pie chart
  const categoryData = Object.entries(COLORS).map(([category, color]) => {
    const totalImportance = features
      .filter(f => f.category === category)
      .reduce((sum, f) => sum + f.importance, 0);
    
    return {
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: totalImportance,
      color
    };
  }).filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Feature Importance Bar Chart */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Feature Importance</h3>
        <p className="text-sm text-slate-400 mb-6">
          SHAP values showing how much each feature contributes to crime risk prediction
        </p>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={features.slice(0, 10)} margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis 
              dataKey="name" 
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8' }}
              label={{ value: 'SHAP Importance', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #475569',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
              formatter={(value: number) => [value.toFixed(4), 'Importance']}
            />
            <Bar 
              dataKey="importance" 
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Distribution Pie Chart */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Risk Factor Categories</h3>
        <p className="text-sm text-slate-400 mb-6">
          Percentage contribution by category to overall crime risk
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(value: number) => [value.toFixed(4), 'Importance']}
              />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300">Category Breakdown</h4>
            {categoryData.map((category) => (
              <div key={category.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: category.color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-slate-300">{category.name}</span>
                </div>
                <span className="text-sm text-slate-400">
                  {((category.value / categoryData.reduce((sum, c) => sum + c.value, 0)) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-400 mb-2">Weather Impact</h4>
            <p className="text-xs text-slate-300">
              Weather conditions contribute {((categoryData.find(c => c.name === 'Weather')?.value || 0) / 
              categoryData.reduce((sum, c) => sum + c.value, 0) * 100).toFixed(1)}% to crime risk prediction
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-400 mb-2">311 Service Impact</h4>
            <p className="text-xs text-slate-300">
              311 service requests contribute {((categoryData.find(c => c.name === '311')?.value || 0) / 
              categoryData.reduce((sum, c) => sum + c.value, 0) * 100).toFixed(1)}% to crime risk prediction
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-amber-400 mb-2">Time Patterns</h4>
            <p className="text-xs text-slate-300">
              Temporal factors contribute {((categoryData.find(c => c.name === 'Temporal')?.value || 0) / 
              categoryData.reduce((sum, c) => sum + c.value, 0) * 100).toFixed(1)}% to crime risk prediction
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-purple-400 mb-2">Location Factors</h4>
            <p className="text-xs text-slate-300">
              Spatial features contribute {((categoryData.find(c => c.name === 'Spatial')?.value || 0) / 
              categoryData.reduce((sum, c) => sum + c.value, 0) * 100).toFixed(1)}% to crime risk prediction
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
