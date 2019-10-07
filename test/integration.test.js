/**
 * Test the "metalsmith-preview" plugin using the Metalsmith software.
 */

/* eslint-disable no-unused-expressions, function-paren-newline */

const { expect } = require('chai');
const Metalsmith = require('metalsmith');
const debug = require('metalsmith-debug');
const preview = require('..');


describe('metalsmith-preview', () => {
    const defaultIndicator = '...';
    const opts = Object.freeze({
        // === DEFAULTS ===
        // pattern: '**/*',
        // key: 'preview',
        // ignoreExisting: false,
        // continueIndicator: defaultIndicator,
        // strip: /\[|\]\[.*?\]|<.*?>|[*_<>]/g,
        // words: 0,
        // characters: 0,
        // marker: {
        //     start: '{{ previewStart }}',
        //     end: '{{ previewEnd }}',
        // },
    });

    it('should build a word preview', done => {
        Metalsmith('test/fixtures/words')
            .use(preview({
                ...opts,
                words: 3,
            }))
            .use(debug())
            .build(function(err, files) {  // eslint-disable-line
                if (err) return done(err);
                Object.keys(files).forEach(file => {
                    const { preview: filePreview } = files[file];
                    expect(filePreview).to.equal(`Lorem ipsum dolor${defaultIndicator}`);
                });
                done();
            });
    });

    it('should build a character preview from a number', done => {
        Metalsmith('test/fixtures/characters')
            .use(preview({
                ...opts,
                characters: 15,
            }))
            .use(debug())
            .build(function(err, files) {  // eslint-disable-line
                if (err) return done(err);
                Object.keys(files).forEach(file => {
                    const { preview: filePreview } = files[file];
                    expect(filePreview).to.equal(`Lorem ipsum ${defaultIndicator}`);
                });
                done();
            });
    });

    it('should build a character preview from an object', done => {
        Metalsmith('test/fixtures/characters')
            .use(preview({
                ...opts,
                characters: {
                    count: 15,
                    trim: true,
                },
            }))
            .use(debug())
            .build(function(err, files) {  // eslint-disable-line
                if (err) return done(err);
                Object.keys(files).forEach(file => {
                    const { preview: filePreview } = files[file];
                    expect(filePreview).to.equal(`Lorem ipsum${defaultIndicator}`);
                });
                done();
            });
    });

    it('should build a marker preview', done => {
        Metalsmith('test/fixtures/markers')
            .use(preview({
                ...opts,
                marker: {
                    start: '{{ previewStart }}',
                    end: '{{ previewEnd }}',
                },
            }))
            .use(debug())
            .build(function(err, files) {  // eslint-disable-line
                if (err) return done(err);
                Object.keys(files).forEach(file => {
                    const { preview: filePreview } = files[file];
                    const testPreview = `Etiam fermentum dignissim${defaultIndicator}`;
                    expect(filePreview).to.equal(testPreview);
                });
                done();
            });
    });
});
