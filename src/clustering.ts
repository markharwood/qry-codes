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
 * {@link clusterByThreshold} to identify clusters of a specified quality. 
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

export {SimilarityGraph, buildSimilarityGraph, clusterByThreshold, oneOffClusterVectors}
