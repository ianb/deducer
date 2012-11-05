$(function () {
  $('#size').change(function () {
    recalculate();
  });

  if (! $('#size').val()) {
    $('#size').val('6');
  }
  recalculate();

  $('#show-answer').click(function () {
    $('#answer').toggle();
  });

  $(document).on("click", ".ops td.chooser-cell", function () {
    ops.click(this, false);
  });
  $(document).on("dblclick", ".ops td.chooser-cell", function () {
    ops.click(this, true);
  });
  $('#make-rule').click(function () {
    puzzle.makeRule();
  });
  $('#make-solving-rules').click(function () {
    puzzle.makeSolvingRules();
  });
  $('#hint-button').click(function () {
    puzzle.hint();
  });
  $('#auto-button').click(function () {
    if (puzzle.solving()) {
      puzzle.cancelSolve();
    } else {
      puzzle.solve();
    }
  });
  $('#hint-container-close').click(function () {
    $('#hint-container').hide();
  });
  $('#size-button').click(function () {
    $('#size-field').toggle();
  });
  $(document).on("dblclick", ".rule", function () {
    $(this).hide();
  });
});

var ops;
var puzzle;
var rules;
var size;

function recalculate() {
  size = parseInt($('#size').val(), 10);
  ops = new Ops(size);
  ops.makeTable();
  var choices = [];
  for (var i=0; i<size; i++) {
    var row = [];
    choices.push(row);
    var options = [];
    for (var j=0; j<size; j++) {
      options.push(j);
    }
    for (var j=0; j<size; j++) {
      var r = random(options.length);
      row.push(options[r]);
      options.splice(r, 1);
    }
  }
  rules = [];
  puzzle = new Puzzle(size, choices);
  $('#answer').empty().append(puzzle.html());
  $('#table-container').empty().append(ops.html());
}

function random(n) {
  return Math.floor(Math.random() * n);
}

function Remove(col, tile, reason) {
  this.col = col;
  this.tile = tile;
  this.reason = reason;
}

Remove.prototype = {
  html: function (noButtons) {
    var el = $('<span />');
    el.append(text('Remove ')).append(this.tile.html()).append(text(' at row ' + (this.tile.row+1) + ' column ' + (this.col+1) + ': '));
    el.append(text(this.reason));
    if (! noButtons) {
      el.append(showButton(ops.tileTd(this.col, this.tile)));
      el.append(applyButton(this.apply.bind(this)));
    }
    return el;
  },
  apply: function (opsObj) {
    opsObj = opsObj || ops;
    opsObj.setNope(this.col, this.tile);
  }
};

function Choose(col, tile, reason) {
  this.col = col;
  this.tile = tile;
  this.reason = reason;
}

Choose.prototype = {
  html: function (noButtons) {
    var el = $('<span />');
    el.append(text('Choose ')).append(this.tile.html()).append(text(' at row ' + (this.tile.row+1) + ' column ' + (this.col+1) + ': '));
    el.append(text(this.reason));
    if (! noButtons) {
      el.append(showButton(ops.tileTd(this.col, this.tile)));
      el.append(applyButton(this.apply.bind(this)));
    }
    return el;
  },
  apply: function (opsObj) {
    opsObj = opsObj || ops;
    opsObj.setChosen(this.col, this.tile);
  }
};

function showButton(target) {
  var b = $('<button class="show-button">show</button>');
  b.click(function () {
    target.addClass('highlight');
    setTimeout(function () {
      target.removeClass('highlight');
    }, 3000);
  });
  return b;
}

function applyButton(callback) {
  var b = $('<button class="apply-button">apply</button>');
  b.click(function () {
    callback();
  });
  return b;
}

var RULES = {
  choose: function () {
    var ops = [];
    for (var i in this) {
      if (this.hasOwnProperty(i) && i != "choose") {
        ops.push(i);
      }
    }
    return RULES[ops[random(ops.length)]];
  }
};

function setRule(rule, changes) {
  changes.forEach(function (c) {
    c.rule = rule;
  });
  return changes;
}

RULES.bound = function (tiles, nots) {
  this.tiles = tiles;
  this.nots = nots;
};

RULES.bound.random = function (puzzle) {
  var cellRow1 = random(puzzle.size);
  var cellCol = random(puzzle.size);
  var cellRow2 = cellRow1;
  while (cellRow2 == cellRow1) {
    cellRow2 = random(puzzle.size);
  }
  if (cellRow2 < cellRow1) {
    var t = cellRow1;
    cellRow1 = cellRow2;
    cellRow2 = t;
  }
  var tiles = [puzzle.tile(cellCol, cellRow1), puzzle.tile(cellCol, cellRow2)];
  var nots = [];
  if (random(3) == 1) {
    var notRow = cellRow1;
    while (notRow == cellRow1 || notRow == cellRow2) {
      notRow = random(puzzle.size);
    }
    var curType = puzzle.tile(cellCol, notRow).type;
    var notType = curType;
    while (notType == curType) {
      notType = random(puzzle.size);
    }
    nots.push(Tile(notRow, notType));
  }
  return new RULES.bound(tiles, nots);
};

RULES.bound.prototype = {

  check: function (ops) {
    var changes = [];
    var tiles = this.tiles;
    var nots = this.nots;
    ops.cols(function (col) {
      var allNot = false;
      var oneChosen = false;
      tiles.forEach(function (tile) {
        if (col.nope(tile)) {
          allNot = tile;
        }
        if (col.chosen(tile)) {
          oneChosen = tile;
        }
      });
      if (allNot) {
        tiles.forEach(function (tile) {
          if (col.maybe(tile)) {
            changes.push(new Remove(col.index, tile, "Because " + allNot + " can't be here"));
          }
        });
      }
      if (oneChosen) {
        tiles.forEach(function (tile) {
          if (! col.chosen(tile)) {
            changes.push(new Choose(col.index, tile, "Because " + oneChosen + " goes here"));
          }
        });
        nots.forEach(function (tile) {
          if (col.maybe(tile)) {
            changes.push(new Remove(col.index, tile, "Because " + oneChosen + " goes here"));
          }
        });
      }
      var oneNotChosen = false;
      nots.forEach(function (tile) {
        if (col.chosen(tile)) {
          oneNotChosen = tile;
        }
      });
      if (oneNotChosen) {
        tiles.forEach(function (tile) {
          if (col.maybe(tile)) {
            changes.push(new Remove(col.index, tile, "Because " + oneNotChosen + " goes here"));
          }
        });
      }
    });
    return setRule(this, changes);
  },

  description: function () {
    var el = $('<span class="description" />');
    el.append(this.tiles[0].html());
    el.append(text(" in the same column as "));
    for (var i=1; i<this.tiles.length; i++) {
      if (i > 1) {
        el.append(text(" and "));
      }
      el.append(this.tiles[i].html());
    }
    if (this.nots.length) {
      el.append(text(" and not "));
      for (i=0; i<this.nots.length; i++) {
        if (i > 0) {
          el.append(text(" or "));
        }
        el.append(this.nots[i].html());
      }
    }
    return el;
  },

  html: function () {
    var el = $('<table class="rule bound"></table>');
    for (var i=0; i<this.tiles.length; i++) {
      var tr = $('<tr></tr>');
      var td = $('<td class="yes"></td>');
      el.append(tr);
      tr.append(td);
      td.append(this.tiles[i].html());
    }
    for (i=0; i<this.nots.length; i++) {
      tr = $('<tr></tr>');
      td = $('<td class="no"></td>');
      el.append(tr);
      tr.append(td);
      td.append(this.nots[i].html());
    }
    return el;
  },

  orientation: "vertical"

};

RULES.next = function (first, second, inverted) {
  this.first = first;
  this.second = second;
  this.inverted = inverted;
};

RULES.next.random = function (puzzle) {
  var firstCol = random(puzzle.size);
  var secondCol;
  if (firstCol == 0 || (random(2) == 1 && firstCol < puzzle.size-1)) {
    secondCol = firstCol+1;
  } else {
    secondCol = firstCol-1;
  }
  var inverted = random(4) == 1;
  var firstRow = random(puzzle.size);
  var secondRow = random(puzzle.size);
  var second = puzzle.tile(secondCol, secondRow);
  if (inverted) {
    var oppositeType = second.type;
    var oppositeCol = firstCol - (secondCol - firstCol);
    if (oppositeCol >= 0 && oppositeCol < puzzle.size) {
      oppositeType = puzzle.tile(oppositeCol, secondRow).type;
    }
    var st = second.type;
    while (st == second.type || st == oppositeType) {
      st = random(puzzle.size);
    }
    second = Tile(secondRow, st);
  }
  return new RULES.next(puzzle.tile(firstCol, firstRow), second, inverted);
};

RULES.next.prototype = {

  check: function (ops) {
    var changes = [];
    var first = this.first;
    var second = this.second;
    var inverted = this.inverted;
    ops.cols(function (col) {
      if (inverted) {
        if (col.maybe(first)) {
          if (col.dir(1).chosen(second) || col.dir(-1).chosen(second)) {
            var reason = "Because " + second;
            if (col.dir(-1).chosen(second)) {
              reason += " is on the left";
            } else {
              reason += " is on the right";
            }
            changes.push(new Remove(col.index, first, reason));
          }
        }
        if (col.maybe(second)) {
          if (col.dir(1).chosen(first) || col.dir(-1).chosen(first)) {
            var reason = "Because " + first;
            if (col.dir(-1).chosen(first)) {
              reason += " is on the left";
            } else {
              reason += " is on the right";
            }
            changes.push(new Remove(col.index, second, reason));
          }
        }
        // FIXME: check case where the only options are on both sides
      } else {
        if (col.maybe(first) && col.dir(1).nope(second) && col.dir(-1).nope(second)) {
          changes.push(new Remove(col.index, first, "Because " + second + " is not on either side"));
        }
        if (col.maybe(second) && col.dir(1).nope(first) && col.dir(-1).nope(first)) {
          changes.push(new Remove(col.index, second, "Because " + first + " is not on either side"));
        }
      }
    });
    return setRule(this, changes);
  },

  description: function () {
    var el = $('<span class="description" />');
    el.append(this.first.html());
    if (this.inverted) {
      el.append(text(" cannot be next to "));
    } else {
      el.append(text(" must be next to "));
    }
    el.append(this.second.html());
    return el;
  },

  html: function () {
    var el = $('<table class="rule next" />');
    var tr = $('<tr />');
    el.append(tr);
    var td = $('<td class="yes" />');
    td.append(this.first.html());
    tr.append(td);
    td = $('<td />');
    td.addClass(this.inverted ? 'no' : 'yes');
    td.append(this.second.html());
    tr.append(td);
    return el;
  },

  orientation: "horizontal"

};

RULES.order = function (before, after) {
  this.before = before;
  this.after = after;
};

RULES.order.random = function (puzzle) {
  var beforeIndex = random(puzzle.size-1);
  var afterIndex = beforeIndex + 1 + random(puzzle.size - beforeIndex - 1);
  var before = puzzle.tile(beforeIndex, random(puzzle.size));
  var after = puzzle.tile(afterIndex, random(puzzle.size));
  return new RULES.order(before, after);
};

RULES.order.prototype = {

  check: function (ops) {
    var changes = [];
    var before = this.before;
    var after = this.after;
    ops.cols(function (col) {
      if (col.maybe(before)) {
        if (! col.after(after)) {
          changes.push(new Remove(col.index, before, "Because there are no " + after + " after here"));
        }
      }
      if (col.maybe(after)) {
        if (! col.before(before)) {
          changes.push(new Remove(col.index, after, "Because there are no " + before + " before here"));
        }
      }
    });
    return setRule(this, changes);
  },

  description: function () {
    var el = $('<span class="description" />');
    el.append(this.before.html()).append(text(" must come before ")).append(this.after.html());
    return el;
  },

  html: function () {
    var el = $('<table class="rule order" />');
    var tr = $('<tr />');
    el.append(tr);
    var td = $('<td class="yes" />').append(this.before.html());
    tr.append(td);
    td = $('<td class="dots">...</td>');
    tr.append(td);
    td = $('<td class="yes" />').append(this.after.html());
    tr.append(td);
    return el;
  },

  orientation: "horizontal"

};


RULES.triple = function (first, second, third, gap) {
  this.first = first;
  this.second = second;
  this.third = third;
  this.gap = gap;
};

RULES.triple.random = function (puzzle) {
  var middleCol = 1+random(puzzle.size-2);
  var middle = puzzle.tile(middleCol, random(puzzle.size));
  var gap = random(4) == 1;
  if (gap) {
    // FIXME: should make sure middle isn't the same as first or third
    var mt = middle.type;
    while (mt == middle.type) {
      mt = random(puzzle.size);
    }
    middle = Tile(middle.row, mt);
  }
  var first = puzzle.tile(middleCol-1, random(puzzle.size));
  var third = puzzle.tile(middleCol+1, random(puzzle.size));
  if (random(2) == 1) {
    var t = first;
    first = third;
    third = t;
  }
  return new RULES.triple(first, middle, third, gap);
};

RULES.triple.prototype = {

  check: function (ops) {
    var changes = [];
    var first = this.first;
    var second = this.second;
    var third = this.third;
    var gap = this.gap;
    ops.cols(function (col) {
      if (col.maybe(first)) {
        if (col.dir(-2).nope(third) && col.dir(2).nope(third)) {
          changes.push(new Remove(col.index, first, "Because " + third + " is neither two to the left nor right"));
        } else {
          if (gap) {
            if ((col.dir(-2).nope(third) || col.dir(-1).chosen(second)) &&
                (col.dir(2).nope(third) || col.dir(1).chosen(second))) {
              changes.push(new Remove(col.index, first, "Because it doesn't work to the left or right"));
            }
          } else {
            if ((col.dir(-2).nope(third) || col.dir(-1).nope(second)) &&
                (col.dir(2).nope(third) || col.dir(1).nope(second))) {
              changes.push(new Remove(col.index, first, "Because it doesn't work to the left or right"));
            }
          }
        }
      }
      if (col.maybe(third)) {
        if (col.dir(-2).nope(first) && col.dir(2).nope(first)) {
          changes.push(new Remove(col.index, third, "Because " + first + " is neither two to the left nor right"));
        } else {
          if (gap) {
            if ((col.dir(-2).nope(first) || col.dir(-1).chosen(second)) &&
                (col.dir(2).nope(first) || col.dir(1).chosen(second))) {
              changes.push(new Remove(col.index, third, "Because it doesn't work to the left or to the right"));
            }
          } else {
            if ((col.dir(-2).nope(first) || col.dir(-1).nope(second)) &&
                (col.dir(2).nope(first) || col.dir(1).nope(second))) {
              changes.push(new Remove(col.index, third, "Because it doesn't work to the left or to the right"));
            }
          }
        }
      }
      if (col.maybe(second)) {
        if (gap) {
          if ((col.dir(-1).chosen(first) && col.dir(1).chosen(third)) ||
              (col.dir(1).chosen(first) && col.dir(-1).chosen(third))) {
            changes.push(new Remove(col.index, second, "Because it can't be between " + first + " and " + third));
          }
        } else {
          if ((col.dir(-1).nope(first) || col.dir(1).nope(third)) &&
              (col.dir(1).nope(first) || col.dir(-1).nope(third))) {
            changes.push(new Remove(col.index, second, "Because it doesn't have " + first + " and " + third + " on either side"));
          }
        }
      }
    });
    return setRule(this, changes);
  },

  description: function () {
    var el = $('<span class="description" />');
    el.append(this.first.html());
    if (this.gap) {
      el.append(text("-something-"));
    } else {
      el.append(text("-")).append(this.second.html()).append(text("-"));
    }
    el.append(this.third.html());
    el.append(" or ");
    el.append(this.third.html());
    if (this.gap) {
      el.append(text("-something-"));
    } else {
      el.append(text("-")).append(this.second.html()).append(text("-"));
    }
    el.append(this.first.html());
    if (this.gap) {
      el.append(" without ").append(this.second.html()).append(" between them");
    }
    return el;
  },

  html: function () {
    var el = $('<table class="rule triple" />');
    var tr = $('<tr />');
    el.append(tr);
    tr.append($('<td class="yes" />').append(this.first.html()));
    var td = $('<td />').addClass(this.gap ? "no" : "yes");
    td.append(this.second.html());
    tr.append(td);
    tr.append($('<td class="yes" />').append(this.third.html()));
    return el;
  },

  orientation: "horizontal"

};


function Tile(row, type) {
  var name = row + '.' + type;
  if (name in Tile.all) {
    return Tile.all[name];
  }
  if (this === window || ! this instanceof Tile) {
    return new Tile(row, type);
  }
  this.row = row;
  this.type = type;
  Tile.all[name] = this;
  return this;
}

Tile.all = {};

Tile.prototype = {

  _chars: [
    ["1", "2", "3", "4", "5", "6"],
    ["A", "B", "C", "D", "E", "F"],
    ["!", "@", "#", "%", "~", "*"], // instead of ~, maybe \u223c
    ["u", "v", "w", "x", "y", "z"],
    ["\u00a2", // cent
     "\u00a5", // yen
     "\u00a3", // pound
     "$",
     "\u00ae", // (R)
     "\u20ac"  // Euro
     ],
    ["+",
     "\u2208", // set containment
     "\u221e", // infinity
     "=",
     "\u2211", // sigma
     "\u2227"  // and symbol
    ]
  ],

  toString: function () {
    return this._chars[this.row][this.type];
  },

  html: function () {
    var el = $('<span class="tile"></span>');
    el.addClass("tile-row-" + this.row);
    el.addClass("tile-type-" + this.type);
    el.addClass("tile-" + this.row + "-" + this.type);
    el.text(this.toString());
    return el;
  }
};


function Puzzle(size, choices) {
  this.size = size;
  if (! _.isArray(choices)) {
    throw 'Bad choices, not an array: ' + JSON.stringify(choices);
  }
  if (choices.length != size) {
    throw 'Bad choice size: ' + choices.length;
  }
  choices.forEach(function (c) {
    if (! _.isArray(c)) {
      throw 'Bad choice row: ' + JSON.stringify(c);
    }
    if (c.length != size) {
      throw 'Bad row size: ' + c.length;
    }
    c.forEach(function (cell) {
      if (typeof cell != "number" || cell < 0 || cell >= size) {
        throw 'Bad cell: ' + JSON.stringify(cell);
      }
    });
  });
  this.choices = choices;
  this.rules = [];
};

Puzzle.prototype = {

  has: function (col, tile) {
    if (col < 0 || col >= this.size) {
      return false;
    }
    return this.choices[tile.row][col] == tile.type;
  },

  tile: function (col, row) {
    return Tile(row, this.choices[row][col]);
  },

  html: function () {
    var el = $('<table class="puzzle" />');
    for (var i=0; i<this.size; i++) {
      var tr = $('<tr />');
      el.append(tr);
      for (var j=0; j<this.size; j++) {
        var td = $('<td />');
        td.append(this.tile(j, i).html());
        tr.append(td);
      }
    }
    return el;
  },

  makeRule: function () {
    var changes = 0;
    while (! changes) {
      var RuleType = RULES.choose();
      var rule = RuleType.random(this);
      changes = rule.check(ops).length;
      if (! changes) {
        console.log('Retrying from', rule.description().text());
      }
    }
    this.addRule(rule);
  },

  addRule: function (rule) {
    var html = rule.html();
    html.attr('title', rule.description().text());
    $('#' + rule.orientation + '-rule-list').append(html);
    rule.element = html;
    this.rules.push(rule);
  },

  makeSolvingRules: function (tmpOps, rules) {
    tmpOps = tmpOps || new Ops(this.size);
    rules = rules || [];
    if (tmpOps.solved()) {
      rules.forEach(function (r) {
        this.addRule(r);
      }, this);
      $('#make-solving-rules').text('Solvable');
      return;
    }
    var changes = null;
    var count = 100;
    while ((! changes) || ! changes.length) {
      count--;
      if (count <= 0) {
        console.warn("Could not find another rule!");
        rules.forEach(function (r) {
          this.addRule(r);
        }, this);
        return;
      }
      var RuleType = RULES.choose();
      var rule = RuleType.random(this);
      changes = rule.check(tmpOps);
    }
    rules.push(rule);
    changes.forEach(function (c) {
      c.apply(tmpOps);
    });
    // Lastly run through all the rules again and apply changes
    changes = 1;
    while (changes) {
      changes = 0;
      this.singleCheck(tmpOps).forEach(function (change) {
        changes++;
        change.apply(tmpOps);
      });
      this.singleOption(tmpOps).forEach(function (change) {
        changes++;
        change.apply(tmpOps);
      });
      rules.forEach(function (r) {
        r.check(tmpOps).forEach(function (change) {
          changes++;
          change.apply(tmpOps);
        });
      });
    }
    $('#make-solving-rules').text('Solving rules... ' + rules.length);
    setTimeout((function () {
      this.makeSolvingRules(tmpOps, rules);
    }).bind(this), 0);
  },

  hint: function () {
    $("#hint").empty();
    $("#hint-container").show();
    $('.rule.highlight').removeClass('highlight');
    var possible = this.singleCheck(ops).concat(
      this.singleOption(ops));
    this.rules.forEach(function (rule) {
      possible = possible.concat(rule.check(ops));
    });
    if (possible.length) {
      var hint = possible[random(possible.length)];
      var h = hint.html();
      $('#hint').append(h);
      h.find('button.show-button').click();
      if (hint.rule) {
        hint.rule.element.addClass('highlight');
      }
    } else {
      $('#hint').append(text("No hints"));
    }
  },

  singleCheck: function (ops) {
    var changes = [];
    for (var row=0; row<this.size; row++) {
      for (var type=0; type<this.size; type++) {
        var tile = Tile(row, type);
        var count = 0;
        var lastPos = null;
        var chosen = false;
        for (var col=0; col<this.size; col++) {
          if (ops.chosen(col, tile)) {
            chosen = true;
            break;
          }
          if (ops.maybe(col, tile)) {
            count++;
            lastPos = col;
          }
        }
        if ((! chosen) && count == 1) {
          changes.push(new Choose(lastPos, tile, "Because this is the last position left"));
        }
      }
    }
    return changes;
  },

  singleOption: function (ops) {
    var changes = [];
    for (var row=0; row<this.size; row++) {
      for (var col=0; col<this.size; col++) {
        var chosen = false;
        var count = 0;
        var lastType = null;
        for (var type=0; type<this.size; type++) {
          var tile = Tile(row, type);
          if (ops.chosen(col, tile)) {
            chosen = true;
            break;
          }
          if (ops.maybe(col, tile)) {
            count++;
            lastType = type;
          }
        }
        if ((! chosen) && count == 1) {
          changes.push(new Choose(col, Tile(row, lastType), "Because this is the only option left at this position"));
        }
      }
    }
    return changes;
  },

  SOLVE_TIMEOUT: 500,

  solve: function () {
    $('#solve-field').empty().show();
    this._solveCount = 0;
    this._solveTimer = setTimeout(this._solveStep.bind(this), this.SOLVE_TIMEOUT);
  },

  solving: function () {
    return !! this._solveTimer;
  },

  cancelSolve: function () {
    clearTimeout(this._solveTimer);
    this._solveTimer = null;
    $('#solve-field').hide();
  },

  _solveStep: function () {
    $('.rule.highlight').removeClass('highlight');
    var field = $('#solve-field').empty();
    var applied = false;
    function apply(change) {
      applied = true;
      field.append(change.html(true));
      if (change.rule) {
        change.rule.element.addClass('highlight');
      }
      change.apply();
    }
    var cs = this.singleCheck(ops);
    if (cs.length) {
      apply(cs[0]);
    }
    if (! applied) {
      cs = this.singleOption(ops);
      if (cs.length) {
        apply(cs[0]);
      }
    }
    if (! applied) {
      this.rules.forEach(function (r) {
        if (applied) {
          return;
        }
        var cs = r.check(ops);
        if (cs.length) {
          apply(cs[0]);
        }
      });
    }
    if (applied) {
      this._solveTimer = setTimeout(this._solveStep.bind(this), this.SOLVE_TIMEOUT);
      this._solveCount++;
      $('#auto-button').text("Auto-solve (" + this._solveCount + ")");
    } else {
      this._solveTimer = null;
      field.append(text("Finished with all rules; " + this._solveCount + " changes made"));
    }
  }

};


function Ops(size) {
  this.size = size;
  this.choices = [];
  for (var i=0; i<size; i++) {
    var row = [];
    for (var j=0; j<size; j++) {
      var ops = [];
      for (var k=0; k<size; k++) {
        ops.push("maybe");
      }
      row.push(ops);
    }
    this.choices.push(row);
  }
  this._cols = [];
  for (i=0; i<size; i++) {
    this._cols.push(new Col(this, i));
  }
}

Ops.prototype = {

  chosen: function (col, tile) {
    return this.choices[tile.row][col][tile.type] === "chosen";
  },

  nope: function (col, tile) {
    return this.choices[tile.row][col][tile.type] === false;
  },

  maybe: function (col, tile) {
    return !!this.choices[tile.row][col][tile.type];
  },

  anyChosen: function (col, row) {
    for (var type=0; type<this.size; type++) {
      var tile = Tile(row, type);
      if (this.chosen(col, tile)) {
        return true;
      }
    }
    return false;
  },

  setNope: function (col, tile) {
    this.choices[tile.row][col][tile.type] = false;
    if (! this._table) {
      return;
    }
    var td = this.tileTd(col, tile);
    td.removeClass('maybe').removeClass('chosen');
    td.addClass('nope');
  },

  setMaybe: function (col, tile) {
    this.choices[tile.row][col][tile.type] = "maybe";
    if (! this._table) {
      return;
    }
    var td = this.tileTd(col, tile);
    td.removeClass('nope').removeClass('chosen');
    td.addClass('maybe');
  },

  setChosen: function (col, tile) {
    for (var i=0; i<this.size; i++) {
      if (i != tile.type) {
        this.setNope(col, Tile(tile.row, i));
      }
      if (i != col) {
        this.setNope(i, tile);
      }
    }
    this.choices[tile.row][col][tile.type] = 'chosen';
    if (! this._table) {
      return;
    }
    var td = this.tileTd(col, tile);
    td.removeClass('nope').removeClass('maybe');
    td.addClass('chosen');
  },

  solved: function () {
    for (var row=0; row<this.size; row++) {
      for (var col=0; col<this.size; col++) {
        var chosen = false;
        for (var type=0; type<this.size; type++) {
          if (this.choices[row][col][type] === "chosen") {
            chosen = true;
            break;
          }
        }
        if (! chosen) {
          return false;
        }
      }
    }
    return true;
  },

  cols: function (callback, context) {
    context = context || this;
    for (var i=0; i<this.size; i++) {
      callback.call(context, this.col(i), i);
    }
  },

  col: function (index) {
    if (index < 0 || index >= this.size) {
      return NullCol;
    }
    return this._cols[index];
  },

  _chooseTemplates: {
    4: '<table><tr><td class="c1"></td><td class="c2"></td></tr><tr><td class="c3"></td><td class="c4"></td></tr></table>',
    5: '<table><tr><td class="c1"></td><td class="c2"></td><td class="c3"></td></tr><tr><td class="c4"></td><td class="c5"></td></tr></table>',
    6: '<table><tr><td class="c1"></td><td class="c2"></td><td class="c3"></td></tr><tr><td class="c4"></td><td class="c5"></td><td class="c6"></td></tr></table>'
  },

  makeTable: function () {
    var el = $('<table class="ops" />');
    for (var row=0; row<this.size; row++) {
      var tr = $('<tr />');
      el.append(tr);
      for (var col=0; col<this.size; col++) {
        var td = $('<td />');
        td.attr('id', 'col-' + col + '-' + row);
        tr.append(td);
        var c = $(this._chooseTemplates[this.size]);
        c.addClass('chooser');
        for (var type=0; type<this.size; type++) {
          var cell = c.find(".c" + (type+1));
          cell.addClass('chooser-cell');
          cell.append(Tile(row, type).html());
          cell.attr('data-row', row);
          cell.attr('data-col', col);
          cell.attr('data-type', type);
        }
        td.append(c);
      }
    }
    this._table = el;
  },

  html: function () {
    return this._table;
  },

  _td: function (col, row) {
    var name = '#col-' + col + '-' + row;
    return $(name);
  },

  _chooseTd: function (col, row, type) {
    var td = this._td(col, row);
    var sub = td.find('.c' + (type+1));
    return sub;
  },

  tileTd: function (col, tile) {
    return this._chooseTd(col, tile.row, tile.type);
  },

  click: function (el, double) {
    el = $(el);
    if (! el.hasClass('chooser-cell')) {
      return;
    }
    var row = parseInt(el.attr('data-row'), 10);
    var col = parseInt(el.attr('data-col'), 10);
    var type = parseInt(el.attr('data-type'), 10);
    var tile = Tile(row, type);
    if (double) {
      if (this.chosen(col, tile)) {
        this.setMaybe(col, tile);
      } else {
        this.setChosen(col, tile);
      }
    } else {
      if (this.chosen(col, tile) || this.anyChosen(col, tile.row)) {
        // Do nothing
      } else if (this.maybe(col, tile)) {
        this.setNope(col, tile);
      } else {
        this.setMaybe(col, tile);
      }
    }
  }

};

function Col(ops, index) {
  this.ops = ops;
  this.index = index;
}

Col.prototype = {

  chosen: function (tile) {
    return this.ops.chosen(this.index, tile);
  },

  nope: function (tile) {
    return this.ops.nope(this.index, tile);
  },

  maybe: function (tile) {
    return this.ops.maybe(this.index, tile);
  },

  dir: function (c) {
    return this.ops.col(this.index + c);
  },

  after: function (tile) {
    for (var i=this.index+1; i<this.ops.size; i++) {
      if (this.ops.maybe(i, tile)) {
        return true;
      }
    }
    return false;
  },

  before: function (tile) {
    for (var i=this.index-1; i>=0; i--) {
      if (this.ops.maybe(i, tile)) {
        return true;
      }
    }
    return false;
  }

};

var NullCol = {

  chosen: function (tile) {
    return false;
  },

  nope: function (tile) {
    return true;
  },

  maybe: function (tile) {
    return false;
  }

};

function text(s) {
  return document.createTextNode(s);
}
