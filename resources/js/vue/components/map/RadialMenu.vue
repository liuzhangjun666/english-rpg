<template>
  <div class="radial-menu" :class="{ 'is-open': visible }" :style="{ left: x, top: y }">
    <div 
      v-for="(node, index) in nodes" 
      :key="node.key"
      class="radial-node"
      :style="getNodeStyle(index)"
      @click.stop="onNodeClick(node)"
    >
      <div class="radial-icon-wrapper">
        <img v-if="node.icon" :src="node.icon" :alt="node.title" class="radial-icon" />
        <span v-else class="radial-fallback">{{ node.title[0] }}</span>
      </div>
      <div class="radial-label">{{ node.title }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  visible: boolean;
  x: string;
  y: string;
  nodes: Array<{ key: string; title: string; icon?: string; onClick: () => void; dismissRadial?: boolean }>;
  radius?: number; // 展开半径，默认 120px
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const configRadius = props.radius || 120;

// 根据节点数量计算每个节点的角度
// 我们倾向于在一个半圆 (上方) 中展开，例如 -30度 到 210度
const getNodeStyle = (index: number) => {
  const total = props.nodes.length;
  if (total === 0) return {};

  let angle = 0;
  if (total === 1) {
    angle = -90; // 正上方
  } else if (total === 2) {
    angle = -135 + index * 90; // 左上，右上
  } else {
    // 均匀分布在 -160 到 -20 度之间
    const startAngle = -160;
    const endAngle = -20;
    const step = (endAngle - startAngle) / (total - 1);
    angle = startAngle + index * step;
  }

  const radian = (angle * Math.PI) / 180;
  const dx = Math.cos(radian) * configRadius;
  const dy = Math.sin(radian) * configRadius;

  return {
    transform: props.visible 
      ? `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)` 
      : `translate(-50%, -50%) scale(0.2)`,
    opacity: props.visible ? 1 : 0,
    pointerEvents: props.visible ? 'auto' : 'none',
    transitionDelay: props.visible ? `${index * 0.05}s` : '0s'
  };
};

const onNodeClick = (node: { onClick: () => void; dismissRadial?: boolean }) => {
  node.onClick();
  if (node.dismissRadial) {
    emit('close');
  }
};
</script>

<style scoped>
.radial-menu {
  position: absolute;
  z-index: 50;
  pointer-events: none; /* Only children should receive events */
  transition: left 0.1s linear, top 0.1s linear;
}

.radial-node {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s;
  cursor: pointer;
}

.radial-node:hover .radial-icon-wrapper {
  transform: scale(1.15);
  border-color: rgba(255, 215, 0, 0.9);
  box-shadow: 0 0 20px rgba(212, 168, 67, 0.6), inset 0 0 10px rgba(212, 168, 67, 0.3);
}

.radial-node:hover .radial-label {
  color: #fff;
  text-shadow: 0 0 5px rgba(255, 215, 0, 0.8);
}

.radial-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(15, 20, 35, 0.85);
  border: 2px solid rgba(130, 210, 255, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  transition: all 0.2s;
}

.radial-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.radial-fallback {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
}

.radial-label {
  margin-top: 6px;
  font-size: 13px;
  color: #fceea7;
  text-shadow: 1px 1px 2px #000;
  background: rgba(0,0,0,0.6);
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  transition: all 0.2s;
}
</style>
