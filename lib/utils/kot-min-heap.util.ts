// lib/utils/kot-min-heap.util.ts
import type { KitchenTicket } from './kitchen';

export class KOTMinHeap {
  private heap: KitchenTicket[] = [];

  constructor(tickets: KitchenTicket[] = []) {
    tickets.forEach((t) => this.insert(t));
  }

  private getScore(t: KitchenTicket): number {
    // 1. Base Score: Elapsed Time
    const elapsedMs = Date.now() - new Date(t.created_at).getTime();
    
    // 2. Add-on urgency (Guest table add-ons are high priority). The flag lives
    // on the individual ticket items, written by the guest order pipeline —
    // there is no ticket-level column for it.
    const isAddon = Array.isArray(t.items) && t.items.some((i) => i.is_addon);
    const addonBonus = isAddon ? 600000 : 0; // equivalent to +10 mins wait time

    // Higher score means HIGHER priority (we invert it for Min-Heap so smaller is at root)
    return -(elapsedMs + addonBonus);
  }

  private parent(index: number): number {
    return Math.floor((index - 1) / 2);
  }

  private leftChild(index: number): number {
    return 2 * index + 1;
  }

  private rightChild(index: number): number {
    return 2 * index + 2;
  }

  private swap(i: number, j: number) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }

  insert(ticket: KitchenTicket) {
    this.heap.push(ticket);
    let current = this.heap.length - 1;

    while (
      current > 0 &&
      this.getScore(this.heap[current]) < this.getScore(this.heap[this.parent(current)])
    ) {
      this.swap(current, this.parent(current));
      current = this.parent(current);
    }
  }

  extractMin(): KitchenTicket | null {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop()!;

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.heapify(0);

    return min;
  }

  private heapify(index: number) {
    let smallest = index;
    const left = this.leftChild(index);
    const right = this.rightChild(index);

    if (
      left < this.heap.length &&
      this.getScore(this.heap[left]) < this.getScore(this.heap[smallest])
    ) {
      smallest = left;
    }

    if (
      right < this.heap.length &&
      this.getScore(this.heap[right]) < this.getScore(this.heap[smallest])
    ) {
      smallest = right;
    }

    if (smallest !== index) {
      this.swap(index, smallest);
      this.heapify(smallest);
    }
  }

  /**
   * Drains the heap into a sorted array (O(N log N) but only done once per render for active items)
   */
  getSortedArray(): KitchenTicket[] {
    const sorted: KitchenTicket[] = [];
    const copyHeap = new KOTMinHeap([...this.heap]); // Clone to preserve original
    while (copyHeap.heap.length > 0) {
      sorted.push(copyHeap.extractMin()!);
    }
    return sorted;
  }
}
