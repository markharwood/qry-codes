/**
 * Compute the bitwise average representation of a set of Uint8Arrays.
 * Typically used to fuse the vectors in a cluster to produce a  blended vector that (hopefully) 
 * retains the meaning of its inputs.  
 * @param vectors Array of Uint8Arrays
 * @returns A new Uint8Array representing the bitwise average.
 */
function mergeVectors(vectors: Uint8Array[]): Uint8Array {
  if (vectors.length === 0) {
    throw new Error("Array is empty");
  }
  if (vectors.length === 1) {
    return vectors[0];
  }

  const numBits = vectors[0].length * 8; // Total number of bits
  const numArrays = vectors.length;
  const result = new Uint8Array(Math.ceil(numBits / 8)); // Result Uint8Array with appropriate length

  // Iterate over each bit position
  for (let i = 0; i < numBits; i++) {
    let countSetBits = 0;

    // Iterate over each Uint8Array
    for (let j = 0; j < numArrays; j++) {
      const byteIndex = Math.floor(i / 8); // Byte index in the Uint8Array
      const bitIndex = 7 - (i % 8); // Bit index within the byte

      // Check if the bit at the current position is set in the current Uint8Array
      if ((vectors[j][byteIndex] >> bitIndex) & 1) {
        countSetBits++;
      }
    }

    // Calculate the average value for the bit position and set the bit in the result Uint8Array
    if (countSetBits > numArrays / 2) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = 7 - (i % 8);
      result[byteIndex] |= 1 << bitIndex; // Set the bit
    }
  }

  return result;
}

export { mergeVectors }