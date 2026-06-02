export function computeRates(plays: number, clicks: number, conversions: number, averageWatchRate: number) {
  const clickRateFraction = plays > 0 ? clicks / plays : 0;
  const conversionRateFraction = clicks > 0 ? conversions / clicks : 0;
  const watchFraction = averageWatchRate / 100;

  const score =
    conversionRateFraction * 50 + clickRateFraction * 30 + watchFraction * 20;

  return {
    clickRate: roundPercent(clickRateFraction * 100),
    conversionRate: roundPercent(conversionRateFraction * 100),
    averageWatchRate: roundPercent(averageWatchRate),
    score: roundPercent(score),
  };
}

export function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildComparisonReasons(
  leftName: string,
  rightName: string,
  left: { conversionRate: number; averageWatchRate: number; score: number },
  right: { conversionRate: number; averageWatchRate: number; score: number },
  winnerTemplateId?: string,
  leftTemplateId?: string
): string[] {
  const reasons: string[] = [];
  const conversionDiff = left.conversionRate - right.conversionRate;

  if (Math.abs(conversionDiff) >= 0.01) {
    if (conversionDiff > 0) {
      reasons.push(`「${leftName}」的转化率比「${rightName}」高 ${roundPercent(Math.abs(conversionDiff))} 个百分点`);
    } else {
      reasons.push(`「${rightName}」的转化率比「${leftName}」高 ${roundPercent(Math.abs(conversionDiff))} 个百分点`);
    }
  }

  if (left.averageWatchRate > right.averageWatchRate + 0.01) {
    reasons.push(`「${leftName}」的平均完播率更高`);
  } else if (right.averageWatchRate > left.averageWatchRate + 0.01) {
    reasons.push(`「${rightName}」的平均完播率更高`);
  }

  if (winnerTemplateId) {
    const winnerName = winnerTemplateId === leftTemplateId ? leftName : rightName;
    reasons.push(`综合评分推荐「${winnerName}」`);
  } else {
    reasons.push('两个模板综合评分接近，建议结合类目与卖点继续 A/B 测试');
  }

  return reasons;
}
