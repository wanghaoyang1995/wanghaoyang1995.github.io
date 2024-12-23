<template>
  <div class="main_container">
    <el-row class="title" :gutter="20">
      <el-col :xs="14" :md="20">
        <el-text class="mx-1 title" size="large">标题行</el-text>
      </el-col>
      <el-col :xs="6" :md="2" :offset="1">
        <el-popover
          placement="top-start"
          title="快捷按键"
          :width="200"
          trigger="hover"
          content="左：上一句；
                   右：下一句；
                   Ctrl+左：后退10秒；
                   Ctrl+右：前进10秒；
                   上：增加播放速度；
                   下：降低播放速度；
                   空格：播放/暂停；
                   X：开启/关闭断句播放；
                   C：开启/关闭单句循环。"
        >
          <template #reference>
            <el-button class="m-2" text><el-text tag="b">快捷键说明</el-text></el-button>

          </template>
        </el-popover>
      </el-col>
    </el-row>
    <el-row :gutter="20" class="time_bar">
      <el-col :xs="6" :md="2">00:00</el-col>
      <el-col :xs="12" :md="20">
        <el-slider v-model="value" :marks="marks" />
      </el-col>
      <el-col :xs="6" :md="2">04:00</el-col>
    </el-row>
    <el-row :gutter="20" class="control_bar">
      <el-col :span="5" style="margin-left: 10px;">
        <el-switch
          v-model="stop_at_sentence"
          size="large"
          inline-prompt
          style="--el-switch-on-color: #339966; --el-switch-off-color: #336699"
          active-text="断句"
          inactive-text="连续"
        />
      </el-col>
      <el-col :xs="0" :md="4"></el-col>
      <el-col :span="2">
        <el-button size="large" style="font-size: 28px;" :icon="CaretLeft" circle text />
      </el-col>
      <el-col :span="2">
        <el-button size="large" style="font-size: 28px;" :icon="VideoPlay" circle text />
      </el-col>
      <el-col :span="2">
        <el-button size="large" style="font-size: 28px;" :icon="CaretRight" circle text />
      </el-col>
      <el-col :xs="1" :md="4"></el-col>
      <el-col :span="2">
        <el-button size="large" style="font-size: 28px;" :icon="RefreshLeft" circle text />
      </el-col>
      <el-col :xs="1" :md="0"></el-col>
      <el-col :span="2">
        <el-select
          v-model="audio_speed"
          placeholder="Select"
          style="width: 65px;"
        >
          <el-option label="0.5x" value="0.5" />
          <el-option label="0.8x" value="0.8" />
          <el-option label="1.0x" value="1.0" />
          <el-option label="1.2x" value="1.2" />
          <el-option label="1.5x" value="1.5" />
          <el-option label="2.0x" value="2.0" />
        </el-select>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  mp3_url: String,
  marks: String
})

import { reactive, ref } from 'vue'
import type { CSSProperties } from 'vue'
import { CaretRight, VideoPlay, CaretLeft, RefreshLeft } from '@element-plus/icons-vue'

interface Mark {
  style: CSSProperties
  label: string
}

type Marks = Record<number, Mark | string>

const value = ref([30, 60])
const marks = reactive<Marks>({
  0: '0°C',
  8: '8°C',
  37: '',
  50: {
    style: {
      color: '#1989FA',
    },
    label: '50%',
  },
})

const stop_at_sentence = ref<boolean>(false);
const audio_speed = ref<string>("1.0");

</script>

<style scoped>
.title {
  margin-top: 5px;
  margin-bottom: 10px;
}
.time_bar {
  margin-top: 10px;
  margin-bottom: 36px;
}
.control_bar {
  margin-top: 10px;
  margin-bottom: 10px;
  vertical-align: middle;
  line-height: 36px;
}
.main_container {
  boxShadow: var(--el-box-shadow-light);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color);
  padding: 10px 20px;
}
</style>
