// Canvas-only Cabin renderer. It consumes host-provided observer state and never changes audio routing.
export function createCabinRenderer(getDependencies) {
  function getCabinFieldLevels(x, y) {
    const {
      state,
      els,
      cabinTestCtx,
      getAllVisualBranchStates,
      energyToDb,
      dbToEnergy,} = getDependencies();
    const g = state.cabinGeometry,
      branches = getAllVisualBranchStates(),
      ambient = branches.ambient.liveRmsDb ?? -100,
      sceneBase = branches.scene.liveRmsDb ?? -100,
      headrestAtA = branches.programA.liveRmsDb ?? -100,
      rear = Math.max(0, Math.min(1, (y - g.fullCabinY) / g.fullCabinH)),
      scene = sceneBase - 6 * rear,
      r = Math.hypot(x - g.headrestX, y - g.headrestY),
      r0 = g.cabinW * 0.12,
      rB = g.cabinW * 0.28,
      u = Math.max(0, Math.min(1, (r - r0) / (rB - r0))),
      smooth = 6 * u ** 5 - 15 * u ** 4 + 10 * u ** 3,
      tailU = Math.max(0, Math.min(1, (r - rB) / (g.cabinH * 0.55))),
      tail = 6 * tailU ** 5 - 15 * tailU ** 4 + 10 * tailU ** 3,
      headrest = headrestAtA - 15 * smooth - 3 * tail,
      total = energyToDb(
        dbToEnergy(ambient) + dbToEnergy(scene) + dbToEnergy(headrest),
      );
    return { ambient, scene, headrest, total };
  }
  function drawCabinLevelTest() {
    const {
      state,
      els,
      cabinTestCtx,
      getAllVisualBranchStates,
      energyToDb,
      dbToEnergy,} = getDependencies();
    const ctx = cabinTestCtx,
      canvas = els.cabinTest,
      w = canvas.width,
      h = canvas.height,
      branches = getAllVisualBranchStates(),
      toVisualLevel = (l) =>
        Number.isFinite(l) && state.playing
          ? Math.max(0, Math.min(1, (l + 42) / 42))
          : 0,
      ambientLevel = toVisualLevel(branches.ambient.liveRmsDb),
      headrestLevel = toVisualLevel(branches.programA.liveRmsDb),
      sceneLevel = toVisualLevel(branches.scene.liveRmsDb);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const cabinW = w * 0.9,
      fullCabinY = h * 0.09,
      fullCabinH = h * 0.82,
      frontCrop = 0.22,
      cabinH = fullCabinH * (1 - frontCrop),
      cabinX = (w - cabinW) / 2,
      cabinY = fullCabinY + fullCabinH * frontCrop,
      headrestX = cabinX + cabinW * 0.36,
      headrestY = fullCabinY + fullCabinH * 0.58;
    state.cabinGeometry = {
      cabinX,
      cabinY,
      cabinW,
      cabinH,
      fullCabinY,
      fullCabinH,
      headrestX,
      headrestY,
    };
    const dashboardY = cabinY - 34;
    ctx.fillStyle = "#121b1f";
    ctx.beginPath();
    ctx.roundRect(cabinX, dashboardY, cabinW, 28, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(159,208,255,.24)";
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.rect(cabinX, cabinY, cabinW, cabinH);
    ctx.clip();
    ctx.fillStyle = "#070909";
    ctx.fillRect(cabinX, cabinY, cabinW, cabinH);
    const tileCols = 8,
      tileRows = 8,
      fieldInset = cabinW * 0.1,
      fieldX = cabinX + fieldInset,
      fieldW = cabinW - fieldInset * 2,
      tileW = fieldW / tileCols,
      tileH = cabinH / tileRows; // EN: The sound-field bubbles leave physical cabin-edge space on both sides.
    for (let row = 0; row < tileRows; row++)
      for (let col = 0; col < tileCols; col++) {
        const totalSpl =
            getCabinFieldLevels(
              fieldX + (col + 0.5) * tileW,
              cabinY + (row + 0.5) * tileH,
            ).total + 80,
          v =
            Math.pow(Math.max(0, Math.min(1, (totalSpl - 38) / 42)), 0.65) *
            0.38;
        ctx.fillStyle = `rgba(64,166,157,${v})`;
        ctx.beginPath();
        ctx.arc(
          fieldX + (col + 0.5) * tileW,
          cabinY + (row + 0.5) * tileH,
          Math.min(tileW, tileH) * (0.3 + (0.18 * v) / 0.38),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    ctx.strokeStyle = `rgba(126,214,202,${0.16 + ambientLevel * 0.62})`;
    ctx.lineWidth = 2.2;
    for (let ly = cabinY + 14; ly < cabinY + cabinH; ly += 18) {
      ctx.beginPath();
      // EN: Crop ambient lines to the active sound field without scaling its grid.
      ctx.moveTo(fieldX, ly);
      ctx.lineTo(fieldX + fieldW, ly);
      ctx.stroke();
    }
    const sceneCenterX = cabinX + cabinW / 2,
      sceneCenterY = cabinY - cabinH * 2,
      sceneAlpha = 0.025 + sceneLevel * 0.54;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(
        sceneCenterX,
        sceneCenterY,
        cabinH * (1.82 + i * 0.3),
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = `rgba(58,230,210,${sceneAlpha * (1 - i * 0.16)})`;
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 2;
    ctx.strokeRect(cabinX, cabinY, cabinW, cabinH);
    ctx.fillStyle = "#777";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("FRONT", cabinX + cabinW / 2, cabinY - 10);
    ctx.fillText("▲", cabinX + cabinW / 2, cabinY - 27); // EN: The seat outline must not dim the sound field; Canvas retains people, sound field and the active focus frame only.
    ctx.strokeStyle = "rgba(170,190,188,.40)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(headrestX - 70, headrestY - 90, 140, 180, 18);
    ctx.stroke();
    ctx.shadowColor = "rgba(242,195,107,1)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(242,195,107,1)";
    ctx.beginPath();
    ctx.ellipse(headrestX, headrestY, 15, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(242,195,107,1)";
    ctx.beginPath();
    ctx.ellipse(headrestX, headrestY - 18, 4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(headrestX, headrestY + 51);
    const arcAlpha = 0.06 + headrestLevel * 0.88;
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      ctx.beginPath();
      ctx.arc(0, 0, 36 + i * 43, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(58,230,210,${arcAlpha * (1 - t * 0.52)})`;
      ctx.lineWidth = 4.4 - i * 0.62;
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    ctx.fillStyle = `rgba(58,230,210,${0.12 + headrestLevel * 0.82})`;
    ctx.beginPath();
    ctx.roundRect(headrestX - 28, headrestY + 42, 56, 10, 5);
    ctx.fill();
    ctx.textAlign = "start";
    const monitorContent = branches.programA.liveRmsDb;
    els.cabinTestReadout.textContent =
      state.playing && Number.isFinite(monitorContent)
        ? `Listener A · Program A ${monitorContent.toFixed(1)} dB · Scene ${branches.scene.liveRmsDb.toFixed(1)} dB · Ambient ${branches.ambient.liveRmsDb.toFixed(1)} dB`
        : "Stopped · --";
  }

  return { draw: drawCabinLevelTest };
}
