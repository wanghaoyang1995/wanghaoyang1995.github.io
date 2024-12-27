<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElConfigProvider, ElMessageBox, ElNotification } from 'element-plus'
import axios from 'axios'

import Mp3Control from './components/Mp3Control.vue'
import SourceTextList from './components/SourceTextList.vue'
import DiffPanel from './components/DiffPanel.vue'


interface Sentence {
  cn: string,
  en: string,
  millisecond: number,  // 起始时间标记, 毫秒
}

const zIndex = ref<number>(0);
const size = ref<"small">("small");
const activeTab = ref<string>("compare_panel");
const left_time = ref(Date.now() + 1000 * 60 * 60 * 1)

const article_title = ref<string>("<无>");
const playurl = ref<string>("");
const mark_list = ref<number[]>([]);
const source_text_list = ref<Array<SourceTextItem>>([]);
const activated_line_index = ref<number>(0);
const input_text_form = reactive({
  input_text: ""
});
const user_content = ref<string>("");
const answer_content = ref<string>("");
const not_submitted = ref<boolean>(true);
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

const extract_answer_content = (content: Array<Sentence>) => {
  let answer_content = "";
  content.forEach((sentence) => {
    answer_content += sentence.en + "\n";
  });
  return answer_content;
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
    answer_content.value = extract_answer_content(response.data.Data.content);
    not_submitted.value = true;
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
  activeTab.value = "diff_panel";
  not_submitted.value = false;
  user_content.value = input_text_form.input_text;
}

const on_query_article = () => {
  fetchArticle(keke_id_form.id);
}

const on_help = () => {
  console.log("on_help");
  ElMessageBox.confirm(
    "<p>这是一个英语听写练习的网页应用，音频与文本内容来自<a href='https://listen.kekenet.com/#/'>可可英语-听写训练</a>。</p>" +
    "<p>原网站的批改功能需要付费，且原文只能下载手机app查看，所以本项目做了原文爬取和本地批改功能。</p>" +
    "<p>由于用了站外接口，需要安装<a href='https://microsoftedge.microsoft.com/addons/detail/cors-unblock/hkjklmhkbkdhlgnnfbbcihcajofmjgbh?hl=zh-CN'>CORS Unblock</a>(<strong>并启用!</strong>)插件才可正常使用，否则会报跨域错误。手机暂不能安装此插件，所以请用电脑Chrome/Edge浏览器打开。</p>" +
    "<p>输入<strong>文章ID</strong>(原文链接地址中的最后一串数字)点击获取，解析内容后，在输入框输入答案，点击提交，查看批改结果与准确率。</p>" +
    "<p>其中<strong>准确率=匹配词数/总词数</strong>，多余词不计数。</p>" +
    "<p>本网页仅供个人学习使用，请勿用于商业用途。如果你觉得有所收获，请记得支持原网站：<a href='https://www.kekenet.com/'>可可英语</a>。</p>",
    "使用说明",
    {
      dangerouslyUseHTMLString: true,
      showCancelButton: false,
    }
  );
}

const on_sentence_changed = (sentence_index: number) => {
  console.log("on_sentence_changed: " + sentence_index.toString());
  activated_line_index.value = sentence_index;
}
</script>

<template>
  <el-config-provider :size="size" :z-index="zIndex">
    <el-row class="main_container">
      <el-col :xs="1" :md="3"></el-col>
      <el-col :xs="23" :md="18">
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
              <el-form-item>
                <el-button type="warning" @click="on_help">使用说明!</el-button>
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
                <el-input :autosize="{ minRows: 20, maxRows: 20 }" v-model="input_text_form.input_text" maxlength="8000" class="textarea_input" placeholder="请输入文本，评分时将忽略空白符，大小写敏感。" show-word-limit type="textarea" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" size="default" @click="on_submit">提交</el-button>
              </el-form-item>
            </el-form>
          </el-tab-pane>
          <el-tab-pane label="译文参考" name="source_text">
            <SourceTextList :source_text_list="source_text_list" :activated_line_index="activated_line_index" />
          </el-tab-pane>
          <el-tab-pane label="答案对照" name="diff_panel" :disabled="not_submitted">
            <DiffPanel language="plaintext" :user_content="user_content" :answer_content="answer_content" :folding="false" :audio_url="playurl" :article_id="keke_id_form.id" />
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
