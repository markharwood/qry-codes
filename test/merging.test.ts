import { expect } from "chai";
import { mergeVectors } from "../src/merging";
 

/**
 * Converts a Uint8Array to a string of ones and zeros representing the bits in each byte.
 * @param uint8Array The input Uint8Array.
 * @returns A string of '0' and '1' characters representing the bits.
 */
function uint8ArrayToBinaryString(uint8Array: Uint8Array): string {
    return Array.from(uint8Array)
        .map(byte => byte.toString(2).padStart(8, '0')) // Convert each byte to an 8-bit binary string
        .join(''); // Join all binary strings together
}

describe("Merging vectors", () => {


    it("should return same for identical arrays", () => {
        const a = new Uint8Array([0b11001100]);
        const b = new Uint8Array([0b11001100]);
        expect(uint8ArrayToBinaryString(mergeVectors([a, b]))).to.equal(uint8ArrayToBinaryString(a));
    });

    it("Marginal addition should not affect average", () => {
        const a = new Uint8Array([0b11001100]);
        const b = new Uint8Array([0b11001100]);
        const c = new Uint8Array([0b01001101])
        expect(uint8ArrayToBinaryString(mergeVectors([a, b,c]))).to.equal(uint8ArrayToBinaryString(a));
    });   

    it("Multiple additions should affect average", () => {
        const a = new Uint8Array([0b11001100]);
        const b = new Uint8Array([0b11001100]);
        const c = new Uint8Array([0b11000101]);
        const d = new Uint8Array([0b10000100]);
        const e = new Uint8Array([0b11000100]);
        expect(uint8ArrayToBinaryString(mergeVectors([a, b,c,d,e]))).to.equal(uint8ArrayToBinaryString(e));
    });      

});