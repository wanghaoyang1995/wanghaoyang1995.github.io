<template>
  <div class="main_container">
    <el-row class="title" :gutter="20">
      <el-col :xs="14" :md="20">
        <el-text class="mx-1 title" size="large" tag="b">{{ props.title }}</el-text>
      </el-col>
      <el-col :xs="6" :md="2" :offset="1">
        <el-popover
          placement="top-start"
          title="快捷按键"
          :width="200"
          trigger="hover"
        >
          <template #reference>
            <el-button class="m-2" text><el-text tag="b">快捷键说明</el-text></el-button>
          </template>
            <pre>Left: 上一句
Right: 下一句
Ctrl+Left: 后退10秒
Ctrl+Right: 前进10秒
Up: 增加播放速度
Down: 降低播放速度
Space: 播放/暂停
X: 开启/关闭断句播放
C: 开启/关闭单句循环</pre>
        </el-popover>
      </el-col>
    </el-row>
    <el-row :gutter="20" class="time_bar">
      <el-col :xs="6" :md="2">{{ formattedTime(current_time) }}</el-col>
      <el-col :xs="12" :md="20">
        <el-slider v-model="current_time" @input="seek" :format-tooltip="formattedTime" :min="0" :max="audio_duration" :marks="marks" />
      </el-col>
      <el-col :xs="6" :md="2">{{ formattedTime(audio_duration) }}</el-col>
    </el-row>
    <el-row :gutter="20" class="control_bar">
      <el-col :span="5" style="margin-left: 10px;">
        <el-switch
          v-model="stop_at_sentence"
          size="large"
          inline-prompt
          style="--el-switch-on-color: #339966; --el-switch-off-color: #336699"
          active-text="单句暂停"
          inactive-text="连续播放"
        />
      </el-col>
      <el-col :xs="0" :md="4"></el-col>
      <el-col :span="2">
        <el-tooltip
          effect="dark"
          content="上一句"
          placement="bottom-start"
        >
          <el-button size="large" @click="seekLastSentence" style="font-size: 28px;" :icon="CaretLeft" circle text />
        </el-tooltip>
      </el-col>
      <el-col :span="2">
        <el-tooltip
          effect="dark"
          content="播放/暂停"
          placement="bottom-start"
        >
          <el-button size="large" @click="togglePlay" style="font-size: 28px;" :icon="playing ? VideoPause : VideoPlay" circle text />
        </el-tooltip>
      </el-col>
      <el-col :span="2">
        <el-tooltip
          effect="dark"
          content="下一句"
          placement="bottom-start"
        >
          <el-button size="large" @click="seekNextSentence" style="font-size: 28px;" :icon="CaretRight" circle text />
        </el-tooltip>
      </el-col>
      <el-col :xs="1" :md="4"></el-col>
      <el-col :span="2">
        <el-tooltip
          effect="dark"
          content="单句循环"
          placement="bottom-start"
        >
          <el-button size="large" @click="toggleSentenceLoop" :style="{ color: sentence_loop ? '#54D038' : null, fontSize: '28px' }" :icon="RefreshLeft" circle text />
        </el-tooltip>
      </el-col>
      <el-col :xs="1" :md="0"></el-col>
      <el-col :span="2">
        <el-tooltip
          effect="dark"
          content="播放速度"
          placement="bottom-start"
        >
          <el-select
            v-model="audio_speed"
            placeholder="Select"
            style="width: 65px;"
            @change="audio_speed_change"
          >
            <el-option v-for="(item, index) in audio_speed_options"
              :key="item"
              :label="item + 'x'"
              :value="item"
            />
          </el-select>
        </el-tooltip>
      </el-col>
    </el-row>
    <audio :src="props.mp3_url" ref="audio" controls style="display: none;"></audio>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { PropType } from 'vue'
import { CaretRight, VideoPlay, VideoPause, CaretLeft, RefreshLeft } from '@element-plus/icons-vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  mp3_url: {
    type: String,
    required: true,
  },
  mark_list: {
    type: Array as PropType<number[]>,
    required: true,
  }
});
const emit = defineEmits<{
  (e: 'currentSentenceChanged', current_sentence_index: number): void
}>();

type Marks = Record<number, string>;
const marks = ref<Marks>([]);
watch(() => props.mark_list, (new_mark_list) => {
  marks.value = new_mark_list.reduce((acc:Marks, num:number) => {
  acc[num] = "";
  return acc;
}, {});
});

const current_sentence_index = ref<number>(0);
const search_sentence_index = (time: number) => {
  if (time <= props.mark_list[0]) {
    return 0;
  }
  if (time >= props.mark_list[props.mark_list.length - 1]) {
    return props.mark_list.length - 1;
  }

  let left = 0;
  let right = props.mark_list.length - 2;
  let mid = 0;
  while (left <= right) {
    mid = Math.floor((left + right) / 2);
    if (props.mark_list[mid] <= time && props.mark_list[mid+1] > time) {
      return mid;
    }

    if (props.mark_list[mid] < time) {
      left = mid + 1;
    } else {  // if (props.mark_list[mid] > time)
      right = mid - 1;
    }
  }
  console.error("BUG! search_sentence_index");
  return -1;
};

const audio_speed_options = ["0.3", "0.5", "0.8", "1.0", "1.2", "1.5", "2.0", "3.0"];
let audio_speed_index = 3;

const audio = ref<HTMLAudioElement>(new Audio());
const audio_duration = ref<number>(0);
const current_time = ref<number>(0);
const stop_at_sentence = ref<boolean>(false);
const playing = ref<boolean>(false);
const sentence_loop = ref<boolean>(false);
const audio_speed = ref<string>(audio_speed_options[audio_speed_index]);

const togglePlay = () => {
  if (audio) {
    if (playing.value) {
      audio.value.pause();
    } else {
      audio.value.play();
    }
    playing.value = !playing.value;
  }
};

const toggleStopAtSentence = () => {
  stop_at_sentence.value = !stop_at_sentence.value;
};

const toggleSentenceLoop = () => {
  sentence_loop.value = !sentence_loop.value;
};

const formattedTime = (seconds: number | undefined): string => {
  if (seconds === undefined) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const seek = () => {
  if (audio) {
    let index = search_sentence_index(current_time.value);
    current_sentence_index.value = index;
    audio.value.currentTime = current_time.value;
    emit("currentSentenceChanged", current_sentence_index.value);
  }
};

const seekForward = () => {
  current_time.value += 10;
  seek();
};

const seekBackward = () => {
  current_time.value -= 10;
  seek();
};

const seekNextSentence = () => {
  current_sentence_index.value += 1;
  if (current_sentence_index.value >= props.mark_list.length) {
    current_sentence_index.value = props.mark_list.length - 1;
  }
  current_time.value = props.mark_list[current_sentence_index.value];
  seek();
};

const seekLastSentence = () => {
  current_sentence_index.value -= 1;
  if (current_sentence_index.value < 0) {
    current_sentence_index.value = 0;
  }
  current_time.value = props.mark_list[current_sentence_index.value];
  seek();
};

const audio_speed_change = () => {
  if (audio) {
    audio.value.playbackRate = parseFloat(audio_speed.value);
  }
};

const audio_speed_up = () => {
  if (audio) {
    audio_speed_index += 1;
    if (audio_speed_index >= audio_speed_options.length) {
      audio_speed_index = audio_speed_options.length - 1;
    }
    audio_speed.value = audio_speed_options[audio_speed_index];
    audio.value.playbackRate = parseFloat(audio_speed.value);
  }
}

const audio_speed_down = () => {
  if (audio) {
    audio_speed_index -= 1;
    if (audio_speed_index <= 0) {
      audio_speed_index = 0;
    }
    audio_speed.value = audio_speed_options[audio_speed_index];
    audio.value.playbackRate = parseFloat(audio_speed.value);
  }
}

const keydown_handler = (e: KeyboardEvent) => {
  if (e.target !== document.body && !(e.target instanceof HTMLBodyElement)) return;
  if (e.ctrlKey) {
    switch (e.key) {
      case "ArrowLeft":
        seekBackward();
        break;
      case "ArrowRight":
        seekForward();
        break;
      default:
        break;
    }
  } else {
    switch (e.key) {
      case "ArrowLeft":
        seekLastSentence();
        break;
      case "ArrowRight":
        seekNextSentence();
        break;
      case "ArrowUp":
        audio_speed_up();
        break;
      case "ArrowDown":
        audio_speed_down();
        break;
      case " ":
        togglePlay();
        break;
      case "x":
      case "X":
        toggleStopAtSentence();
        break;
      case "c":
      case "C":
        toggleSentenceLoop();
        break;
      default:
        break;
    }
  }
};

onMounted(() => {
  document.addEventListener("keydown", keydown_handler, true);
  if (!audio.value) {
    console.error("BUG: audio is empty!");
    return;
  }

  audio.value.addEventListener("loadedmetadata", () => {
    audio_duration.value = audio.value.duration;
  });
  audio.value.addEventListener("timeupdate", () => {
    current_time.value = audio.value.currentTime;
    let index = search_sentence_index(current_time.value);
    if (index === current_sentence_index.value) {
      return;
    }

    if (sentence_loop.value) {
      current_time.value = props.mark_list[current_sentence_index.value];
      audio.value.currentTime = current_time.value;
    } else {
      current_sentence_index.value = index;
    }

    if (stop_at_sentence.value) {
      playing.value = true;
      togglePlay();
    }

    emit("currentSentenceChanged", current_sentence_index.value);
  });
  audio.value.addEventListener("ended", () => {
    playing.value = false;
  });
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", keydown_handler);
});
</script>

<style scoped>
.title {
  margin-top: 5px;
  margin-bottom: 10px;
}
.time_bar {
  margin-top: 10px;
  margin-bottom: 26px;
}
.control_bar {
  margin-top: 10px;
  margin-bottom: 10px;
  vertical-align: middle;
  line-height: 36px;
}
.main_container {
  box-shadow: var(--el-box-shadow-light);
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color);
  padding: 10px 20px;
}
</style>
