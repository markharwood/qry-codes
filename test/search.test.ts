import { expect } from "chai";
import { simpleSearch, Match } from "../src/search";
 

describe("Search documents", () => {
    it("should return top results", () => {
        const a = new Uint8Array([0b11111111]);
        const b = new Uint8Array([0b00000001]);
        const c = new Uint8Array([0b00001111]);
        const d = new Uint8Array([0b11000000]);
        const docs=[a, b, c, d]

        let matches:Match[] = simpleSearch(a, docs, 3)

        expect(matches.length).to.equal(3)
        expect(matches[0].index).to.equal(docs.indexOf(a))
        expect(matches[0].score).to.equal(1)

        expect(matches[1].index).to.equal(docs.indexOf(c))
        expect(matches[1].score).to.equal(4/8)

        expect(matches[2].index).to.equal(docs.indexOf(d))
        expect(matches[2].score).to.equal(2/8)


    });


});