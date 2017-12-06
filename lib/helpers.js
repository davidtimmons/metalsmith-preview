/**
 * Helper functions that manipulate text to create a preview.
 */


////////////
// PUBLIC //
////////////

/**
 * Generate a preview based on a given character count.
 *
 * @param {number} charCount - Characters limit for generating the preview.
 * @param {object|string} [strip=] - Regular expression or string to strip from the preview.
 * @param {object} fileData - Metalsmith file object.
 * @property {object} fileData.contents - Buffer containing file contents.
 * @return {object} - Preview and original contents buffer.
 */
function createCharacterPreview(charCount, strip = '', fileData) {
    const wordEstimate = Math.ceil(charCount / 2);
    const { contents, preview } = createWordPreview(wordEstimate, strip, fileData);
    return { contents, preview: preview.substring(0, charCount) };
}


/**
 * Generate a preview based on finding a starting and/or ending marker in the file content.
 *
 * @param {string} [markerStart] - Generate a preview starting from this marker if present.
 * @param {string} [markerEnd] - Generate a preview ending at this marker if present.
 * @param {object|string} [strip=] - Regular expression or string to strip from the preview.
 * @param {object} fileData - Metalsmith file object.
 * @property {object} fileData.contents - Buffer containing file contents.
 * @return {object} - Preview and modified contents buffer with markers removed.
 */
function createMarkerPreview(markerStart, markerEnd, strip = '', fileData) {
    let preview = '';
    let text = fileData.contents.toString();
    const startIndex = text.indexOf(markerStart);
    let endIndex = text.indexOf(markerEnd);

    if (~startIndex) {
        // Generate a preview based on finding the start marker; end marker is optional.
        endIndex = ~endIndex ? endIndex : text.length;
        preview = text.substring(startIndex + markerStart.length, endIndex).replace(strip, '');
        text = [ text.substring(0, startIndex)
               , text.substring(startIndex + markerStart.length, endIndex)
               , text.substring(endIndex + markerEnd.length, text.length)
               ].join('');
    } else if (~endIndex) {
        // Generate a preview based on finding the end marker; start marker is missing.
        preview = text.substring(0, endIndex).replace(strip, '');
        text = [ text.substring(0, endIndex)
               , text.substring(endIndex + markerEnd.length, text.length)
               ].join('');
    }

    return { preview, contents: Buffer.from(text) };
}


/**
 * Generate a preview based on a given word count.
 *
 * @param {number} wordCount - Word limit for generating the preview.
 * @param {object|string} [strip=] - Regular expression or string to strip from the preview.
 * @param {object} fileData - Metalsmith file object.
 * @property {object} fileData.contents - Buffer containing file contents.
 * @return {object} - Preview and original contents buffer.
 */
function createWordPreview(wordCount, strip = '', fileData) {
    const preview = fileData.contents
                            .toString()
                            .split(/\s/)
                            .filter(word => word.length)
                            .filter((_, i) => i < wordCount)
                            .join(' ')
                            .replace(strip, '');

    return { preview, contents: fileData.contents };
}


/////////
// API //
/////////

module.exports = {
    createCharacterPreview,
    createMarkerPreview,
    createWordPreview,
};
