import { GradingResult } from '../types';

const DEFAULT_TOKENS_USED = {
  total: 0,
  prompt: 0,
  completion: 0,
};

export class AssertionsResult {
  static noAssertsResult(): GradingResult {
    return {
      pass: true,
      score: 1,
      reason: 'No assertions',
      tokensUsed: { ...DEFAULT_TOKENS_USED },
      assertion: null,
    };
  }

  private tokensUsed = {
    ...DEFAULT_TOKENS_USED,
  };
  private totalScore: number = 0;
  private totalWeight: number = 0;
  private failedReason: string | undefined;
  private componentResults: GradingResult[] = [];
  private namedScores: Record<string, number> = {};
  private result: GradingResult | null = null;

  addResult({
    index,
    result,
    metric,
    weight = 1,
  }: {
    index: number;
    result: GradingResult;
    metric?: string;
    weight?: number;
  }) {
    this.totalScore += result.score * weight;
    this.totalWeight += weight;
    this.componentResults[index] = result;

    if (metric) {
      this.namedScores[metric] = (this.namedScores[metric] || 0) + result.score;
    }

    if (result.tokensUsed) {
      this.tokensUsed.total += result.tokensUsed.total;
      this.tokensUsed.prompt += result.tokensUsed.prompt;
      this.tokensUsed.completion += result.tokensUsed.completion;
    }

    if (result.pass) {
      return;
    }

    this.failedReason = result.reason;

    if (process.env.PROMPTFOO_SHORT_CIRCUIT_TEST_FAILURES) {
      throw new Error(result.reason);
    }
  }

  testResult({ threshold }: { threshold?: number }): GradingResult {
    if (this.result) {
      return this.result;
    }

    const score = this.totalScore / this.totalWeight;
    let pass = !this.failedReason;

    let reason = !this.failedReason ? 'All assertions passed' : this.failedReason;

    if (threshold) {
      // Existence of a test threshold overrides the pass/fail status of individual assertions
      pass = score >= threshold;

      if (pass) {
        reason = `Aggregate score ${score.toFixed(2)} ≥ ${threshold} threshold`;
      } else {
        reason = `Aggregate score ${score.toFixed(2)} < ${threshold} threshold`;
      }
    }

    this.result = {
      pass,
      score,
      reason,
      namedScores: this.namedScores,
      tokensUsed: this.tokensUsed,
      componentResults: this.componentResults,
      assertion: null,
    };

    return this.result;
  }
}
