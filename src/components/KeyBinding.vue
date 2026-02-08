<template>
  <v-bottom-sheet v-model="modelValue">
    <v-container>
      <div class="binding-list">
        <template v-for="name in bindingKeys" :key="name">
          <v-icon
            v-if="KeyDisplay[name].startsWith('mdi-')"
            class="binding-name"
            :icon="KeyDisplay[name]"
          />
          <span v-else class="binding-name">{{ KeyDisplay[name] }}</span>
          <v-btn
            block
            :color="configures[name] === '' ? 'warning' : ''"
            @click="emit('requestChange', name)"
          >
            <span v-if="modifying === name">按下想要修改为的按键</span>
            <v-hotkey v-else :keys="configures[name]" />
          </v-btn>
        </template>
      </div>
    </v-container>
  </v-bottom-sheet>
</template>
<script setup lang="ts">
import { watch } from "vue";
import {
  type BindingConfigure,
  type BindingKey,
  bindingKeys,
  KeyDisplay,
} from "./index.vue";
const modelValue = defineModel<boolean>({ required: true });
defineProps<{
  configures: BindingConfigure;
  modifying: BindingKey | "";
}>();
const emit = defineEmits<{
  requestChange: [BindingKey];
  cancelChange: {};
}>();
watch(modelValue, () => {
  if (modelValue.value === false) {
    emit("cancelChange");
  }
});
</script>
<style lang="css" scoped>
.binding-list {
  font-size: large;
  display: grid;
  grid-template-columns: 2em 12em;
  width: max-content;
  margin: 0 auto;
  gap: 2ex 1em;
  align-items: center;
}
.binding-name {
  width: 100%;
  height: min-content;
  text-align: center;
}
</style>
