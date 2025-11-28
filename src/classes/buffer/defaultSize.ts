import { SizeStrategy } from '../../inputs/index';

interface ItemSize {
  size: number;
  newSize?: number;
}

export class SizesRecalculation {
  newItems: ItemSize[];
  oldItems: ItemSize[];
  removed: ItemSize[];

  constructor() {
    this.reset();
  }

  reset(): void {
    this.newItems = [];
    this.oldItems = [];
    this.removed = [];
  }
}

export class DefaultSize {
  private readonly itemSize: number;
  private readonly sizeStrategy: SizeStrategy;
  private sizeMap: Map<number, number>;
  private recalculation: SizesRecalculation;

  private constantSize: number;
  private frequentSize: number;
  private averageSize: number;
  private averageSizeFloat: number;

  constructor(itemSize: number, sizeStrategy: SizeStrategy) {
    this.itemSize = itemSize;
    this.sizeStrategy = sizeStrategy;
    this.sizeMap = new Map<number, number>();
    this.recalculation = new SizesRecalculation();
  }

  reset(force: boolean): void {
    if (force) {
      this.constantSize = this.itemSize;
      this.frequentSize = this.itemSize;
      this.averageSize = this.itemSize;
      this.averageSizeFloat = this.itemSize;
      this.sizeMap.clear();
    }
    this.recalculation.reset();
  }

  get(): number {
    switch (this.sizeStrategy) {
      case SizeStrategy.Average:
        return this.averageSize;
      case SizeStrategy.Frequent:
        return this.frequentSize;
      default:
        return this.constantSize;
    }
  }

  private recalculateAverageSize(cacheSize: number): void {
    const { oldItems, newItems, removed } = this.recalculation;
    if (oldItems.length) {
      const oldSize = oldItems.reduce((acc, item) => acc + item.size, 0);
      const newSize = oldItems.reduce((acc, item) => acc + (item.newSize as number), 0);
      const averageSize = this.averageSizeFloat || 0;
      this.averageSizeFloat = averageSize - (oldSize - newSize) / (cacheSize - newItems.length);
    }
    if (newItems.length) {
      const newSize = newItems.reduce((acc, item) => acc + item.size, 0);
      const averageSize = this.averageSizeFloat || 0;
      this.averageSizeFloat = ((cacheSize - newItems.length) * averageSize + newSize) / cacheSize;
    }
    if (removed.length) {
      const removedSize = removed.reduce((acc, item) => acc + item.size, 0);
      const averageSize = this.averageSizeFloat || 0;
      this.averageSizeFloat =
        ((cacheSize + removed.length) * averageSize - removedSize) / cacheSize;
    }
    this.averageSize = Math.round(this.averageSizeFloat);
  }

  private recalculateFrequentSize(): void {
    const { oldItems, newItems, removed } = this.recalculation;
    const oldFrequentSizeCount = this.sizeMap.get(this.frequentSize);
    if (newItems.length) {
      newItems.forEach(({ size }) => this.sizeMap.set(size, (this.sizeMap.get(size) || 0) + 1));
    }
    if (oldItems.length) {
      oldItems.forEach(({ size }) =>
        this.sizeMap.set(size, Math.max((this.sizeMap.get(size) || 0) - 1, 0))
      );
      oldItems.forEach(({ newSize: s }) =>
        this.sizeMap.set(s as number, (this.sizeMap.get(s as number) || 0) + 1)
      );
    }
    if (removed.length) {
      removed.forEach(({ size }) =>
        this.sizeMap.set(size, Math.max((this.sizeMap.get(size) || 0) - 1, 0))
      );
    }
    const sorted = [...this.sizeMap.entries()].sort((a, b) => b[1] - a[1]);
    const mostFrequentCount = sorted[0][1];
    const listEqual = sorted.filter(i => i[1] === mostFrequentCount);
    if (listEqual.length > 1 && listEqual.find(i => i[0] === oldFrequentSizeCount)) {
      // if there are more than 1 most frequent sizes, but the old one is present
      return;
    }
    this.frequentSize = sorted[0][0];
  }

  recalculate(cacheSize: number): boolean {
    if (this.sizeStrategy === SizeStrategy.Constant) {
      return false;
    }
    const { oldItems, newItems, removed } = this.recalculation;
    if (!oldItems.length && !newItems.length && !removed.length) {
      return false;
    }
    const oldValue = this.get();
    if (!cacheSize) {
      this.reset(true);
    } else {
      if (this.sizeStrategy === SizeStrategy.Average) {
        this.recalculateAverageSize(cacheSize);
      } else {
        this.recalculateFrequentSize();
      }
      this.recalculation.reset();
    }
    return this.get() !== oldValue;
  }

  setExisted(oldSize: number, newSize: number): void {
    if (this.sizeStrategy !== SizeStrategy.Constant) {
      this.recalculation.oldItems.push({
        size: oldSize,
        newSize
      });
    }
  }

  setNew(size: number): void {
    if (this.sizeStrategy !== SizeStrategy.Constant) {
      this.recalculation.newItems.push({ size });
    } else {
      if (!this.constantSize) {
        this.constantSize = size;
      }
    }
  }

  setRemoved(size: number): void {
    if (this.sizeStrategy !== SizeStrategy.Constant) {
      this.recalculation.removed.push({ size });
    }
  }
}
