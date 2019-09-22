<template>
  <el-container class="app-container">
    <el-header>
      <el-menu
        :default-active="activeIndex"
        mode="horizontal">
        <h1>OUSIRI</h1>
      </el-menu>
    </el-header>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<script>
export default {
  name: 'App',
  data: () => ({
    activeIndex: '1'
  }),
};
</script>

<style lang="scss">
  body {
    margin: 0;
    padding: 0;
  }
</style>
