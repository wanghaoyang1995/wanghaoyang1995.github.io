<template>
  <el-row :gutter="2" class="header_bar">
    <el-col :xs="4" :md="4">
      <el-text size="default">文本对比工具</el-text>
    </el-col>
    <el-col :xs="6" :md="6">
      <el-select
        v-model="selector"
        placeholder="选择对比工具"
        size="large"
      >
        <el-option lable="vue-diff" value="vue-diff" />
        <el-option lable="vue-jsdiff" value="vue-jsdiff" />
      </el-select>
    </el-col>
    <el-col :xs="6" :md="6" :offset="2">
      <el-rate
        v-model="rate"
        disabled
        show-score
        text-color="#292929"
        score-template="{value}"
      />
    </el-col>
    <el-col :xs="4" :md="4" :offset="2">
      <el-text size="default">准确率：{{(score * 100).toFixed(2)}}%</el-text>
    </el-col>
  </el-row>
  <el-row class="vue_diff_container" :style="{display: selector==='vue-diff' ? 'block':'none'}">
    <el-col :span="24">
      <Diff
        mode="split"
        theme="light"
        :language="props.language"
        :prev="props.answer_content"
        :current="props.user_content"
        :folding="props.folding"
        :input-delay="0"
        :virtual-scroll="{ height: 500, lineMinHeight: 24, delay: 100 }"
      />
    </el-col>
  </el-row>
  <el-row class="vue_jsdiff_container" :style="{display: selector==='vue-jsdiff' ? 'block':'none'}">
    <el-col :span="24">
      <pre id="display"></pre>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import JsDiff from 'vue-jsdiff'

const props = defineProps({
  language: String,
  user_content: String,
  answer_content: String,
  folding: Boolean,
});

const selector = ref<string>('vue-jsdiff');
const score = ref<number>(0);
const rate = computed(() => {
  return (score.value * 5.0).toFixed(1);
});
watch(() => props.user_content, (newVal, oldVal) => {
  let span = null;
  const options = {
    ignoreWhitespace: true,
    stripTrailingCr: true,
  };
  let correct_count = 0;
  let total_count = 0;
  const diff = JsDiff.diffWords(props.answer_content, props.user_content);
  const display = document.getElementById("display");
  display!.innerHTML = "";
  const fragment = document.createDocumentFragment();

  diff.forEach((part : any) => {
    const tokens_count = part.value.split(/\s+/).filter(Boolean).length;
    total_count += tokens_count;
    if (!part.added && !part.removed) {
      correct_count += tokens_count;
    }
    const color = part.added ? 'red' :
      part.removed ? 'blue' : 'green';
    span = document.createElement('span');
    span.style.color = color;
    span.appendChild(document
      .createTextNode(part.value));
    fragment.appendChild(span);
  });

  display!.appendChild(fragment);
  score.value = correct_count / total_count;
  console.log("correct_count: ", correct_count);
  console.log("total_count: ", total_count);
});
</script>

<style scoped>
.header_bar {
  margin-bottom: 20px;
}
</style>
