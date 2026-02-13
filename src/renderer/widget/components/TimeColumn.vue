<template>
  <div class="time-column" :style="timeColumnStyle">
    <div
      v-for="hour in hourCount"
      :key="startHour + hour - 1"
      class="time-slot"
    >
      <span class="time-slot-label">{{ formatHour(startHour + hour - 1) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    color?: string
    startHour?: number
    endHour?: number
    /** Top padding in rem to align with header + all-day row (default 2.25) */
    paddingTopRem?: number
  }>(),
  { startHour: 0, endHour: 24, paddingTopRem: 2.25 }
)

const color = computed(() => props.color ?? 'currentColor')
const timeColumnStyle = computed(() => ({
  color: color.value,
  paddingTop: `${props.paddingTopRem ?? 2.25}rem`,
}))
const startHour = computed(() => {
  const v = props.startHour ?? 0
  return Number.isFinite(v) ? Math.max(0, Math.min(23, v)) : 0
})
const endHour = computed(() => {
  const v = props.endHour ?? 24
  return Number.isFinite(v) ? Math.max(1, Math.min(24, v)) : 24
})
const hourCount = computed(() => Math.max(1, endHour.value - startHour.value))

function formatHour(h: number): string {
  if (h === 0) return '00:00'
  return `${String(h).padStart(2, '0')}:00`
}
</script>

<style scoped>
.time-column {
  flex-shrink: 0;
  width: 3rem;
  font-size: 0.7rem;
}
.time-slot {
  height: 1.5rem;
  position: relative;
  box-sizing: border-box;
}
.time-slot-label {
  position: absolute;
  top: 0;
  right: 0.25rem;
  transform: translateY(-50%);
  line-height: 1;
}
</style>
