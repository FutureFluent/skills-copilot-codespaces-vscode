import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip
} from 'chart.js';

let isRegistered = false;

export function ensureChartRegistration() {
  if (isRegistered) {
    return;
  }

  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);
  isRegistered = true;
}
