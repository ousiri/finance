'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;
  router.get('/api/basicData', controller.home.basicData)
  router.get('/api/getCompaniesFromCode', controller.home.getCompaniesFromCode)
  router.post('/api/downloadArticleList', controller.home.downloadArticleList)
};
