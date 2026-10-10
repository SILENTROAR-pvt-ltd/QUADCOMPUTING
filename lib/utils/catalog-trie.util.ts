// lib/utils/catalog-trie.util.ts
import type { CatalogItem } from '@/types';

class TrieNode<T> {
  children: Map<string, TrieNode<T>>;
  items: Set<T>;
  isEndOfWord: boolean;

  constructor() {
    this.children = new Map();
    this.items = new Set();
    this.isEndOfWord = false;
  }
}

export class CatalogTrie<T extends { name: string; category?: string; description?: string; course?: string }> {
  root: TrieNode<T>;

  constructor() {
    this.root = new TrieNode<T>();
  }

  /**
   * Insert an item into the Trie indexing by its name and category.
   * Time Complexity: O(L) where L is the length of the string being indexed.
   */
  insert(item: T) {
    const tokens = this.tokenize(item.name);
    if (item.category) tokens.push(...this.tokenize(item.category));
    if (item.course) tokens.push(item.course.toLowerCase());
    if (item.description) tokens.push(...this.tokenize(item.description));

    for (const token of tokens) {
      let current = this.root;
      for (const char of token) {
        if (!current.children.has(char)) {
          current.children.set(char, new TrieNode());
        }
        current = current.children.get(char)!;
        // Optimization: Store the item reference at every node along the path
        // for instant prefix retrieval without DFS traversal.
        current.items.add(item);
      }
      current.isEndOfWord = true;
    }
  }

  /**
   * Search for items matching a given prefix.
   * Time Complexity: O(M) where M is the length of the query prefix.
   * Extremely fast, completely independent of total catalog size (N).
   */
  search(query: string): T[] {
    const q = query.trim().toLowerCase();
    if (!q) return []; // Empty query handled by caller

    const tokens = this.tokenize(q);
    if (tokens.length === 0) return [];

    // For multi-word queries, we find the intersection of results for each token
    let resultSets: Set<T>[] = [];

    for (const token of tokens) {
      let current = this.root;
      let found = true;
      for (const char of token) {
        if (!current.children.has(char)) {
          found = false;
          break;
        }
        current = current.children.get(char)!;
      }
      if (found) {
        resultSets.push(current.items);
      } else {
        // If any token has zero matches, the entire query fails
        return [];
      }
    }

    if (resultSets.length === 1) {
      return Array.from(resultSets[0]);
    }

    // Intersect the sets for multi-token queries
    const smallestSet = resultSets.reduce((a, b) => a.size < b.size ? a : b);
    const finalResults: T[] = [];
    
    for (const item of Array.from(smallestSet)) {
      let inAll = true;
      for (const set of resultSets) {
        if (set !== smallestSet && !set.has(item)) {
          inAll = false;
          break;
        }
      }
      if (inAll) finalResults.push(item);
    }

    return finalResults;
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase().split(/[\s\-]+/).filter(t => t.length > 0);
  }
}
