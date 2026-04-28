const { codeToHtml } = require('shiki');

async function run() {
  let input = '';
  process.stdin.on('data', chunk => {
    input += chunk;
  });

  process.stdin.on('end', async () => {
    try {
      const data = JSON.parse(input);
      const { code, lang, theme = 'github-dark' } = data;

      // Normalização de alias para o Shiki
      const langMap = {
        'ts': 'typescript',
        'tsx': 'tsx',
        'js': 'javascript',
        'jsx': 'jsx',
        'cs': 'csharp',
        'py': 'python',
        'sh': 'bash',
        'shell': 'bash',
        'sql': 'sql',
        'yml': 'yaml',
        'json': 'json',
        'md': 'markdown',
        'tf': 'terraform',
        'dockerfile': 'dockerfile',
        'diff': 'diff',
        'git': 'git',
      };

      const resolvedLang = langMap[lang?.toLowerCase()] || lang || 'text';

      const htmlContent = await codeToHtml(code, {
        lang: resolvedLang,
        theme: theme,
        structure: 'classic',
        // Ativamos classes para linhas permitindo estilização de line numbers via CSS se necessário
        // Ou podemos usar um transformer se desejarmos line numbers impressos
      });

      console.log(htmlContent);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
}

run();
