<script setup lang="ts">
import { ref } from 'vue'
import { ElConfigProvider } from 'element-plus'
import Mp3Control from './components/Mp3Control.vue'

const zIndex = ref<number>(3000)
const size = ref<'small'>('small')

</script>

<template>
  <el-config-provider :size="size" :z-index="zIndex">
    <el-row class="main_container">
      <el-col :xs="1" :md="4"></el-col>
      <el-col :xs="23" :md="16">
        <Mp3Control />

      </el-col>
    </el-row>
  </el-config-provider>
</template>

<style scoped>
.main_container {
  margin-top: 20px;
}
</style>
