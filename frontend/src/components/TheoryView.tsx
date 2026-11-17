import React from 'react';
import { BookOpen, Sparkles, AlertTriangle, Lightbulb, Zap, TrendingUp, CheckCircle2 } from 'lucide-react';

export const TheoryView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Mathematical Foundations: Lagrange Interpolation in Electricity Load Modeling
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Numerical analysis, basis polynomial decomposition, and practical grid dispatch considerations.
            </p>
          </div>
        </div>
      </div>

      {/* Core Formulation Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          1. The Lagrange Interpolating Polynomial
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Given a set of <span className="font-semibold text-slate-800">n + 1</span> distinct electricity consumption observations{' '}
          <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-blue-700">(x₀, y₀), (x₁, y₁), ..., (xₙ, yₙ)</span> where{' '}
          <span className="font-mono">xᵢ</span> represents the time coordinate (e.g. hour of the day) and{' '}
          <span className="font-mono">yᵢ</span> represents the electrical power load (kW) or consumption (kWh), there exists a unique polynomial{' '}
          <span className="font-mono">P(x)</span> of degree at most <span className="font-semibold">n</span> that satisfies:
        </p>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono text-sm text-slate-800">
          P(x) = ∑ᵢ₌₀ⁿ yᵢ · Lᵢ(x)
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          The <span className="font-semibold text-slate-800">Lagrange Basis Polynomials</span>{' '}
          <span className="font-mono text-blue-700">Lᵢ(x)</span> are constructed as:
        </p>

        <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 text-center font-mono text-sm text-blue-900">
          Lᵢ(x) = ∏ⱼ≠ᵢ (x - xⱼ) / (xᵢ - xⱼ)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-semibold text-slate-800">Kronecker Delta Property:</span>
            <p className="text-slate-500 mt-1">
              For any node <span className="font-mono">xₖ</span>, <span className="font-mono">Lᵢ(xₖ) = 1</span> when{' '}
              <span className="font-mono">i = k</span>, and <span className="font-mono">Lᵢ(xₖ) = 0</span> when{' '}
              <span className="font-mono">i ≠ k</span>. Hence, <span className="font-mono">P(xᵢ) = yᵢ</span> holds exactly at every support node.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-semibold text-slate-800">Barycentric Formulation:</span>
            <p className="text-slate-500 mt-1">
              To guarantee numerical stability and fast <span className="font-mono">O(n)</span> re-evaluation, our backend utilizes the first and second Barycentric forms of the Lagrange polynomial.
            </p>
          </div>
        </div>
      </div>

      {/* Load Ramp Rate & Energy Integration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          2. Derivatives (Ramp Rate) & Definite Integrals (Total Energy)
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          In electricity grid operations, knowing the instantaneous load level is only half the requirement. Power system operators must monitor ramp rates to ensure spinning reserves and dispatchable generation can follow steep changes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-600" />
              Instantaneous Ramp Rate P'(x)
            </span>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Differentiating the Lagrange polynomial yields the rate of change of power demand:{' '}
              <span className="font-mono font-semibold">P'(x) = ∑ yᵢ · L'ᵢ(x)</span>.
              A positive ramp rate indicates surge (e.g. evening dinner peak, EV charging onset), while a negative ramp indicates shedding.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-emerald-600" />
              Cumulative Energy Area ∫ P(x) dx
            </span>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Integrating power demand over time computes total electrical energy (kWh or MWh):{' '}
              <span className="font-mono font-semibold">E = ∫ₐᵇ P(x) dx</span>.
              Our engine applies composite numerical quadrature over the continuous polynomial to evaluate total energy throughput.
            </p>
          </div>
        </div>
      </div>

      {/* Runge's Phenomenon & Mitigation Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          3. Runge's Phenomenon & Engineering Remedies
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          A fundamental limitation in high-degree polynomial interpolation is <span className="font-semibold text-slate-800">Runge's Phenomenon</span>: when interpolating using high-degree polynomials (e.g. n ≥ 8) with uniformly spaced support points, the error near the boundaries of the interval can grow exponentially, resulting in unrealistic oscillations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-xs">
            <span className="font-bold text-purple-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-purple-700" />
              Remedy 1: Chebyshev Node Distribution
            </span>
            <p className="text-purple-800 mt-1 leading-relaxed">
              By clustering interpolation points denser near the interval boundaries using Chebyshev roots:
              <br />
              <span className="font-mono font-semibold">
                xₖ = ½(a + b) + ½(b - a) · cos((2k - 1)π / (2n))
              </span>
              <br />
              the Lebesgue constant grows logarithmically rather than exponentially, practically eliminating Runge oscillations!
            </p>
          </div>

          <div className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200 text-xs">
            <span className="font-bold text-cyan-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-700" />
              Remedy 2: Piecewise Local Lagrange
            </span>
            <p className="text-cyan-800 mt-1 leading-relaxed">
              Instead of fitting a single global degree-23 polynomial across all 24 hours of the day, our Piecewise Lagrange mode evaluates localized 3-node or 4-node Lagrange polynomials dynamically around any evaluation point x*. This provides continuous smoothing with zero runaway boundary oscillations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
