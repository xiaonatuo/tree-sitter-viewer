const COLORS: string[] = ['#80cbc4', '#ffb757', '#e0b8ff', '#ff9492', '#56d364', '#a5d6ff', '#ffa198', '#d2a8ff', '#ff7b72', '#7ee787', '#ffa657', '#9ca3af', '#79c0ff'];
let NAMES: string[] = [];


export class Colors {
    /**
     * Compute the color index from the capture name
     * @param name Name of the captured node
     * @returns 
     */
    static getColorForCaptureName(name: string): string {
        let index = NAMES.indexOf(name);
        if (index === -1) {
            NAMES.push(name);
            index = NAMES.length - 1;
        }
        return COLORS[index % 13];
    }

    /**
     * Reset color styles
     */
    static reset() {
        NAMES = [];
    }
}