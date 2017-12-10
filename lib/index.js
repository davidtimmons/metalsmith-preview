const Multimatch = require('multimatch');
const { attachPreview, choosePreviewFunction } = require('./preview');


/////////////
// PRIVATE //
/////////////

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
 * @property {number|string|object} [characters=0] - Character limit used to generate previews;
 *     this can be used as a number or an object containing configuration options.
 * @property {number|string} [characters.count=0] - Character limit used to generate previews.
 * @property {boolean} [characters.trim=false] - Whether to trim whitespace from character preview.
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
 *     words: 40,
 *     characters: {
 *       count: 42,
 *       trim: true,
 *     },
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
    opts.words = _setArgDefaults(opts.words, Number, String, 0);
    if (typeof opts.characters !== 'object') {
        opts.characters = _setArgDefaults(opts.characters, Number, String, 0);
    } else {
        opts.characters.count = _setArgDefaults(opts.characters.count, Number, String, 0);
        opts.characters.trim = _setArgDefaults(opts.characters.trim, Boolean, Boolean, false);
    }
    opts.marker = _setArgDefaults(opts.marker, Object, Object, {});
    opts.marker.start = _setArgDefaults(opts.marker.start, String, String, '{{ previewStart }}');
    opts.marker.end = _setArgDefaults(opts.marker.end, String, String, '{{ previewEnd }}');

    return (files, Metalsmith, done) => {
        setImmediate(done);

        // Limit preview generation work to the matched files to save a few CPU cycles.
        const previewSet = Multimatch(Object.keys(files), opts.pattern);
        if (previewSet.length > 0) {
            const createPreview = choosePreviewFunction(opts);
            const attachPreviewToFile = attachPreview.bind(null, createPreview, opts, files);
            previewSet.forEach(filePath => attachPreviewToFile(filePath));
        }
    };
}


/////////
// API //
/////////

module.exports = plugin;
