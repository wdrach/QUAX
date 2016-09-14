module.exports = function(app) {
  app.service('Modal', function($rootScope) {
      var Modal = {};

      Modal.create = function(data, promise) {
        $rootScope.$emit('m.create', data);
        $rootScope.$on('m.accepted', function(){
          promise.resolve();
        });
        $rootScope.$on('m.rejected', function(){
          promise.reject();
        });
      };

      return Modal;
  });
};
