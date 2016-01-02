var should = require('should'),
    fs = require('fs'),
    path = require('path'),
    os = require('os'),
    mh = require('../lib/marked-html'),
    spawn = require('child_process').spawn;

var md_fn = path.join(__dirname, 'test.md');
var md = fs.readFileSync(md_fn, 'utf-8');

describe('render', function() {
    var template = fs.readFileSync(path.join(__dirname, '..', 'template', 'default.mustache'), 'utf-8');

    it('should output html', function() {
        var rv = mh.render(md, template, {});
        rv.should.be.a('string');
        rv.should.match(/doctype html/ig);
        rv.should.match(/<title><\/title>/ig);
    });
    it('should have a title', function() {
        var args = {title: 'my title'};
        var rv = mh.render(md, template, args);
        rv.should.match(/<title>my title<\/title>/ig);
    });
    it('should have linked css', function() {
        var args = {css_link: 'foobar.com/css'};
        var rv = mh.render(md, template, args);
        rv.should.match(/<link rel="stylesheet" type="text\/css" href="foobar.com\/css" \/>/ig);
        rv.should.not.match(/<style/ig);
    });
    it('should have embedded css', function() {
        var args = {css_inline: path.join(__dirname, '..', 'template', 'default.css')};
        var rv = mh.render(md, template, args);
        rv.should.not.match(/<link/ig);
        rv.should.match(/<style/ig);
    });
    it('should have a hljs theme', function() {
        var args = {css_hljs_theme: 'foobar.com/css'};
        var rv = mh.render(md, template, args);
        rv.should.match(/<link rel="stylesheet" type="text\/css" href="foobar.com\/css" \/>/ig);
    });
});

describe('run', function() {
    var bin = path.join(__dirname, '..', 'bin', 'marked-html'),
        expected_length = 6346,
        tempdir = os.tmpdir();
    it('should read a md file, write html to stdout', function(done) {
        var output = '';
        var c = spawn('node', [bin, '-i', md_fn]);
        c.stdout.setEncoding('utf8');
        c.stdout.on('data', function(data) {
            output += data;
        });
        c.on('close', function(code) {
            code.should.equal(0);
            output.should.have.length(expected_length);
            done();
        });
    });
    it('should read a md file, write a html file', function(done) {
        var output = path.join(tempdir, 'test.html');
        var c = spawn('node', [bin, '-i', md_fn, '-o', output]);
        c.on('close', function(code) {
            code.should.equal(0);
            output = fs.readFileSync(output, 'utf-8');
            output.should.have.length(expected_length);
            done();
        });
    });
    it('should read md from stdin, write html to stdout', function(done) {
        var output = '';
        var c = spawn('node', [bin]);
        c.stdout.setEncoding('utf8');
        c.stdout.on('data', function(data) {
            output += data;
        });
        c.on('close', function(code) {
            code.should.equal(0);
            // no default title of test.md filename when stdin
            output.should.have.length(expected_length-7);
            done();
        });
        c.stdin.write(md);
        c.stdin.end();
    });
    it('should read md from stdin, write a html file', function(done) {
        var output = path.join(tempdir, 'test.html');
        var c = spawn('node', [bin, '-o', output]);
        c.on('close', function(code) {
            code.should.equal(0);
            output = fs.readFileSync(output, 'utf-8');
            // no default title of test.md filename when stdin
            output.should.have.length(expected_length-7);
            done();
        });
        c.stdin.write(md);
        c.stdin.end();
    });
    it('should show help', function(done) {
        var output = '';
        var c = spawn('node', [bin, '-h']);
        c.stderr.on('data', function(data) {
            output += data;
        });
        c.on('close', function(code) {
            code.should.equal(0);
            output.should.match(/usage/gi);
            output.should.match(/--output, -o/gi);
            output.should.match(/--help, -h/gi);
            done();
        });
    });
});