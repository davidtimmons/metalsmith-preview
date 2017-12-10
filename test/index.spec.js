/**
 * Test the metalsmith-preview plugin.
 */

/* eslint-disable no-unused-expressions, function-paren-newline */

const { expect } = require('chai');
const Rewire = require('rewire');
const Sinon = require('sinon'); // eslint-disable-line
const plugin = Rewire('../lib/index');
const _attachPreview = plugin.__get__('_attachPreview');
const _choosePreviewFunction = plugin.__get__('_choosePreviewFunction');
const _setArgDefaults = plugin.__get__('_setArgDefaults');


///////////
// TESTS //
///////////

describe('index.js', () => {
    context('_attachPreview', () => {
        const opts = Object.freeze({
            key: 'preview',
            ignoreExistingKey: false,
            continueIndicator: '...',
        });
        const contentB = '  This is more text in a buffer.  ';
        let files;

        beforeEach('reset files object', () => {
            files = Object.freeze({
                a: { preview: '', contents: Buffer.from('This is text in a buffer.') },
                b: { contents: Buffer.from(contentB) },
                c: { contents: 'This is a test string.' },
            });
        });

        it('should do nothing if a preview key exists unless overwriting an existing key', () => {
            const filePath01 = 'a';
            const _opts01 = { ...opts };
            const stub01 = Sinon.stub().returns(files[filePath01]);
            _attachPreview(stub01, _opts01, files, filePath01);
            expect(stub01.callCount).to.equal(0);

            const filePath02 = 'a';
            const _opts02 = { ..._opts01, ignoreExistingKey: true };
            const stub02 = Sinon.stub().returns(files[filePath02]);
            _attachPreview(stub02, _opts02, files, filePath02);
            expect(stub02.callCount).to.equal(1);
        });

        it('should add a preview if missing a preview key', () => {
            const filePath = 'b';
            const _opts = { ...opts };
            const stub = Sinon.stub().returns(files[filePath]);
            _attachPreview(stub, _opts, files, filePath);
            expect(stub.callCount).to.equal(1);
        });

        it('should do nothing if the file "contents" value is not a Buffer', () => {
            const filePath = 'c';
            const _opts = { ...opts };
            const stub = Sinon.stub().returns(files[filePath]);
            _attachPreview(stub, _opts, files, filePath);
            expect(stub.callCount).to.equal(0);
        });

        it('should not trim the preview when that option is falsey', () => {
            const stub = Sinon.stub().returns({ preview: contentB, contents: files.b.contents });
            _attachPreview(stub, { ...opts }, files, 'b');
            expect(files.b.preview).to.equal(contentB + opts.continueIndicator);
        });

        it('should trim the preview when that option is truthy', () => {
            const stub = Sinon.stub().returns({ preview: contentB, contents: files.b.contents });
            _attachPreview(stub, { ...opts, trim: true }, files, 'b');
            expect(files.b.preview).to.equal(contentB.trim() + opts.continueIndicator);
        });

        it('should attach the "contents" returned from the preview function', () => {
            // See: https://nodejs.org/api/buffer.html
            const { contents } = files.b;
            const stub = Sinon.stub().returns({ contents });
            _attachPreview(stub, { ...opts }, files, 'b');
            expect(files.b.contents.compare(contents)).to.equal(0);
        });
    });

    context('_choosePreviewFunction', () => {
        const opts = Object.freeze({
            words: 0,
            characters: 0,
            continueIndicator: '...',
            marker: {
                start: '',
                end: '',
            },
        });

        it('should return a preview function that creates an empty preview', () => {
            const result = _choosePreviewFunction(opts)();
            expect(result).to.be.empty;
        });

        it('should return a preview function that creates a word preview', () => {
            const _opts = { ...opts, words: 5 };
            const result = _choosePreviewFunction(_opts);
            expect(result.name).to.equal('bound createWordPreview');
        });

        it('should return a preview function that creates a character preview', () => {
            const _opts = { ...opts, characters: 5 };
            const result = _choosePreviewFunction(_opts);
            expect(result.name).to.equal('bound createCharacterPreview');
        });

        it('should return a preview function that creates a marker preview', () => {
            const _opts = { ...opts, marker: { start: '{{ start }}' } };
            const result = _choosePreviewFunction(_opts);
            expect(result.name).to.equal('bound createMarkerPreview');
        });

        it('should return a preview function based on a specific order', () => {
            const _opts01 = {
                ...opts,
                words: 5,
                characters: 5,
                marker: { start: '{{ start }}' },
            };
            const result01 = _choosePreviewFunction(_opts01);
            expect(result01.name).to.equal('bound createWordPreview');

            const _opts02 = { ..._opts01, words: 0 };
            const result02 = _choosePreviewFunction(_opts02);
            expect(result02.name).to.equal('bound createCharacterPreview');

            const _opts03 = { ..._opts01, words: 0, characters: 0 };
            const result03 = _choosePreviewFunction(_opts03);
            expect(result03.name).to.equal('bound createMarkerPreview');
        });
    });

    context('_setArgDefaults()', () => {
        it('should fail when called without required arguments', () => {
            const fns =
                [ _ => _setArgDefaults()
                , _ => _setArgDefaults(true)
                , _ => _setArgDefaults(true, String)
                ];
            fns.forEach((fn) => {
                expect(fn).to.throw();
            });
            expect(_ => _setArgDefaults(true, String, Number)).to.not.throw();
        });

        it('should return "arg" if instance of "desiredType"', () => {
            // See: https://nodejs.org/api/buffer.html
            const arg = Buffer.from('test');
            const result = _setArgDefaults(arg, Buffer);
            expect(arg.compare(result)).to.equal(0);
        });

        it('should return "arg" if type of "desiredType"', () => {
            const result = _setArgDefaults(42, Number);
            expect(result).to.equal(42);
        });

        it('should return a type-casted "arg" if instance of "acceptedType"', () => {
            const arg = Buffer.from('test');
            const result = _setArgDefaults(arg, String, Buffer);
            expect(result).to.be.a('string');
            expect(result).to.equal('test');
        });

        it('should return a type-casted "arg" if type of "acceptedType"', () => {
            const result = _setArgDefaults(42, String, Number);
            expect(result).to.be.a('string');
            expect(result).to.equal('42');
        });

        it('should return "defaultValue" if "arg" not of "desiredType" or "acceptedType"', () => {
            const result = _setArgDefaults(42, String, Boolean, 'test');
            expect(result).to.equal('test');
        });
    });

    context('plugin()', () => {
        beforeEach('stub the private functions', () => {
            plugin.__set__('_attachPreview', Sinon.stub());
            plugin.__set__('_choosePreviewFunction', Sinon.stub());
            // Returns the default value.
            plugin.__set__('_setArgDefaults', Sinon.stub().returnsArg(3));
        });

        after('reset the private functions', () => {
            plugin.__set__('_attachPreview', _attachPreview);
            plugin.__set__('_choosePreviewFunction', _choosePreviewFunction);
            plugin.__set__('_setArgDefaults', _setArgDefaults);
        });

        it('should enforce types for all plugin configuration options', () => {
            const stub = plugin.__get__('_setArgDefaults');
            plugin();
            expect(stub.callCount).to.equal(11);
        });

        it('should do nothing if the file matching pattern produces no matches', () => {
            const pattern = '*.md';
            const stub = plugin.__get__('_attachPreview');
            plugin.__set__('_setArgDefaults', Sinon.stub().callsFake(
                (...args) => {
                    if (args[0] === pattern) {
                        return pattern;
                    }
                    return args[3];
                }
            ));

            plugin({ pattern: '*.md' })({ 'test.txt': true }, undefined, _ => '');
            expect(stub.callCount).to.equal(0);
        });

        it('should attach a preview to every matched file', () => {
            const stub = plugin.__get__('_attachPreview');
            plugin()({ a: true, b: true, c: true }, undefined, _ => '');
            expect(stub.callCount).to.equal(3);
        });
    });
});
