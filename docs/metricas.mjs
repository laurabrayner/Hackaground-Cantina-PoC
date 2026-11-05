/* Complexidade ciclomatica e encapsulamento, pela API do compilador TypeScript. */
import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const arquivos = [];
(function varrer(dir) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) varrer(caminho);
    else if (nome.endsWith('.ts')) arquivos.push(caminho);
  }
})('src');

const RAMOS = new Set([
  ts.SyntaxKind.IfStatement, ts.SyntaxKind.ForStatement, ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.ForInStatement, ts.SyntaxKind.WhileStatement, ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CaseClause, ts.SyntaxKind.CatchClause, ts.SyntaxKind.ConditionalExpression,
]);
const OPERADORES = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken,
]);

function complexidade(no) {
  let c = 1;
  (function anda(n) {
    if (RAMOS.has(n.kind)) c++;
    if (ts.isBinaryExpression(n) && OPERADORES.has(n.operatorToken.kind)) c++;
    ts.forEachChild(n, anda);
  })(no);
  return c;
}

const CAMADAS = ['dominio', 'aplicacao', 'infra', 'ui'];
const classes = [];
const todos = [];

for (const caminho of arquivos) {
  const camada = CAMADAS.find((c) => caminho.includes(c)) || 'raiz';
  const fonte = ts.createSourceFile(caminho, readFileSync(caminho, 'utf8'), ts.ScriptTarget.ES2022, true);
  ts.forEachChild(fonte, function anda(no) {
    if (ts.isClassDeclaration(no) && no.name) {
      const metodos = no.members.filter((m) => ts.isMethodDeclaration(m) || ts.isGetAccessor(m) || ts.isConstructorDeclaration(m));
      const campos = no.members.filter((m) => ts.isPropertyDeclaration(m));
      const ehPrivado = (m) => m.modifiers?.some((x) => x.kind === ts.SyntaxKind.PrivateKeyword);
      classes.push({
        nome: no.name.text,
        metodos: metodos.length,
        wmc: metodos.reduce((s, m) => s + complexidade(m), 0),
        campos: campos.length,
        camposPublicos: campos.filter((m) => !ehPrivado(m)).length,
      });
      for (const m of metodos) {
        todos.push({ nome: no.name.text + '.' + (m.name?.getText?.() ?? 'constructor'), cc: complexidade(m), camada });
      }
    }
    ts.forEachChild(no, anda);
  });
}

const pedido = classes.find((c) => c.nome === 'Pedido');
console.log('=== PoC: classe Pedido ===');
console.log('  metodos=%d  WMC=%d  campos=%d (publicos=%d)', pedido.metodos, pedido.wmc, pedido.campos, pedido.camposPublicos);

console.log('');
console.log('=== CC maxima por camada ===');
for (const camada of CAMADAS) {
  const da = todos.filter((m) => m.camada === camada);
  if (!da.length) continue;
  const pior = da.reduce((a, b) => (b.cc > a.cc ? b : a));
  const media = (da.reduce((s, m) => s + m.cc, 0) / da.length).toFixed(2);
  console.log('  %s metodos=%s CC media=%s pior: %s (CC=%d)', camada.padEnd(10), String(da.length).padEnd(4), media.padEnd(5), pior.nome, pior.cc);
}

console.log('');
console.log('  metodos no total:', todos.length);
console.log('  CC maxima:', Math.max(...todos.map((m) => m.cc)));
console.log('  CC media: ', (todos.reduce((s, m) => s + m.cc, 0) / todos.length).toFixed(2));
