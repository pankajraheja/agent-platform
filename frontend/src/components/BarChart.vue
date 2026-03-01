<script setup>
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip)

const props = defineProps({
  labels: { type: Array, required: true },
  datasets: { type: Array, required: true },
  horizontal: { type: Boolean, default: false },
  height: { type: Number, default: 250 },
})

const chartData = {
  labels: props.labels,
  datasets: props.datasets,
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: props.horizontal ? 'y' : 'x',
  plugins: {
    title: { display: false },
    tooltip: {
      backgroundColor: '#1f2937',
      titleFont: { size: 12 },
      bodyFont: { size: 11 },
      padding: 8,
      cornerRadius: 6,
    },
  },
  scales: {
    x: {
      grid: { display: !props.horizontal, color: '#f3f4f6' },
      ticks: { font: { size: 11 }, color: '#9ca3af' },
    },
    y: {
      grid: { display: props.horizontal, color: '#f3f4f6' },
      ticks: { font: { size: 11 }, color: '#9ca3af' },
      beginAtZero: true,
    },
  },
}
</script>

<template>
  <div :style="{ height: height + 'px' }">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
