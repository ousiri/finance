'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/api/basicData', controller.home.basicData)
  router.post('/api/titleSearch', controller.home.titleSearch)
};
