import { expect } from "chai";
import { computeHammingSimilarity } from "../src/similarity";
 

describe("Hamming Similarity", () => {
    it("should return 1 for identical arrays", () => {
        const a = new Uint8Array([0b11001100]);
        const b = new Uint8Array([0b11001100]);
        expect(computeHammingSimilarity(a, b)).to.equal(1);
    });


    it("should return 0.5 for half different arrays", () => {
        const a = new Uint8Array([0b00000000]);
        const b = new Uint8Array([0b00001111]);
        expect(computeHammingSimilarity(a, b)).to.equal(0.5);
    });



    it("should return 0 for completely different arrays", () => {
        const a = new Uint8Array([0b00000000]);
        const b = new Uint8Array([0b11111111]);
        expect(computeHammingSimilarity(a, b)).to.equal(0);
    });
});