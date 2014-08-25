describe('ReportsCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      message,
      UserDistrict,
      GenerateSearchQuery,
      MarkRead,
      Search,
      db,
      changesCallback;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    scope.filterModel = { date: {} };
    scope.selected = { _id: 'a' };
    message = { _id: 'x' };
    scope.readStatus = {
      forms: { total: 0, read: 0 },
      messages: { total: 0, read: 0 }
    };
    scope.updateReadStatus = function() {};
    scope.isRead = function() {
      return true;
    };
    scope.setSelected = function(obj) {
      scope.selected = obj;
    };
    scope.messages = [ message, { _id: 'a' } ];

    UserDistrict = function() {
      return { 
        then: function() {}
      };
    };

    MarkRead = function() {};

    GenerateSearchQuery = function() {
      return 'somequery';
    };

    Search = function(options, callback) {
      callback(null, { });
    };

    db = { 
      changes: function(options, callback) {
        changesCallback = callback;
      }
    };

    changesCallback = undefined;

    createController = function() {
      return $controller('ReportsCtrl', {
        '$scope': scope,
        '$route': { current: { params: { doc: 'x' } } },
        'UserDistrict': UserDistrict,
        'db': db,
        'MarkRead': MarkRead,
        'GenerateSearchQuery': GenerateSearchQuery,
        'Search': Search,
        'Verified': {},
        'DeleteMessage': {},
        'UpdateFacility': {}
      });
    };
  }));

  it('set up controller', function() {
    createController();
    chai.expect(scope.filterModel.type).to.equal('reports');
    chai.expect(scope.selected).to.equal(message);
  });

  it('updated messages when changed', function() {

    var changedObjects = [ { id: 'a' }, { id: 'b' } ];
    var query = 'myquery';

    scope.messages = [
      {
        _id: 'a',
        _rev: 1,
        shared: 'x',
        existing: 'y'
      }
    ];

    GenerateSearchQuery = function(scope, options) {
      chai.expect(options.changes).to.deep.equal(changedObjects);
      return query;
    };

    Search = function(options, callback) {
      chai.expect(options.query).to.equal(query);
      callback(null, { results: [ 
        { 
          _id: 'a',
          _rev: 2,
          shared: 'z',
          unique: 'w'
        },
        { 
          _id: 'b'
        }
      ] });
    };
    
    createController();
    changesCallback(null, { results: changedObjects });
    chai.expect(scope.messages).to.deep.equal([
      { 
        _id: 'a',
        _rev: 2,
        shared: 'z',
        unique: 'w',
        existing: 'y'
      },
      { 
        _id: 'b'
      }
    ]);
  });

  it('updated messages when all deleted', function() {

    var changedObjects = [
      { id: 'a', deleted: true },
      { id: 'b', deleted: true }
    ];

    scope.messages = [
      { _id: 'a' },
      { _id: 'c' }
    ];

    GenerateSearchQuery = function(scope, options) {
      chai.expect(options.changes).to.deep.equal(changedObjects);
      return 'myquery';
    };

    createController();
    changesCallback(null, { results: changedObjects });
    chai.expect(scope.messages).to.deep.equal([
      { _id: 'c' }
    ]);
  });

  it('updated messages when some deleted', function() {

    scope.selected = { _id: 'c' };

    var changedObjects = [
      { id: 'a', deleted: true },
      { id: 'b' }
    ];

    scope.messages = [
      { _id: 'a' },
      { _id: 'c' }
    ];

    GenerateSearchQuery = function(scope, options) {
      chai.expect(options.changes).to.deep.equal([{ id: 'b' }]);
      return 'myquery';
    };

    Search = function(options, callback) {
      callback(null, { results: [
        { _id: 'b' }
      ] });
    };

    createController();
    changesCallback(null, { results: changedObjects });
    chai.expect(scope.messages).to.deep.equal([
      { _id: 'c' },
      { _id: 'b' }
    ]);
  });

});