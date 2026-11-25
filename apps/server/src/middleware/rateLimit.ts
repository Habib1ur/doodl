interface Bucket {
  timestamps: number[];
}

export class SlidingWindowLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly maxEvents: number,
    private readonly windowMs: number
  ) {}

  allow(key: string): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const bucket = this.buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

    if (bucket.timestamps.length >= this.maxEvents) {
      this.buckets.set(key, bucket);
      return false;
    }

    bucket.timestamps.push(now);
    this.buckets.set(key, bucket);
    return true;
  }

  clear(key: string): void {
    this.buckets.delete(key);
  }
}
