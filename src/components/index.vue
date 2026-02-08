<template>
  <main class="main">
    <video
      ref="main-video"
      autoplay
      class="main-video"
      :src="state.video_src"
    />
    <key-history
      ref="key-history"
      class="history"
      :keys="state.key_history"
      @remove="state.key_history.shift()"
    />
    <command-list :active="state.active_action" class="commands" />
    <div class="key-binding-opener">
      <div class="key-binding-opener-helper">
        <v-btn width="100%" @click="state.show_binding_configure = true">
          修改按键绑定
        </v-btn>
      </div>
    </div>
  </main>
  <key-binding
    v-model="state.show_binding_configure"
    :configures="bindings"
    :modifying="state.modifying"
    @cancel-change="state.modifying = ''"
    @request-change="
      (name) => {
        state.modifying = name;
      }
    "
  />
</template>
<script setup lang="ts">
import type { Reactive } from "vue";
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  useTemplateRef,
} from "vue";
import video_samplers from "@/assets/videos";
import { SweetPresser } from "@/sweet-presser/sweet-presser";
import KeyBinding from "./KeyBinding.vue";
import KeyHistory from "./KeyHistory.vue";

const state: Reactive<{
  show_binding_configure: boolean;
  modifying: BindingKey | "";
  key_history: { display: string; time: number; real_time: number }[];
  sequence_start_time: number;
  video_src: string | undefined;
  active_action: string;
}> = reactive({
  show_binding_configure: false,
  modifying: "",
  key_history: [],
  sequence_start_time: -1,
  video_src: undefined,
  active_action: "",
});
const presser = SweetPresser.build(Commands, output_handler, {
  sequence_timeout: 150,
  reset_on_action: true,
  on_reset: () => {
    state.sequence_start_time = -1;
  },
});
const bindings: Reactive<BindingConfigure> = reactive({
  up_left: "q",
  up: "w",
  up_right: "e",
  left: "a",
  right: "d",
  down_left: "z",
  down: "x",
  down_right: "c",
  punch: "j",
  kick: "k",
});
const key_mapping = computed(() => {
  return new Map(bindingKeys.map((name) => [bindings[name], name]));
});

const key_history = useTemplateRef("key-history");

function input_handler(event: KeyboardEvent) {
  const key = event.key;
  if (state.modifying === "") {
    const target = key_mapping.value.get(key);
    if (target !== undefined) {
      const time = performance.now();
      if (state.sequence_start_time === -1) {
        state.sequence_start_time = time;
      }
      state.key_history.push({
        display: KeyDisplay[target],
        time: time - state.sequence_start_time,
        real_time: time,
      });
      key_history.value?.adjust_items();
      presser.feed(target);
    }
  } else {
    for (const binding_name of bindingKeys) {
      if (bindings[binding_name] === key) {
        bindings[binding_name] = "";
      }
    }
    bindings[state.modifying] = key;
    state.modifying = "";
  }
}
const video = useTemplateRef("main-video");
onMounted(() => {
  document.addEventListener("keydown", input_handler);
  video.value?.addEventListener("ended", () => {
    state.active_action = "";
    state.video_src = undefined;
  });
});
onUnmounted(() => {
  document.removeEventListener("keydown", input_handler);
});

async function output_handler(_id: string, actions: string[]) {
  const action_level = [
    "Delta Red Assault",
    "Killer Bee Spin",
    "Spin Drive Smasher",
    "Cannon Spike",
    "点点点四百鸭鹿！",
    "Spiral Arrow",
  ] as const;
  for (const action of action_level) {
    if (actions.includes(action)) {
      state.active_action = action;
      state.video_src = undefined;
      await nextTick();
      state.video_src = video_samplers.get(action)!();
      break;
    }
  }
}
</script>
<script lang="ts">
export const bindingKeys = [
  "up_left",
  "up",
  "up_right",
  "left",
  "right",
  "down_left",
  "down",
  "down_right",
  "punch",
  "kick",
] as const;
export type BindingKey = (typeof bindingKeys)[number];
export type BindingConfigure = {
  [K in BindingKey]: string;
};
export const KeyDisplay: {
  [K in BindingKey]: string;
} = {
  up_left: "mdi-arrow-top-left",
  up: "mdi-arrow-up",
  up_right: "mdi-arrow-top-right",
  left: "mdi-arrow-left",
  right: "mdi-arrow-right",
  down_left: "mdi-arrow-bottom-left",
  down: "mdi-arrow-down",
  down_right: "mdi-arrow-bottom-right",
  punch: "👊",
  kick: "🦵",
};
export const Commands: {
  name: string;
  sequences: BindingKey[][];
  hidden?: boolean;
}[] = [
  {
    name: "Spiral Arrow",
    sequences: [["down", "down_right", "right", "kick"]],
  },
  {
    name: "Cannon Spike",
    sequences: [["right", "down", "down_right", "kick"]],
  },
  {
    name: "Spin Drive Smasher",
    sequences: [
      ["down", "down_right", "right", "down", "down_right", "right", "kick"],
    ],
  },
  {
    name: "Killer Bee Spin",
    sequences: [
      ["down", "down_left", "left", "down", "down_left", "left", "punch"],
    ],
  },
  {
    name: "Delta Red Assault",
    sequences: [
      ["down", "down_right", "right", "down", "down_right", "right", "punch"],
    ],
  },
  {
    name: "点点点四百鸭鹿！",
    sequences: [
      ["punch", "punch", "punch", "down", "down_right", "right", "kick"],
    ],
    hidden: true,
  },
];
</script>
<style lang="css" scoped>
.main {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}
.main-video {
  width: 100%;
  height: 100%;
}
.history {
  position: absolute;
  top: 0;
  left: 0;
  height: 90vh;
  width: 10vw;
  padding: 8px 8px 0 8px;
}
.commands {
  position: absolute;
  top: 0;
  right: 0;
  width: 20vw;
}

.key-binding-opener {
  font-size: large;
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 20vh;
  opacity: 0;
  transition-duration: 0.4s;
}
.key-binding-opener:hover {
  opacity: 1;
}
.key-binding-opener-helper {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  height: 100%;
  width: 60%;
  margin: 0 auto;
}
</style>
