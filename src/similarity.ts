
/**
 * Defines a similarity function that takes two Uint8Arrays and returns a similarity score (0-1).
 */
type SimilarityScorer = (a: Uint8Array, b: Uint8Array) => number;

function popcnt(byte:number){
    let count=0
    while (byte) {
        count += byte & 1;
        byte >>= 1;
    }
    // Note this cache is actually for holding the number of zero bits
    // because that is what denotes similarity after xORing a query and doc bytes
    return  8 - count;
}

// Precomputed lookup table for bit population counts
const popcnts: Uint8Array = (() => {
    const counts = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
        counts[i] = popcnt(i)
    }
    return counts;
})();

/**
 * The default {@link SimilarityScorer}, computes Hamming similarity between two Uint8Arrays. 
 * @param a First Uint8Array
 * @param b Second Uint8Array
 * @returns Similarity score (0-1). One means all bits were identical, zero means no bits were the same
 */
function computeHammingSimilarity(a: Uint8Array, b: Uint8Array): number {
    let totalBits = 0
    let sameBits = 0

    for (var i = 0; i < a.length; i++) {
      totalBits += 8
      // XOR and popcnt in one line:
      sameBits += popcnts[a[i] ^ b[i]];
    }
    return sameBits / totalBits
}


  /**
   * Compute full hamming distance but only for Uint8Array pairs that look likely to meet a minimum target score at the halfway mark.
   * Helps speed up comparisons on long arrays when using high target scores.
   * A heuristic is used to exit early at the halfway mark if 
   * sufficient scores have not been achieved already. This heuristic assumes that any matching bits are 
   * evenly distributed across the array (which is typical for embeddings). The number of matching bits required at the halfway stage is
   * calculated as (targetScore * arrayLength /2) * 0.9. The 0.9 is used to allow for some unevenness in the 
   * distribution of matching bits. Tests with real-world text embeddings have shown that this heuristic produced 
   * no false negatives (when compared with the exhaustive computeHammingSimilarity) and doubled the speed of high-target-score searches.
   * When the heuristic exits early at the halfway point the score returned is zero rather than any estimate based on what has been
   * gathered so far.
   * @param a First Uint8Array
   * @param b Second Uint8Array
   * @param targetScore a number between 0 and 1 
   * @returns a similarity score between zero and 1 (zero if comparison exited early)
   */
  function fastHammingSimilarity(a: Uint8Array, b: Uint8Array, targetScore: number): number {
    // We set the midpoint target similarity to be a little less than the final target score to 
    // allow for the fact that the most similar bits are (by chance) skewed to the second half 
    // of the array. This seems like a very unlikely distribution and I found 0.9 to produce
    // identical results to a full-scan similarity in thousands of tests.
    let midPointTargetSim = targetScore * 0.9

    // A midpoint exit target of 0.5 is not fast-trackable. It is far too low a bar that we can expect the 
    // vast majority of embeddings to pass. Even a random "white noise" embedding will have at least 50% 
    // of its toin cosses matching.
    if (midPointTargetSim < 0.5) {
      return computeHammingSimilarity(a, b)
    }
    let totalBits = 0
    let sameBits = 0
    let midway = Math.ceil(a.length / 2)
    for (var i = 0; i < a.length; i++) {
      totalBits += 8
      // xor and popcnt 
      sameBits += popcnts[a[i] ^ b[i]];

      if (i == midway) {
        if ((sameBits / totalBits) <= midPointTargetSim) {
          // Halfway through and we are not on target. Exit early because we assume
          // we're not going to make the numbers up in the second half
          return 0
        }
      }
    }
    return sameBits / totalBits
  }


export { computeHammingSimilarity, fastHammingSimilarity, SimilarityScorer};