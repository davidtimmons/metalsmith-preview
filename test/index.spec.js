/**
 * Test the metalsmith-preview plugin.
 */

/* eslint-disable no-unused-expressions, function-paren-newline */

const { expect } = require('chai');
const Rewire = require('rewire');
const Sinon = require('sinon'); // eslint-disable-line
const plugin = Rewire('../lib/index');
const _isTypeEqual = plugin.__get__('_isTypeEqual');
const _setArgDefaults = plugin.__get__('_setArgDefaults');
const { attachPreview, choosePreviewFunction } = require('../lib/preview');


///////////
// TESTS //
///////////

describe('index.js', () => {
    context('_isTypeEqual()', () => {
        it('should check if the argument is the expected type', () => {
            const testArgs =
                [ [42, Number]
                , [true, Boolean]
                , ['hello world', String]
                , [[], Array]
                , [{}, Object]
                ];

            testArgs.forEach(testArg => {
                const [value, type] = testArg;
                const result = _isTypeEqual(value, type);
                expect(result, `args: (${value}, ${type.name})`).to.be.true;
            });
        });

        it('should check if the argument is an instance of an object', () => {
            function MyType() {}
            const arg = new MyType();
            const result = _isTypeEqual(arg, MyType);
            expect(result).to.be.true;
        });
    });

    context('_setArgDefaults()', () => {
        it('should fail when called without required arguments', () => {
            const fns =
                [ _ => _setArgDefaults()
                , _ => _setArgDefaults(true)
                , _ => _setArgDefaults(true, String)
                ];
            fns.forEach(fn => {
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
            plugin.__set__('attachPreview', Sinon.stub());
            plugin.__set__('choosePreviewFunction', Sinon.stub());
            // Returns the default value.
            plugin.__set__('_setArgDefaults', Sinon.stub().returnsArg(3));
        });

        after('reset the private functions', () => {
            plugin.__set__('attachPreview', attachPreview);
            plugin.__set__('choosePreviewFunction', choosePreviewFunction);
            plugin.__set__('_setArgDefaults', _setArgDefaults);
        });

        it('should enforce types for all plugin configuration options', () => {
            const stub = plugin.__get__('_setArgDefaults');

            // Trigger the default logic.
            plugin();
            expect(stub.callCount).to.equal(10);

            // Trigger the alternate character preview logic.
            plugin({ characters: {} });
            expect(stub.callCount - 10).to.equal(11);
        });

        it('should do nothing if the file matching pattern produces no matches', () => {
            const pattern = '*.md';
            const stub = plugin.__get__('attachPreview');
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
            const stub = plugin.__get__('attachPreview');
            plugin()({ a: true, b: true, c: true }, undefined, _ => '');
            expect(stub.callCount).to.equal(3);
        });
    });
});
