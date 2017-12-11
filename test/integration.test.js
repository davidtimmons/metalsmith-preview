/**
 * Test the "metalsmith-preview" plugin using the Metalsmith software.
 */

/* eslint-disable no-unused-expressions, function-paren-newline */

const { expect } = require('chai');
const Metalsmith = require('metalsmith');
const debug = require('metalsmith-debug');
const preview = require('..');


describe('metalsmith-preview', () => {
    const opts = Object.freeze({
        pattern: '**/*',
        key: 'preview',
        ignoreExisting: true,
        continueIndicator: '...',
        strip: '',
    });

    it('should build a word preview', (done) => {
        Metalsmith('test/fixtures/words')
            .use(preview({
                ...opts,
                words: 3,
            }))
            .use(debug())
            .build(function(err, files) {  // eslint-disable-line
                if (err) return done(err);
                Object.keys(files).forEach((file) => {
                    const { preview: filePreview } = files[file];
                    expect(filePreview).to.equal(`Lorem ipsum dolor${opts.continueIndicator}`);
                });
                done();
            });
    });

    it('should build a character preview from a number', (done) => {
        Metalsmith('test/fixtures/characters')
            .use(preview({
                ...opts,
                characters: 15,
            }))
            .use(debug())
            .build(function(err, files) {  // eslint-disable-line
                if (err) return done(err);
                Object.keys(files).forEach((file) => {
                    const { preview: filePreview } = files[file];
                    expect(filePreview).to.equal(`Lorem ipsum ${opts.continueIndicator}`);
                });
                done();
            });
    });

    it('should build a character preview from an object', (done) => {
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
                Object.keys(files).forEach((file) => {
                    const { preview: filePreview } = files[file];
                    expect(filePreview).to.equal(`Lorem ipsum${opts.continueIndicator}`);
                });
                done();
            });
    });

    it('should build a marker preview', (done) => {
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
                Object.keys(files).forEach((file) => {
                    const { preview: filePreview } = files[file];
                    const testPreview = `Etiam fermentum dignissim${opts.continueIndicator}`;
                    expect(filePreview).to.equal(testPreview);
                });
                done();
            });
    });
});
