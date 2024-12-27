<template>
  <el-row :gutter="2" class="header_bar">
    <el-col :xs="3" :sm="3" :md="3">
      <el-text size="default">文本对比工具</el-text>
    </el-col>
    <el-col :xs="6" :sm="6" :md="4">
      <el-select
        v-model="selector"
        placeholder="选择对比工具"
        size="large"
      >
        <el-option lable="vue-diff" value="vue-diff" />
        <el-option lable="vue-jsdiff" value="vue-jsdiff" />
      </el-select>
    </el-col>
    <el-col :xs="0" :sm="0" :md="6" :offset="1">
      <el-rate
        v-model="rate"
        disabled
        show-score
        text-color="#292929"
        score-template="{value}"
      />
    </el-col>
    <el-col :xs="6" :sm="6" :md="4" :offset="1">
      <el-text size="default">准确率：{{(score * 100).toFixed(2)}}%</el-text>
    </el-col>
    <el-col :xs="2" :sm="2" :md="1" :offset="1">
      <el-button type="success" @click="on_download" plain>下载</el-button>
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
import { saveAs } from "file-saver"

const props = defineProps({
  language: String,
  user_content: String,
  answer_content: String,
  folding: Boolean,
  audio_url: String,
  article_id: String,
});

const selector = ref<string>("vue-jsdiff");
const score = ref<number>(0);
const rate = computed(() => {
  return (score.value * 5.0).toFixed(1);
});
const diff_html = ref<string>("");
const total_words = ref<number>(0);
const matched_words = ref<number>(0);

watch(() => [props.user_content, props.answer_content], ([new_content, new_answer]) => {
  let span = null;
  const options = {
    ignoreWhitespace: true,
    stripTrailingCr: true,
  };
  let correct_count = 0;
  let total_count = 0;
  const diff = JsDiff.diffWords(new_answer, new_content);
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
  diff_html.value = display!.innerHTML;
  score.value = correct_count / total_count;
  total_words.value = total_count;
  matched_words.value = correct_count;
  console.log("correct_count: ", correct_count);
  console.log("total_count: ", total_count);
});

const on_download = () => {
  const date = new Date();
  const date_str = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  const time_str = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  const template_html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${date_str} ${time_str}</title>
      </head>
      <body>
        <div>
          <h3>${date_str} ${time_str}</h3>
        </div>
        <hr />
        <div>
          <strong>文章id</strong>: ${props.article_id}
        </div>
        <div>
          <strong>源音频链接</strong>: <a href="${props.audio_url}">${props.audio_url}</a>
        </div>
        <div>
          <strong>原文词数</strong>: ${total_words.value}
        </div>
        <div>
          <strong>匹配词数</strong>: ${matched_words.value}
        </div>
        <div>
          <strong>准确率</strong>: ${(matched_words.value / total_words.value * 100).toFixed(2)}%
        </div>
        <hr />
        <div>
          <div><strong>我的输入</strong></div>
          <div>${diff_html.value}</div>
        </div>
        <hr />
        <div>
          <div><strong>原文</strong></div>
          <div style="background-color: #eeebd6; font-weight: 600; line-height: 18px;">${props.answer_content}</div>
        </div>
      </body>
    </html>
    </html>
  `;

  let blob = new Blob([template_html], {type: "text/html;charset=utf-8"});
  saveAs(blob, `听写练习_${date_str}.html`);
};

</script>

<style scoped>
.header_bar {
  margin-bottom: 20px;
}
</style>
