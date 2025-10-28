/**
 * Mulberry32 PRNG - Simple, fast, and deterministic
 * Based on: https://github.com/bryc/code/blob/master/jshash/PRNGs.md
 */
export class SeededRandom {
    private state: number;

    constructor(seed: number) {
        this.state = seed;
    }

    /**
     * Returns a random number between 0 and 1
     */
    next(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Returns a random integer between min (inclusive) and max (exclusive)
     */
    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min)) + min;
    }

    /**
     * Returns a random element from an array
     */
    choice<T>(array: T[]): T {
        return array[this.nextInt(0, array.length)];
    }

    /**
     * Shuffles an array in place using Fisher-Yates algorithm
     */
    shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}
