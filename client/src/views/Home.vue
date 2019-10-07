<template>
  <el-form ref="form" :model="form" :rules="rules" label-width="120px">
    <el-form-item label="来源" prop="source">
      <el-radio-group v-model="form.source">
        <el-radio v-for="source of sources" :key="source.value" :label="source.value">
          {{source.text}}
        </el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="代码" prop="code" placeholder="代码">
      <el-autocomplete
        v-model.trim="form.code"
        :debounce="500"
        :maxlength="6"
        value-key="code"
        :fetch-suggestions="getCompaniesFromCode"
      >
        <span slot-scope="scope">{{scope.item.name}}({{scope.item.code}})</span>
      </el-autocomplete>
    </el-form-item>
    <el-form-item label="时间范围" prop="date">
      <el-date-picker
        v-model="form.range"
        type="daterange"
        range-separator="to"
        start-placeholder="from"
        end-placeholder="to"
        :picker-options="pickerOptions"
      />
    </el-form-item>
    <el-form-item>
      <el-button :loading="loading" type="primary" @click="submit">生成</el-button>
    </el-form-item>
  </el-form>
</template>

<script>

import * as Cookie from 'js-cookie'
import * as dayjs from 'dayjs'

export default {
  data(){
    const to = dayjs().toDate()
    let from = dayjs().set('month', 0).set('date', 1).toDate()
    return {
      valid: true,
      sources: [],
      form: {
        source: '',
        code: '',
        range: [from, to]
      },
      rules: {
        source: [v => !!v || 'Source is required'],
        code: [
          v => !!v || 'Code is required',
          v => (v && v.length <= 6) || 'Code must be less than 6 characters',
        ],
      },
      loading: false,
      companiesCache: {},
      pickerOptions: {
        shortcuts: [{
          text: '最近半年',
          onClick(picker){
            const start = new Date()
            start.setTime(start.getTime() - 183 * 24 * 3600 * 1000)
            picker.$emit('pick', [start, new Date()])
          }
        }, {
          text: '最近一年',
          onClick(picker){
            const start = new Date()
            start.setTime(start.getTime() - 365 * 24 * 3600 * 1000)
            picker.$emit('pick', [start, new Date()])
          }
        }]
      }
    }
  },
  methods: {
    getCompaniesFromCode(code, cb){
      if(!code){
        cb([])
        return
      }
      const cacheKey = `${this.form.source}-${code}`
      if(this.companiesCache[cacheKey]) {
        cb(this.companiesCache[cacheKey])
        return
      }
      this.$axios.get('/api/getCompaniesFromCode', {
        params: {
          source: this.form.source,
          code: code
        }
      }).then(res => {
        cb(this.companiesCache[cacheKey] = res.data)
      }).catch(error => {
        console.error(error)
        cb([])
      })
    },
    submit(){
      this.$refs.form.validate(isValid => {
        if(!isValid) return
        this.submitForm(`/api/downloadArticleList?_csrf=${Cookie.get('csrfToken')}`, {
          source: this.form.source,
          code: this.form.code,
          from: dayjs(this.form.range[0]).format('YYYYMMDD'),
          to: dayjs(this.form.range[1]).format('YYYYMMDD'),
        })
        this.loading = true
        setTimeout(() => {
          this.loading = false
        }, 10000)
      })
    },
    submitForm(url, params){
      const $form = document.createElement('form')
      $form.action = url
      $form.method = 'POST'
      $form.style.display = 'none'

      for(const key of Object.keys(params)){
        const $input = document.createElement('input')
        $input.name = key
        $input.value = params[key]
        $form.appendChild($input)
      }

      document.body.appendChild($form)
      $form.submit()
    }
  },
  created(){
    this.$axios.get('/api/basicData').then(res => {
      this.sources = res.data.SOURCES
      this.form.source = this.sources[0].value
    })
  }
};
</script>

<style lang="scss">
  .el-form{
    width: 600px;
    margin: 100px auto 0;
  }
</style>
