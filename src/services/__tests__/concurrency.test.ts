import { withConcurrencyLimit } from '../concurrency';

describe('Concurrency Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withConcurrencyLimit', () => {
    it('should process all items with concurrency limit', async () => {
      const items = [1, 2, 3, 4, 5];
      const processedItems: number[] = [];
      const handler = jest.fn(async (item: number) => {
        processedItems.push(item);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await withConcurrencyLimit(items, 2, handler);

      expect(handler).toHaveBeenCalledTimes(5);
      expect(processedItems).toHaveLength(5);
      expect(processedItems.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should respect concurrency limit', async () => {
      const items = [1, 2, 3, 4, 5];
      let concurrentCount = 0;
      let maxConcurrent = 0;
      
      const handler = jest.fn(async (item: number) => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrentCount--;
      });

      await withConcurrencyLimit(items, 2, handler);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
      expect(handler).toHaveBeenCalledTimes(5);
    });

    it('should handle empty array', async () => {
      const items: number[] = [];
      const handler = jest.fn();

      await withConcurrencyLimit(items, 2, handler);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle single item', async () => {
      const items = [1];
      const handler = jest.fn(async (item: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await withConcurrencyLimit(items, 2, handler);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(1, 0);
    });

    it('should handle concurrency limit larger than items', async () => {
      const items = [1, 2];
      const handler = jest.fn(async (item: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await withConcurrencyLimit(items, 5, handler);

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in handler', async () => {
      const items = [1, 2, 3];
      const handler = jest.fn(async (item: number) => {
        if (item === 2) {
          throw new Error(`Error processing item ${item}`);
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await expect(withConcurrencyLimit(items, 2, handler)).rejects.toThrow('Error processing item 2');
      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should pass correct index to handler', async () => {
      const items = ['a', 'b', 'c'];
      const handler = jest.fn(async (item: string, index: number) => {
        expect(typeof index).toBe('number');
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(items.length);
      });

      await withConcurrencyLimit(items, 2, handler);

      expect(handler).toHaveBeenCalledWith('a', 0);
      expect(handler).toHaveBeenCalledWith('b', 1);
      expect(handler).toHaveBeenCalledWith('c', 2);
    });

    it('should handle zero concurrency limit', async () => {
      const items = [1, 2, 3];
      const handler = jest.fn(async (item: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Zero limit should still process items (edge case)
      await withConcurrencyLimit(items, 0, handler);

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should handle negative concurrency limit', async () => {
      const items = [1, 2, 3];
      const handler = jest.fn(async (item: number) => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Negative limit should still process items (edge case)
      await withConcurrencyLimit(items, -1, handler);

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const items = [1, 2, 3, 4, 5];
      const results: number[] = [];
      const handler = jest.fn(async (item: number) => {
        if (item === 3) {
          throw new Error('Item 3 failed');
        }
        results.push(item);
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      await expect(withConcurrencyLimit(items, 2, handler)).rejects.toThrow('Item 3 failed');
      expect(handler).toHaveBeenCalledTimes(5);
    });

    it('should handle resource cleanup properly', async () => {
      const items = [1, 2, 3, 4, 5];
      const activePromises: Promise<void>[] = [];
      
      const handler = jest.fn(async (item: number) => {
        const promise = new Promise<void>(resolve => {
          setTimeout(() => {
            resolve();
          }, 20);
        });
        activePromises.push(promise);
        await promise;
      });

      await withConcurrencyLimit(items, 2, handler);

      // All promises should be resolved
      const results = await Promise.allSettled(activePromises);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });
}); 