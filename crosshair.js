function drawCrosshair(canvas, ctx, color = "red", size = 10, lineWidth = 1) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    console.error("Provided element is not a canvas.");
    return;
  }

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.save(); // Save the current state so we don't mess up other drawings

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  // Draw horizontal line
  ctx.beginPath();
  ctx.moveTo(centerX - size, centerY);
  ctx.lineTo(centerX + size, centerY);
  ctx.stroke();

  // Draw vertical line
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - size);
  ctx.lineTo(centerX, centerY + size);
  ctx.stroke();

  ctx.restore(); // Restore previous state
}
