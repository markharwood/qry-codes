import { computeHammingSimilarity, SimilarityScorer } from "./similarity";

/**
 * Represents a compact, fully connected, weighted graph (scores for connections between all nodes)
 * Stores only the upper triangular part of the adjacency matrix to avoid duplication.
 * Built using {@link buildSimilarityGraph}
 */
interface SimilarityGraph {
    /**
     * Number of nodes (vectors) in the graph.
     */
    nodeCount: number;

    /**
     * A dense array-based structure storing similarity scores.
     * - `edgeScores[i][j]` contains the similarity score for vectors `(i, i + j + 1)`.
     * - Only upper-triangular elements are stored to save space.
     */
    edgeScores: number[][];
}

/**
 * Builds a SimilarityGraph from a list of vectors. The graph can then be used in
 * {@link clusterByThreshold} or {@link clusterWithCohesion}  to identify clusters of a specified quality. 
 * @param vectors An array of Uint8Arrays representing vectors.
 * @param similarityScorer A function to compute similarity (default: Hamming similarity).
 * @returns A fully connected, weighted graph where edges are similarity scores - for use in calls to {@link clusterByThreshold}
 */
function buildSimilarityGraph(
    vectors: Uint8Array[],
    similarityScorer: SimilarityScorer = computeHammingSimilarity
): SimilarityGraph {
    const nodeCount = vectors.length;
    const edgeScores: number[][] = new Array(nodeCount - 1);

    for (let i = 0; i < nodeCount - 1; i++) {
        edgeScores[i] = new Array(nodeCount - i - 1);
        for (let j = i + 1; j < nodeCount; j++) {
            edgeScores[i][j - i - 1] = similarityScorer(vectors[i], vectors[j]);
        }
    }
    return { nodeCount, edgeScores };
}

/**
 * Simple API to compute clusters for a set of vectors.
 * If repeated calls are to be made with the same vectors, but different threshold settings,
 * consider calling {@link buildSimilarityGraph} first then repeated {@link clusterByThreshold} instead which will avoid
 * recomputing all the scores between vector pairs.
 * @param vectors An array of Uint8Arrays representing vectors.
 * @param similarityThreshold The similarity threshold for clustering (0-1). (optional, defaults to 0.75).
 * @param similarityScorer A function to compute similarity (default: Hamming similarity).
 * @returns An array of clusters, where each cluster is an array of similar vector indices. The array is sorted by cluster size.
 */
function oneOffClusterVectors(vectors: Uint8Array[],
                            similarityThreshold:number = 0.75,
                            similarityScorer: SimilarityScorer = computeHammingSimilarity
                        ):number[][]{
    let simGraph = buildSimilarityGraph(vectors, similarityScorer)
    return clusterByThreshold(simGraph, similarityThreshold)
}

/**
 * Extracts clusters from a similarity graph based on a user-defined threshold.
 * The threshold is used to trim weak edges leaving one or more fully connected sub graphs.
 * This simple approach can lead to weak connections joining two or more otherwise independent
 * clusters. See {@link clusterWithCohesion} for a smarter alternative 
 * @param graph A precomputed SimilarityGraph built using {@link buildSimilarityGraph}
 * @param threshold The similarity threshold for clustering (0-1).
 * @returns An array of clusters, sorted by size (largest first).
 */
function clusterByThreshold(graph: SimilarityGraph, threshold: number): number[][] {
    const visited = new Set<number>();
    const clusters: number[][] = [];

    function depthFirstSearch(node: number, cluster: number[]) {
        if (visited.has(node)) return;
        visited.add(node);
        cluster.push(node);

        for (let j = node + 1; j < graph.nodeCount; j++) {
            if (!visited.has(j) && graph.edgeScores[node][j - node - 1] >= threshold) {
                depthFirstSearch(j, cluster);
            }
        }

        for (let i = 0; i < node; i++) {
            if (!visited.has(i) && graph.edgeScores[i][node - i - 1] >= threshold) {
                depthFirstSearch(i, cluster);
            }
        }
    }

    for (let node = 0; node < graph.nodeCount; node++) {
        if (!visited.has(node)) {
            const cluster: number[] = [];
            depthFirstSearch(node, cluster);
            clusters.push(cluster);
        }
    }

    // Sort clusters by size (largest first)
    return clusters.sort((a, b) => b.length - a.length);
}

/**
 * Retrieves the similarity score for a pair of vectors in the graph
 * @param simGraph The pre-computed store of similarities between all vectors
 * @param i Index of a vector in the graph
 * @param j Index of another vector in the graph
 * @returns The similarity score of the two vectors.
 */
function getComputedSimilarity(simGraph: SimilarityGraph, i: number, j: number): number {
  if (i === j) return 1; 
  const a = Math.min(i, j);
  const b = Math.max(i, j);
  return simGraph.edgeScores[a][b - a - 1];
}

//======= More advanced cluster formation ======

/**
 * Build adjacency lists for edges with sim >= threshold.
 */
function buildAdjacency(graph: SimilarityGraph, threshold: number): number[][] {
  const n = graph.nodeCount;
  const adj: number[][] = Array.from({ length: n }, () => []);

  for (let i = 0; i < n - 1; i++) {
    const row = graph.edgeScores[i] ?? [];
    const maxK = n - i - 1;
    const rowLen = Math.min((row as any).length ?? 0, maxK);

    for (let k = 0; k < rowLen; k++) {
      const s = (row as any)[k] as number;
      if (s >= threshold) {
        const j = i + k + 1;
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  return adj;
}

function connectedComponents(adj: number[][]): number[][] {
  const n = adj.length;
  const seen = new Uint8Array(n);
  const comps: number[][] = [];

  for (let s = 0; s < n; s++) {
    if (seen[s]) continue;
    const stack = [s];
    seen[s] = 1;
    const comp: number[] = [];

    while (stack.length) {
      const u = stack.pop()!;
      comp.push(u);
      for (const v of adj[u]) {
        if (!seen[v]) {
          seen[v] = 1;
          stack.push(v);
        }
      }
    }
    comps.push(comp);
  }
  return comps;
}

/**
 * Deterministic PRNG (Mulberry32) so runs are reproducible.
 */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

/**
 * Key for undirected edge (u<v).
 */
function edgeKey(u: number, v: number): string {
  return u < v ? `${u},${v}` : `${v},${u}`;
}

/**
 * BFS shortest path on an unweighted graph, restricted to nodes in `inComp`.
 * Randomized tie-breaking: we shuffle neighbor iteration order per BFS using RNG,
 * so repeated runs explore different shortest paths when multiple exist.
 *
 * Returns path as array of nodes [s..t], or null if disconnected.
 */
function bfsRandomShortestPath(
  adj: number[][],
  inComp: Uint8Array,
  s: number,
  t: number,
  rng: () => number
): number[] | null {
  if (s === t) return [s];

  const n = adj.length;
  const q = new Int32Array(n);
  let qh = 0, qt = 0;

  const dist = new Int32Array(n);
  dist.fill(-1);
  const parent = new Int32Array(n);
  parent.fill(-1);

  dist[s] = 0;
  q[qt++] = s;

  // We'll do a lightweight "shuffle" by picking a start offset for neighbor scanning;
  // avoids allocating/shuffling arrays each BFS.
  while (qh < qt) {
    const u = q[qh++];
    const Nu = adj[u];
    if (!Nu || Nu.length === 0) continue;

    const start = Nu.length > 1 ? randInt(rng, Nu.length) : 0;
    for (let kk = 0; kk < Nu.length; kk++) {
      const v = Nu[(start + kk) % Nu.length];
      if (!inComp[v]) continue;
      if (dist[v] !== -1) continue;

      dist[v] = dist[u] + 1;
      parent[v] = u;
      if (v === t) {
        // reconstruct
        const path: number[] = [];
        let cur = t;
        while (cur !== -1) {
          path.push(cur);
          if (cur === s) break;
          cur = parent[cur];
        }
        path.reverse();
        return path;
      }
      q[qt++] = v;
    }
  }

  return null;
}

export interface PairPathPruneOptions {
  /** Only attempt pruning inside components of at least this size */
  minComponentSizeForPrune?: number; // default 30
  /** Number of sampled (s,t) pairs per component per round */
  samplesPerComponent?: number; // default 600
  /** Or remove this fraction of edges per component per round  */
  removeTopEdgeFraction?: number; // e.g. 0.005 (0.5%)
  /** Max pruning rounds to run inside each component */
  maxRounds?: number; // default 3
  /** Deterministic seed for sampling */
  seed?: number; // default 1337
  /**
   * Stop early if a component does not split (number of subcomponents stays the same) in a round.
   * default true
   */
  stopIfNoSplit?: boolean;
}

/**
 * Cohesive clustering: Overcomes overlinking issues with clusterByThreshold.
 * With the naive approach used in clusterByThreshold a cohesive cluster of tightly-knit elements 
 * can have a new lower-scoring rogue element added which "bridges meaning" and weakly connects the 
 * existing island to a different island of meaning. The two dense clusters bridged by this single
 * element represent the shape of a dumbell when visualized as a graph. Were it not for the weak bridge
 * connecting them they would be entirely separate clusters.
 * 
 * One example problem might be a cluster that represents "ice" as in "US immigration control" and ice 
 * as in snow and weather. A single bridging document (e.g. "ICE agents struggle through snow") might be 
 * the only connection between two otherwise separate collections.
 * 
 * This clusterWithCohesion function still connects using similarity thresholds but then prunes
 * elements that lack cohesion due to weakly connected large groups inside.
 * 
 * Starts from thresholded graph, then prune "bridge" edges
 * using sampled shortest paths between random vertex pairs (approx edge betweenness),
 * recompute components, repeat a few rounds.
 *
 * Returns clusters as arrays of node indices, sorted by size.
 */
function clusterWithCohesion(
  graph: SimilarityGraph,
  threshold: number,
  options: PairPathPruneOptions = {}
): number[][] {
  const opts = {
    minComponentSizeForPrune: options.minComponentSizeForPrune ?? 30,
    samplesPerComponent: options.samplesPerComponent ?? 600,
    removeTopEdgeFraction: options.removeTopEdgeFraction??0.5,
    maxRounds: options.maxRounds ?? 3,
    seed: options.seed ?? 1337,
    stopIfNoSplit: options.stopIfNoSplit ?? true,
  };

  const rng = mulberry32(opts.seed);

  const adj = buildAdjacency(graph, threshold);

  // Initial components
  let comps = connectedComponents(adj);

  // Process each large component independently (keeps collateral damage low)
  const refined: number[][] = [];

  for (const comp of comps) {
    if (comp.length < opts.minComponentSizeForPrune) {
      refined.push(comp);
      continue;
    }

    // membership mask for this component (updated each round based on splitting)
    let currentSubcomps: number[][] = [comp];

    for (let round = 0; round < opts.maxRounds; round++) {
      const nextSubcomps: number[][] = [];

      for (const sub of currentSubcomps) {
        if (sub.length < opts.minComponentSizeForPrune) {
          nextSubcomps.push(sub);
          continue;
        }

        // Build membership mask for BFS restriction
        const inComp = new Uint8Array(adj.length);
        for (const u of sub) inComp[u] = 1;

        // Count edge usage across sampled shortest paths
        const edgeCounts = new Map<string, number>();

        const m = sub.length;
        const K = Math.min(opts.samplesPerComponent, m * (m - 1)); // cap for tiny subcomps

        for (let sIter = 0; sIter < K; sIter++) {
          const s = sub[randInt(rng, m)];
          let t = sub[randInt(rng, m)];
          if (t === s && m > 1) {
            // ensure distinct if possible
            t = sub[(randInt(rng, m - 1) + 1) % m];
          }

          const path = bfsRandomShortestPath(adj, inComp, s, t, rng);
          if (!path || path.length < 2) continue;

          for (let i = 0; i < path.length - 1; i++) {
            const u = path[i];
            const v = path[i + 1];
            const k = edgeKey(u, v);
            edgeCounts.set(k, (edgeCounts.get(k) ?? 0) + 1);
          }
        }

        if (edgeCounts.size === 0) {
          nextSubcomps.push(sub);
          continue;
        }

        // Decide how many edges to remove
        const E = edgeCounts.size;
        const removeN = Math.max(1, Math.floor(E * opts.removeTopEdgeFraction))

        // IMPORTANT: We want to cut bridges. Bridges are often on many shortest paths
        // *between lobes*, so they get HIGH counts. So we remove TOP counted edges.
        const topEdges = Array.from(edgeCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, removeN)
          .map(([k]) => k);

        // Apply removals to adjacency (undirected)
        for (const k of topEdges) {
          const [as, bs] = k.split(",");
          const u = parseInt(as, 10);
          const v = parseInt(bs, 10);
          // Only remove if both still in this subcomp (they should be)
          if (!inComp[u] || !inComp[v]) continue;

          adj[u] = adj[u].filter(x => x !== v);
          adj[v] = adj[v].filter(x => x !== u);
        }

        // Recompute components within this subgraph by running CC on induced nodes.
        // Efficient approach for n<1000: run CC globally, then keep those intersecting.
        const after = connectedComponents(adj).filter(c => c.some(n => inComp[n]));

        // Keep only the parts that are subsets of this subcomp
        // and dedup by key
        const seenKeys = new Set<string>();
        for (const c of after) {
          // Filter to induced nodes (safety)
          const induced = c.filter(n => inComp[n]);
          if (induced.length === 0) continue;
          induced.sort((a, b) => a - b);
          const key = induced.join(",");
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            nextSubcomps.push(induced);
          }
        }
      }

      // Stop early if nothing split (same number of subcomponents and identical sets)
      if (opts.stopIfNoSplit) {
        const beforeKeys = new Set(currentSubcomps.map(c => c.slice().sort((a,b)=>a-b).join(",")));
        const afterKeys = new Set(nextSubcomps.map(c => c.slice().sort((a,b)=>a-b).join(",")));
        let changed = beforeKeys.size !== afterKeys.size;
        if (!changed) {
          for (const k of beforeKeys) {
            if (!afterKeys.has(k)) { changed = true; break; }
          }
        }
        currentSubcomps = nextSubcomps;
        if (!changed) break;
      } else {
        currentSubcomps = nextSubcomps;
      }
    }

    // Add resulting subcomponents
    for (const c of currentSubcomps) refined.push(c);
  }

  return refined.sort((a, b) => b.length - a.length);
}



export {SimilarityGraph, buildSimilarityGraph, clusterByThreshold, oneOffClusterVectors, getComputedSimilarity, clusterWithCohesion}
