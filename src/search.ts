
import { computeHammingSimilarity, SimilarityScorer } from "./similarity";

/**
 * A result from the {@link simpleSearch} function
 */
interface Match {
    index: number,
    score: number
}
/**
 * A simple brute-force search across a collection of local documents.
 * For more complex or large scale search consider using:
 * * [elasticsearch](https://www.elastic.co/search-labs/blog/bit-vectors-in-elasticsearch#ok,-but-how-do-i-use-)
 * * [Weaviate](https://weaviate.io/developers/weaviate/configuration/compression/bq-compression)
 * * In browser-search combining Boolean, vector keyword etc using the javascript search engine in www.andorsearch.co
 * @param query A vector that represents a query
 * @param docs An array of vectors that represents the documents to be searched
 * @param topN The number of top results to be returned
 * @param scorer The {@link SimilarityScorer} to be used
 * @returns the top scoring matches
 */
function simpleSearch(query: Uint8Array, docs: Uint8Array[], topN: number = 10, scorer: SimilarityScorer = computeHammingSimilarity): Match[] {
    let matches: Match[] = []
    docs.forEach((docEmbed, index) => {
        matches.push({ index, "score": computeHammingSimilarity(docEmbed, query) })
    })
    return matches.sort((a, b) => {
        return b.score - a.score;
    }).slice(0, topN);
}
export { Match, simpleSearch }