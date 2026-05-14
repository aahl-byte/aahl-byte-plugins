export function md(text) {
  if (!text) return '';
  let s = String(text);

  // Fenced code blocks (``` ... ```)
  s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre><code${lang ? ` class="lang-${lang}"` : ''}>${escaped}</code></pre>`;
  });

  // Split on fenced code blocks to avoid processing their contents
  const parts = s.split(/(<pre><code[\s\S]*?<\/code><\/pre>)/);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) continue; // skip code blocks
    let p = parts[i];
    // Inline code
    p = p.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold
    p = p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic (single asterisk, avoid matching list items)
    p = p.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Unordered list blocks
    p = p.replace(/((?:^|\n)(?:- .+(?:\n|$))+)/g, (match) => {
      const items = match.trim().split('\n')
        .map(line => `<li>${line.replace(/^- /, '')}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    });
    // Paragraphs (double newline)
    p = p.replace(/\n{2,}/g, '</p><p>');
    // Single newlines → <br> (but not after block elements)
    p = p.replace(/(?<!\n)(?<!<\/ul>|<\/li>|<\/pre>|<\/p>)\n(?!<)/g, '<br>');
    parts[i] = p;
  }
  s = parts.join('');

  // Wrap in <p> if not already block-level
  if (!s.startsWith('<pre>') && !s.startsWith('<ul>')) {
    s = `<p>${s}</p>`;
  }
  // Clean empty paragraphs
  s = s.replace(/<p>\s*<\/p>/g, '');

  return s;
}
