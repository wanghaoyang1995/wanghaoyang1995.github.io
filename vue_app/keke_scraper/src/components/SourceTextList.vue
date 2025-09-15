<template>
  <div class="main_container">
    <ul class="text_ul">
      <li v-for="item in source_text_list" :key="item.index" class="text_li" :class="{ activated_line: item.index === props.activated_line_index }">
        <el-text class="mx-1" size="default" tag="b">{{ item.en }}</el-text>
        <br />
        <el-text class="mx-1" size="default" tag="i">{{ item.cn }}</el-text>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
interface SourceTextItem {
  cn: string,
  en: string,
  index: number
}
const props = defineProps({
  source_text_list: {
    type: Array<SourceTextItem>,
    required: true,
  },
  activated_line_index: {
    type: Number,
    required: true,
  }
});

</script>

<style scoped>
.text_ul {
  list-style-type: auto;
}

.text_li {
  margin-bottom: 10px;
}

.activated_line {
  background-color: #a6f0c5;
}
</style>
