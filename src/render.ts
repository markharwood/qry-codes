

interface RenderOptions {
    cols?: number;
    cellSize?: number;
    barSimilarity?: number;
    pixelColor?: string;
    noMatchPixelColor?: string;
    backgroundColor?: string;
}

/**
 * A class for visualizing binary vectors as a bitmap using canvas
 */
class BitPatternCanvas {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private data: Uint8Array;
    private cols: number =64;
    private cellSize: number =10;
    private barSimilarity: number=0;
    private pixelColor: string="#3937f18c";
    private noMatchPixelColor: string="lightgray";
    private backgroundColor: string="white";


    /**
     * Constructs a new BitPatternCanvas instance.
     * @param canvas The target canvas element.
     * @param data The binary vector data to visualize.
     * @param options Optional configuration.
     * @param [options.cols=64] The number of columns in the grid.
     * @param [options.cellSize=10] The size of each grid cell in pixels.
     * @param [options.barSimilarity=0] If greater than 0, applies a bar similarity effect. Useful for illustrating a similarity match score
     * @param [options.pixelColor="#3937f18c"] The color for active (set) bits.
     * @param [options.noMatchPixelColor="lightgray"] The color for non-matching pixels.
     * @param [options.backgroundColor="white"] The background color of the canvas. 
     */
    constructor(canvas: HTMLCanvasElement, data: Uint8Array, options: RenderOptions = {} // Default to empty object
    ) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.data = data;

        this.setOptions(options)

        this.drawBitPattern();
    }

    /**
     * Computes the canvas width based on columns and cell size.
     */
    get width(): number {
        return this.cols * this.cellSize;
    }

    /**
     * Computes the canvas height based on the number of bits and columns.
     */
    get height(): number {
        return Math.ceil(this.data.length * 8 / this.cols) * this.cellSize;
    }

    /**
     * Updates the visualization options, merging new values with existing ones.
     * @param options An object containing the properties to update.
     */
    public setOptions(options: RenderOptions): void {
        this.cols = options.cols ?? 64;
        this.cellSize = options.cellSize ?? 1;
        this.barSimilarity = options.barSimilarity ?? 0;
        this.pixelColor = options.pixelColor ?? '#3937f18c';
        this.noMatchPixelColor = options.noMatchPixelColor ?? 'lightgray';
        this.backgroundColor = options.backgroundColor ?? 'white';
    }

    /**
     * Draws the bit pattern visualization on the canvas.
     */
    private drawBitPattern(): void {
        const { data, cols, cellSize } = this;
        const numRows = Math.ceil(data.length * 8 / cols);
        const totalWidth = this.width;
        const totalHeight = this.height;

        this.canvas.width = totalWidth;
        this.canvas.height = totalHeight;

        // Background fill
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, totalWidth, totalHeight);

        // Paint set bits with primary color
        this.ctx.fillStyle = this.pixelColor;
        for (let i = 0; i < data.length; i++) {
            const byte = data[i];
            for (let j = 7; j >= 0; j--) {
                const bit = (byte >> j) & 1;
                const row = Math.floor((i * 8 + (7 - j)) / cols);
                const col = (i * 8 + (7 - j)) % cols;

                if (bit === 1) {
                    this.ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }
            }
        }

        // Apply bar similarity effect if enabled
        if (this.barSimilarity > 0) {
            let maxCol = Math.ceil(this.barSimilarity * cols);
            this.ctx.fillStyle = this.noMatchPixelColor;

            for (let i = 0; i < data.length; i++) {
                const byte = data[i];
                for (let j = 7; j >= 0; j--) {
                    const bit = (byte >> j) & 1;
                    const row = Math.floor((i * 8 + (7 - j)) / cols);
                    const col = (i * 8 + (7 - j)) % cols;

                    if (col >= maxCol && bit === 1) {
                        this.ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                    }
                }
            }
        }
    }

    /**
     * Re-renders the visualization (useful for dynamic updates).
     */
    public redraw(newData: Uint8Array): void {
        this.data = newData
        this.drawBitPattern();
    }
}


export { BitPatternCanvas }