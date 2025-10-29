// Utility for generating charts on canvas for PDF export
export function createPieChart(
  canvas: HTMLCanvasElement,
  data: Record<string, number>,
  title: string,
  colors: string[]
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2 - 20;
  const radius = Math.min(centerX, centerY) - 60;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, centerX, 30);

  let startAngle = 0;
  Object.entries(data).forEach(([label, value], index) => {
    const sliceAngle = (value / total) * 2 * Math.PI;
    ctx.fillStyle = colors[index % colors.length];
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();
    startAngle += sliceAngle;
  });

  // Legend
  let legendY = centerY + radius + 30;
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  Object.entries(data).forEach(([label, value], index) => {
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(centerX - 100, legendY, 15, 15);
    ctx.fillStyle = '#1f2937';
    ctx.fillText(`${label}: ${value}`, centerX - 80, legendY + 12);
    legendY += 20;
  });
}

export function createBarChart(
  canvas: HTMLCanvasElement,
  data: Record<string, number>,
  title: string,
  color: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, 30);

  const entries = Object.entries(data);
  const maxValue = Math.max(...Object.values(data));
  const barWidth = (canvas.width - 100) / entries.length;
  const chartHeight = canvas.height - 120;

  entries.forEach(([label, value], index) => {
    const barHeight = (value / maxValue) * chartHeight;
    const x = 50 + index * barWidth;
    const y = canvas.height - 70 - barHeight;

    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth - 10, barHeight);
    ctx.fillStyle = '#1f2937';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label.substring(0, 10), x + barWidth / 2 - 5, canvas.height - 50);
    ctx.fillText(value.toString(), x + barWidth / 2 - 5, y - 5);
  });
}
