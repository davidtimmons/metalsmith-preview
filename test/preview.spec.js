/**
 * Test the helper functions.
 */

/* eslint-disable no-unused-expressions, function-paren-newline */

const { expect } = require('chai');
const Rewire = require('rewire');
const Sinon = require('sinon'); // eslint-disable-line
const Preview = Rewire('../lib/preview');
const {
    attachPreview,
    choosePreviewFunction,
    createCharacterPreview,
    createMarkerPreview,
    createWordPreview,
} = Preview;


///////////
// TESTS //
///////////

describe('preview.js', () => {
    context('attachPreview', () => {
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
            attachPreview(stub01, _opts01, files, filePath01);
            expect(stub01.callCount).to.equal(0);

            const filePath02 = 'a';
            const _opts02 = { ..._opts01, ignoreExistingKey: true };
            const stub02 = Sinon.stub().returns(files[filePath02]);
            attachPreview(stub02, _opts02, files, filePath02);
            expect(stub02.callCount).to.equal(1);
        });

        it('should add a preview if missing a preview key', () => {
            const filePath = 'b';
            const _opts = { ...opts };
            const stub = Sinon.stub().returns(files[filePath]);
            attachPreview(stub, _opts, files, filePath);
            expect(stub.callCount).to.equal(1);
        });

        it('should do nothing if the file "contents" value is not a Buffer', () => {
            const filePath = 'c';
            const _opts = { ...opts };
            const stub = Sinon.stub().returns(files[filePath]);
            attachPreview(stub, _opts, files, filePath);
            expect(stub.callCount).to.equal(0);
        });

        it('should not trim the preview when that option is falsey', () => {
            const stub = Sinon.stub().returns({ preview: contentB, contents: files.b.contents });
            attachPreview(stub, { ...opts }, files, 'b');
            expect(files.b.preview).to.equal(contentB + opts.continueIndicator);
        });

        it('should trim the character preview when the "trim" option is truthy', () => {
            const stub = Sinon.stub().returns({ preview: contentB, contents: files.b.contents });
            attachPreview(stub, { ...opts, characters: { trim: true } }, files, 'b');
            expect(files.b.preview).to.equal(contentB.trim() + opts.continueIndicator);
        });

        it('should attach the "contents" returned from the preview function', () => {
            // See: https://nodejs.org/api/buffer.html
            const { contents } = files.b;
            const stub = Sinon.stub().returns({ contents });
            attachPreview(stub, { ...opts }, files, 'b');
            expect(files.b.contents.compare(contents)).to.equal(0);
        });
    });

    context('choosePreviewFunction', () => {
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
            const result = choosePreviewFunction(opts)();
            expect(result).to.be.empty;
        });

        it('should return a preview function that creates a word preview', () => {
            const _opts = { ...opts, words: 5 };
            const result = choosePreviewFunction(_opts);
            expect(result.name).to.equal('bound createWordPreview');
        });

        it('should return a preview function that creates a character preview from a number', () => {
            const _opts = { ...opts, characters: 5 };
            const result = choosePreviewFunction(_opts);
            expect(result.name).to.equal('bound createCharacterPreview');
        });

        it('should return a preview function that creates a character preview from an object', () => {
            const _opts = { ...opts, characters: { count: 5 } };
            const result = choosePreviewFunction(_opts);
            expect(result.name).to.equal('bound createCharacterPreview');
        });

        it('should return a preview function that creates a marker preview', () => {
            const _opts = { ...opts, marker: { start: '{{ start }}' } };
            const result = choosePreviewFunction(_opts);
            expect(result.name).to.equal('bound createMarkerPreview');
        });

        it('should return a preview function based on a specific order', () => {
            const _opts01 = {
                ...opts,
                words: 5,
                characters: 5,
                marker: { start: '{{ start }}' },
            };
            const result01 = choosePreviewFunction(_opts01);
            expect(result01.name).to.equal('bound createWordPreview');

            const _opts02 = { ..._opts01, words: 0 };
            const result02 = choosePreviewFunction(_opts02);
            expect(result02.name).to.equal('bound createCharacterPreview');

            const _opts03 = { ..._opts01, words: 0, characters: 0 };
            const result03 = choosePreviewFunction(_opts03);
            expect(result03.name).to.equal('bound createMarkerPreview');
        });
    });

    context('createCharacterPreview()', () => {
        const fileData = Object.freeze({
            contents: Buffer.from('This is test content.'),
        });

        beforeEach('stub the createWordPreview() function', () => {
            Preview.__set__('createWordPreview', Sinon.stub().returns(
                Object.freeze({
                    contents: fileData.contents,
                    preview: 'This is a test preview.',
                })
            ));
        });

        after('reset the createWordPreview() function', () => {
            Preview.__set__('createWordPreview', createWordPreview);
        });

        it('should fail if argument "charCount" is not a positive integer', () => {
            const fns =
                [ _ => createCharacterPreview(-1, undefined, fileData)
                , _ => createCharacterPreview(0, undefined, fileData)
                , _ => createCharacterPreview(0.42, undefined, fileData)
                , _ => createCharacterPreview(null, undefined, fileData)
                , _ => createCharacterPreview(undefined, undefined, fileData)
                ];

            fns.forEach(fn => {
                expect(fn).to.throw('character count preview');
            });
        });

        it('should call the createWordPreview() function to generate a charcter preview', () => {
            const stub = Preview.__get__('createWordPreview');
            createCharacterPreview(1);
            expect(stub.calledOnce).to.be.true;
        });

        it('should pass through arguments "strip" and "fileData" without mutation', () => {
            const stub = Preview.__get__('createWordPreview');
            const strip = '!@#$%^&*()_+';
            expect(_ => createCharacterPreview(1, strip, fileData)).to.not.throw();
            expect(stub.args[0][1]).to.equal(strip);
            expect(stub.args[0][2]).to.deep.equal(fileData);
        });

        it('should create a word estimate by halving the character count and rounding up', () => {
            const stub = Preview.__get__('createWordPreview');
            for (let i = 1; i <= 10; i++) {
                createCharacterPreview(i);
                expect(stub.args[i - 1][0]).to.equal(Math.ceil(i / 2));
            }
        });

        it('should return an object containing keys "contents" and "preview"', () => {
            const result = createCharacterPreview(1);
            expect(result).to.have.all.keys(['contents', 'preview']);
        });

        it('should generate a preview starting at the first character', () => {
            const { preview: preview00 } = createCharacterPreview(50);
            const { preview: preview01 } = createCharacterPreview(3);
            expect(preview00[0]).to.equal('T');
            expect(preview01[0]).to.equal('T');
        });

        it('should generate a preview length up to the given character count', () => {
            const length = createCharacterPreview(100).preview.length; // eslint-disable-line
            for (let i = 1; i <= 20; i++) {
                const { preview } = createCharacterPreview(i);
                if (i <= preview.length) {
                    expect(preview.length).to.equal(i);
                } else {
                    expect(preview.length).to.equal(length);
                }
            }
        });

        it('should not mutate the source content', () => {
            const { contents } = createCharacterPreview(3);
            expect(contents).to.equal(fileData.contents);
        });
    });

    context('createMarkerPreview()', () => {
        const marker01 = '{ markerStart }';
        const marker02 = '{ markerEnd }';
        const previewGoal = 'Gotham City';
        const fileData = Object.freeze({
            contents: Buffer.from(`Did you know${marker01}${previewGoal}${marker02}needs Batman?`),
        });

        it('should fail if argument "fileData" is missing or malformed', () => {
            const fn01 = _ => createMarkerPreview();
            const fn02 = _ => createMarkerPreview(undefined, undefined, undefined, {});
            expect(fn01).to.throw('contents');
            expect(fn02).to.throw('toString');
        });

        it('should return an object containing keys "contents" and "preview"', () => {
            const result = createMarkerPreview(undefined, undefined, undefined, fileData);
            expect(result).to.have.all.keys(['contents', 'preview']);
            expect(result.contents).to.be.instanceOf(Buffer);
        });

        it('should do nothing if the markers are missing or mismatched', () => {
            const results =
                [ createMarkerPreview(undefined, undefined, undefined, fileData)
                , createMarkerPreview('< ok? >', undefined, undefined, fileData)
                , createMarkerPreview(undefined, '< ok! >', undefined, fileData)
                , createMarkerPreview('< ok? >', '< ok! >', undefined, fileData)
                ];
            results.forEach(result => {
                const { preview, contents } = result;
                expect(preview).to.be.empty;
                expect(contents.toString()).to.equal(fileData.contents.toString());
            });
        });

        it('should create a preview and remove the beginning marker when found', () => {
            const _previewGoal = 'Gotham City needs Batman?';
            const _fileData = Object.freeze({
                contents: Buffer.from(`Did you know ${marker01}Gotham City needs Batman?`),
            });
            const { preview, contents } =
                createMarkerPreview(marker01, undefined, undefined, _fileData);
            expect(preview).to.equal(_previewGoal);
            expect(contents.toString()).to.not.have.string(marker01);
        });

        it('should create a preview and remove all markers when found', () => {
            const { preview, contents } =
                createMarkerPreview(marker01, marker02, undefined, fileData);
            expect(preview).to.equal(previewGoal);
            expect(contents.toString()).to.not.have.string(marker01).and.not.have.string(marker02);
        });

        it('should strip out matched regex text from the preview but not the source content when a beginning marker is found', () => {
            const _fileData = Object.freeze({
                contents: Buffer.from(`Did you know ${marker01}Gotham% City_ needs! Batman?`),
            });

            const previewGoal01 = 'Gotham City needs Batman?';
            const strip01 = /%|_|!/g;
            const { preview: preview01, contents: contents01 } =
                createMarkerPreview(marker01, marker02, strip01, _fileData);

            expect(preview01).to.equal(previewGoal01);
            expect(contents01.toString()).to.match(strip01);
        });

        it('should strip out matched string text from the preview but not the source content when a beginning marker is found', () => {
            const _fileData = Object.freeze({
                contents: Buffer.from(`Did you know ${marker01}Gotham% City_ needs! Batman?`),
            });

            const previewGoal02 = 'Gotham needs! Batman?';
            const strip02 = '% City_';
            const { preview: preview02, contents: contents02 } =
                createMarkerPreview(marker01, marker02, strip02, _fileData);

            expect(preview02).to.equal(previewGoal02);
            expect(contents02.toString()).to.have.string(strip02);
        });

        it('should create a preview and remove the ending marker when found', () => {
            const _previewGoal = 'Did you know';
            const _fileData = Object.freeze({
                contents: Buffer.from(`Did you know ${marker02}Gotham City needs Batman?`),
            });
            const { preview, contents } =
                createMarkerPreview(undefined, marker02, undefined, _fileData);
            expect(preview).to.equal(_previewGoal);
            expect(contents.toString()).to.not.have.string(marker02);
        });

        it('should strip out matched regex text from the preview but not the source content when an ending marker is found', () => {
            const _fileData = Object.freeze({
                contents: Buffer.from(`Did% you_ know! ${marker02}Gotham City needs Batman?`),
            });

            const previewGoal01 = 'Did you know';
            const strip01 = /%|_|!/g;
            const { preview: preview01, contents: contents01 } =
                createMarkerPreview(undefined, marker02, strip01, _fileData);

            expect(preview01).to.equal(previewGoal01);
            expect(contents01.toString()).to.match(strip01);
        });

        it('should strip out matched string text from the preview but not the source content when an ending marker is found', () => {
            const _fileData = Object.freeze({
                contents: Buffer.from(`Did% you_ know! ${marker02}Gotham City needs Batman?`),
            });

            const previewGoal02 = 'Did know!';
            const strip02 = '% you_';
            const { preview: preview02, contents: contents02 } =
                createMarkerPreview(undefined, marker02, strip02, _fileData);

            expect(preview02).to.equal(previewGoal02);
            expect(contents02.toString()).to.have.string(strip02);
        });

        it('should split the source content on common whitespace characters', () => {
            const _previewGoal = 'know Gotham City needs Batman?';
            const _fileData = Object.freeze({
                contents: Buffer.from(`Did you${marker01}
                
                know
                    Gotham City
                
                needs Batman?`),
            });
            const { preview } = createMarkerPreview(marker01, undefined, undefined, _fileData);
            expect(preview).to.equal(_previewGoal);
        });
    });

    context('createWordPreview()', () => {
        const fileData = Object.freeze({
            contents: Buffer.from('Did you know Gotham City needs Batman?'),
        });

        it('should fail if argument "wordCount" is not a positive integer', () => {
            const fns =
                [ _ => createWordPreview(-1, undefined, fileData)
                , _ => createWordPreview(0, undefined, fileData)
                , _ => createWordPreview(0.42, undefined, fileData)
                , _ => createWordPreview(null, undefined, fileData)
                , _ => createWordPreview(undefined, undefined, fileData)
                ];

            fns.forEach(fn => {
                expect(fn).to.throw('word count preview');
            });
        });

        it('should fail if argument "fileData" is missing or malformed', () => {
            const fn01 = _ => createWordPreview(1);
            const fn02 = _ => createWordPreview(1, undefined, {});
            expect(fn01).to.throw('contents');
            expect(fn02).to.throw('toString');
        });

        it('should return an object containing keys "contents" and "preview"', () => {
            const result = createWordPreview(1, undefined, fileData);
            expect(result).to.have.all.keys(['contents', 'preview']);
            expect(result.contents).to.be.instanceOf(Buffer);
        });

        it('should not mutate the source content', () => {
            const { contents } = createWordPreview(3, undefined, fileData);
            expect(contents).to.deep.equal(fileData.contents);
        });

        it('should generate a preview starting at the first word', () => {
            const { preview } = createWordPreview(3, undefined, fileData);
            expect(preview.split(/\s/)[0]).to.equal('Did');
        });

        it('should generate a preview length up to the given word count', () => {
            const length = fileData.contents.toString().split(/\s/).length; // eslint-disable-line
            for (let i = 1; i <= 20; i++) {
                const { preview } = createWordPreview(i, undefined, fileData);
                if (i < length) {
                    expect(preview.split(/\s/).length).to.equal(i);
                } else {
                    expect(preview.split(/\s/).length).to.equal(length);
                }
            }
        });

        it('should split the source content on common whitespace characters', () => {
            const previewGoal = 'Did you know Gotham City';
            const _fileData = Object.freeze({
                contents: Buffer.from(`Did you
                
                know
                    Gotham City
                
                needs Batman?`),
            });
            const { preview } = createWordPreview(5, undefined, _fileData);
            expect(preview).to.equal(previewGoal);
        });

        it('should strip out matched regex text from the preview but not the source content', () => {
            const _fileData = Object.freeze({
                contents: Buffer.from('Did% you_ know! Gotham City needs Batman?'),
            });

            const previewGoal01 = 'Did you know';
            const strip01 = /%|_|!/g;
            const { preview: preview01, contents: contents01 } =
                createWordPreview(3, strip01, _fileData);

            expect(preview01).to.equal(previewGoal01);
            expect(contents01).to.match(strip01);
        });

        it('should strip out matched string text from the preview but not the source content', () => {
            const _fileData = Object.freeze({
                contents: Buffer.from('Did% you_ know! Gotham City needs Batman?'),
            });

            const previewGoal02 = 'know!';
            const strip02 = 'Did% you_ ';
            const { preview: preview02, contents: contents02 } =
                createWordPreview(3, strip02, _fileData);

            expect(preview02).to.equal(previewGoal02);
            expect(contents02.toString()).to.have.string(strip02);
        });
    });
});
