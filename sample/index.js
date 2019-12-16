/* eslint-disable no-unused-vars */
/**
 * @class Example
 */
const Example = class Example {};

/**
 * Example Project
 * @application example
 * @version 0.0.1
 * @description RESTful API service for example
 * @author linkang <linkang@innobuddy.com>
 */
module.exports = {
  /**
   * Example Module
   * @note note 1
   * @note note 2
   * @note note 3
   * @module example
   * @middleware {exampleMiddleware1}
   * @middleware {exampleMiddleware2}
   * @path /example
   */
  ThirdPartyConsultant: {
    /**
     * Get Example Info
     * @route {get} /info
     * @middleware {exampleMiddleware3}
     * @middleware {exampleMiddleware4}
     * @param {object} params
     * @param {Upload} params.keywords keywords for search
     * @param {Context} context
     */
    async getInfo(params, context) {},
  },
};
