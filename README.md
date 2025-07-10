# "QRy codes - like QR codes, but for search"


A picture is worth a thousand words.
An interactive demo is worth even more - visit [QRy.codes](http://qry.codes) to see what this package does and why.

This package provides *low-level utilities* for browser-side search and clustering of binary embeddings.

If you don't want to get your hands dirty, *higher-level packages* like @andorsearch/qry-codes-vue wrap this functionality and provide ready-built user-interface components you can use to quickly build apps.

This package is primarily designed for use by developers building equivalents of the Vue wrapper in React, Svelte etc 

## Installation

```bash
npm install @andorsearch/qry-codes
```

## Background and assumptions
It is assumed you are familiar with the world of vector databases. "QRy codes" are simply a user-friendly name for 
binary quantised vector embeddings because that phrase is something 99.999% of the world won't have a clue about. 
"QRy codes" are introduced as a concept users can understand and engage with in search interfaces. 
They advance the conversation users can have with search engines by providing tangible, more powerful alternatives to keyword search clauses.

Binary quantised vector embeddings are:
* Objects small and fast enough to be downloaded to even mobile devices in volume
* Useful artefacts for local clustering of search results
* Mergeable objects that can be used in follow-up query refinements.

To build applications you will need to:
#### Create binary embeddings for the text of your documents
Use your choice of LLMs to convert text into *embeddings* e.g. [OpenAI's service](https://platform.openai.com/docs/guides/embeddings) to get floating point numbers then [convert into binary](https://weaviate.io/blog/binary-quantization)
#### Downloaded embeddings to your browser
Typically the content being analysed is the results of a search on a vector database but equally a static JSON file could also 
be the source. Either way, the embeddings are assumed to be binary vectors and likely arrive in JSON as base64 or hex strings. To work with these we first need to convert each embedding into a Uint8Array and the functions in {@link bytesConversion} can be used to help with this step.
#### You're all set..
With your embeddings available as Uint8Array objects we can now get to work. The workflow of a typical QRy-code app user would be:
1) Cluster results using {@link clusterByThreshold}, using {@link mergeVectors} to create new vectors for each result cluster
2) User picks a cluster to drill-down on (the merged vector for the cluster is sent to the remote vector database to fetch more results)
3) Go to step 1.

## Usage

### Basic clustering

The oneOffClusterVectors function groups strongly related vectors into clusters.

```typescript
import { oneOffClusterVectors } from "qry-codes";

// Fetch the raw data (typically searching a vector database)
let docEmbeddings:Uint8Array[] = await mySearch("Fetch the latest news headlines")

// create clusters from the vectors
let clusters:number[][] = oneOffClusterVectors(docEmbeddings)

// poor man's rendering of clusters (see qry-codes-vue for better)
clusters.forEach((vectorIndices:number[], index)=> {
        console.log("Cluster #"+index+" has "+vectorIndices.length+" related vectors")
})
```


### Repeated clustering with different similarity levels
If the end user wants to experiment with using different levels of similarity for grouping vectors into 
clusters (e.g. using a slider to dynamically change thresholds) then it is more efficient to use two different functions:

1) call {@link buildSimilarityGraph} once to calculate the scores between all vector pairs
2) call {@link clusterByThreshold} to create clusters for the user's choice of threshold.

Step 2 can be repeated as desired with the cached result scores from step 1.

```typescript
import { SimilarityGraph, buildSimilarityGraph, clusterByThreshold, mergeVectors } from "qry-codes";

// Fetch the raw data (typically searching a vector database)
let docEmbeddings:Uint8Array[] = await mySearch("Fetch the latest news headlines")
// Compute the similarity between all vectors (relatively expensive so we only want to do this once)
let simGraph: SimilarityGraph = buildSimilarityGraph(docEmbeddings)

// Use a reasonable min level of similarity for grouping related text embeddings
let clusters :number[][] = clusterByThreshold(simGraph, 0.75)
clusters.forEach((vectorIndices:number[], index)=> {
        console.log("Cluster #"+index+" has "+vectorIndices.length+" related vectors")
})
// Maybe allow users to re-run clusterByThreshold with a different choice of similarity threshold
```


### Merging cluster contents
When a user clicks on a cluster they may want to drill-down on that topic by querying a 
vector database. The vectors in a cluster can be merged into a single new vector which
typically retains the meaning of its inputs while providing a single clause for faster searches.
```typescript
// ... Following on from above code, compute a merged vector for the first cluster. 
let mergedVector = mergeVectors(clusters[0].map(i=>allVectors[i]))

// myDrillDownResults = await mySearch(mergedVector)
```


### Basic search
Local documents can be searched using this helper function.
```typescript
import { simpleSearch, Match } from "@andorsearch/qry-codes";

// Fetch the raw data 
let docEmbeddings:Uint8Array[] = await loadDocEmbeddingsFromMyFile("/myData.jsonl")
// build a query embedding
let queryEmbedding :Uint8Array = await convertQueryToEmbedding("politician resigns from government")

//Get the 10 closest matches
let searchResults:Match[] = simpleSearch(query, docEmbeddings, 10)
```

### Rendering vectors
It can be useful to show vectors as tangible bitmaps. The {@link BitPatternCanvas} class provides
a way to render QRy codes with various styling options. 

```typescript
// ....following on from the previous "Basic search" example...
import { simpleSearch, Match, BitPatternCanvas } from "@andorsearch/qry-codes";


// Get the embedding for the top scored result from our search as an example
const data:Uint8Array = docEmbeddings[searchResults[0].index]
// Find the blank <canvas id='myCanvas'> element in the DOM which will be the target
const canvasElement = document.getElementById("myCanvas") as HTMLCanvasElement;

// Render the top matching result's QRy-code as a bitmap
const visualizer = new BitPatternCanvas(canvasElement, data, {
    // One of the optional styling elements - color a percentage of the pixels differently
    // to represent the match score.
    barSimilarity: searchResults[0].score,
});

```


