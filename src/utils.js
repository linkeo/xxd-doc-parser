const crypto = require('crypto');
const doctrine = require('doctrine');
const eslintScope = require('eslint-scope');
const utils = require('eslint-utils');
const evk = require('eslint-visitor-keys');
const astUtils = require('eslint/lib/shared/ast-utils');
const Traverser = require('eslint/lib/shared/traverser');
const SourceCode = require('eslint/lib/source-code/source-code');
const parser = require('espree');
const fs = require('fs');

SourceCode.prototype.findJSDocComment = function findJSDocComment(astNode) {
  const tokenBefore = this.getTokenBefore(astNode, { includeComments: true });

  if (
    tokenBefore &&
    utils.isCommentToken(tokenBefore) &&
    tokenBefore.type === 'Block' &&
    tokenBefore.value.charAt(0) === '*' &&
    astNode.loc.start.line - tokenBefore.loc.end.line <= 1
  ) {
    return tokenBefore;
  }

  return null;
};

/**
 * Analyze scope of the given AST.
 * @param {ASTNode} ast The `Program` node to analyze.
 * @param {ParserOptions} parserOptions The parser options.
 * @param {Record<string, string[]>} visitorKeys The visitor keys.
 * @returns {ScopeManager} The analysis result.
 */
function analyzeScope(ast, parserOptions, visitorKeys) {
  const ecmaFeatures = parserOptions.ecmaFeatures || {};
  const ecmaVersion = parserOptions.ecmaVersion || 5;

  return eslintScope.analyze(ast, {
    ignoreEval: true,
    nodejsScope: ecmaFeatures.globalReturn,
    impliedStrict: ecmaFeatures.impliedStrict,
    ecmaVersion,
    sourceType: parserOptions.sourceType || 'script',
    childVisitorKeys: visitorKeys || evk.KEYS,
    fallback: Traverser.getKeys,
  });
}

function getSourceCode(filename) {
  const text = fs
    .readFileSync(filename, 'utf-8')
    .replace(astUtils.shebangPattern, (match, captured) => `//${captured}`);
  const parserOptions = {
    loc: true,
    range: true,
    raw: true,
    tokens: true,
    comment: true,
    eslintVisitorKeys: true,
    eslintScopeManager: true,
    ecmaVersion: 2019,
  };
  const parseResult = { ast: parser.parse(text, parserOptions) };
  const ast = parseResult.ast;
  const parserServices = parseResult.services || {};
  const visitorKeys = parseResult.visitorKeys || evk.KEYS;
  const scopeManager = parseResult.scopeManager || analyzeScope(ast, parserOptions, visitorKeys);
  return new SourceCode({
    text,
    ast,
    parserServices,
    scopeManager,
    visitorKeys,
  });
}

function parseJSDoc(commentNode) {
  const doc = doctrine.parse(commentNode.value, { unwrap: true });
  return {
    title() {
      return doc.description
        .trim()
        .split('\n')[0]
        .trim();
    },
    has(tagName) {
      const index = doc.tags.findIndex(tag => tag.title === tagName);
      return index !== -1;
    },
    module() {
      const tag = doc.tags.find(tag => tag.title === 'module');
      return tag ? tag.name : '';
    },
    text(tagName) {
      const tag = doc.tags.find(tag => tag.title === tagName);
      return tag ? tag.description.trim() : '';
    },
    textArray(tagName) {
      const tags = doc.tags.filter(tag => tag.title === tagName);
      return tags.map(tag => tag.description);
    },
    customArray(tagName, mapper) {
      const tags = doc.tags.filter(tag => tag.title === tagName);
      return tags.map(mapper);
    },
  };
}

function hash(str, map = {}) {
  const md5 = crypto.createHash('md5');
  map[str] = map[str] ? map[str] + 1 : 1;
  md5.update(`${str}:${map[str]}`);
  return md5.digest('hex').slice(0, 6);
}

function parseMiddleware(tag) {
  const match = tag.description.match(/^\s*\{([^}]+)\}(.*?)(?:\n|$)/);
  if (match) {
    return { name: match[1].trim(), args: match[2].trim() };
  }
  throw new Error(
    `${JSON.stringify(`@middleware ${tag.description}`)} is not valid middleware definition`
  );
}

function parseRoute(tag) {
  const match = tag.description.match(/^\s*\{([^}]+)\}(.+?)(?:\n|$)/);
  if (match) {
    return {
      method: match[1].trim().toUpperCase(),
      path: match[2].trim(),
      toName() {
        return `${this.method.toLowerCase()}:${this.path}`;
      },
    };
  }
  throw new Error(`${JSON.stringify(`@route ${tag.description}`)} is not valid route definition`);
}
function parseParam(tag) {
  if (tag.type && tag.name.startsWith('params.')) {
    return {
      type: tag.type.name,
      name: tag.name.slice(7),
      description: tag.description || '',
    };
  }
  return null;
}

function getFuncName(node) {
  let name = '';
  Traverser.traverse(node, {
    enter(node) {
      if (!name) {
        if (node.type === 'Program') {
          return;
        }
        if (node.type === 'Property') {
          name = node.key.name;
        } else if (node.type === 'MethodDefinition') {
          name = node.key.name;
        } else if (node.type === 'FunctionDeclaration') {
          name = node.id.name;
        } else if (
          node.type === 'VariableDeclarator' &&
          node.init &&
          (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression')
        ) {
          name = node.id.name;
        }
      }
    },
  });
  return name;
}

exports.getSourceCode = getSourceCode;
exports.parseJSDoc = parseJSDoc;
exports.hash = hash;
exports.parseMiddleware = parseMiddleware;
exports.parseRoute = parseRoute;
exports.parseParam = parseParam;
exports.getFuncName = getFuncName;
