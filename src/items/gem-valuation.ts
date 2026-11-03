import { BadRequestException } from '@nestjs/common';
import { GemValuationDto } from './dto/gem-valuation.dto';
export const GEM_VALUATION_KEY = '_gemValuation';
export interface GemValuation {
  prices: {
    id: string;
    label: string;
    value: number;
    referenceValue?: number;
  }[];
  sourceUrl?: string;
  capturedAt?: string;
  referenceKeys?: string[];
  manuallyModified: boolean;
  updatedAt?: string;
  translationPending?: boolean;
}
export function parseStats(stats: unknown): Record<string, unknown> {
  if (typeof stats === 'string') {
    try {
      return parseStats(JSON.parse(stats));
    } catch {
      return {};
    }
  }
  return stats && typeof stats === 'object' && !Array.isArray(stats)
    ? { ...(stats as Record<string, unknown>) }
    : {};
}
export function updateValuation(
  previous: unknown,
  dto: GemValuationDto,
): GemValuation {
  const old = previous as GemValuation | undefined;
  if (
    old?.prices &&
    (old.prices.length !== dto.prices.length ||
      dto.prices.some(
        (price) => !old.prices.some((entry) => entry.id === price.id),
      ))
  )
    throw new BadRequestException('估值方案已变化，请刷新后重试');
  if (
    !old?.prices &&
    (dto.prices.length !== 1 || dto.prices[0].id !== 'default')
  )
    throw new BadRequestException('未配置道具只能设置默认单价');
  return {
    ...old,
    prices: dto.prices.map((price) => ({
      ...old?.prices?.find((entry) => entry.id === price.id),
      id: price.id,
      label:
        old?.prices?.find((entry) => entry.id === price.id)?.label ??
        '默认单价',
      value: price.value,
    })),
    manuallyModified: true,
    updatedAt: new Date().toISOString(),
  };
}
