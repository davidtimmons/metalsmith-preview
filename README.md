# metalsmith-preview

[![npm version][version-badge]][version-url]
[![build status][build-badge]][build-url]
[![downloads][downloads-badge]][downloads-url]

> A Metalsmith plugin for generating custom text previews.

This plugin generates a customizable text preview for each source file. Previews can be generated
based on word count, character count, or custom markers placed within the source text. Each
preview is assigned to a file metadata key that can be referenced using the desired template
engine.

## Table of Contents

  1. [Installation](#installation)
  1. [Examples](#examples)
  1. [Options](#options)
  1. [License](#license)

## Installation

```bash
$ npm install metalsmith-preview
```

**[⬆ back to top](#metalsmith-preview)**

## Examples

Configuration in `metalsmith.json`:

### Word Preview

```json
{
  "plugins": {
    "metalsmith-preview": {
      "words": 10
    }
  }
}
```

Source file `src/index.md`:

```markdown
Lorem ipsum dolor sit amet consectetur adipiscing elit, fermentum bibendum metus justo congue
tortor eget, phasellus aptent nunc nibh quis fusce.
```

Results in `preview`:

```
"Lorem ipsum dolor sit amet consectetur adipiscing elit, fermentum bibendum..."
```

### Character Preview

#### Exact Count

```json
{
  "plugins": {
    "metalsmith-preview": {
      "characters": 16
    }
  }
}
```

_**Note:** Dots are used for spaces to illustrate the example._

Source file `src/index.md`:

```markdown
∙Lorem∙ipsum∙dolor∙sit∙amet
```

Results in `preview`:

```
"∙Lorem∙ipsum∙..."
```

#### No Leading or Trailing Whitespace

```json
{
  "plugins": {
    "metalsmith-preview": {
      "characters": {
          "count": 16,
          "trim": true
      }
    }
  }
}
```

_**Note:** Dots are used for spaces to illustrate the example._

Source file `src/index.md`:

```markdown
∙Lorem∙ipsum∙dolor∙sit∙amet
```

Results in `preview`:

```
"Lorem∙ipsum..."
```

### Marker Preview

#### Enclosed Text

```json
{
  "plugins": {
    "metalsmith-preview": {
      "marker": {
          "start": "{{ previewStart }}",
          "end": "{{ previewEnd }}"
      }
    }
  }
}
```

Source file `src/index.md`:

```markdown
Lorem ipsum dolor sit amet consectetur adipiscing elit, {{ previewStart}}fermentum bibendum metus
justo congue{{ previewEnd }} tortor eget, phasellus aptent nunc nibh quis fusce.
```

Results in `build/index.md`:

```markdown
Lorem ipsum dolor sit amet consectetur adipiscing elit, fermentum bibendum metus
justo congue tortor eget, phasellus aptent nunc nibh quis fusce.
```

And results in `preview`:

```
"fermentum bibendum metus justo congue..."
```

#### Leading Text

```json
{
  "plugins": {
    "metalsmith-preview": {
      "marker": {
          "end": "{{ previewEnd }}"
      }
    }
  }
}
```

Source file `src/index.md`:

```markdown
Lorem ipsum dolor sit amet{{ previewEnd }} consectetur adipiscing elit, fermentum bibendum metus
justo congue tortor eget, phasellus aptent nunc nibh quis fusce.
```

Results in `build/index.md`:

```markdown
Lorem ipsum dolor sit amet consectetur adipiscing elit, fermentum bibendum metus
justo congue tortor eget, phasellus aptent nunc nibh quis fusce.
```

And results in `preview`:

```
"Lorem ipsum dolor sit amet..."
```

#### Ending Text

```json
{
  "plugins": {
    "metalsmith-preview": {
      "marker": {
          "start": "{{ previewStart }}"
      }
    }
  }
}
```

Source file `src/index.md`:

```markdown
Lorem ipsum dolor sit amet consectetur adipiscing elit, fermentum bibendum metus justo congue
tortor eget, {{ previewstart }}phasellus aptent nunc nibh quis fusce.
```

Results in `build/index.md`:

```markdown
Lorem ipsum dolor sit amet consectetur adipiscing elit, fermentum bibendum metus justo congue
tortor eget, phasellus aptent nunc nibh quis fusce.
```

And results in `preview`:

```
"phasellus aptent nunc nibh quis fusce...."
```

**[⬆ back to top](#metalsmith-preview)**

## Options

Pass options to `metalsmith-preview` using the Metalsmith
[Javascript API](https://github.com/segmentio/metalsmith#api) or
[CLI](https://github.com/segmentio/metalsmith#cli).
These are the available plugin options:

|Option                                 |Type                    |Description|
|---------------------------------------|------------------------|-----------|
|[pattern](#pattern)                    |`string[]\|string`      |Pattern used to match file names.|
|[key](#key)                            |`string`                |Key used to assign the preview value.|
|[ignoreExistingKey](#ignoreexistingkey)|`boolean`               |Whether to overwrite an existing preview key.|
|[continueIndicator](#continueindicator)|`string`                |Value appended to the preview.|
|[strip](#strip)                        |`regex\|string`         |Regular expression or string to strip from the preview.|
|[words](#words)                        |`number\|string`        |Word limit used to generate previews.|
|[characters](#characters)              |`number\|string\|object`|Character limit used to generate previews; this can be used as a number or an object containing configuration options.|
|[characters.count](#characterscount)   |`number\|string`        |Character limit used to generate previews.|
|[characters.trim](#characterstrim)     |`boolean`               |Whether to trim whitespace from the character preview.|
|[marker](#marker)                      |`object`                |Data marker(s) that indicate the desired preview.|
|[marker.start](#markerstart)           |`string`                |Generate a preview starting from this marker if present in the source file.|
|[marker.end](#markerend)               |`string`                |Generate a preview ending at this marker if present in the source file.|

### Defaults

```javascript
{
  "plugins": {
    "metalsmith-preview": {
      "pattern": "**/*",
      "key": "preview",
      "ignoreExisting": false,
      "continueIndicator": "...",
      "strip": /\[|\]\[.*?\]|<.*?>|[*_<>]/g,
      "words": 0,
      "characters": 0,
      "marker": {
        "start": "{{ previewStart }}",
        "end": "{{ previewEnd }}"
      }
    }
  }
}
```

### Order of Operation

When options are set for word, character, and/or marker previews in the same configuration object,
`metalsmith-preview` defaults first to a word preview, then to a character preview, and finally
to a marker preview.

### Option Details

#### pattern

Fed directly into [multimatch](https://github.com/sindresorhus/multimatch) as the mechanism
to select source files.

#### key

Attached to each Metalsmith file object. Contains the preview text.

#### ignoreExistingKey

Overwrites an existing file key that has the same name as [key](#key) when set to `true`.
The default behavior is to do nothing if a duplicate key already exists in the Metalsmith
file object.

#### continueIndicator

Appended at the end of the preview text as a visual indicator that more content exists.
When used with the character preview, the length of the `continueIndicator` string counts
against the specified character limit.

#### strip

Matched against the extracted preview text as a final step in generating the preview.
The default behavior strips `HTML` and `Markdown` tags from the preview string.

#### words

Indicates the number of words to extract from the source text. If `words` is greater than
the number of available words in the file, the plugin uses all words in the file.

#### characters

Indicates the number of characters to extract from the source text. If `characters` is greater
than the number of available characters in the file, the plugin uses all characters in the file.
Does not trim leading or trailing whitespace by default.

Used with a number:

```json
{
  "characters": 42
}
```

Used with an object:

```json
{
  "characters": {
    "count": 42,
    "trim": true
  }
}
```

##### charactersCount

Indicates the number of characters to extract from the source text when `characters` is an object.

##### charactersTrim

Indicates whether to trim leading and trailing whitespace from the character preview.

#### marker

Requires a configuration object when generating a marker-based preview.

##### markerStart

Extracts preview text starting from the first character after this marker.

##### markerEnd

Extracts preview text ending at the final character before this marker.

**[⬆ back to top](#metalsmith-preview)**

## License

MIT

**[⬆ back to top](#metalsmith-preview)**


[build-badge]: https://travis-ci.org/davidtimmons/metalsmith-preview.svg
[build-url]: https://travis-ci.org/davidtimmons/metalsmith-preview
[downloads-badge]: https://img.shields.io/npm/dt/metalsmith-preview.svg
[downloads-url]: https://www.npmjs.com/package/metalsmith-preview
[version-badge]: https://img.shields.io/npm/v/metalsmith-preview.svg
[version-url]: https://www.npmjs.com/package/metalsmith-preview
