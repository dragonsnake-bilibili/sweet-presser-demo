<template>
  <div
    ref="history-container"
    class="key-list"
    @click="show_difference = !show_difference"
  >
    <div
      v-for="({ display, time, real_time }, index) in display_keys"
      :key="`${display}-${real_time}`"
      class="key-item"
    >
      <v-icon
        v-if="display.startsWith('mdi-')"
        class="binding-name"
        :icon="display"
      />
      <span v-else class="binding-name">{{ display }}</span>
      <span :style="time === 0 ? 'color: cyan' : ''">
        {{
          show_difference
            ? format_difference(real_time, display_keys[index + 1]?.real_time)
            : time
        }}
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from "vue";
const props = defineProps<{
  keys: { display: string; time: number; real_time: number }[];
}>();
const emit = defineEmits<{ remove: [] }>();
const show_difference = ref(false);
const display_keys = computed(() => props.keys.toReversed());
const container = useTemplateRef("history-container");
defineExpose<{ adjust_items: () => void }>({
  adjust_items: async () => {
    while (container.value!.scrollHeight > container.value!.clientHeight) {
      emit("remove");
      await nextTick();
    }
  },
});
function format_difference(current: number, last: number | undefined): string {
  if (last === undefined) {
    return "+9999";
  }
  const difference = Math.min(current - last, 9999);
  return `+${difference}`;
}
</script>
<style lang="css" scoped>
.key-list {
  font-size: large;
  display: flex;
  flex-direction: column;
  width: max-content;
  margin: 0 auto;
  gap: 2ex;
  align-items: center;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.6);
  mask-image: linear-gradient(to right, black, rgba(0, 0, 0, 0.2));
}
.key-list:hover {
  mask-image: none;
}
.key-item {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  width: 100%;
  align-items: center;
  border-bottom-style: solid;
  border-bottom-width: 0.8px;
}
.binding-name {
  width: 24px;
  height: min-content;
  text-align: center;
}
</style>
