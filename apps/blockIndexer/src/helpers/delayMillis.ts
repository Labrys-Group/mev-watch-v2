/**
 * Sleep for milliseconds
 * @param ms number of milliseconds to delay 
 */
export const delayMillis = (ms: number) => {
    return new Promise( resolve => setTimeout(resolve, ms) );
}