// ==UserScript==
// @name        Reddit Blocker
// @include     /^https?:\/\/([A-Za-z]{1,3}\.)?reddit(js)?\.com\/r\//
// @namespace   reddit_block
// @version     3
// @grant       GM_getValue
// @grant       GM_setValue
// @require     https://code.jquery.com/jquery-2.1.1.min.js
// ==/UserScript==

// const
var block_button_html = 
      "<li class='block-button'>"
    + "<a href='javascript:void(0)'>"
    + "block"
    + "</a></li>";
var unblock_button_html =
       "<li class='block-button'>"
    + "<a href='javascript:void(0)'>"
    + "unblock"
    + "</a></li>";

// --- run on page load ---
 
// restore page's jQuery
this.$ = this.jQuery = jQuery.noConflict(true);

var author_blocked = _get_blocked_map();

$("div.comment").each( function (index) {
    insert_block_button(this, author_blocked);
    
    var author = get_author(this);
    if (author_blocked[author]) {
        _do_comment_block_action(this);
    }
});


// --- subroutines ---

function insert_block_button (comment, user_is_blocked) {
    var $button_list = $(comment).find("div.entry ul.buttons").first();
    var author = get_author(comment);
    if (user_is_blocked[author]){
        var $unblock_button = $(unblock_button_html);
        $unblock_button.click( _block_button_onclick(author, $unblock_button, false) );
        $button_list.append($unblock_button);
    }
    else {
        var $block_button = $(block_button_html);
        $block_button.click( _block_button_onclick(author, $block_button, true) );
        $button_list.append($block_button);
    }
}

function replace_block_button (comment, prev_blocking) {
    var $button_list = $(comment).find("div.entry ul.buttons").first();
    var $old_block_button = $button_list.children("li.block-button").first();
    _swap_type_of_block_button(get_author(comment), $old_block_button, prev_blocking);    
}

function _swap_type_of_block_button (author, $old_block_button, prev_blocking) {
    var $new_block_button 
       = prev_blocking ? $(unblock_button_html) : $(block_button_html);
    
    $new_block_button.click(
        _block_button_onclick(author, $new_block_button, !prev_blocking)
    );
    
    $old_block_button.replaceWith($new_block_button);
}

// function constructor
// blocking is a boolean: true = block, false = unblock
function _block_button_onclick (author, $old_block_button, blocking) {
    return function () {
        if (blocking) { block_author(author);  }
        else          { unblock_author(author);}
        
        $("div.comment").each( function (index) {
            var comment_author = get_author(this);
            if (comment_author === author) {
                if (blocking) { _do_comment_block_action(this);   }
                else          { _do_comment_unblock_action(this); }
                
                replace_block_button(this, blocking);
            }
        });
    };
}

function hide_content (comment) {
    _$get_comment_content(comment).hide();
}

function show_content (comment) {
    _$get_comment_content(comment).show();
}

function collapse (comment) {
    $(comment).addClass("collapsed");
    $(comment).addClass("collapsed-for-reason");
    $(comment).find("div.entry span.userattrs").first().after(
        "<span class='collapsed-reason'>\n"
        +    "author quality below threshold"
        + "</span>"
    );
}

function remove_flair (comment) {
    $(comment).find("div.entry span.flair").remove();
}

function rename_author (comment) {
    var $author_box = $(comment).find("div.entry a.author").first();
    var author = $author_box.text();
    $author_box.html("<del>" + author + "</del>");
}

function restore_author_name (comment) {
    var $author_box = $(comment).find("div.entry a.author").first();
    var author = ( /<del>(\s*\w+\s*)<\/del>/.exec($author_box.html()) )[1];
    $author_box.html(author);
}

function block_author (author) {
    var author_blocked = _get_blocked_map();
    author_blocked[author] = true;
    _set_blocked_map(author_blocked);
}

function unblock_author (author) {
    var author_blocked = _get_blocked_map();
    delete author_blocked[author];
    _set_blocked_map(author_blocked);
}

// --
// Boolean
// --

/*
function _is_child_comment (comment) {
    return $(comment).parent().parent().hasType("child");
}

function _is_root_comment (comment) {
    return $(comment).parent().parent().hasType("commentarea");
}
*/

// --
// Get
// --

/*
function get_thread_author (thread) {
    return $(comment).children("a.author").first().text();
}
*/

function get_author (comment) {
    return $(comment).find("div.entry a.author").first().text();
}

function _$get_comment_content (comment) {
    return $(comment).find("div.entry div.md").first().children();
}

function _$get_comment_parent_table (comment) {
    return $(comment).parent();
}

function _get_blocked_map () {
    return JSON.parse( GM_getValue("blocked_authors_map", "{}") );
}

// --
// Do
// --

function _do_comment_block_action (comment) {
    //collapse(comment);
    hide_content(comment);
    rename_author(comment);
    remove_flair(comment);
    _move_comment_to_bottom(comment);
}

function _do_comment_unblock_action (comment) {
    show_content(comment);
    restore_author_name(comment);
}

function _do_thread_block_action (thread) {
    change_state(this, 'hide', hide_thing); //reddit function
}

function _move_comment_to_bottom (comment) {
    $comment_table = _$get_comment_parent_table(comment);
    $(comment).detach();
    $(comment).appendTo($comment_table);
}

// --
// Set
// --

function _set_blocked_map (new_map) {
    GM_setValue("blocked_authors_map", JSON.stringify(new_map) );
}