
const fs = require('fs')
const qs = require('qs')
const cheerio = require('cheerio')
const XLSX = require('xlsx')
const dayjs = require('dayjs')
const Service = require('egg').Service
const { SOURCE_MAP } = require('../libs')

class AnnounceService extends Service {
  async getCompaniesFromCode(source, code) {
    const { ctx } = this

    if(source === SOURCE_MAP.HKEX) {
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
      const data = JSON.parse(res.data.trim().replace(/^callback\(|\);$/ig, ''))
      return data.stockInfo || [] // {stockId: 10227, code: "01083", name: "港華燃氣"}
    } else if(source === SOURCE_MAP.SZSE) {
      const res = await ctx.curl(`http://www.szse.cn/api/report/shortname/gethangqing?${qs.stringify({
        dataType: 'ZA||BG||CY||EB||[zzss]||[ts]',
        input: code,
      })}`, {
        dataType: 'json',
      })
      return res.data.data || [] // {"code":"002173","name":"创新医疗","pinyinString":"cxyl","pingyinall":"chuangxinyiliao","enjc":"INNOVATION MEDICAL"}
    } else if(source === SOURCE_MAP.SSE) {
      const res = await ctx.curl(`http://www.sse.com.cn/js/common/ssesuggestdata.js`, {
        dataType: 'text'
      })
      // console.log(res.data)
      const list = []
      res.data.replace(/_t\.push\(([^)]+)\)/ig, ($0, $1) => {
        try {
          list.push(eval('('+$1+')')) // hard to handle
        } catch (error) {
          console.log($0, $1)
          console.error(error)
        }
        return $0
      })
      return list.filter(item => item.val.includes(code)).map(item => ({ code: item.val, name: item.val2, val3: item.val3 }))
    } else {
      return []
    }
  }

  async getArticleList(source, code, from, to, lang='zh') {
    const { ctx } = this
    const [company] = await this.getCompaniesFromCode(source, code)
    if(!company) throw new Error('no matched company')
    if(source === SOURCE_MAP.HKEX) {
      const res = await ctx.curl(`https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=${lang}`, {
        method: 'POST',
        data: {
          lang: lang.toUpperCase(),
          category: 0,
          market: 'SEHK',
          searchType: 0,
          documentType: -1,
          t1code: -2,
          t2Gcode: -2,
          t2code: -2,
          stockId: company.stockId,
          from: from.format('YYYYMMDD'),
          to: to.format('YYYYMMDD'),
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
        list.push({
          time: $tr.find('.release-time').text().replace(lang === 'zh' ? '發放時間: ' : 'Release Time: ', '').trim(),
          category: $tr.find('.headline').text().trim(),
          title: $tr.find('.doc-link a').text().trim(),
          link: 'https://www1.hkexnews.hk' + $tr.find('.doc-link a').attr('href').trim(),
        })
      })
      return [company, list]
    } else if(source === SOURCE_MAP.SZSE){
      let list = []
      let total = 0
      let curIndex = 1
      do {
        const res = await ctx.curl(`http://www.szse.cn/api/disc/announcement/annList`, {
          method: 'POST',
          contentType: 'json',
          data: {
            "seDate": [from.format('YYYY-MM-DD'), to.format('YYYY-MM-DD')],
            "stock": [company.code],
            "channelCode": ["listedNotice_disc"],
            "pageSize": 30,
            "pageNum": curIndex
          },
          dataType: 'json',
        })
        list = list.concat(res.data.data.map(item => ({
          time: item.publishTime,
          category: '',
          title: item.title,
          link: 'http://disc.static.szse.cn/download' + item.attachPath
        })))
        total = res.data.announceCount || 0
        curIndex++
      } while(list.length < total)
      // console.log('list', list)
      return [company, list]
    } else if(source === SOURCE_MAP.SSE){
      let list = []
      let total = 0
      let curIndex = 1
      do {
        const res = await ctx.curl(`http://query.sse.com.cn/security/stock/queryCompanyBulletin.do?${qs.stringify({
          callback: 'callback',
          isPagination: 'true',
          productId: code,
          keyWord: '',
          securityType: '0101,120100,020100,020200,120200',
          reportType2: '',
          reportType: 'ALL',
          beginDate: from.format('YYYY-MM-DD'),
          endDate: to.format('YYYY-MM-DD'),
          'pageHelp.pageSize': 25,
          'pageHelp.pageCount': 50,
          'pageHelp.pageNo': curIndex,
          'pageHelp.beginPage': curIndex,
          'pageHelp.cacheSize': 1,
          'pageHelp.endPage': 2,
        })}`, {
          headers: {
            Referer: 'http://www.sse.com.cn/disclosure/listedinfo/announcement/'
          },
          dataType: 'json',
        })
        /* console.log(`http://query.sse.com.cn/security/stock/queryCompanyBulletin.do?${qs.stringify({
          callback: 'callback',
          isPagination: 'true',
          productId: code,
          keyWord: '',
          securityType: '0101,120100,020100,020200,120200',
          reportType2: '',
          reportType: 'ALL',
          beginDate: from.format('YYYY-MM-DD'),
          endDate: to.format('YYYY-MM-DD'),
          'pageHelp.pageSize': 25,
          'pageHelp.pageCount': 50,
          'pageHelp.pageNo': curIndex,
          'pageHelp.beginPage': curIndex,
          'pageHelp.cacheSize': 1,
          'pageHelp.endPage': 2,
        })}`)
        console.log(res.data) */
        total = res.data.pageHelp.total || 0
        list = list.concat(res.data.result.map(item => ({
          time: item.SSEDATE,
          category: item.BULLETIN_TYPE,
          title: item.TITLE,
          link: 'http://static.sse.com.cn' + item.URL,
        })))

        curIndex++
      } while(list.length < total)
      return [ company, list ]
    } else {
      return []
    }
  }

  async generateXLSXFile(company, from, to, articleList){
    const wb = new XLSX.utils.book_new()
    const wsData = [
      [`${company.name}[${company.code}]`],
      [`From ${from.format('DD/MM/YYYY')} to ${to.format('DD/MM/YYYY')}`],
      ...new Array(2),
      ['', '发放时间', '类型', '文件', '链接'],
      ...articleList.map(item => ([ '', item.time, item.category, item.title, item.link ]))
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    for(let i = 0; i < articleList.length; i++){
      if(articleList[i].link) {
        ws[`E${6 + i}`].l = {Target: articleList[i].link}
      }
    }

    // console.log(ws['!cols'])
    ws['!cols'] = [
      { wpx: 180 },
      { wpx: 110 },
      { wpx: 250 },
      { wpx: 350 },
      { wpx: 500 },
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Summary')
    const filename = `report-${dayjs().format('YYYYMMDDHHmmss')}.xlsx`
    XLSX.writeFile(wb, filename)
    return filename
  }
}

module.exports = AnnounceService
