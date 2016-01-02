var optimist = require('optimist'),
    marked = require('marked'),
    mustache = require('mustache'),
    hljs = require('highlight.js'),
    path = require('path'),
    fs = require('fs');

var template_dir = path.join(__dirname, '..', 'template');
var highlighted_one;

// install highlight.js as the highlighter for marked
// use all other default options
marked.setOptions({
    highlight: function(code, lang) {
        var hl;
        try {
            hl = hljs.highlight(lang, code);
        } catch(e) {
            return code;
        }
        highlighted_one = true;
        return hl.value;
    }
});

/**
 * Helper function that gets markdown from stdin or file based on options.
 */
var get_input = function(args, callback) {
    var md = '';
    if(!args.input) {
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', function(data) {
            md += data;
        });
        process.stdin.on('end', function() {
            callback(md);
        });
    } else {
        callback(fs.readFileSync(args.input, 'utf-8'));
    }
};

/**
 * Helper function that writes html to stdout or file based on options.
 */
var put_output = function(html, args, callback) {
    if(args.output) {
        fs.writeFileSync(args.output, html, 'utf-8');
    } else {
        process.stdout.write(html);
    }
};

/**
 * Renders markdown into the "content" field of the mustache template. Provides
 * the additional args to the template render function for optional use by the
 * template. Sets a default title for the page based on the markdown filename
 * ("title" property) and loads the specified or default stylesheet to embed
 * ("css_inline" property) if a "css_link" property is not defined. Also deletes
 * the default highlight.js theme CSS link ("css_hljs_theme" property) if no
 * code highlighting happens during the render (to save a HTTP fetch).
 */
exports.render = function(md, template, args) {
    // no highlighting applied yet
    highlighted_one = false;

    // render markdown
    args.content = marked(md);
    // set a default title
    args.title = args.title ? args.title : (args.input ? path.basename(args.input) : '');
    // set a default style
    if(args.css_link) {
        delete args.css_inline;
    } else if(args.css_inline) {
        args.css_inline = fs.readFileSync(args.css_inline, 'utf-8');
    }
    // set no theme if no code to highlight
    if(!highlighted_one) {
        delete args.css_hljs_theme;
    }

    return mustache.render(template, args);
};

/**
 * Fetches the command line args and options. Exposed primarily for testing.
 */
exports.get_argv = function() {
    return optimist
        .usage('usage: $0 [-h] [-iot VALUE] [TEMPLATE ARGS]')

        .alias('input', 'i')
        .string('input')
        .describe('input', 'Input Markdown filename. Read from stdin if not given.')

        .alias('output', 'o')
        .string('output')
        .describe('output', 'Output HTML filename. Write to stdout if not given.')

        .alias('template', 't')
        .string('template')
        .describe('template', 'Path to custom mustache template.')
        .default('template', path.resolve(template_dir, 'default.mustache'))

        .alias('help', 'h')
        .boolean('help')
        .describe('help', 'Show this help')

        .string('title')
        .describe('title', 'Default template option: Title of the HTML page')

        .string('css_link')
        .describe('css_link', 'Default template option: URL of CSS stylesheet to link')

        .string('css_inline')
        .describe('css_inline', 'Default template option: Path of CSS stylesheet to embed')
        .default('css_inline', path.resolve(template_dir, 'default.css'))

        .string('css_hljs_theme')
        .describe('css_hljs_theme', 'Default template option: URL of highlight.js CSS theme to ues')
        .default('css_hljs_theme', 'http://yandex.st/highlightjs/7.3/styles/xcode.min.css')

        .argv;
};

/**
 * Parses the command line, reads the markdown from a file or stdin, renders
 * the html, and outputs it to a file or stdout.
 */
exports.run = function(argv) {
    argv = argv || this.get_argv();

    if(argv.help) {
        optimist.showHelp();
        process.exit(0);
    }

    get_input(argv, function(md) {
        var template = fs.readFileSync(argv.template, 'utf-8');
        var html = exports.render(md, template, argv);
        put_output(html, argv, function() {
            process.exit(0);
        });
    });
};