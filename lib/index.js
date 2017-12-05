const Multimatch = require('multimatch');


/////////////
// PRIVATE //
/////////////

/**
 * Generate a preview based on a given character count.
 * 
 * @param {number} charCount - Characters limit for generating the preview.
 * @param {object|string} [strip=] - Regular expression or string to strip from the preview.
 * @param {object} fileData - Metalsmith file object.
 * @property {object} fileData.contents - Buffer containing file contents.
 * @return {object} - Preview and original contents buffer.
 */
function _createCharacterPreview(charCount, strip='', fileData) {
    let wordEstimate = Math.ceil(charCount / 2);
    let { contents, preview } = _createWordPreview(wordEstimate, strip, fileData);
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
function _createMarkerPreview(markerStart, markerEnd, strip='', fileData) {
    let preview = '';
    let text = fileData.contents.toString();
    let startIndex = text.indexOf(markerStart);
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
function _createWordPreview(wordCount, strip='', fileData) {
    const preview = fileData.contents
                            .toString()
                            .split(/\s/)
                            .filter(word => word.length)
                            .filter((_, i) => i < wordCount)
                            .join(' ')
                            .replace(strip, '');

    return { preview, contents: fileData.contents };
}

/**
 * Check an argument type and return the argument converted to a desired type.
 * If the argument is not a desired or accepted type, return a default value.
 *
 * @param {*} arg - Argument used to check types.
 * @param {function} desiredType - Type constructor the arg should use.
 * @param {function} acceptedType - Type constructor the arg can use before conversion.
 * @param {*} defaultValue - Default value if the arg is an unaccepted type.
 * @return {*} - Original argument of the desired type or a default value.
 */
function _setArgDefaults(arg, desiredType, acceptedType, defaultValue) {
    if (arg instanceof desiredType || typeof arg === typeof desiredType('')) {
        return arg;
    } else if (arg instanceof acceptedType || typeof arg === typeof acceptedType('')) {
        return desiredType(arg);
    } else {
        return defaultValue;
    }
}


////////////
// PUBLIC //
////////////

/**
 * Generate a "contents" preview. When <words>, <characters>, and/or <marker> are present in
 * the plugin argument, <words> takes precedense then <characters> then <marker>. These are
 * mutually exclusive configuration options. Strips Markdown and HTML syntax by default.
 *
 * @param {object} opts - Plugin configuration object.
 * @property {string[]|string} [pattern] - Pattern used to match file names; defaults to all.
 * @property {string} [key='preview'] - Key used to assign the preview value.
 * @property {boolean} [ignoreExistingKey=false] - Whether to overwrite an existing preview key.
 * @property {string} [continueIndicator='...'] - Value that appends to the preview.
 * @property {object|string} [strip=/\[|\]\[.*?\]|\<.*?\>|[*_<>]/g] - Regular expression
 *     or string to strip from the preview.
 * @property {number|string} [words=0] - Word limit used to generate previews.
 * @property {number|string} [characters=0] - Character limit used to generate previews.
 * @property {boolean} [trim=false] - Whether to trim whitespace from the preview.
 * @property {object} [marker] - Data markers that enclose the desired preview.
 * @property {string} [marker.start='{{ previewStart }}'] - Generate a preview starting from
 *     this marker if present.
 * @property {string} [marker.end='{{ previewEnd }}'] - Generate a preview ending at
 *     this marker if present.
 * @example <caption>Example plugin argument.</caption>
 *   {
 *     pattern: '*.md',
 *     key: 'preview',
 *     ignoreExistingKey: true,
 *     continueIndicator: '...',
 *     strip: /\[|\]\[.*?\]|\<.*?\>|[*_<>]/g,
 *     trim: false,
 *     words: 40,
 *     characters: 10,
 *     marker: {
 *       start: '{{ previewStart }}',
 *       end: '{{ previewEnd }}'
 *     }
 *   }
 */
function plugin(opts={}) {
    // Assign default argument values to prevent object access errors.
    opts.pattern = _setArgDefaults(opts.pattern, Array, String, ['**/*']);
    opts.key = _setArgDefaults(opts.key, String, String, 'preview');
    opts.ignoreExistingKey = _setArgDefaults(opts.ignoreExistingKey, Boolean, Boolean, false);
    opts.continueIndicator = _setArgDefaults(opts.continueIndicator, String, String, '...');
    opts.strip = _setArgDefaults(opts.strip, RegExp, String, /\[|\]\[.*?\]|\<.*?\>|[*_<>]/g);
    opts.trim = _setArgDefaults(opts.trim, Boolean, Boolean, false);
    opts.words = _setArgDefaults(opts.words, Number, String, 0);
    opts.characters = _setArgDefaults(opts.characters, Number, String, 0);
    opts.marker = _setArgDefaults(opts.marker, Object, Object, {});
    opts.marker.start = _setArgDefaults(opts.marker.start, String, String, '{{ previewStart }}');
    opts.marker.end = _setArgDefaults(opts.marker.end, String, String, '{{ previewEnd }}');

    return function (files, Metalsmith, done) {
        setImmediate(done);

        // Determine the correct preview generator.
        const hasAnyMarkers = Object.keys(opts.marker).reduce(
            (truth, key) => truth || opts.marker[key].length > 0
        , false);

        const createPreview = opts.words > 0
                            ? _createWordPreview.bind(
                                  null,
                                  opts.words,
                                  opts.strip
                              )
                            : opts.characters > 0
                            ? _createCharacterPreview.bind(
                                  null,
                                  opts.characters - opts.continueIndicator.length,
                                  opts.strip
                              )
                            : hasAnyMarkers
                            ? _createMarkerPreview.bind(
                                  null,
                                  opts.marker.start,
                                  opts.marker.end,
                                  opts.strip
                              )
                            : x => '';

        // Limit preview generation work to the matched files.
        let previewSet = Multimatch(Object.keys(files), opts.pattern);
        if (previewSet.length > 0) {
            previewSet.forEach(file => {
                const fileData = files[file];

                // Only generate a preview if key is missing or ignoring an existing key.
                const shouldPreview = (
                    !fileData.hasOwnProperty(opts.key)
                    || (fileData.hasOwnProperty(opts.key) && opts.ignoreExistingKey)
                );
                                    
                if (shouldPreview && Buffer.isBuffer(fileData.contents)) {
                    let { preview, contents } = createPreview(fileData);
                    preview = opts.trim ? preview.trim() : preview;
                    fileData[opts.key] = preview + opts.continueIndicator;
                    fileData.contents = contents;
                }
            });
        }
    }
}


/////////
// API //
/////////

module.exports = plugin;
