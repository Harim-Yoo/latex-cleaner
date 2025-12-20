class LatexCleaner {
    constructor(text="") {
        this.text = text;
    }
    clean(inputText) {
        const target = inputText !== undefined ? inputText : this.text;

        if (!target || typeof target !== "string") return "";

        return target
          .replace(
            /\\n|\\bigskip|\\medskip|\\smallskip|\\newpage|\\vfill|\\null|\\noindent|\\hfill|\t|\\\\/g,
            ""
          )
          .replace(/\\\\/g, " ")
          .replace(/\s+/g, " ")
          .trim();
    }
}

const clean = (text) => new LatexCleaner().clean(text);
module.exports = clean;
module.exports = LatexCleaner;