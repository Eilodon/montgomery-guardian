"use client";

import { useState, useEffect } from "react";
import { Calculator, TrendingUp, Users, Clock, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";

interface ROICalculatorProps {
  className?: string;
}

interface ROIMetrics {
  costSavings: number;
  timeSavings: number;
  efficiencyGains: number;
  riskReduction: number;
  totalROI: number;
  paybackPeriod: number;
}

interface CostInputs {
  staffCosts: number;
  operationalCosts: number;
  technologyCosts: number;
  trainingCosts: number;
}

interface BenefitInputs {
  reducedResponseTime: number;
  automatedReports: number;
  improvedAccuracy: number;
  riskMitigation: number;
}

export function ROICalculator({ className = "" }: ROICalculatorProps) {
  const [costInputs, setCostInputs] = useState<CostInputs>({
    staffCosts: 500000,  // Annual staff costs
    operationalCosts: 200000,  // Annual operational costs
    technologyCosts: 75000,  // One-time implementation cost
    trainingCosts: 25000,  // Training and adoption costs
  });

  const [benefitInputs, setBenefitInputs] = useState<BenefitInputs>({
    reducedResponseTime: 40,  // Hours saved per week
    automatedReports: 25,  // Reports automated per week
    improvedAccuracy: 30,  // Percentage improvement
    riskMitigation: 15,  // Incidents prevented per month
  });

  const [roiMetrics, setROIMetrics] = useState<ROIMetrics | null>(null);
  const [timeHorizon, setTimeHorizon] = useState(12); // months

  // Calculate ROI when inputs change
  useEffect(() => {
    const totalCosts = costInputs.staffCosts + costInputs.operationalCosts + costInputs.technologyCosts + costInputs.trainingCosts;
    
    // Calculate benefits
    const hourlyStaffCost = costInputs.staffCosts / 2080; // 40 hours/week * 52 weeks
    const timeSavingsValue = benefitInputs.reducedResponseTime * hourlyStaffCost * 4.33; // weeks in timeHorizon
    const automationSavings = benefitInputs.automatedReports * 2 * 4.33; // $2 per report * weeks
    const accuracySavings = totalCosts * (benefitInputs.improvedAccuracy / 100) * 0.1; // 10% of costs from accuracy
    const riskSavings = benefitInputs.riskMitigation * 5000 * 4.33; // $5000 per incident * weeks
    
    const totalBenefits = timeSavingsValue + automationSavings + accuracySavings + riskSavings;
    const netBenefits = totalBenefits - (costInputs.technologyCosts + costInputs.trainingCosts);
    const monthlyROI = (netBenefits / (timeHorizon / 12)) / (totalCosts / 12) * 100;
    const annualROI = (netBenefits / (timeHorizon / 12)) / (totalCosts / 12) * 12;
    const paybackPeriod = (costInputs.technologyCosts + costInputs.trainingCosts) / (netBenefits / (timeHorizon / 12));
    
    setROIMetrics({
      costSavings: timeSavingsValue + automationSavings,
      timeSavings: benefitInputs.reducedResponseTime * 4.33,
      efficiencyGains: accuracySavings,
      riskReduction: riskSavings,
      totalROI: annualROI,
      paybackPeriod: paybackPeriod,
    });
  }, [costInputs, benefitInputs, timeHorizon]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getROIColor = (roi: number) => {
    if (roi >= 200) return "text-green-500";
    if (roi >= 100) return "text-blue-500";
    if (roi >= 50) return "text-yellow-500";
    return "text-red-500";
  };

  const getPaybackColor = (months: number) => {
    if (months <= 6) return "text-green-500";
    if (months <= 12) return "text-blue-500";
    if (months <= 18) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className={`bg-slate-900 rounded-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <Calculator className="w-6 h-6 text-blue-500" />
        <h2 className="text-xl font-bold text-white">ROI Calculator</h2>
        <p className="text-slate-400 text-sm">
          Calculate the business impact of Montgomery Guardian implementation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Inputs */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-red-400" />
            Implementation Costs
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Annual Staff Costs
              </label>
              <input
                type="number"
                value={costInputs.staffCosts}
                onChange={(e) => setCostInputs(prev => ({ ...prev, staffCosts: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">Current annual staff salaries and benefits</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Annual Operational Costs
              </label>
              <input
                type="number"
                value={costInputs.operationalCosts}
                onChange={(e) => setCostInputs(prev => ({ ...prev, operationalCosts: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">Software licenses, maintenance, infrastructure</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Technology Implementation
              </label>
              <input
                type="number"
                value={costInputs.technologyCosts}
                onChange={(e) => setCostInputs(prev => ({ ...prev, technologyCosts: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">One-time implementation and setup costs</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Training & Adoption
              </label>
              <input
                type="number"
                value={costInputs.trainingCosts}
                onChange={(e) => setCostInputs(prev => ({ ...prev, trainingCosts: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">Staff training and change management</p>
            </div>
          </div>
        </div>

        {/* Benefit Inputs */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Expected Benefits
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Time Savings (hours/week)
              </label>
              <input
                type="number"
                value={benefitInputs.reducedResponseTime}
                onChange={(e) => setBenefitInputs(prev => ({ ...prev, reducedResponseTime: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-slate-400 mt-1">Hours saved through automation and efficiency</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Automated Reports (per week)
              </label>
              <input
                type="number"
                value={benefitInputs.automatedReports}
                onChange={(e) => setBenefitInputs(prev => ({ ...prev, automatedReports: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-slate-400 mt-1">Reports automatically generated by the system</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Accuracy Improvement (%)
              </label>
              <input
                type="number"
                value={benefitInputs.improvedAccuracy}
                onChange={(e) => setBenefitInputs(prev => ({ ...prev, improvedAccuracy: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-slate-400 mt-1">Improvement in data accuracy and decision making</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Risk Mitigation (incidents/month)
              </label>
              <input
                type="number"
                value={benefitInputs.riskMitigation}
                onChange={(e) => setBenefitInputs(prev => ({ ...prev, riskMitigation: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-slate-400 mt-1">Incidents prevented through early detection</p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Horizon */}
      <div className="mt-6 bg-slate-800 rounded-lg p-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Analysis Time Horizon (months)
        </label>
        <select
          value={timeHorizon}
          onChange={(e) => setTimeHorizon(Number(e.target.value))}
          className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={6}>6 months</option>
          <option value={12}>12 months</option>
          <option value={18}>18 months</option>
          <option value={24}>24 months</option>
          <option value={36}>36 months</option>
        </select>
      </div>

      {/* ROI Results */}
      {roiMetrics && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Key Metrics */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-400" />
              Key ROI Metrics
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Annual ROI</span>
                <span className={`text-xl font-bold ${getROIColor(roiMetrics.totalROI)}`}>
                  {formatPercentage(roiMetrics.totalROI)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Payback Period</span>
                <span className={`text-lg font-semibold ${getPaybackColor(roiMetrics.paybackPeriod)}`}>
                  {roiMetrics.paybackPeriod.toFixed(1)} months
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Net Benefits</span>
                <span className="text-lg font-semibold text-green-400">
                  {formatCurrency(roiMetrics.costSavings + roiMetrics.efficiencyGains + roiMetrics.riskReduction)}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Benefit Breakdown
            </h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300">Cost Savings</span>
                  <span className="text-green-400 font-semibold">
                    {formatCurrency(roiMetrics.costSavings)}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Time and automation savings
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300">Time Savings</span>
                  <span className="text-blue-400 font-semibold">
                    {roiMetrics.timeSavings.toFixed(0)} hours/year
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Staff hours reallocated to higher-value activities
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300">Efficiency Gains</span>
                  <span className="text-purple-400 font-semibold">
                    {formatCurrency(roiMetrics.efficiencyGains)}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Improved accuracy and decision making
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-300">Risk Reduction</span>
                  <span className="text-orange-400 font-semibold">
                    {formatCurrency(roiMetrics.riskReduction)}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Incidents prevented through early detection
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Investment Summary */}
      {roiMetrics && (
        <div className="mt-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-blue-500/30">
          <h3 className="text-lg font-semibold text-white mb-3">Investment Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {formatCurrency(costInputs.technologyCosts + costInputs.trainingCosts)}
              </div>
              <div className="text-sm text-slate-300">Total Investment</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-green-400 mb-1">
                {formatCurrency(roiMetrics.costSavings + roiMetrics.efficiencyGains + roiMetrics.riskReduction)}
              </div>
              <div className="text-sm text-slate-300">Annual Benefits</div>
            </div>
            
            <div>
              <div className={`text-2xl font-bold ${getROIColor(roiMetrics.totalROI)} mb-1`}>
                {formatPercentage(roiMetrics.totalROI)}
              </div>
              <div className="text-sm text-slate-300">Annual ROI</div>
            </div>
          </div>
          
          {roiMetrics.totalROI >= 100 && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-full">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-semibold">
                  Strong Investment - Expected ROI > 100%
                </span>
              </div>
            </div>
          )}
          
          {roiMetrics.totalROI < 50 && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-semibold">
                  Review Needed - Expected ROI < 50%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
