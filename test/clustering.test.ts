import { expect } from "chai";
import { SimilarityGraph, buildSimilarityGraph, clusterByThreshold, oneOffClusterVectors } from "../src/clustering";
import { computeHammingSimilarity } from "../src/similarity";
// import { mergeVectors } from "../src/merging";


describe("Clustering", () => {
    const a = new Uint8Array([0b11110000]);
    const b = new Uint8Array([0b10110000]);
    // nodes a and b are similar. nodes c and d are similar (but less so), bridge node connects these two islands.
    const bridge = new Uint8Array([0b11111111]);
    const c = new Uint8Array([0b00001110]);
    const d = new Uint8Array([0b00001100]);
    let lowestSim = computeHammingSimilarity(d, bridge)
    let allVectors = [a, b, bridge, c, d]
    let fullyConnectedGraph: SimilarityGraph = buildSimilarityGraph(allVectors)
    // Build a graph where everything is scored 1
    let allOnesGraph: SimilarityGraph = buildSimilarityGraph(allVectors, (a:Uint8Array, b:Uint8Array)=>1)
    let allZeroesGraph: SimilarityGraph = buildSimilarityGraph(allVectors, (a:Uint8Array, b:Uint8Array)=>0)

    it("Lowest sim = match all in one cluster using oneOff API", () => {
        // Call graph trimming with lowest threshold should leave fully connected graph
        let clusters = oneOffClusterVectors(allVectors, lowestSim)
        expect(clusters.length).to.equal(1);
        expect(clusters[0].length).to.equal(allVectors.length);
    });


    it("Lowest sim = match all in one cluster", () => {
        // Call graph trimming with lowest threshold should leave fully connected graph
        let clusters = clusterByThreshold(fullyConnectedGraph, lowestSim)
        expect(clusters.length).to.equal(1);
        expect(clusters[0].length).to.equal(allVectors.length);
    });

    it("mid sim = 3 clusters", () => {
        // Call graph trimming with threshold that is greater than the bridge's connectivity to any other node.
        let clusters = clusterByThreshold(fullyConnectedGraph, 0.51)
        expect(clusters.length).to.equal(3);
        expect(clusters[0].length).to.equal(2);
        expect(clusters[0][0]).to.equal(allVectors.indexOf(a));
        expect(clusters[0][1]).to.equal(allVectors.indexOf(b));

        expect(clusters[1].length).to.equal(2);
        expect(clusters[1][0]).to.equal(allVectors.indexOf(c));
        expect(clusters[1][1]).to.equal(allVectors.indexOf(d));

        expect(clusters[2].length).to.equal(1);
        expect(clusters[2][0]).to.equal(allVectors.indexOf(bridge));
    });

    it("high sim = single node clusters", () => {
        // Call graph trimming with threshold that is greater than the bridge's connectivity to any other node.
        let clusters = clusterByThreshold(fullyConnectedGraph, 0.99)
        expect(clusters.length).to.equal(allVectors.length);
    });

    it("custom sim 1 = single cluster", () => {
        let clusters = clusterByThreshold(allOnesGraph, 1)
        expect(clusters.length).to.equal(1);
    });

    it("custom sim 2 = many clusters", () => {
        let clusters = clusterByThreshold(allZeroesGraph, 0.5)
        expect(clusters.length).to.equal(allVectors.length);
    });

});