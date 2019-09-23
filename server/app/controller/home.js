'use strict';

const Controller = require('egg').Controller
const cheerio = require('cheerio')
const XLSX = require('xlsx')
const fs = require('fs')
const dayjs = require('dayjs')
const qs = require('qs')

class HomeController extends Controller {

  async basicData(){
    this.ctx.body = {}
  }

  async titleSearch(){
    const { ctx } = this
    let { code, from, to = dayjs().format('YYYYMMDD') } = ctx.request.body

    if(!code.trim()) throw new Error('no query "code"')

    if(!from){
      from = dayjs().set('month', 0).set('date', 1).format('YYYYMMDD')
    }

    const [company] = await this.getCompaniesFromCode(code.trim())
    console.log('company', company)

    if(!company) throw new Error('no matched company')

    const articleList = await this.getArticleList(company.stockId, from, to)
    console.log('articleList', articleList)

    const wb = new XLSX.utils.book_new()
    const wsData = [[company.name], ...new Array(3), ['', '发放时间', '类型', '文件', '链接'], ...articleList]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    for(let i = 0; i < articleList.length; i++){
      ws[`E${6+i}`].l = { Target: articleList[i][4] }
    }

    // console.log(ws['!cols'])
    ws['!cols'] = [
      { wpx: 70 },
      { wpx: 110 },
      { wpx: 250 },
      { wpx: 350 },
      { wpx: 500 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, '报表')
    const filename = `report-${dayjs().format('YYYYMMDDHHmmss')}.xlsx`
    XLSX.writeFile(wb, filename)
    ctx.attachment(filename)
    ctx.body = fs.createReadStream(filename)
  }

  async getCompaniesFromCode(code){
    const { ctx } = this
    const res = await ctx.curl(`https://www1.hkexnews.hk/search/prefix.do?${qs.stringify({
      lang: 'ZH',
      type: 'A',
      name: code,
      market: 'SEHK',
      callback: 'callback'
    })}`, {
      dataType: 'text',
      timeout: 60 * 1000,
    })
    // console.log(res)
    const data = JSON.parse(res.data.trim().replace(/^callback\(|\);$/ig, ''))
    // console.log(data)
    return data.stockInfo || []
  }

  async getArticleList(stockId, from, to){
    const { ctx } = this
    const res = await ctx.curl(`https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=zh`, {
      method: 'POST',
      data: {
        lang: 'ZH',
        category: 0,
        market: 'SEHK',
        searchType: 0,
        documentType: -1,
        t1code: -2,
        t2Gcode: -2,
        t2code: -2,
        stockId: stockId,
        from,
        to,
        'MB-Daterange': 0,
        title: '',
      },
      dataType: 'text',
      timeout: 60 * 1000,
    })
    const html = res.data
    const $ = cheerio.load(html)
    const $table = $('.table.sticky-header-table.table-scroll.table-mobile-list')
    const $trs = $table.find('tbody tr')
    const list = []
    $trs.each((i, tr) => {
      const $tr = $(tr)
      list.push([
        '',
        $tr.find('.release-time').text().replace('發放時間: ', '').trim(),
        // stockShortCode: $tr.find('.stock-short-code').text().replace('股份代號: ', '').trim(),
        // stockShortName: $tr.find('.stock-short-name').text().replace('股份簡稱: ', '').trim(),
        $tr.find('.headline').text().trim(),
        $tr.find('.doc-link a').text().trim(),
        'https://www1.hkexnews.hk' + $tr.find('.doc-link a').attr('href').trim()
      ])
    })
    return list
  }
}

module.exports = HomeController;
