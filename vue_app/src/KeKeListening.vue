<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElConfigProvider, ElNotification } from 'element-plus'
import Mp3Control from './components/Mp3Control.vue'
import axios from 'axios'

interface Sentence {
  cn: string,
  en: string,
  millisecond: number,  // 起始时间标记, 毫秒
}

const zIndex = ref<number>(3000);
const size = ref<"small">("small");
const activeTab = ref<string>("compare_panel");
const left_time = ref(Date.now() + 1000 * 60 * 60 * 1)

const article_title = ref<string>("xxx");
const playurl = ref<string>("");
const mark_list = ref<number[]>([]);
const source_text_list = ref<Array<SourceTextItem>>([]);
const activated_line_index = ref<number>(0);
const input_text_form = reactive({
  input_text: ""
});

const keke_id_form = reactive({
  id: "698455"
});



const extract_mark_list = (content: Array<Sentence>) => {
  let mark_list : number[] = content.map(sentence => sentence.millisecond / 1000.0);
  return mark_list;
}

interface SourceTextItem {
  cn: string,
  en: string,
  index: number
}
const extract_source_text = (content: Array<Sentence>) => {
  let temp_list : Array<SourceTextItem> = [];
  content.forEach((sentence, index) => {
    temp_list.push({
      cn: sentence.cn,
      en: sentence.en,
      index: index
    });
  });
  return temp_list;
}

const fetchArticle = async (article_id: string) => {
  const raw_text_param = `{"Method":"v9_news_getcontent","Params":{"id":${article_id}},"Token":"","Terminal":"11","Version":"4.0","UID":0,"AppFlag":"18","Sign":"","ApVersionCode":1}`;
  const mp3_url_prefix = "https://k7.kekenet.com/";

  try {
    const response = await axios.post(
      "https://mob2015.kekenet.com/keke/mobile/index.php",
      raw_text_param,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7",
          "Cache-Control": "no-cache",
        }
      }
    );

    console.log("Response:", response.data);
    playurl.value = mp3_url_prefix + response.data.Data.playurl;
    article_title.value = response.data.Data.title;
    mark_list.value = extract_mark_list(response.data.Data.content);
    source_text_list.value = extract_source_text(response.data.Data.content);
  } catch (error) {
    console.error("Error sending POST request:", error);
    ElNotification({
      title: "Error",
      message: "POST请求出错!",
      type: "error",
    });
  }
};

const on_submit = () => {
  console.log("submit: " + input_text_form.input_text);
}

const on_query_article = () => {
  fetchArticle(keke_id_form.id);
}

const on_sentence_changed = (sentence_index: number) => {
  console.log("on_sentence_changed: " + sentence_index.toString());
  activated_line_index.value = sentence_index;
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
                <el-tooltip
                  effect="light"
                  content="例如: 原文链接为 https://mob.kekenet.com/lesson/96/698455, 此处输入698455"
                >
                  <el-input v-model="keke_id_form.id" placeholder="输入文章ID" />
                </el-tooltip>
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
        <Mp3Control :title="article_title" :mp3_url="playurl" :mark_list="mark_list" @current-sentence-changed="on_sentence_changed" />
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
            <SourceTextList :source_text_list="source_text_list" :activated_line_index="activated_line_index" />
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
