import { BadRequestException } from '@nestjs/common';
import { parseStats } from './gem-valuation';
export const IDENTITY_KEYS = [
  '_mergedInto',
  '_itemAliases',
  '_previousNames',
] as const;
export function mergedInto(stats: unknown): string | undefined {
  const value = parseStats(stats)._mergedInto;
  return typeof value === 'string' && value ? value : undefined;
}
export function canonicalIds(
  ids: string[],
  rows: { id: string; stats?: unknown }[],
) {
  const targets = new Map(rows.map((row) => [row.id, mergedInto(row.stats)]));
  return [
    ...new Set(
      ids.map((original) => {
        let id = original;
        const visited = new Set<string>();
        while (targets.get(id)) {
          if (visited.has(id))
            throw new BadRequestException('道具别名循环，请联系管理员');
          visited.add(id);
          id = targets.get(id)!;
        }
        return id;
      }),
    ),
  ];
}
