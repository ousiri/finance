'use strict';

const Controller = require('egg').Controller
const fs = require('fs')
const dayjs = require('dayjs')

const { SOURCES, LANGS } = require('../libs')

// source: hkex, szse, sse

class HomeController extends Controller {

  async basicData(){
    this.ctx.body = {
      SOURCES,
      LANGS,
    }
  }

  async getCompaniesFromCode(){
    const { ctx, service } = this
    const { query } = ctx
    if(!query.source) throw new Error('no source')
    if(!query.code) return []
    ctx.body = await service.announce.getCompaniesFromCode(query.source, query.code)
  }

  async downloadArticleList(){
    const { ctx, service } = this
    let { source, code, from, to = dayjs(), lang='zh' } = ctx.request.body


    if(!code.trim()) throw new Error('no query "code"')
    to = dayjs(to)
    if(!from){
      from = dayjs().set('month', 0).set('date', 1)
    }else{
      from = dayjs(from)
    }

    const [company, list] = await service.announce.getArticleList(source, code, from, to, lang)

    const filename = await service.announce.generateXLSXFile(company, from, to, list)

    ctx.attachment(filename)
    ctx.body = fs.createReadStream(filename)
  }
}

module.exports = HomeController;
