
const SOURCE_MAP = {
  HKEX: 'hkex',
  SZSE: 'szse',
  SSE: 'sse',
}

const SOURCES = [
  { value: SOURCE_MAP.HKEX, text: '香港' },
  { value: SOURCE_MAP.SZSE, text: '深圳' },
  { value: SOURCE_MAP.SSE, text: '上海' }
]

const LANGS = [
  { value: 'zh', text: '中文' },
  { value: 'en', text: '英语' },
]


module.exports = {
  SOURCE_MAP,
  SOURCES,
  LANGS,
}
