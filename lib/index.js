const Multimatch = require('multimatch');
const {
    createCharacterPreview,
    createMarkerPreview,
    createWordPreview,
} = require('./helpers');


/////////////
// PRIVATE //
/////////////

/**
 * Generate a content preview and attach it to file data. Occurs if the desired preview key
 * is missing or the option is set to overwrite an existing preview key.
 *
 * @param {function} createPreview - Content preview function.
 * @param {object} opts - Plugin configuration object.
 * @param {object} files - Metalsmith file objects.
 * @param {string} filePath - File path used as a key.
 */
function _attachPreview(createPreview, opts, files, filePath) {
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
function _choosePreviewFunction(opts = {}) {
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
 * Check an argument type and return the argument converted to a desired type.
 * If the argument is not a desired or accepted type, return a default value.
 *
 * @param {*} arg - Argument used to check types.
 * @param {function} desiredType - Type constructor the arg should use.
 * @param {function} acceptedType - Type constructor the arg can use before conversion.
 * @param {*} [defaultValue] - Default value if the arg is an unaccepted type.
 * @return {*} - Argument of the desired type else a default value.
 */
function _setArgDefaults(arg, desiredType, acceptedType, defaultValue) {
    if (arg instanceof desiredType || typeof arg === typeof desiredType('')) {
        return arg;
    } else if (arg instanceof acceptedType || typeof arg === typeof acceptedType('')) {
        return desiredType(arg);
    }
    return defaultValue;
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
 * @property {boolean} [trim=false] - Whether to trim whitespace from the preview; ignored when
 *     using the marker preview in order to eliminate line breaks.
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
function plugin(opts = {}) {
    // Assign default argument values to prevent object access errors.
    opts.pattern = _setArgDefaults(opts.pattern, Array, String, ['**/*']);
    opts.key = _setArgDefaults(opts.key, String, String, 'preview');
    opts.ignoreExistingKey = _setArgDefaults(opts.ignoreExistingKey, Boolean, Boolean, false);
    opts.continueIndicator = _setArgDefaults(opts.continueIndicator, String, String, '...');
    opts.strip = _setArgDefaults(opts.strip, RegExp, String, /\[|\]\[.*?\]|<.*?>|[*_<>]/g);
    opts.trim = _setArgDefaults(opts.trim, Boolean, Boolean, false);
    opts.words = _setArgDefaults(opts.words, Number, String, 0);
    opts.characters = _setArgDefaults(opts.characters, Number, String, 0);
    opts.marker = _setArgDefaults(opts.marker, Object, Object, {});
    opts.marker.start = _setArgDefaults(opts.marker.start, String, String, '{{ previewStart }}');
    opts.marker.end = _setArgDefaults(opts.marker.end, String, String, '{{ previewEnd }}');

    return (files, Metalsmith, done) => {
        setImmediate(done);

        // Limit preview generation work to the matched files to save a few CPU cycles.
        const previewSet = Multimatch(Object.keys(files), opts.pattern);
        if (previewSet.length > 0) {
            const createPreview = _choosePreviewFunction(opts);
            const attachPreview = _attachPreview.bind(null, createPreview, opts, files);
            previewSet.forEach(filePath => attachPreview(filePath));
        }
    };
}


/////////
// API //
/////////

module.exports = plugin;
