<template>
  <el-form ref="form" :model="form" :rules="rules" label-width="120px">
    <el-form-item label="code" prop="code">
      <el-input v-model.trim="form.code" maxlength="6" />
    </el-form-item>
    <el-form-item label="date" prop="date">
      <el-date-picker
        v-model="form.range"
        type="daterange"
        range-separator="to"
        start-placeholder="from"
        end-placeholder="to">
      </el-date-picker>
    </el-form-item>
    <el-form-item>
      <el-button :loading="loading" type="primary" @click="submit">Submit</el-button>
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
      form: {
        code: '',
        range: [from, to]
      },
      rules: {
        code: [
          v => !!v || 'Code is required',
          v => (v && v.length <= 6) || 'Code must be less than 6 characters',
        ],
      },
      loading: false,
    }
  },
  methods: {
    submit(){
      this.$refs.form.validate(isValid => {
        if(!isValid) return
        this.submitForm(`/api/titleSearch?_csrf=${Cookie.get('csrfToken')}`, {
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
    this.$axios.get('/api/basicData')
  }
};
</script>

<style lang="scss">
  .el-form{
    width: 600px;
    margin: 100px auto 0;
  }
</style>
