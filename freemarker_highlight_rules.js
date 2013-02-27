/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var lang = require("../lib/lang");
var HtmlHighlightRules = require("./html_highlight_rules").HtmlHighlightRules;
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var FreeMarkerRules = function () {
    // capture all of the freemarker keywords
    // TODO: iso...
    // @see: http://freemarker.sourceforge.net/docs/ref_builtins_date.html#ref_builtin_date_iso
    var built_ins = ("ancestors|byte|c|cap_first|capitalize|ceiling|children|chop_linebreak|chunk|contains|date|datetime|double|ends_with|eval|first|floor|groups|float|has_content|html|index_of|int|interpret|is_string|is_number|is_boolean|is_date|is_method|is_transform|is_macro|is_hash|is_hash_ex|is_sequence|is_collection|is_enumerable|is_indexable|is_directive|is_node|j_string|js_string|keys|last|last_index_of|left_pad|length|long|lower_case|matches|namespace|new|node_namespace|node_name|node_type|number|number_to_date|number_to_datetime|number_to_time|parent|replace|reverse|right_pad|round|root|rtf|short|size|sort|seq_contains|seq_index_of|seq_last_index_of|sort_by|split|starts_with|string|substring|time|trim|uncap_first|upper_case|url|values|word_list|xhtml|xml");
    
    // TODO: special variables must be preceded by a period
    // @see: http://freemarker.sourceforge.net/docs/ref_directive_userDefined.html#ref.directive.userDefined
    var directives = ("assign|attempt|break|case|compress|default|else|elseif|escape|fallback|function|flush|ftl|global|if|import|include|list|local|lt|macro|nested|noescape|nt|recover|recurse|return|rt|setting|stop|switch|t|visit");
    var special_variables = ("data_model|error|globals|lang|locale|locals|main|namespace|node|now|output_encoding|template_name|url_escaping_charset|vars|version");
    var reserved_names = {
            booleans: ("true|false"),
            comparisons: ("gt|gte|lt|lte"),
            others: ("as|in|using")
        };

    var deprecated_directives = ("call|comment|foreach|transform");
    var deprecated_built_ins = ("default|exists|if_exists|web_safe");

    var keywordMapper = this.createKeywordMapper({
        "support.function" : built_ins,
        "meta.tag.tag-name" : directives,
        "variable.language" : special_variables,
        "constant.language.boolean" : reserved_names.booleans,
        "keyword.operator.comparison" : reserved_names.comparisons,
        "keyword.other" : reserved_names.others,
        "invalid.deprecated" : [deprecated_directives, deprecated_built_ins].join("|")
    }, "identifier");

    // add freemarker start tags to the HTML start tags
    this.$rules.start.unshift({
            token : "comment.block.freemarker",
            regex : "[<\\[]#--",
            next : "comment"
        }, {
            token : ["meta.tag.ftl", "punctuation.definition.function.ftl"],
            regex : "([<\\[]\\/?)(#|@)",
            next : "freemarker-directive-start"
        }, {
            token : "variable.other.readwrite.local.ftl",
            regex : "\\$\\{",
            next : "freemarker-interpolation-start"
        });

    // add freemarker closing comment to HTML comments
    this.$rules.comment.unshift({
            token : "comment.block.freemarker",
            regex : ".*--[>\\]]",
            next : "start"
        });

    // Specific freemarker rules (heavily borrowed from Liquid, some from JavaScript)

    // common rules for all freemarker highlighting
    var freemarker_common = [
        {
            token : "constant.numeric", // hex
            regex : "0[xX][0-9a-fA-F]+\\b"
        }, {
            token : "constant.numeric", // float
            regex : "[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"
        }, {
            token : keywordMapper,
            regex : "[a-zA-Z_$][a-zA-Z0-9_$]*\\b"
        }, {
            token : "keyword.operator.comparison",
            regex : "==|!=|<|>|>=|<=|&lt;|&gt;|\\?lte?|\\?gte?"
        }, {
            token : "keyword.operator.assignment",
            regex : "="
        }, {
            token : "keyword.operator.arithmetic",
            regex : "\\+|-|/|%|\\*"
        }, {
            token : "keyword.operator.logical",
            regex : "\\|\\||&&|!"
        }, {
            token : "keyword.operator.other",
            regex : "\\.\\.|\\|"
        }, {
            token : "punctuation.operator",
            regex : /\?|\:|\,|\;|\./
        }, {
            token : "paren.lparen",
            regex : /[\[\({]/
        }, {
            token : "paren.rparen",
            regex : /[\])}]/
        }, {
            token : "text",
            regex : "\\s+"
        }];

    // freemarker directive start
    this.$rules["freemarker-directive-start"] = [
        {
            token : ["punctuation.definition.function.ftl", "meta.tag.r.ftl"],
            regex : "(\\/)?([>\\]])",
            next : "start"
        } ].concat(freemarker_common);

    // freemarker interpolation start
    this.$rules["freemarker-interpolation-start"] = [
        {
            token : "variable.other.readwrite.local.ftl",
            regex : "\\}",
            next : "start"
        } ].concat(freemarker_common);

    // Borrow quoted strings from PHP    
    // FreeMarker treats both quotes exactly the same
    function freemarker_quotes (next) {
        this.$rules["freemarker-string-" + next] = [
            {
                token : "constant.language.escape",
                regex : "\\\\(?:[nrtvef\\\\\"'$]|[0-7]{1,3}|x[0-9A-Fa-f]{1,2})"
            }, {
                token : "string",
                regex : "['\"]",
                next : next
            }, {
                defaultToken : "string"
            }
        ];
        //freemarker_inside.call(this, "freemarker-string-" + next);
        
        this.$rules["freemarker-raw-string-" + next] = [
            {
                token : "string",
                regex : "['\"]",
                next : next
            }, {
                defaultToken : "string"
            }
        ];
        this.$rules[next].unshift({
            token : "string",
            regex : 'r[\'"](?=.)',
            next  : "freemarker-raw-string-" + next
        }, {
            token : "string",
            regex : '[\'"](?=.)',
            next  : "freemarker-string-" + next
        });
    }
    freemarker_quotes.call(this, "freemarker-directive-start");
    freemarker_quotes.call(this, "freemarker-interpolation-start");

    // for FreeMarker variables inside other things
    function freemarker_inside (next) {
        // TODO: how do you tag up interpolation without infinite recursion?
        this.$rules[next].unshift({
            token : "string.interpolated",
            regex : "\\$\\{.*?\\}"
        });
    }

    // Allow freemarker inside quotes
    //freemarker_inside.call(this, "tag_qqstring");
    //freemarker_inside.call(this, "tag_qstring");
}

var FreeMarkerHighlightRules = function() {
    // inspired by Liquid, PHP and JavaScript Highlight Rules

    // repeat the HTML rules (like PHP does)
    HtmlHighlightRules.call(this);

    // regexp must not have capturing parentheses. Use (?:) instead.
    // regexps are ordered -> the first match is used
    FreeMarkerRules.call(this);

};

oop.inherits(FreeMarkerHighlightRules, TextHighlightRules);

exports.FreeMarkerRules = FreeMarkerRules;
exports.FreeMarkerHighlightRules = FreeMarkerHighlightRules;
});