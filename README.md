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

## License
MIT
