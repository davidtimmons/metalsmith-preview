/**
 * Helper functions that manipulate text and generate content previews.
 */


////////////
// PUBLIC //
////////////

/**
 * Generate a content preview and attach it to file data. Occurs if the desired preview key
 * is missing or the option is set to overwrite an existing preview key.
 *
 * @param {function} createPreview - Content preview function.
 * @param {object} opts - Plugin configuration object.
 * @param {object} files - Metalsmith file objects.
 * @param {string} filePath - File path used as a key.
 */
function attachPreview(createPreview, opts = {}, files = {}, filePath = '') {
    const fileData = files[filePath];
    const hasPreviewKey = Object.prototype.hasOwnProperty.call(fileData, opts.key);
    const shouldPreview = !hasPreviewKey || opts.ignoreExistingKey;

    if (shouldPreview && Buffer.isBuffer(fileData.contents)) {
        let { preview, contents: contentsMod } = createPreview(fileData);
        preview = opts.trim ? preview.trim() : preview;
        fileData[opts.key] = preview + opts.continueIndicator;
        fileData.contents = contentsMod;
    }
}


/**
 * Determines which content preview function to use based on the plugin option arguments.
 *
 * @param {object} opts - Plugin configuration object.
 * @return {function} - Content preview function.
 */
function choosePreviewFunction(opts = {}) {
    const hasAnyMarkers = Object.keys(opts.marker).reduce(
        (truth, key) => truth || opts.marker[key].length > 0,
        false
    );

    let previewFunction = () => '';

    if (opts.words > 0) {
        previewFunction = createWordPreview.bind(
            null,
            opts.words,
            opts.strip
        );
    } else if (opts.characters > 0) {
        previewFunction = createCharacterPreview.bind(
            null,
            opts.characters - opts.continueIndicator.length,
            opts.strip
        );
    } else if (hasAnyMarkers) {
        previewFunction = createMarkerPreview.bind(
            null,
            opts.marker.start,
            opts.marker.end,
            opts.strip
        );
    }

    return previewFunction;
}


/**
 * Generate a preview based on a given character count.
 *
 * @param {number} charCount - Character limit for generating the preview.
 * @param {object|string} [strip=''] - Regular expression or string to strip from the preview.
 * @param {object} fileData - Metalsmith file object.
 * @property {object} fileData.contents - Buffer containing file contents.
 * @return {object} - Preview and original contents buffer.
 * @throws {TypeError} - charCount must be an integer greater than zero.
 */
function createCharacterPreview(charCount, strip = '', fileData) {
    if (!Number.isInteger(charCount) || charCount < 1) {
        throw new TypeError('Generating a character count preview requires a positive integer.');
    }

    const wordEstimate = Math.ceil(charCount / 2);
    const { contents, preview } = createWordPreview(wordEstimate, strip, fileData);
    return { contents, preview: preview.substring(0, charCount) };
}


/**
 * Generate a preview based on finding a starting and/or ending marker in the file content.
 * Automatically trims the preview to eliminate line breaks.
 *
 * @param {string} [markerStart] - Generate a preview starting from this marker if present.
 * @param {string} [markerEnd] - Generate a preview ending at this marker if present.
 * @param {object|string} [strip=''] - Regular expression or string to strip from the preview.
 * @param {object} fileData - Metalsmith file object.
 * @property {object} fileData.contents - Buffer containing file contents.
 * @return {object} - Preview and mutated contents buffer with markers removed.
 */
function createMarkerPreview(markerStart, markerEnd, strip = '', fileData) {
    let preview = '';
    let text = fileData.contents.toString();
    const startIndex = text.indexOf(markerStart);
    let endIndex = text.indexOf(markerEnd);

    if (~startIndex) {
        // Generate a preview based on finding the start marker; end marker is optional.
        let _markerEnd = markerEnd;
        if (!~endIndex) {
            endIndex = text.length;
            _markerEnd = '';
        }

        preview = text.substring(startIndex + markerStart.length, endIndex).replace(strip, '');
        text = [ text.substring(0, startIndex)
               , text.substring(startIndex + markerStart.length, endIndex)
               , text.substring(endIndex + _markerEnd.length, text.length)
               ].join('');
    } else if (~endIndex) {
        // Generate a preview based on finding the end marker; start marker is missing.
        preview = text.substring(0, endIndex).replace(strip, '');
        text = [ text.substring(0, endIndex)
               , text.substring(endIndex + markerEnd.length, text.length)
               ].join('');
    }

    return {
        preview: preview.split(/\s/).filter(word => word.length).join(' '),
        contents: Buffer.from(text),
    };
}


/**
 * Generate a preview based on a given word count.
 *
 * @param {number} wordCount - Word limit for generating the preview.
 * @param {object|string} [strip=''] - Regular expression or string to strip from the preview.
 * @param {object} fileData - Metalsmith file object.
 * @property {object} fileData.contents - Buffer containing file contents.
 * @return {object} - Preview and original contents buffer.
 * @throws {TypeError} - wordCount must be an integer greater than zero.
 */
function createWordPreview(wordCount, strip = '', fileData) {
    if (!Number.isInteger(wordCount) || wordCount < 1) {
        throw new TypeError('Generating a word count preview requires a positive integer.');
    }

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
    attachPreview,
    choosePreviewFunction,
    createCharacterPreview,
    createMarkerPreview,
    createWordPreview,
};
