/* eslint-env jest */
const path = require('path');
const t = require('babel-types');
const { transform: babelTransform } = require('babel-core');
const { default: traverse } = require('babel-traverse');

function transform(code) {
  return babelTransform(code, {
    babelrc: false,
    plugins: [path.resolve(__dirname, '..')]
  });
}

function extractConsoleTableArguments(ast) {
  let consoleTableArgs;
  traverse(ast, {
    CallExpression(path) {
      const { arguments: args, callee } = path.node;
      if (t.isLogicalExpression(callee)) {
        const { object, property } = callee.left;
        if (
          t.isIdentifier(object) && object.name === 'console' &&
          t.isIdentifier(property) && property.name === 'table'
        ) {
          consoleTableArgs = args;
        }
      }
    }
  });
  return consoleTableArgs;
}

function extractFoundLocalVariables(ast) {
  const args = extractConsoleTableArguments(ast);
  const consoleTableArgs = args[0] && (
    t.isObjectExpression(args[0]) ?
      args[0].properties :
      t.isCallExpression(args[0]) ?
        args[0].arguments[0].properties :
        undefined
  );
  const validTransform = args.length === 1 && consoleTableArgs &&
    consoleTableArgs.reduce(
      (pass, prop) =>
        pass && t.isObjectProperty(prop) &&
        t.isStringLiteral(prop.key) && t.isIdentifier(prop.value) &&
        prop.key.value === prop.value.name,
      true
    );
  return validTransform && consoleTableArgs.map((prop) => prop.key.value);
}

describe('handy-debug', () => {
  describe('scope types', () => {
    it('transforms class method', () => {
      const src = `
class Test {
  foo() {
    const a = 1;
    __printLocals();
  }
}
      `;
      expect(transform(src).code).toContain('console.table');
    });

    it('transforms function', () => {
      const src = 'function test() { const a = 1; __printLocals(); }';
      expect(transform(src).code).toContain('console.table');
    });

    it('transforms lambda', () => {
      const src = 'const f = () => { const a = 1; __printLocals(); };';
      expect(transform(src).code).toContain('console.table');
    });
  });

  describe('variable scoping', () => {
    it('reaches over if blocks', () => {
      const src = 'function test() { const a = 1; if (a) { const b = 0; __printLocals(); } }';
      expect(extractFoundLocalVariables(transform(src).ast)).toEqual(['a', 'b']);
    });

    it('reaches over for blocks (and include declerations in for)', () => {
      const src = 'function test() { const a = 1; for(let i=0;i<10;i++) { __printLocals(); } }';
      expect(extractFoundLocalVariables(transform(src).ast)).toEqual(['a', 'i']);
    });

    it('reaches over while blocks', () => {
      const src = 'function test() { const a = 1; while (a < 10) { a++; __printLocals(); } }';
      expect(extractFoundLocalVariables(transform(src).ast)).toEqual(['a']);
    });

    it('only prints variables declared before the call', () => {
      const src = 'function test() { const a = 1; if (a) { __printLocals(); const b = 0; } }';
      expect(extractFoundLocalVariables(transform(src).ast)).toEqual(['a']);
    });
  });

  describe('type of variables', () => {
    it('works with const', () => {
      const src = 'function test() { const a = 1; __printLocals(); }';
      expect(extractFoundLocalVariables(transform(src).ast)).toEqual(['a']);
    });

    it('works with let', () => {
      const src = 'function test() { let a = 1; __printLocals(); }';
      expect(extractFoundLocalVariables(transform(src).ast)).toEqual(['a']);
    });

    it ('works with var', () => {
      const src = 'function test() { var a = 1; __printLocals(); }';
      expect(extractFoundLocalVariables(transform(src).ast)).toEqual(['a']);
    });
  });

  describe('accepts a function', () => {
    test('pass local variables into the function', () => {
      const src = 'function test() { const a = 1, b = 2 ; __printLocals((props) => Object.keys(props)); }';
      const compiledFunc = extractConsoleTableArguments(transform(src).ast)[0];

      expect(t.isCallExpression(compiledFunc) && t.isArrowFunctionExpression(compiledFunc.callee) && compiledFunc.callee.params[0].name === 'props').toBeTruthy();
      expect(compiledFunc.arguments[0].properties.map((prop) => prop.key.value)).toEqual(['a', 'b']);
    });
  });
});