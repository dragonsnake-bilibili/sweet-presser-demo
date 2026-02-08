<template>
  <div class="command-list">
    <template v-for="{ name, sequences, hidden } in Commands" :key="name">
      <v-card
        v-if="name === active || !hidden"
        :class="name === active ? 'highlight' : ''"
        color="#24007f"
        variant="flat"
      >
        <v-card-title>{{ name }}</v-card-title>
        <v-card-text>
          <div
            v-for="sequence in sequences"
            :key="sequence.join(',')"
            class="sequence"
          >
            <template v-for="item in sequence" :key="item">
              <v-icon
                v-if="KeyDisplay[item].startsWith('mdi-')"
                class="sequence-item"
                :icon="KeyDisplay[item]"
              />
              <span v-else class="sequence-item">{{ KeyDisplay[item] }}</span>
            </template>
          </div>
        </v-card-text>
      </v-card>
    </template>
  </div>
</template>
<script setup lang="ts">
import { Commands, KeyDisplay } from "./index.vue";
defineProps<{ active: string }>();
</script>
<style lang="css" scoped>
.command-list {
  padding: 8px 8px 0 0;
}
.command-list > * {
  margin-bottom: 1em;
  mask-image: linear-gradient(to left, black, rgba(0, 0, 0, 0.2));
}
.command-list > *:hover {
  mask-image: none;
}
.sequence {
  display: flex;
  justify-content: left;
  align-items: center;
  gap: 1ex;
}
.sequence-item {
  width: min-content;
  height: min-content;
}

.command-list > *.highlight {
  mask-image: none;
}

.command-list > *.highlight::before {
  content: "";
  position: absolute;
  top: -50%;
  left: -150%;
  width: 70%;
  height: 200%;
  background: linear-gradient(
    120deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.35) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: skewX(-20deg);
  animation: sweep 1.2s ease-in-out infinite;
}

@keyframes sweep {
  0% {
    left: -150%;
  }
  50% {
    left: 120%;
  }
  100% {
    left: 120%;
  }
}
</style>
