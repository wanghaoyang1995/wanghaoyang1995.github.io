<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElConfigProvider } from 'element-plus'
import Mp3Control from './components/Mp3Control.vue'

const zIndex = ref<number>(3000);
const size = ref<'small'>('small');
const activeTab = ref<string>("compare_panel");
const left_time = ref(Date.now() + 1000 * 60 * 60 * 1)

const article_title = ref<string>("微软正在扩展其人工智能工具产品");
const mp3_url = ref<string>("https://k7.kekenet.com/Sound/2024/12/voatech2412183_3806493Fp4.mp3");
const mark_list = ref<number[]>([5.0, 10.0, 14.0, 20.0]);

const input_text_form = reactive({
  input_text: ""
});

const keke_id_form = reactive({
  id: ""
});

const on_submit = () => {
  console.log('submit: ' + input_text_form.input_text)
}

const on_query_article = () => {
  console.log("onQueryArticle: " + keke_id_form.id)
}

const on_sentence_changed = (sentence_index: number) => {
  console.log("on_sentence_changed: " + sentence_index.toString())
}

onMounted(() => {

});

onBeforeUnmount(() => {

});

</script>

<template>
  <el-config-provider :size="size" :z-index="zIndex">
    <el-row class="main_container">
      <el-col :xs="1" :md="4"></el-col>
      <el-col :xs="23" :md="16">
        <el-row>
          <el-col :xs="18" :md="18">
            <el-form :inline="true" :model="keke_id_form" size="default">
              <el-form-item label="文章ID">
                <el-input v-model="keke_id_form.id" placeholder="698455" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="on_query_article">获取</el-button>
              </el-form-item>
            </el-form>
          </el-col>
          <el-col :xs="6" :md="6">
            <el-countdown
              title="剩余计时"
              format="HH:mm:ss"
              :value="left_time"
            />
          </el-col>
        </el-row>
        <Mp3Control :title="article_title" :mp3_url="mp3_url" :mark_list="mark_list" @current-sentence-changed="on_sentence_changed" />
        <el-tabs v-model="activeTab" class="tab_container">
          <el-tab-pane label="听写批改" name="compare_panel">
            <el-form :model="input_text_form" label-width="auto">
              <el-form-item>
                <el-input :autosize="{ minRows: 20, maxRows: 20 }" v-model="input_text_form.input_text" maxlength="8000" class="textarea_input" placeholder="请输入文本，评分时将忽略标点符号与空白符，大小写敏感。" show-word-limit type="textarea" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="default" @click="on_submit">提交</el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="译文参考" name="source_text">

          </el-tab-pane>
          <el-tab-pane label="答案对照" name="diff_panel">

          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>
  </el-config-provider>
</template>

<style scoped>
.main_container {
  margin-top: 20px;
}
.tab_container {
  margin-top: 20px;
}
.textarea_input {
  font-size: large;
  font-weight: bold;
}
</style>
