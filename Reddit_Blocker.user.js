// ==UserScript==
// @name        Reddit Blocker
// @include     /^https?://([A-Za-z]{1,3}\.)?reddit(js)?\.com/r/.*$/
// @namespace   reddit_block
// @version     4
// @grant       GM.getValue
// @grant       GM.setValue
// @require     https://code.jquery.com/jquery-3.2.1.min.js
// ==/UserScript==

// --
// CLASS
// --

var TogglableUserState = function ( statename, actionname, recoveryactionname,
                                    comment_action, comment_recovery_action ) 
{
    this.statename          = statename;
    this.actionname         = actionname;
    this.recoveryactionname = recoveryactionname;
    
    this.buttonclassname    = "" + this.actionname + "-button";
    this.buttonhtml
        = make_button_html(this.actionname, this.buttonclassname);
    this.recoverybuttonhtml
        = make_button_html(this.recoveryactionname, this.buttonclassname);

    this.comment_action          = comment_action;
    this.comment_recovery_action = comment_recovery_action;
};

TogglableUserState.prototype.init = async function ( statename ) {
    this.mapname         = "" + this.statename + "_authors_map";
    this.user_is_toggled = await _get_map(this.mapname);
}

TogglableUserState.prototype.toggle_action = async function (author) {
    var newmap = await _add_author_to_map(author, this.mapname);
    this.user_is_toggled = newmap;
};

TogglableUserState.prototype.untoggle_action = async function (author) {
    var newmap = await _remove_author_from_map(author, this.mapname);
    this.user_is_toggled = newmap;
};

TogglableUserState.prototype.state_dependant_comment_action 
= function (comment) {
    var author = get_author(comment);
    if (this.user_is_toggled[author]) { this.comment_action(comment); }
};

TogglableUserState.prototype.swap_button_type = function (comment, prev_toggled) {
    var $old_button
        = _$get_button_of_type_from_comment(this.buttonclassname, comment);
    var author = get_author(comment);

    var $new_button
        = prev_toggled ? $(this.recoverybuttonhtml) : $(this.buttonhtml);

    $new_button.click(
        this.button_onclick(author, $new_button, !prev_toggled)
    );

    $old_button.replaceWith($new_button);
};

TogglableUserState.prototype.button_onclick = function ( author, toggled ) {
    var userstate = this;
    return function () {
        if (toggled) { userstate.toggle_action(author);   }
        else         { userstate.untoggle_action(author); }
        
        $("div.comment").each( function (index) {
            var comment_author = get_author(this);
            if (comment_author === author) {
                if (toggled) { userstate.comment_action(this);          }
                else         { userstate.comment_recovery_action(this); }
                
                userstate.swap_button_type(this, toggled);
            }
        });
    };
};

TogglableUserState.prototype.create_button = function (author) {
    var toggled = this.user_is_toggled[author];
    var $button;
    if (toggled) { $button = $(this.recoverybuttonhtml); }
    else         { $button = $(this.buttonhtml);          }

    $button.click( this.button_onclick(author, !toggled) );

    return $button;
};



// -- instances

// -- block

async function _create_blocked_state () {
    var statename = "blocked";
    var NewState
        = new TogglableUserState(
        statename, "block", "unblock",
        _do_comment_block_action,
        _do_comment_unblock_action
    );
    await NewState.init(statename);
    return NewState;
}

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

//
// -- END CLASS
//

//
// -- Utility Functions --
//

function make_button_html (buttontext, buttonclass) {
    return "<li class='" + buttonclass + "'>"
         + "<a href='javascript:void(0)'>"
         + buttontext
         + "</a></li>";
}

// --
// Do
// --

/*
function _do_thread_block_action (thread) {
    change_state(this, 'hide', hide_thing); //reddit function
}
*/

function _move_comment_to_bottom (comment) {
    $comment_table = _$get_comment_parent_table(comment);
    $(comment).detach();
    $(comment).appendTo($comment_table);
}

function _move_comment_to_top (comment) {
    $comment_table = _$get_comment_parent_table(comment);
    $(comment).detach();
    $(comment).prependTo($comment_table);
}

function hide_content (comment) {
    _$get_comment_content(comment).hide();
}

function show_content (comment) {
    _$get_comment_content(comment).show();
}

/*
function collapse (comment) {
    $(comment).addClass("collapsed");
    $(comment).addClass("collapsed-for-reason");
    $(comment).find("div.entry span.userattrs").first().after(
        "<span class='collapsed-reason'>\n"
        +    "author quality below threshold"
        + "</span>"
    );
}
*/

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

// --
// Set
// --

function _set_map (mapname, new_map) {
    GM.setValue(mapname, JSON.stringify(new_map) );
}

async function _add_author_to_map (author, mapname) {
    var newmap = await _get_map(mapname);
    newmap[author] = true;
    _set_map(mapname, newmap);
    return newmap;
}

async function _remove_author_from_map (author, mapname) {
    var newmap = await _get_map(mapname);
    delete newmap[author];
    _set_map(mapname, newmap);
    return newmap;
}

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

// buttontype is a string
function _$get_button_of_type_from_comment (buttontype, comment) {
    var $button_list = $(comment).find("div.entry ul.buttons").first();
    return $button_list.children( "li." + buttontype ).first();
}

function _$get_comment_content (comment) {
    return $(comment).find("div.entry div.md").first().children();
}

function _$get_comment_parent_table (comment) {
    return $(comment).parent();
}

// Returns the promise of a map
// to allow for asynchronous structure
async function _get_map (mapname) {
    var map = JSON.parse(await GM.getValue(mapname, "{}"));
    if (!map) {
      //JSON.parse() should never return any value that type-casts to false, assume there is an 
      //   error in the input string
      var error_message
        = 'Error! JSON.parse failed - '
        + 'The stored value for "foo" is likely to be corrupted.';
      console.warn(error_message);
      throw error_message;
    }
    else {
        return map;
    }
}

//
// -- END Utility Functions --
//

//
// --- run on page load ---
//

this.$ = this.jQuery = jQuery.noConflict(true);
_execute_reddit_blocker();


// --- subroutines ---

async function _execute_reddit_blocker () {
    var blockedstate = await _create_blocked_state();

    $("div.comment").each( function (index) {
        insert_new_buttons(this, blockedstate);
        blockedstate.state_dependant_comment_action(this);
    });
}

function insert_new_buttons (comment, blockedstate) {
    var $button_list = $(comment).find("div.entry ul.buttons").first();
    var author = get_author(comment);

    var $block_button = blockedstate.create_button(author);
    $button_list.append($block_button);
}
