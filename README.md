# LaTeX Cleaner for Web

A lightweight utility to strip unnecessary LaTeX layout tags and clean up text for web display. Great for parsing math problems or educational content.

I tried to change some PDF files including math problems into JSON file, and when converted by either 'file-system' or 'pdf-parse' npm module, the file keeps throwing either \n or \t, which are bit annoying. So, I make a simple function as a module anyone can use.

## Features
- Removes layout commands like `\bigskip`, `\newpage`, `\vfill`, etc.
- Converts `\\` (line breaks) to spaces.
- Removes standard LaTeX boilerplate.

## Installation

```bash
npm install @jamesyhr/latex-cleaner
```

## Usage

# Old version
```
const clean = require('@jamesyhr/latex-cleaner');

const rawLatex = "Problem 1 \\bigskip \\textbf{Solve this:} $x^2 + y^2 = 1$ \\newpage";
const cleanText = clean(rawLatex);

console.log(cleanText);
// Output: "Problem 1 Solve this: $x^2 + y^2 = 1$"
```
***IF YOU WERE TO UPDATE TO A NEWER VERSION, USE THE FOLLOWING RULES.***

# Version 0.1.0+
One may call just a function, or all class. 

```
const { clean } = require('@jamesyhr/latex-cleaner');

const rawData = "SOMETHING YOU WANT TO TEST";

const cleanedData = clean(rawData);
console.log(cleanedData);
```

```
const { LatexCleaner }= require('@jamesyhr/latex-cleaner');

const cleaner = new LatexCleaner();

const dirty = "\\noindent Hello \\\\ World \t \\bigskip";
const clean = cleaner.clean(dirty);

console.log(clean); // "Hello World"
```

## Options

```js
const { clean, LatexCleaner } = require('@jamesyhr/latex-cleaner');

clean(text, {
  preserveMath: true,    // keep $...$, $$...$$, \(...\), \[...\], align/equation/... untouched
  stripComments: false,  // remove `%` comments (off by default: PDF text often has literal "50%")
  removeCommands: ['myskip', { name: 'mybox', args: 1 }], // extra commands to remove
  keepCommands: ['centering'],                              // default commands to keep
});

const cleaner = new LatexCleaner({ stripComments: true });
cleaner.clean(text);
```

A custom command can declare what it consumes: `star` (`\cmd*`), `opt` (`[...]`), `args` (number of `{...}`), or `glue` (`\vskip 1em plus 2pt`).

### Behavior notes
- Only whole command names are matched, so `\nabla`, `\neq`, `\nu`, `\newcommand` are never cut.
- Layout commands are removed together with their arguments: `\vspace*{1cm}`, `\pagebreak[4]`, `\question[5]`, `\vskip 1em`, `\\[2mm]`.
- `\\` inside math (matrices, `aligned`, ...) is kept; outside math it becomes a space.
- Real newlines/tabs become spaces, so `"Hello\nWorld"` → `"Hello World"`.
- `\$`, `\%`, an unmatched `$` and `\verb|...|` / `verbatim` content are left as-is.

## Testing

```bash
npm test
```

## License
MIT
