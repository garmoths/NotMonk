// Java syntax support for NotMonk code blocks.
if (globalThis.Prism?.languages?.clike && !Prism.languages.java) {
  Prism.languages.java = Prism.languages.extend("clike", {
    string: {
      pattern: /(^|[^\\])"(?:\\.|[^"\\\r\n])*"/,
      lookbehind: true,
      greedy: true
    },
    "class-name": [
      { pattern: /(\b(?:class|enum|extends|implements|instanceof|interface|new|record|throws)\s+)[\w.\\]+/, lookbehind: true },
      /\b[A-Z](?:\w|\$)*\b/
    ],
    keyword: /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|exports|extends|final|finally|float|for|if|implements|import|instanceof|int|interface|long|module|native|new|non-sealed|open|opens|package|permits|private|protected|provides|public|record|requires|return|sealed|short|static|strictfp|super|switch|synchronized|this|throw|throws|to|transient|transitive|try|uses|var|void|volatile|while|with|yield)\b/,
    function: /\b\w+(?=\s*\()/,
    number: /\b(?:0b[01][01_]*|0x(?:\.[\da-f_p+-]+|[\da-f_]+(?:\.[\da-f_]*)?(?:p[+-]?\d+)?)|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?)[dfl]?\b/i,
    operator: { pattern: /(^|[^.])(?:<<=?|>>>?=?|->|--|\+\+|&&|\|\||::|[?:~]|[-+*/%&|^!=<>]=?)/m, lookbehind: true }
  });
}
