/* 'use strict'; */

var MYTIMEOUT = 12000;

var DEFAULT_SIZE = 5000000; // max to avoid popup in safari/ios

// FUTURE TODO replace in test(s):
function ok(test, desc) { expect(test).toBe(true); }
function equal(a, b, desc) { expect(a).toEqual(b); } // '=='
function strictEqual(a, b, desc) { expect(a).toBe(b); } // '==='

// XXX TODO REFACTOR OUT OF OLD TESTS:
var wait = 0;
var test_it_done = null;
function xtest_it(desc, fun) { xit(desc, fun); }
function test_it(desc, fun) {
  wait = 0;
  it(desc, function(done) {
    test_it_done = done;
    fun();
  }, MYTIMEOUT);
}
function stop(n) {
  if (!!n) wait += n
  else ++wait;
}
function start(n) {
  if (!!n) wait -= n;
  else --wait;
  if (wait == 0) test_it_done();
}

var isWP8 = /IEMobile/.test(navigator.userAgent); // Matches WP(7/8/8.1)
var isWindows = /Windows /.test(navigator.userAgent); // Windows (8.1)
var isAndroid = !isWindows && /Android/.test(navigator.userAgent);
var isMac = /Macintosh/.test(navigator.userAgent);
var isWKWebView = !isWindows && !isAndroid && !isWP8 && !isMac && !!window.webkit && !!window.webkit.messageHandlers;

// NOTE: While in certain version branches there is no difference between
// the default Android implementation and implementation #2,
// this test script will also apply the androidLockWorkaround: 1 option
// in case of implementation #2.
var scenarioList = [
  isAndroid ? 'Plugin-implementation-default' : 'Plugin',
  'HTML5',
  'Plugin-implementation-2'
];

var scenarioCount = (!!window.hasWebKitBrowser) ? (isAndroid ? 3 : 2) : 1;

var mytests = function() {

  for (var i=0; i<scenarioCount; ++i) {

    describe(scenarioList[i] + ': tx value bindings test(s)', function() {
      var scenarioName = scenarioList[i];
      var suiteName = scenarioName + ': ';
      var isWebSql = (i === 1);
      var isImpl2 = (i === 2);

      // NOTE: MUST be defined in function scope, NOT outer scope:
      var openDatabase = function(name, ignored1, ignored2, ignored3) {
        if (isImpl2) {
          return window.sqlitePlugin.openDatabase({
            // prevent reuse of database from default db implementation:
            name: 'i2-'+name,
            // explicit database location:
            location: 'default',
            androidDatabaseImplementation: 2,
            androidLockWorkaround: 1
          });
        }
        if (isWebSql) {
          return window.openDatabase(name, '1.0', 'Test', DEFAULT_SIZE);
        } else {
          return window.sqlitePlugin.openDatabase({name: name, location: 'default'});
        }
      }

      describe(suiteName + 'transaction column value bindings semantics test(s)', function() {

        it(suiteName + "all columns should be included in result set (including 'null' columns)", function(done) {

          var db = openDatabase('all-result-columns-including-null-columns.db', '1.0', 'Demo', DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text, data_num integer)');

          }, function(err) {
            expect(false).toBe(true);
            expect(err.message).toBe('---');

          }, function() {
            db.transaction(function(tx) {
              tx.executeSql("insert into test_table (data, data_num) VALUES (?,?)", ["test", null], function(tx, res) {

                expect(res).toBeDefined();
                expect(res.rowsAffected).toEqual(1);

                tx.executeSql("select * from test_table", [], function(tx, res) {
                  var row = res.rows.item(0);

                  //deepEqual(row, { id: 1, data: "test", data_num: null }, "all columns should be included in result set.");
                  expect(row.id).toBe(1);
                  expect(row.data).toEqual('test');
                  expect(row.data_num).toBeDefined();
                  expect(row.data_num).toBeNull();

                  done();
                });
              });
            });
          });
        });

      });

      describe(scenarioList[i] + ': tx column value insertion test(s)', function() {

        it(suiteName + "number values inserted using number bindings", function(done) {

          var db = openDatabase("Value-binding-test.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data_text1, data_text2, data_int, data_real)');
          }, function(err) {
            expect(false).toBe(true);
            expect(err.message).toBe('---');

          }, function() {
            db.transaction(function(tx) {

              // create columns with no type affinity
              tx.executeSql("insert into test_table (data_text1, data_text2, data_int, data_real) VALUES (?,?,?,?)", ["314159", "3.14159", 314159, 3.14159], function(tx, res) {

                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);

                tx.executeSql("select * from test_table", [], function(tx, res) {
                  var row = res.rows.item(0);

                  expect(row.data_text1).toBe("314159"); // (data_text1 should have inserted data as text)

                  if (!isWP8) // JSON issue in WP(8) version
                    expect(row.data_text2).toBe("3.14159"); // (data_text2 should have inserted data as text)

                  expect(row.data_int).toBe(314159); // (data_int should have inserted data as an integer)
                  expect(Math.abs(row.data_real - 3.14159) < 0.000001).toBe(true); // (data_real should have inserted data as a real)

                  done();
                });
              });
            });
          });
        });

        it(suiteName + "Big [integer] value bindings", function(done) {
          if (isWP8) pending('BROKEN on WP(8)'); // XXX [BUG #195]

          var db = openDatabase("Big-int-bindings.db", "1.0", "Demo", DEFAULT_SIZE);
          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (test_date INTEGER, test_text TEXT)');
          }, function(err) {
            expect(false).toBe(true);
            expect(err.message).toBe('---');

          }, function() {
            db.transaction(function(tx) {
              tx.executeSql("insert into tt (test_date, test_text) VALUES (?,?)",
                  [1424174959894, 1424174959894], function(tx, res) {
                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);
                tx.executeSql("select * from tt", [], function(tx, res) {
                  // (Big integer number inserted properly)
                  var row = res.rows.item(0);
                  expect(row.test_date).toBe(1424174959894);

                  // NOTE: big number stored in field with TEXT affinity with different conversion
                  // in case of plugin (certain platforms) vs. Android/iOS WebKit Web SQL
                  if (isWebSql || isMac || isWKWebView)
                    expect(row.test_text).toBe("1424174959894.0"); // ([Big] number inserted as string ok)
                  else
                    expect(row.test_text).toBe("1424174959894"); // (Big integer number inserted as string ok)

                  done();
                });
              });
            });
          });
        });

        it(suiteName + "Double precision decimal number insertion", function(done) {
          var db = openDatabase("Double-precision-number-insertion.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS tt');
            tx.executeSql('CREATE TABLE IF NOT EXISTS tt (tr REAL)');
          }, function(err) {
            expect(false).toBe(true);
            expect(err.message).toBe('---');

          }, function() {
            db.transaction(function(tx) {
              tx.executeSql("insert into tt (tr) VALUES (?)", [123456.789], function(tx, res) {
                expect(res).toBeDefined();
                expect(res.rowsAffected).toBe(1);

                tx.executeSql("select * from tt", [], function(tx, res) {
                  var row = res.rows.item(0);
                  expect(row.tr).toBe(123456.789); // (Decimal number inserted properly)

                  done();
                });
              });
            });
          });
        });

        it(suiteName + "executeSql parameter as array", function(done) {
          var db = openDatabase("array-parameter.db", "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function(tx) {
            tx.executeSql('DROP TABLE IF EXISTS test_table');
            tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data1, data2)');
          }, function(err) {
            expect(false).toBe(true);
            expect(err.message).toBe('---');

          }, function() {
            db.transaction(function(tx) {
              // create columns with no type affinity
              tx.executeSql("insert into test_table (data1, data2) VALUES (?,?)", ['abc', [1,2,3]], function(tx, res) {
                expect(res).toBeDefined();
                //if (!isWindows) // XXX TODO
                  expect(res.rowsAffected).toBe(1);
                tx.executeSql("select * from test_table", [], function(tx, res) {
                  var row = res.rows.item(0);
                  strictEqual(row.data1, 'abc', "data1: string");
                  strictEqual(row.data2, '1,2,3', "data2: array should have been inserted as text (string)");

                  done();
                });
              });
            });
          });
        });

        // FUTURE TODO: fix these tests to follow the Jasmine style:

        test_it(suiteName + ' stores [Unicode] string with \\u0000 correctly', function () {
          if (isWP8) pending('BROKEN on WP(8)'); // [BUG #202] UNICODE characters not working with WP(8)
          if (isWindows) pending('BROKEN on Windows'); // TBD (truncates on Windows)
          if (!isWebSql && !isWindows && isAndroid && !isImpl2) pending('BROKEN on Android-sqlite-connector implementation)');

          stop();

          var dbName = "Database-Unicode";
          var db = openDatabase(dbName, "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function (tx) {
            tx.executeSql('DROP TABLE IF EXISTS test', [], function () {
              tx.executeSql('CREATE TABLE test (name, id)', [], function() {
                tx.executeSql('INSERT INTO test VALUES (?, "id1")', ['\u0000foo'], function () {
                  tx.executeSql('SELECT hex(name) AS `hex` FROM test', [], function (tx, res) {
                    // select hex() because even the native database doesn't
                    // give the full string. it's a bug in WebKit apparently
                    var hex = res.rows.item(0).hex;

                    // varies between Chrome-like (UTF-8)
                    // and Safari-like (UTF-16)
                    var expected = [
                      '000066006F006F00',
                      '00666F6F'
                    ];
                    ok(expected.indexOf(hex) !== -1, 'hex matches: ' +
                        JSON.stringify(hex) + ' should be in ' +
                        JSON.stringify(expected));

                    // ensure this matches our expectation of that database's
                    // default encoding
                    tx.executeSql('SELECT hex("foob") AS `hex`', [], function (tx, res) {
                      var otherHex = res.rows.item(0).hex;
                      equal(hex.length, otherHex.length,
                          'expect same length, i.e. same global db encoding');

                      checkCorrectOrdering(tx);
                    });
                  })
                });
              });
            });
          }, function(err) {
            ok(false, 'unexpected error: ' + err.message);
          }, function () {
          });
        });

        function checkCorrectOrdering(tx) {
          var least = "54key3\u0000\u0000";
          var most = "54key3\u00006\u0000\u0000";
          var key1 = "54key3\u00004bar\u000031\u0000\u0000";
          var key2 = "54key3\u00004foo\u000031\u0000\u0000";

          tx.executeSql('INSERT INTO test VALUES (?, "id2")', [key1], function () {
            tx.executeSql('INSERT INTO test VALUES (?, "id3")', [key2], function () {
              var sql = 'SELECT id FROM test WHERE name > ? AND name < ? ORDER BY name';
              tx.executeSql(sql, [least, most], function (tx, res) {
                equal(res.rows.length, 2, 'should get two results');
                equal(res.rows.item(0).id, 'id2', 'correct ordering');
                equal(res.rows.item(1).id, 'id3', 'correct ordering');

                start();
              });
            });
          });
        }

        test_it(suiteName + ' returns [Unicode] string with \\u0000 correctly', function () {
          if (isWindows) pending('BROKEN on Windows'); // XXX
          if (isWP8) pending('BROKEN on WP(8)'); // [BUG #202] UNICODE characters not working with WP(8)

          stop();

          var dbName = "Database-Unicode";
          var db = openDatabase(dbName, "1.0", "Demo", DEFAULT_SIZE);

          db.transaction(function (tx) {
            tx.executeSql('DROP TABLE IF EXISTS test', [], function () {
              tx.executeSql('CREATE TABLE test (name, id)', [], function() {
                tx.executeSql('INSERT INTO test VALUES (?, "id1")', ['\u0000foo'], function () {
                  tx.executeSql('SELECT name FROM test', [], function (tx, res) {
                    var name = res.rows.item(0).name;

                    var expected = [
                      '\u0000foo'
                    ];

                    // There is a bug in WebKit and Chromium where strings are created
                    // using methods that rely on '\0' for termination instead of
                    // the specified byte length.
                    //
                    // https://bugs.webkit.org/show_bug.cgi?id=137637
                    //
                    // For now we expect this test to fail there, but when it is fixed
                    // we would like to know, so the test is coded to fail if it starts
                    // working there.
                    if(isWebSql) {
                        ok(expected.indexOf(name) === -1, 'field value: ' +
                            JSON.stringify(name) + ' should not be in this until a bug is fixed ' +
                            JSON.stringify(expected));

                        equal(name.length, 0, 'length of field === 0'); 
                        start();
                        return;
                    }

                    // correct result:
                    ok(expected.indexOf(name) !== -1, 'field value: ' +
                        JSON.stringify(name) + ' should be in ' +
                        JSON.stringify(expected));

                    equal(name.length, 4, 'length of field === 4');
                    start();
                  })
                });
              });
            });
          }, function(err) {
            ok(false, 'unexpected error: ' + err.message);
          }, function () {
          });
        });


        // Issue on Android [WORKAROUND for iOS/macOS in this version branch]
        // For reference:
        // - litehelpers/Cordova-sqlite-storage#147
        // - cordova/cordova-discuss#57 (issue with cordova-android)
        test_it(suiteName +
            ' handles UNICODE \\u2028 line separator correctly [in database]', function () {
          if (isWP8) pending('BROKEN on WP(8)'); // [BUG #202] UNICODE characters not working with WP(8)
          if (!isWebSql && !isWindows && isAndroid) pending('SKIP for Android plugin (cordova-android 6.x BUG: cordova/cordova-discuss#57)');

          var dbName = "Unicode-line-separator.db";
          var db = openDatabase(dbName, "1.0", "Demo", DEFAULT_SIZE);

          stop(2);

          db.transaction(function (tx) {
            tx.executeSql('DROP TABLE IF EXISTS test', [], function () {
              tx.executeSql('CREATE TABLE test (name, id)', [], function() {
                tx.executeSql('INSERT INTO test VALUES (?, "id1")', ['hello\u2028world'], function () {
                  tx.executeSql('SELECT name FROM test', [], function (tx, res) {
                    var name = res.rows.item(0).name;

                    var expected = [
                      'hello\u2028world'
                    ];

                    ok(expected.indexOf(name) !== -1, 'field value: ' +
                       JSON.stringify(name) + ' should be in ' +
                       JSON.stringify(expected));

                    equal(name.length, 11, 'length of field should be 15');
                    start();
                  })
                });
              });
            });
          }, function(err) {
            ok(false, 'unexpected error: ' + err.message);
            start(2);
          }, function () {
            ok(true, 'transaction ok');
            start();
          });
        });

      });

    });
  }

}

if (window.hasBrowser) mytests();
else exports.defineAutoTests = mytests;

/* vim: set expandtab : */
